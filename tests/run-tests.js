#!/usr/bin/env node
/* Une Phrase 상설 자동 점검. 실행: node tests/run-tests.js — 전부 PASS일 때만 푸시. */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
let pass = 0, fail = 0;
function ok(c, n, x = "") { if (c) { pass++; console.log("  ✓ " + n); } else { fail++; console.log("  ✗ " + n + " " + x); } }

console.log("\n[데이터]");
const html = read("index.html");
const itemsJson = html.match(/const ITEMS = (\[[\s\S]*?\n\]);/)[1];
const ITEMS = eval(itemsJson);
ok(ITEMS.length >= 60, "문장 수 >= 60 (실제 " + ITEMS.length + ")");
ok(new Set(ITEMS.map(i => i.id)).size === ITEMS.length, "id 중복 없음");
ok(ITEMS.every((v, i) => v.id === i + 1), "id가 1부터 순서대로");
ok(ITEMS.every(i => i.fr && i.fr.trim() && i.ko && i.ko.trim()), "프랑스어·한국어 빈 문장 없음");
ok(ITEMS.every(i => Array.isArray(i.chunks) && i.chunks.length >= 2 && i.chunks.length <= 4 && i.chunks.every(c => c[0] && c[1])), "덩어리 2~4개, 내용 있음");
ok(ITEMS.every(i => i.pattern && i.pattern.length >= 10), "패턴 한 줄 있음");
ok(ITEMS.every(i => Array.isArray(i.words) && i.words.length >= 1 && i.words.every(w => w[0] && w[1])), "핵심 단어 1개 이상");
ok(ITEMS.every(i => i.topic && i.level && i.tef), "주제·레벨·TEF 연결 있음");
ok(ITEMS.every(i => ["A2", "B1", "B2"].includes(i.level)), "레벨은 A2/B1/B2");
ok(ITEMS.every(i => /(EO 말하기|EE 쓰기|CE 읽기|CO 듣기)/.test(i.tef)), "TEF 표기에 한국어 영역명 병기");
const topics = [...new Set(ITEMS.map(i => i.topic))];
ok(topics.length >= 8, "주제 8종 이상 (실제 " + topics.length + ": " + topics.join(",") + ")");
for (const t of topics) ok(ITEMS.filter(i => i.topic === t).length >= 5, "주제 " + t + " 5문장 이상 (" + ITEMS.filter(i => i.topic === t).length + ")");
ok(!ITEMS.some(i => /selon une étude|d'après une étude|statistique/i.test(i.fr)), "지어낸 연구·통계 인용 없음");

console.log("\n[순수 함수]");
const normSrc = html.match(/function normalizeForCompare[\s\S]*?\n\}/)[0];
const corrSrc = html.match(/function isCorrect[\s\S]*?\n\}/)[0];
eval(normSrc); eval(corrSrc);
ok(isCorrect("Je cherche un appartement pres du metro.", "Je cherche un appartement près du métro."), "악센트·구두점 달라도 정답");
ok(isCorrect("  JE PENSE QUE  ", "je pense que"), "대소문자·공백 무시");
ok(!isCorrect("je pense que", "je ne pense pas"), "다른 문장은 오답");
ok(normalizeForCompare("l'étranger") === "l'etranger", "아포스트로피·악센트 정규화");

console.log("\n[보관함 시뮬레이션: 저장소 소실 → 복구]");
const actSrc = html.match(/function activityOf[\s\S]*?\n\}/)[0];
const pickSrc = html.match(/function pickRestore[\s\S]*?\n\}/)[0];
eval(actSrc); eval(pickSrc);
// 인메모리 localStorage / IndexedDB 스텁으로 앱의 저장→미러→소실→복구 흐름을 재현
function makeStores() {
  const ls = new Map(); const idb = new Map();
  return {
    save(p) { const s = JSON.stringify(p); ls.set("une-phrase-progress-v1", s); idb.set("une-phrase-progress-v1", s); },
    wipeLocal() { ls.clear(); },
    loadLocal() { const r = ls.get("une-phrase-progress-v1"); return r ? JSON.parse(r) : null; },
    loadVault() { const r = idb.get("une-phrase-progress-v1"); return r ? JSON.parse(r) : null; },
    forget() { ls.delete("une-phrase-progress-v1"); idb.delete("une-phrase-progress-v1"); },
    hasVault() { return idb.has("une-phrase-progress-v1"); }
  };
}
{
  const st = makeStores();
  const saved = { index: 12, completed: [1, 2, 3, 4, 5], doneDates: ["2026-10-20"], step: 1 };
  st.save(saved);
  ok(st.hasVault(), "저장 시 보관함(IndexedDB)에도 미러됨");
  st.wipeLocal();
  ok(st.loadLocal() === null, "소실 시뮬레이션: localStorage 비워짐");
  const restored = pickRestore(st.loadLocal(), st.loadVault());
  ok(restored && restored.completed.length === 5 && restored.index === 12, "보관함에서 진행 복구됨");
  const older = { index: 1, completed: [1], doneDates: [], step: 1 };
  ok(pickRestore(older, saved) === saved, "활동량 많은 보관본 우선");
  ok(pickRestore(saved, older) === saved, "로컬이 더 최신이면 로컬 유지");
  st.forget();
  ok(st.loadLocal() === null && st.loadVault() === null && pickRestore(st.loadLocal(), st.loadVault()) === null, "전체 지우기(forget)는 보관함까지 삭제 — 부활 없음");
}
ok(html.includes('navigator.storage.persist()'), "영구 보관 요청 코드 있음");
ok(html.includes("une-phrase-vault") && html.includes("vaultReady"), "IndexedDB 보관함 + 복구 게이트 코드 있음");
ok(html.includes('speechSynthesis') && html.includes('.cancel()') && html.includes('setTimeout'), "TTS: cancel 후 지연 재생 (Android 경합 방지)");
ok(html.includes('fr-FR'), "TTS 언어 fr-FR");

console.log("\n[단계 이어가기]");
ok(html.includes("function setStep(n){ currentStep = n; progress.step = n; saveProgress(); }"), "단계 이동 시 기록에 단계 저장 (setStep)");
ok(html.includes("currentStep = [1,2,3].includes(progress.step) ? progress.step : 1;"), "다시 열면 저장된 단계로 복원");
ok(/progress\.index\+\+;\s*\n\s*progress\.step = 1;/.test(html), "문장 완료 시 다음 문장은 1단계부터 (기록 단계 초기화)");

console.log("\n[완료 시각화·폴리시]");
ok(html.includes('id="pfill"') && html.includes('role="progressbar"'), "헤더 전체 진행률 바 있음");
ok(html.includes('id="todayChip"'), "오늘 완료 칩 있음");
ok(html.includes("donecircle"), "완료 화면 큰 체크 서클 있음");
ok(html.includes("isdone") && html.includes("li-check"), "주제별 목록 완료 행 표시(체크 배지) 있음");
ok(html.includes("wlearned"), "단어 탭 학습 완료 표시 있음");
ok(html.includes("prefers-reduced-motion"), "모션 최소화 설정 존중");
ok(html.includes("env(safe-area-inset-bottom)"), "하단 safe-area 여백 있음");
ok(html.includes("--sp1:4px") && html.includes("--r-md:12px"), "디자인 토큰(간격·반경) 변수 있음");

console.log("\n[동기부여: XP·레벨·정복 지도·복습 퀴즈]");
const lvArrSrc = html.match(/const LEVELS = \[[\s\S]*?\n\];/)[0];
const lvlSrc = html.match(/function levelOf[\s\S]*?\n\}/)[0];
const xpSrc2 = html.match(/function xpOf[\s\S]*?\n\}/)[0];
const tsSrc = html.match(/function topicStats[\s\S]*?\n\}/)[0];
const qpSrc = html.match(/function quizPool[\s\S]*?\n\}/)[0];
eval(lvArrSrc + "\n" + lvlSrc); eval(xpSrc2); eval(tsSrc); eval(qpSrc);
const LEVELS = eval(lvArrSrc.match(/\[[\s\S]*\]/)[0]);
ok(xpOf(0,0)===0 && xpOf(1,0)===10 && xpOf(0,1)===5 && xpOf(286,0)===2860, "XP 규칙: 신규 완료 +10, 복습 정답 +5");
ok(LEVELS.length===10 && LEVELS.every(l=>l.title && l.title.trim()), "레벨 10단계, 칭호 있음");
ok(LEVELS.every((l,i)=> i===0 ? l.at===0 : l.at>LEVELS[i-1].at), "레벨 임계값 오름차순, Lv.1은 0 XP");
ok(levelOf(0).lv===1 && levelOf(LEVELS[1].at-1).lv===1 && levelOf(LEVELS[1].at).lv===2, "레벨 경계 판정");
ok(levelOf(xpOf(286,0)).lv>=9, "전 문장 완료(2860 XP) 시 Lv.9 이상 (실제 Lv."+levelOf(xpOf(286,0)).lv+")");
ok(levelOf(99999).nextAt===null && levelOf(99999).toNext===0 && levelOf(99999).pct===100, "최고 레벨: 다음 레벨 없음");
{ const mid = levelOf(100); ok(mid.nextAt!==null && mid.toNext===mid.nextAt-100 && mid.pct>0 && mid.pct<100, "중간 레벨: 남은 XP·진행률 계산"); }
{ const fakeItems = [{id:1,topic:"일상"},{id:2,topic:"일상"},{id:3,topic:"건강"}];
  const ts = topicStats(fakeItems, [1,2]);
  ok(ts.length===2, "정복 지도: 주제별 집계");
  const daily = ts.find(t=>t.topic==="일상"), health = ts.find(t=>t.topic==="건강");
  ok(daily.done===2 && daily.total===2 && daily.pct===100 && daily.conquered===true, "정복 지도: 100% 주제는 정복");
  ok(health.done===0 && health.conquered===false, "정복 지도: 미완료 주제는 정복 아님");
  ok(quizPool(fakeItems, [1,2,3], 2).map(i=>i.id).join(",")==="1,3", "복습 퀴즈 풀: 완료 문장만, 현재 문장 제외");
  ok(quizPool(fakeItems, [1], 1).length===0, "복습 퀴즈 풀: 현재 문장만 완료면 풀 비어 있음");
  ok(quizPool(fakeItems, [], null).length===0, "복습 퀴즈 풀: 완료 없으면 비어 있음"); }
ok(html.includes("reviewCorrect:0") && html.includes("completedAt:{}"), "덧붙임 저장: 새 필드 기본값 있음");
ok(html.includes("Object.assign(defaultProgress(), chosen)"), "덧붙임 저장: 기존 저장본에 기본값 병합해 로드 (구버전 저장본 그대로 열림)");
ok(html.includes('id="topicMap"') && html.includes("function renderTopicMap"), "정복 지도 UI 있음");
ok(html.includes('id="quizArea"') && html.includes("복습 퀴즈 — 끝낸 문장에서 다시 쓰기") && html.includes("progress.reviewCorrect"), "복습 퀴즈 진입·XP 적립 코드 있음");
ok(html.includes('id="lvLabel"') && html.includes("다음 레벨까지"), "레벨 행 UI 있음");
ok(html.includes("completedAt[it.id]"), "완료 시 문장별 완료 날짜 기록");

console.log("\n[수동 넘기기·효과음]");
const ctSrc = html.match(/function checkTyping[\s\S]*?\n\}/)[0];
ok(!/setTimeout/.test(ctSrc), "따라 쓰기·가리고 쓰기 정답 경로에 자동 넘김 타이머 없음");
ok(ctSrc.includes("advanceBtn"), "정답 후 명시적 진행 버튼(advanceBtn) 표시");
ok(ctSrc.includes('getElementById("advanceBtn").onclick'), "진행은 버튼을 눌러야만 일어남");
ok(html.includes("function playSound(ok)") && html.includes("AudioContext"), "효과음 모듈(playSound, WebAudio) 있음");
ok(html.includes("sound:true") && html.includes("progress.sound !== false"), "효과음 기본값 ON, 진행 기록에 덧붙여 저장");
ok(html.includes('id="soundBtn"'), "설명 탭 효과음 켜기/끄기 토글 있음");
ok((html.match(/playSound\(true\)/g) || []).length >= 2 && (html.match(/playSound\(false\)/g) || []).length >= 2, "학습·퀴즈 채점에서 정답/오답 효과음 호출");

console.log("\n[오답 비교: diffWords·wrongHtml]");
const swSrc = html.match(/function splitWords[\s\S]*?\n\}/)[0];
const dwSrc = html.match(/function diffWords[\s\S]*?\n\}/)[0];
const escSrc = html.match(/function esc\(s\)\{[^}]*\}/)[0];
const whSrc = html.match(/function wrongHtml[\s\S]*?\n\}/)[0];
eval(swSrc); eval(dwSrc); eval(escSrc); eval(whSrc);
{ const d = diffWords("je cherche un appartement", "je cherche un appartement");
  ok(d.mineDiff.every(x=>!x) && d.ansDiff.every(x=>!x), "diff: 완전히 같으면 양쪽 다 차이 없음"); }
{ const d = diffWords("je cherche un appartement", "je cherche un logement");
  ok(d.mineDiff.join(",") === "false,false,false,true" && d.ansDiff.join(",") === "false,false,false,true", "diff: 단어 하나 교체 → 그 위치만 표시"); }
{ const d = diffWords("je cherche un", "je cherche un appartement");
  ok(d.mine.length===3 && d.answer.length===4 && d.mineDiff[3]===true && d.ansDiff[3]===true, "diff: 단어 누락 → 빈 자리도 차이로 표시"); }
{ const d = diffWords("je cherche un grand appartement", "je cherche un appartement");
  ok(d.mineDiff[3]===true && d.ansDiff[3]===true && d.ansDiff[4]===true, "diff: extra 단어 → 밀린 위치가 차이로 표시"); }
{ const d = diffWords("je cherche pres du metro", "je cherche près du métro");
  ok(d.mineDiff.every(x=>!x) && d.ansDiff.every(x=>!x), "diff: 악센트만 다르면 차이 아님 (채점 기준과 동일)"); }
{ const h = wrongHtml("je cherche un logement", "je cherche un appartement");
  ok(h.includes("여기가 달라요") && h.includes("내가 쓴 문장") && h.includes("정답"), "오답 피드백: 제목 + 내가 쓴 문장/정답 두 줄 구성");
  ok(h.includes('class="wdiff"') && h.includes('class="adiff"'), "오답 피드백: 내 문장과 정답에서 다른 단어를 각각 강조"); }
ok(html.includes('placeholder="문장을 보면서 써 보세요"') && html.includes('placeholder="프랑스어 문장을 써 보세요"'), "타이핑 박스: 단계별 안내 placeholder 있음");
ok(html.includes('id="wordProg"') && html.includes('id="quizWordProg"') && html.includes("function bindWordProg"), "타이핑 박스: 단어 수 진행 표시 (학습·퀴즈)");

console.log("\n[버그 회귀: 완료·퀴즈 중복 처리 방지]");
const csSrc = html.match(/function completeSentence\(\)[\s\S]*?\n\}/)[0];
const cqSrc = html.match(/function checkQuiz\(\)[\s\S]*?\n\}/)[0];
ok(csSrc.includes("if(completionInFlight) return;"), "완료 처리: 재진입 가드(completionInFlight) 있음");
ok(csSrc.includes('getElementById("studyCard").innerHTML = ""'), "완료 처리: 학습 카드를 비워 완료하기 버튼이 남지 않음");
ok(csSrc.includes("scrollIntoView"), "완료 처리: 완료 화면으로 스크롤함");
ok(cqSrc.includes("quizAnswered"), "퀴즈 채점: 한 번 답하면 재채점 가드(quizAnswered) 있음");
// 최소 DOM 스텁: innerHTML에 등장하는 id를 레지스트리에 등록해 동적 요소를 흉내낸다
const STUB_ELS = {};
function makeStubEl(id){
  const el = { id:id, value:"", style:{}, textContent:"", onclick:null, _html:"", _listeners:{},
    classList:{ toggle(){}, add(){}, remove(){}, contains(){ return false; } },
    setAttribute(){}, getAttribute(){ return null; },
    addEventListener(t,f){ this._listeners[t] = f; },
    focus(){}, scrollIntoView(){} };
  Object.defineProperty(el, "innerHTML", {
    get(){ return this._html; },
    set(v){ this._html = v; const re = /id="([^"]+)"/g; let m; while((m = re.exec(v))){ if(!STUB_ELS[m[1]]) STUB_ELS[m[1]] = makeStubEl(m[1]); } }
  });
  return el;
}
const documentStub = {
  getElementById(id){ if(!STUB_ELS[id]) STUB_ELS[id] = makeStubEl(id); return STUB_ELS[id]; },
  querySelectorAll(){ return [makeStubEl("sb1"), makeStubEl("sb2"), makeStubEl("sb3")]; }
};
const smokePrelude = [
  'let progress = null;',
  'let currentStep = 3;',
  'let quizItem = null;',
  'let completionInFlight = false;',
  'let quizAnswered = false;',
  'let currentTab = "study";',
  'let menuOpen = false;',
  'let completionShown = false;',
  'let resetStage = 0;',
  'let resetDoneMsg = false;',
  'const document = documentStub;',
  'function saveProgress(){}',
  'function renderVaultState(){}',
  'function renderProgress(){}',
  'function renderQuizEntry(){}',
  'function renderResetZone(){}',
  'function renderBrowse(){}',
  'function renderWords(){}',
  'function playSound(){}',
  'function speakFr(){}'
].join("\n");
const smokeFns = [
  escSrc, swSrc, dwSrc,
  html.match(/function slowListenBtnHtml\(\)[^\n]*/)[0],
  html.match(/function inFocus\(\)[^\n]*/)[0],
  html.match(/function applyFocus\(\)[\s\S]*?\n\}/)[0],
  html.match(/function openMenu\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function closeMenu\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function goMenu\(name\)\{[\s\S]*?\n\}/)[0],
  html.match(/function showTab\(name\)\{[\s\S]*?\n\}/)[0],
  html.match(/function correctHtml[\s\S]*?\n\}/)[0],
  html.match(/function setStep\(n\)\{[^}]*\}/)[0],
  html.match(/function currentItem\(\)\{[^}]*\}/)[0],
  html.match(/function todayKey\(\)\{[^}]*\}/)[0],
  html.match(/function countToday\(p\)\{[^}]*\}/)[0],
  html.match(/function bindWordProg[\s\S]*?\n\}/)[0],
  html.match(/function renderStudy\(\)[\s\S]*?\n\}/)[0],
  ctSrc, csSrc,
  html.match(/function startQuiz[\s\S]*?\n\}/)[0],
  cqSrc,
  html.match(/function endQuiz\(\)\{[^}]*\}/)[0]
].join("\n");
const smokeDriver = [
  'progress = { index:0, step:3, completed:[], doneDates:[], completedAt:{}, reviewCorrect:0, sound:true };',
  'currentStep = 3;',
  'renderStudy();',
  'ok(STUB_ELS["tabBar"].hidden === true, "포커스 스모크: 공부 중에는 탭 바가 숨겨짐");',
  'ok(STUB_ELS["menuBtn"].hidden === false, "메뉴 스모크: 공부 중에는 메뉴 버튼이 보임");',
  'openMenu();',
  'ok(STUB_ELS["menuOverlay"].hidden === false, "메뉴 스모크: 메뉴 버튼을 누르면 패널이 열림");',
  'closeMenu();',
  'ok(STUB_ELS["menuOverlay"].hidden === true && STUB_ELS["tabBar"].hidden === true, "메뉴 스모크: 닫으면 메뉴만 닫히고 탭 바는 계속 숨김 (공부 계속)");',
  'ok(!!STUB_ELS["typeInput"], "스모크: 3단계 타이핑 박스 렌더됨");',
  'ok(STUB_ELS["wordProg"].innerHTML.indexOf("단어") > -1, "스모크: 단어 수 진행 표시 초기 렌더");',
  'STUB_ELS["typeInput"].value = ITEMS[0].fr;',
  'STUB_ELS["typeInput"]._listeners.input();',
  'ok(STUB_ELS["wordProg"].innerHTML.indexOf("<b>" + splitWords(ITEMS[0].fr).length + "</b>") === 0, "스모크: 입력하면 단어 수 진행 표시 갱신");',
  'openMenu(); goMenu("study");',
  'ok(STUB_ELS["menuOverlay"].hidden === true && currentStep === 3 && STUB_ELS["typeInput"].value === ITEMS[0].fr, "메뉴 스모크: 메뉴에서 공부하기를 고르면 메뉴만 닫히고 단계·입력이 그대로");',
  'checkTyping();',
  'ok(!!STUB_ELS["advanceBtn"], "스모크: 정답 후 완료하기 버튼 표시");',
  'STUB_ELS["advanceBtn"].onclick();',
  'const idx1 = progress.index, done1 = progress.completed.length;',
  'STUB_ELS["advanceBtn"].onclick();',
  'STUB_ELS["advanceBtn"].onclick();',
  'completeSentence();',
  'ok(done1 === 1 && progress.completed.length === 1, "회귀: 완료 버튼 연타·재호출에도 완료는 1회만 (실제 " + progress.completed.length + "회)");',
  'ok(idx1 === 1 && progress.index === 1, "회귀: 완료 연타해도 안 본 문장으로 건너뛰지 않음 (index " + progress.index + ")");',
  'ok(xpOf(progress.completed.length, progress.reviewCorrect) === 10, "회귀: XP도 1회분 +10만 적립");',
  'ok(STUB_ELS["studyCard"].innerHTML === "", "회귀: 완료 후 학습 카드가 비어 있음");',
  'ok(STUB_ELS["tabBar"].hidden === false, "포커스 스모크: 완료 화면(쉬는 지점)에서는 탭 바가 보임");',
  'ok(STUB_ELS["menuBtn"].hidden === true, "메뉴 스모크: 완료 화면에서는 메뉴 버튼도 숨겨짐");',
  'progress.completed = [ITEMS[0].id, ITEMS[1].id, ITEMS[2].id];',
  'progress.index = 0; currentStep = 1; completionShown = false;',
  'startQuiz();',
  'ok(!!quizItem, "스모크: 복습 퀴즈 출제됨");',
  'ok(STUB_ELS["tabBar"].hidden === true && STUB_ELS["menuBtn"].hidden === false, "메뉴 스모크: 복습 퀴즈 중에도 탭 바 숨김, 메뉴 버튼 표시");',
  'STUB_ELS["quizInput"].value = quizItem.fr;',
  'const rc0 = progress.reviewCorrect;',
  'checkQuiz(); checkQuiz();',
  'ok(progress.reviewCorrect === rc0 + 1, "회귀: 퀴즈 정답을 두 번 제출해도 복습 XP는 1회만 (reviewCorrect " + progress.reviewCorrect + ")");',
  'openMenu();',
  'ok(STUB_ELS["menuOverlay"].hidden === false, "메뉴 스모크: 퀴즈 중에도 메뉴를 열 수 있음");',
  'goMenu("words");',
  'ok(currentTab === "words" && STUB_ELS["tabBar"].hidden === false && STUB_ELS["menuOverlay"].hidden === true, "메뉴 스모크: 메뉴에서 단어를 고르면 단어 탭으로 이동, 메뉴는 닫히고 탭 바가 보임");',
  'showTab("study");',
  'ok(STUB_ELS["tabBar"].hidden === true && STUB_ELS["menuBtn"].hidden === false, "메뉴 스모크: 공부하기로 돌아오면 다시 몰입 (탭 바 숨김·메뉴 버튼 표시)");'
].join("\n");
eval(smokePrelude + "\n" + lvArrSrc + "\n" + lvlSrc + "\n" + xpSrc2 + "\n" + qpSrc + "\n" + normSrc + "\n" + corrSrc + "\n" + smokeFns + "\n" + smokeDriver);

console.log("\n[정답 피드백 분리·짧은 라벨·짧은 안내 (v1.19.0)]");
const chSrc = html.match(/function correctHtml[\s\S]*?\n\}/)[0];
eval(chSrc);
{ const fr = "Je cherche un appartement près du métro.";
  const ch = correctHtml(fr);
  const okLine = ch.split('<div class="answerbox">')[0];
  ok(okLine.includes("✓ 맞았어요!") && !okLine.includes(fr), "정답 피드백: 성공 문구만 따로, 전체 문장이 붙지 않음");
  ok(ch.includes('class="answerbox"') && ch.includes('class="answer-label">정답<') && ch.includes(fr), "정답 피드백: 정답 문장은 라벨과 함께 별도 블록에 표시");
  const chq = correctHtml(fr, " +5 XP");
  ok(chq.split('<div class="answerbox">')[0].includes("+5 XP") && !chq.split('<div class="answerbox">')[0].includes(fr), "퀴즈 정답 피드백: +5 XP는 성공 문구에, 문장은 별도 블록에");
  ok(!html.includes("맞았어요! 정답:"), "학습·퀴즈 어디에도 성공 문구와 정답을 한 줄로 붙이지 않음"); }
ok(ctSrc.includes('"가리고 쓰기"') && ctSrc.includes('"완료하기 →"') && !ctSrc.includes("다음으로"), "진행 버튼: 따라 쓰기 정답 후에는 '가리고 쓰기', 마지막 단계는 '완료하기 →' ('다음으로' 제거)");
ok(!html.includes("다음: 2 · 따라 쓰기"), "읽어보기 단계 진행 버튼도 단계 이름 없이 짧게");
ok(ctSrc.includes("advancewrap") && /\.advancewrap\{margin:14px 0\}/.test(html), "정답 후 진행 버튼 영역: 위아래 14px 간격으로 듣기 버튼과 분리");
ok(!html.includes("뜻만 보고 프랑스어로 써 보세요"), "가리고 쓰기 안내: 안내 문구 자체를 표시하지 않음 (v1.23.0)");
ok(!html.includes("프랑스어 문장은 가려져 있어요"), "가리고 쓰기 안내: 긴 설명 문구 제거");

console.log("\n[기록 초기화: 2단계 확인]");
ok(html.includes('id="resetZone"') && html.includes("기록 초기화"), "초기화: 설명 탭에 기록 초기화 진입점 있음");
ok(!html.includes("기록 전체 지우기"), "초기화: 기존 '기록 전체 지우기' 버튼은 교체되어 없음");
ok(!html.includes("confirm(") && !html.includes("alert("), "초기화: 네이티브 confirm/alert 팝업을 쓰지 않음");
const rzSrc = html.match(/function renderResetZone\(\)\{[\s\S]*?\n\}/)[0];
const drSrc = html.match(/async function doReset\(\)\{[\s\S]*?\n\}/)[0];
ok(rzSrc.includes("네, 지울게요") && rzSrc.includes("정말 초기화") && rzSrc.includes("마지막 확인이에요"), "초기화: 1단계(네, 지울게요) → 2단계(정말 초기화·마지막 확인) 문구 있음");
ok(rzSrc.includes("되돌릴 수 없어요") && rzSrc.includes("백업"), "초기화: 경고에 삭제 범위·되돌릴 수 없음·백업 안내 포함");
ok(drSrc.includes("localStorage.removeItem(STORAGE_KEY)") && drSrc.includes("vaultDelete(STORAGE_KEY)"), "초기화 실행: 로컬 기록과 보관함 복사본을 함께 삭제 (forget 경로)");
ok(drSrc.includes("defaultProgress()"), "초기화 실행: 진행 상태를 기본값으로 되돌림");
// 초기화 흐름용 최소 DOM 스텁 (id 레지스트리 방식은 위 스모크와 동일)
const RZ_ELS = {};
function makeRzEl(id){
  const el = { id:id, value:"", style:{}, textContent:"", onclick:null, _html:"", _listeners:{},
    classList:{ toggle(){}, add(){}, remove(){}, contains(){ return false; } },
    setAttribute(){}, getAttribute(){ return null; },
    addEventListener(t,f){ this._listeners[t] = f; },
    focus(){}, scrollIntoView(){} };
  Object.defineProperty(el, "innerHTML", {
    get(){ return this._html; },
    set(v){ this._html = v; const re = /id="([^"]+)"/g; let m; while((m = re.exec(v))){ if(!RZ_ELS[m[1]]) RZ_ELS[m[1]] = makeRzEl(m[1]); } }
  });
  return el;
}
const rzDocument = {
  getElementById(id){ if(!RZ_ELS[id]) RZ_ELS[id] = makeRzEl(id); return RZ_ELS[id]; },
  querySelectorAll(){ return []; }
};
const rzPrelude = [
  'let progress = null;',
  'let currentStep = 3;',
  'let quizItem = { id: 1 };',
  'let completionInFlight = true;',
  'let quizAnswered = true;',
  'let vaultReady = false;',
  'let persistGranted = null;',
  'let resetStage = 0;',
  'let resetDoneMsg = false;',
  'let currentTab = "about";',
  'let menuOpen = false;',
  'let completionShown = false;',
  'const STORAGE_KEY = "une-phrase-progress-v1";',
  'const document = rzDocument;',
  'const rzLocalStore = new Map();',
  'const rzVaultStore = new Map();',
  'const localStorage = { getItem(k){ return rzLocalStore.has(k) ? rzLocalStore.get(k) : null; }, setItem(k,v){ rzLocalStore.set(k, String(v)); }, removeItem(k){ rzLocalStore.delete(k); } };',
  'async function vaultDelete(k){ rzVaultStore.delete(k); }',
  'function renderStudy(){}'
].join("\n");
const rzFns = [
  html.match(/function defaultProgress\(\)[^\n]*/)[0],
  html.match(/function soundEnabled\(\)[^\n]*/)[0],
  html.match(/function renderSoundBtn\(\)[^\n]*/)[0],
  html.match(/function renderVaultState\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function inFocus\(\)[^\n]*/)[0],
  html.match(/function applyFocus\(\)[\s\S]*?\n\}/)[0],
  html.match(/function closeMenu\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function showTab\(name\)\{[\s\S]*?\n\}/)[0],
  rzSrc, drSrc
].join("\n");
const rzDriver = [
  'progress = { index:5, step:3, completed:[1,2,3], doneDates:["2026-10-21"], completedAt:{1:"2026-10-21"}, reviewCorrect:4, sound:false };',
  'localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));',
  'rzVaultStore.set(STORAGE_KEY, JSON.stringify(progress));',
  'renderResetZone();',
  'ok(!!RZ_ELS["resetBtn"], "초기화 스모크: 처음에는 기록 초기화 버튼만 보임");',
  'RZ_ELS["resetBtn"].onclick();',
  'ok(RZ_ELS["resetZone"].innerHTML.includes("네, 지울게요"), "초기화 스모크: 한 번 누르면 1단계 경고·확인 표시");',
  'ok(localStorage.getItem(STORAGE_KEY) !== null && rzVaultStore.has(STORAGE_KEY) && progress.completed.length === 3, "초기화 스모크: 1단계(확인 전)에서는 아직 아무것도 지워지지 않음");',
  'RZ_ELS["resetCancel1"].onclick();',
  'ok(progress.completed.length === 3 && localStorage.getItem(STORAGE_KEY) !== null && RZ_ELS["resetZone"].innerHTML.includes("기록 초기화"), "초기화 스모크: 1단계에서 취소하면 기록 그대로, 버튼 상태로 복귀");',
  'RZ_ELS["resetBtn"].onclick();',
  'RZ_ELS["resetNext1"].onclick();',
  'ok(RZ_ELS["resetZone"].innerHTML.includes("정말 초기화") && localStorage.getItem(STORAGE_KEY) !== null && progress.completed.length === 3, "초기화 스모크: 2단계(마지막 확인)에서도 아직 지워지지 않음");',
  'showTab("study");',
  'ok(!RZ_ELS["resetZone"].innerHTML.includes("정말 초기화") && progress.completed.length === 3, "초기화 스모크: 다른 탭으로 가면 확인 상태가 접히고 기록도 그대로");',
  'RZ_ELS["resetBtn"].onclick();',
  'RZ_ELS["resetNext1"].onclick();',
  'RZ_ELS["resetDo"].onclick();',
  'ok(progress.completed.length === 0 && progress.index === 0 && progress.reviewCorrect === 0 && Object.keys(progress.completedAt).length === 0, "초기화 스모크: 두 번 확인 후 완료·복습·날짜 기록이 기본값으로");',
  'ok(progress.sound === true && currentStep === 1, "초기화 스모크: 효과음 설정 기본값(켜짐), 단계 1로 복귀");',
  'ok(localStorage.getItem(STORAGE_KEY) === null && !rzVaultStore.has(STORAGE_KEY), "초기화 스모크: 로컬과 보관함 복사본이 모두 삭제됨");',
  'const rzLocalAfter = localStorage.getItem(STORAGE_KEY) ? JSON.parse(localStorage.getItem(STORAGE_KEY)) : null;',
  'const rzVaultAfter = rzVaultStore.has(STORAGE_KEY) ? JSON.parse(rzVaultStore.get(STORAGE_KEY)) : null;',
  'ok(pickRestore(rzLocalAfter, rzVaultAfter) === null, "초기화 스모크: 초기화 후 다시 열어도 복구로 부활하지 않음");',
  'renderResetZone();',
  'ok(RZ_ELS["resetZone"].innerHTML.includes("초기화됐어요"), "초기화 스모크: 초기화 완료 안내가 표시됨");'
].join("\n");
eval(rzPrelude + "\n" + rzFns + "\n" + rzDriver);

console.log("\n[몰입 모드(메뉴)·느리게 듣기·하단 버튼 정리·간격 (v1.20.0 / v1.22.0)]");
ok(html.includes('id="tabBar"') && html.includes('id="menuBtn"') && html.includes("☰ 메뉴"), "메뉴: 탭 바 id와 조용한 메뉴 버튼 있음");
ok(!html.includes("✕ 나가기") && !html.includes("exitFocus") && !html.includes("focusOff") && !html.includes("exitbtn"), "메뉴: 기존 나가기 버튼과 포커스 해제 상태(exitFocus·focusOff)가 완전히 제거됨");
ok(html.includes('id="menuOverlay" hidden') && html.includes('id="menuBackdrop"') && html.includes('id="menuCloseBtn"') && html.includes("닫기"), "메뉴: 배경·닫기를 갖춘 메뉴 패널이 처음에는 숨겨져 있음");
ok(html.includes('data-menu="study"') && html.includes('data-menu="browse"') && html.includes('data-menu="words"') && html.includes('data-menu="about"') && html.includes("지금 여기"), "메뉴: 목적지 4곳 행 (공부하기에는 '지금 여기' 표시)");
ok(html.includes('role="dialog"') && html.includes('aria-haspopup="dialog"'), "메뉴: 패널에 dialog 역할, 버튼에 aria-haspopup 표시");
ok(/\.tabs\[hidden\]\{display:none\}/.test(html), "포커스: 숨긴 탭 바가 실제로 display:none 됨 (flex에 덮이지 않음)");
ok(/\.menubtn\[hidden\]\{display:none\}/.test(html) && /\.menuoverlay\[hidden\]\{display:none\}/.test(html), "메뉴: 메뉴 버튼·패널도 hidden이면 확실히 숨겨짐");
const ifSrc = html.match(/function inFocus\(\)[^\n]*/)[0];
const afSrc = html.match(/function applyFocus\(\)[\s\S]*?\n\}/)[0];
const stSrc2 = html.match(/function showTab\(name\)\{[\s\S]*?\n\}/)[0];
ok(ifSrc.includes('currentTab === "study"') && ifSrc.includes("!completionShown"), "포커스 판정: 공부하기 탭 + 완료 화면이 아닐 때만 몰입");
ok(afSrc.includes('getElementById("tabBar")') && afSrc.includes('getElementById("menuBtn")'), "포커스 적용: 탭 바와 메뉴 버튼 표시를 함께 토글");
const gmSrc = html.match(/function goMenu\(name\)\{[\s\S]*?\n\}/)[0];
ok(gmSrc.includes("closeMenu()") && gmSrc.includes('showTab("browse")') && gmSrc.includes('showTab("words")') && gmSrc.includes('showTab("about")'), "메뉴 선택: 메뉴를 닫고 해당 탭으로 이동 (공부하기는 닫기만 하고 공부 상태 유지)");
ok(html.includes('getElementById("menuBtn").onclick') && html.includes('getElementById("menuCloseBtn").onclick') && html.includes('getElementById("menuBackdrop").onclick'), "메뉴: 메뉴 버튼·닫기·배경 클릭이 모두 연결됨");
ok(html.includes('querySelectorAll("[data-menu]")'), "메뉴: 목적지 행 클릭이 goMenu로 연결됨");
ok(stSrc2.includes("currentTab = name") && stSrc2.includes("applyFocus()"), "탭 전환 시 포커스 상태도 함께 갱신");
const rsSrc2 = html.match(/function renderStudy\(\)[\s\S]*?\n\}/)[0];
const csSrc2 = html.match(/function completeSentence\(\)[\s\S]*?\n\}/)[0];
ok(rsSrc2.includes("applyFocus()") && csSrc2.includes("completionShown = true"), "포커스: 학습 렌더 시 적용, 완료 화면에서는 해제 지점 표시");
ok(!html.includes('id="prevBtn"') && !html.includes('id="nextBtn"'), "공부하기 하단: 이전/다음 문장 버튼 제거됨 (문장 고르기는 주제별 탭)");
ok(!html.includes('id="listenBtn2"') && !html.includes("다시 듣기"), "공부하기 하단: 중복 다시 듣기 버튼 제거됨 (카드 안 듣기로 충분)");
ok(!html.includes("progress.slow") && !html.includes("speakRate") && !html.includes("🐢 느리게 0.8배속") && !html.includes("slowbtn"), "느리게 듣기: 토글 칩·속도 설정 저장·speakRate가 모두 제거됨 (v1.23.0)");
ok(html.includes("🐢 느리게 듣기") && html.includes('id="slowListenBtn"'), "느리게 듣기: 누를 때만 0.7배속으로 1회 재생하는 버튼 있음");
ok(html.includes('u.rate = (typeof rate === "number") ? rate : 1.0;'), "느리게 듣기: speakFr가 명시 속도 인자를 받고 기본값은 1.0");
ok(rsSrc2.includes("slowListenBtnHtml()") && rsSrc2.includes("speakFr(it.fr, 0.7)"), "느리게 듣기: 읽어보기·따라 쓰기에 버튼이 있고 0.7 인자로 speakFr를 호출");
// speakFr 속도 스텁: speechSynthesis를 흉내내 발화 객체의 rate를 직접 확인
const sfSrc = html.match(/function speakFr\(text, rate\)[\s\S]*?\n\}/)[0];
const sfPrelude = [
  'const sfUtterances = [];',
  'function SpeechSynthesisUtterance(t){ this.text = t; this.lang = ""; this.rate = 1; this.voice = null; }',
  'const window = { speechSynthesis: { cancel(){}, getVoices(){ return []; }, speak(u){ sfUtterances.push(u); } } };',
  'const setTimeout = (fn)=>{ fn(); return 0; };',
  'const clearTimeout = ()=>{};',
  'let speakTimer = null;'
].join("\n");
eval(sfPrelude + "\n" + sfSrc + "\n" + [
  'speakFr("Bonjour.");',
  'ok(sfUtterances.length === 1 && sfUtterances[0].rate === 1.0 && sfUtterances[0].lang === "fr-FR", "듣기 스모크: 인자 없이 부르면 1.0배속 발화");',
  'speakFr("Bonjour.", 0.7);',
  'ok(sfUtterances.length === 2 && sfUtterances[1].rate === 0.7, "느리게 듣기 스모크: 0.7 인자를 주면 그 발화만 0.7배속");',
  'speakFr("Bonjour.");',
  'ok(sfUtterances.length === 3 && sfUtterances[2].rate === 1.0, "느리게 듣기 스모크: 다음 일반 듣기는 다시 1.0배속 (토글 아님, 상태 없음)");'
].join("\n"));
ok(/\.btnrow\{[^}]*display:flex[^}]*gap:12px/.test(html), "간격: 카드 안 버튼 묶음은 flex gap 12px (.btnrow)");
ok(/\.tabs\{[^}]*gap:10px/.test(html) && !/stepnav/.test(html), "간격: 탭 바 gap 10px (단계 탭 행은 제거됨)");
ok(/\.resetbtns\{[^}]*gap:12px/.test(html), "간격: 초기화 확인 버튼 gap 12px");
ok(rsSrc2.includes('class="btnrow"'), "간격: 학습 카드 버튼들이 .btnrow로 묶임");
ok(html.match(/function startQuiz[\s\S]*?\n\}/)[0].includes("btnrow") && cqSrc.includes("btnrow"), "간격: 퀴즈 버튼 행도 .btnrow로 묶임");

console.log("\n[학습 흐름 재편: 선형 진행·뒤로·재통과 (v1.23.0)]");
ok(!html.includes('class="stepnav"') && !html.includes('id="stepBtn') && !html.includes(".stepbtn"), "단계 탭: 읽어보기/따라 쓰기/가리고 쓰기 버튼 행이 학습 화면에서 제거됨");
ok(rsSrc2.includes('id="goStep2">따라 쓰기</button>'), "읽어보기: 진행 버튼 라벨이 '따라 쓰기'");
ok(rsSrc2.includes('<button class="primary" id="goStep2">') && rsSrc2.split("} else if(currentStep===2){")[0].includes('<button class="ghost" id="listenBtn">') && !rsSrc2.split("} else if(currentStep===2){")[0].includes('class="primary" id="listenBtn"'), "강조 배분: 읽어보기에서는 '따라 쓰기'가 primary(파란 버튼)이고 듣기는 ghost (v1.23.1)");
ok((rsSrc2.match(/id="backBtn"/g) || []).length === 2, "뒤로: 따라 쓰기와 가리고 쓰기 두 곳에 '← 뒤로' 버튼이 있음");
ok(rsSrc2.includes("setStep(currentStep===3 ? 2 : 1)"), "뒤로: 3단계에서는 2단계로, 2단계에서는 1단계로 돌아감");
ok(rsSrc2.includes("const tefSeg = currentStep===1"), "메타 줄: '도움되는 영역'은 읽어보기(1단계)에서만 붙음");
ok(!html.includes("hintBtn") && !html.includes("힌트: 첫 단어 보기"), "가리고 쓰기: 힌트 버튼과 힌트 로직이 앱 전체에서 제거됨");
{ const s2 = rsSrc2.split("} else if(currentStep===2){")[1].split("} else {")[0];
  ok(s2.includes("slowListenBtnHtml()") && s2.includes('id="backBtn"') && s2.includes('id="listenBtn"'), "따라 쓰기: 듣기·느리게 듣기·뒤로가 함께 있음"); }
{ const s3 = rsSrc2.split("} else {")[1].split('document.getElementById("studyCard")')[0];
  ok(!s3.includes("listenBtn") && !s3.includes("slowListen") && !s3.includes("hint") && !s3.includes("뜻만 보고"), "가리고 쓰기: 듣기·느리게 듣기·힌트·안내 문구가 모두 없음 (문장이 새지 않음)");
  ok(s3.includes('id="checkBtn"') && s3.includes('id="backBtn"') && s3.includes('id="typeInput"') && s3.includes('id="wordProg"'), "가리고 쓰기: 뜻 프롬프트·타이핑 박스·단어 수·확인하기·뒤로만 남음"); }
// 흐름 스모크: 단계 탭 없이 선형 진행 + 뒤로가기 재통과를 실제 앱 함수로 재현
const FL_ELS = {};
function makeFlEl(id){
  const el = { id:id, value:"", style:{}, textContent:"", onclick:null, _html:"", _listeners:{},
    classList:{ toggle(){}, add(){}, remove(){}, contains(){ return false; } },
    setAttribute(){}, getAttribute(){ return null; },
    addEventListener(t,f){ this._listeners[t] = f; },
    focus(){}, scrollIntoView(){} };
  Object.defineProperty(el, "innerHTML", {
    get(){ return this._html; },
    set(v){ this._html = v; const re = /id="([^"]+)"/g; let m; while((m = re.exec(v))){ if(!FL_ELS[m[1]]) FL_ELS[m[1]] = makeFlEl(m[1]); } }
  });
  return el;
}
const flDocument = {
  getElementById(id){ if(!FL_ELS[id]) FL_ELS[id] = makeFlEl(id); return FL_ELS[id]; },
  querySelectorAll(){ return []; }
};
const flPrelude = [
  'let progress = null;',
  'let currentStep = 1;',
  'let completionInFlight = false;',
  'let completionShown = false;',
  'const document = flDocument;',
  'function saveProgress(){}',
  'function renderQuizEntry(){}',
  'function renderProgress(){}',
  'function applyFocus(){}',
  'function playSound(){}',
  'function speakFr(){}',
  'function completeSentence(){}'
].join("\n");
const flFns = [
  escSrc, swSrc, dwSrc, normSrc, corrSrc, chSrc, whSrc,
  html.match(/function slowListenBtnHtml\(\)[^\n]*/)[0],
  html.match(/function setStep\(n\)\{[^}]*\}/)[0],
  html.match(/function currentItem\(\)\{[^}]*\}/)[0],
  html.match(/function todayKey\(\)\{[^}]*\}/)[0],
  html.match(/function countToday\(p\)\{[^}]*\}/)[0],
  html.match(/function bindWordProg[\s\S]*?\n\}/)[0],
  rsSrc2, ctSrc
].join("\n");
const flDriver = [
  'progress = { index:0, step:1, completed:[], doneDates:[], completedAt:{}, reviewCorrect:0, sound:true };',
  'currentStep = 1;',
  'renderStudy();',
  'const card1 = FL_ELS["studyCard"].innerHTML;',
  'ok(card1.includes("도움되는 영역"), "흐름 스모크: 1단계 메타 줄에는 도움되는 영역이 보임");',
  'ok(card1.includes(\'id="goStep2"\') && card1.includes(">따라 쓰기<") && card1.includes(\'id="slowListenBtn"\'), "흐름 스모크: 1단계에 따라 쓰기 진행 버튼과 느리게 듣기 버튼");',
  'ok(!card1.includes(\'id="backBtn"\'), "흐름 스모크: 1단계에는 뒤로 버튼 없음");',
  'FL_ELS["goStep2"].onclick();',
  'ok(currentStep === 2, "흐름 스모크: 따라 쓰기를 누르면 2단계로");',
  'const card2 = FL_ELS["studyCard"].innerHTML;',
  'ok(!card2.includes("도움되는 영역") && card2.includes(\'id="backBtn"\') && card2.includes(\'id="slowListenBtn"\'), "흐름 스모크: 2단계는 메타에서 영역이 사라지고 뒤로·느리게 듣기가 있음");',
  'FL_ELS["backBtn"].onclick();',
  'ok(currentStep === 1, "흐름 스모크: 2단계 뒤로는 1단계로 돌아감");',
  'FL_ELS["goStep2"].onclick();',
  'ok(currentStep === 2 && !FL_ELS["studyCard"].innerHTML.includes("advanceBtn"), "흐름 스모크: 뒤로 갔다 다시 오면 2단계가 새 상태 (진행 버튼 없음)");',
  'FL_ELS["typeInput"].value = ITEMS[0].fr;',
  'checkTyping();',
  'ok(FL_ELS["fb"].innerHTML.includes("가리고 쓰기") && FL_ELS["fb"].innerHTML.includes(\'id="advanceBtn"\'), "흐름 스모크: 2단계 정답 후 진행 버튼 라벨이 가리고 쓰기");',
  'FL_ELS["advanceBtn"].onclick();',
  'ok(currentStep === 3, "흐름 스모크: 가리고 쓰기를 누르면 3단계로");',
  'const card3 = FL_ELS["studyCard"].innerHTML;',
  'ok(!card3.includes("listenBtn") && !card3.includes("hintBtn") && !card3.includes("뜻만 보고") && !card3.includes("도움되는 영역"), "흐름 스모크: 3단계에는 듣기·힌트·안내·영역 표시가 없음");',
  'ok(card3.includes(\'id="backBtn"\') && card3.includes(\'id="checkBtn"\'), "흐름 스모크: 3단계에는 확인하기와 뒤로만 남음");',
  'FL_ELS["backBtn"].onclick();',
  'ok(currentStep === 2, "흐름 스모크: 3단계 뒤로는 2단계로 돌아감");',
  'const card2b = FL_ELS["studyCard"].innerHTML;',
  'ok(!card2b.includes("advanceBtn") && card2b.includes(\'id="checkBtn"\') && card2b.includes(\'id="fb"\'), "재통과 스모크: 뒤로 온 2단계는 진행 버튼 없이 새 상태 — 다시 정답을 맞춰야 함");',
  'FL_ELS["typeInput"].value = ITEMS[0].fr;',
  'checkTyping();',
  'ok(FL_ELS["fb"].innerHTML.includes(\'id="advanceBtn"\'), "재통과 스모크: 다시 정답을 맞히면 진행 버튼이 다시 나타남");',
  'FL_ELS["advanceBtn"].onclick();',
  'ok(currentStep === 3, "재통과 스모크: 재통과 후에야 3단계로 넘어감");',
  'FL_ELS["typeInput"].value = ITEMS[0].fr;',
  'checkTyping();',
  'ok(FL_ELS["fb"].innerHTML.includes("완료하기"), "흐름 스모크: 3단계 정답 후 버튼은 완료하기");'
].join("\n");
eval(flPrelude + "\n" + flFns + "\n" + flDriver);

console.log("\n[공유 버튼 (v1.21.0)]");
ok(html.includes('id="shareBtn"') && html.includes("🔗 이 앱 공유하기"), "공유: 설명 탭에 '🔗 이 앱 공유하기' 버튼 있음");
ok(html.indexOf('id="tab-about"') > -1 && html.indexOf('id="shareBtn"') > html.indexOf("어떻게 쓰나요") && html.indexOf('id="shareBtn"') < html.indexOf('id="resetZone"'), "공유: 버튼 위치는 설명 탭 안, 사용법 아래·보관/초기화 영역 위");
ok(html.includes('const SHARE_URL = "https://sidebatch.github.io/une-phrase/";'), "공유: 공유 주소는 실주소로 고정");
ok(html.includes('const SHARE_TITLE = "Une Phrase — 한 문장 프랑스어";') && html.includes('const SHARE_TEXT = "켜면 바로 시작하는 프랑스어 한 문장 공부";'), "공유: 제목·소개 문구 고정");
ok(html.includes('getElementById("shareBtn").onclick') && html.includes('id="shareLink" hidden'), "공유: 버튼 핸들러 연결, 복사 실패 시 보여줄 주소 텍스트(숨김) 있음");
const shareSrc = html.match(/function shareApp\(\)\{[\s\S]*?\n\}/)[0];
const shareConstSrc = html.match(/const SHARE_TITLE[\s\S]*?const SHARE_BTN_LABEL = "[^"]*";/)[0];
ok(shareSrc.includes("navigator.share") && shareSrc.includes(".catch(()=>{})"), "공유: Web Share를 쓰고 취소(AbortError)는 조용히 삼킴");
ok(shareSrc.includes("navigator.clipboard.writeText") && shareSrc.includes("링크가 복사됐어요"), "공유: 공유가 안 되면 클립보드 복사 + 버튼 피드백");
// 공유 동작용 최소 스텁: navigator/document를 갈아끼우며 4가지 환경을 재현
function makeShareEl(id){ return { id:id, textContent: id === "shareBtn" ? "🔗 이 앱 공유하기" : "", hidden: id === "shareLink", style:{}, onclick:null }; }
const SH_ELS = { shareBtn: makeShareEl("shareBtn"), shareLink: makeShareEl("shareLink") };
const shDocument = { getElementById(id){ return SH_ELS[id] || null; } };
const shPrelude = [
  'const document = shDocument;',
  'let navigator = {};',
  'let shareCalls = [];',
  'let shareCatchFn = null;',
  'let clipCalls = [];'
].join("\n");
const shDriver = [
  // 1) Web Share 사용 가능: 정확한 제목·소개·주소로 호출, 클립보드는 안 씀
  'navigator = { share(data){ shareCalls.push(data); return { catch(fn){ shareCatchFn = fn; return this; } }; } };',
  'shareApp();',
  'ok(shareCalls.length === 1 && shareCalls[0].title === SHARE_TITLE && shareCalls[0].text === SHARE_TEXT && shareCalls[0].url === "https://sidebatch.github.io/une-phrase/", "공유 스모크: navigator.share에 제목·소개·실주소가 그대로 전달됨");',
  'ok(clipCalls.length === 0 && SH_ELS.shareLink.hidden === true, "공유 스모크: 공유가 가능하면 클립보드·주소 텍스트는 안 씀");',
  // 1b) 사용자가 공유 창을 취소(AbortError): 오류 표시도, 대체 동작도 없음
  'let abortThrew = false;',
  'try{ const ae = new Error("cancel"); ae.name = "AbortError"; shareCatchFn(ae); }catch(e){ abortThrew = true; }',
  'ok(!abortThrew && SH_ELS.shareLink.hidden === true && SH_ELS.shareBtn.textContent === "🔗 이 앱 공유하기", "공유 스모크: 공유 취소(AbortError)는 조용히 무시 — 오류 UI 없음");',
  // 2) Web Share 없음 + 클립보드 성공: 링크 복사 + 버튼 피드백
  'navigator = { clipboard: { writeText(t){ clipCalls.push(t); return { then(a,b){ if(a) a(); return this; }, catch(){ return this; } }; } } };',
  'shareApp();',
  'ok(clipCalls.length === 1 && clipCalls[0] === SHARE_URL, "공유 스모크: 공유가 안 되면 실주소를 클립보드에 복사");',
  'ok(SH_ELS.shareBtn.textContent === "링크가 복사됐어요" && SH_ELS.shareLink.hidden === true, "공유 스모크: 복사 성공 피드백이 버튼에 표시됨");',
  // 3) 클립보드 복사까지 실패: 주소를 선택 가능한 텍스트로 표시
  'SH_ELS.shareBtn.textContent = "🔗 이 앱 공유하기";',
  'navigator = { clipboard: { writeText(){ return { then(a,b){ if(b) b(new Error("denied")); return this; } }; } } };',
  'shareApp();',
  'ok(SH_ELS.shareLink.hidden === false, "공유 스모크: 복사 실패 시 주소 텍스트가 드러남");',
  // 4) 공유·클립보드 둘 다 없음: 마찬가지로 주소 텍스트 표시
  'SH_ELS.shareLink.hidden = true;',
  'navigator = {};',
  'shareApp();',
  'ok(SH_ELS.shareLink.hidden === false, "공유 스모크: 공유·클립보드가 모두 없으면 주소 텍스트 표시");'
].join("\n");
eval(shPrelude + "\n" + shareConstSrc + "\n" + shareSrc + "\n" + shDriver);

console.log("\n[버전·파일]");
const ver = html.match(/const APP_VERSION = "([^"]+)"/)[1];
ok(read("README.md").includes("v" + ver), "README 버전 일치 (v" + ver + ")");
ok(read("sw.js").includes("une-phrase-v" + ver), "sw 캐시 버전 일치");
ok(html.includes("버전 " + ver), "화면 버전 표시 일치");
ok(fs.existsSync(path.join(ROOT, "manifest.webmanifest")), "manifest 있음");
ok(fs.existsSync(path.join(ROOT, "icons/icon-192.png")) && fs.existsSync(path.join(ROOT, "icons/icon-512.png")), "아이콘 있음");
const man = JSON.parse(read("manifest.webmanifest"));
ok(man.name.includes("Une Phrase"), "manifest 이름 확인");
ok(html.includes('property="og:image" content="https://sidebatch.github.io/une-phrase/og-image.png"'), "og:image 절대 URL 있음");
ok(html.includes('property="og:image:width" content="1200"') && html.includes('property="og:image:height" content="630"'), "og:image 크기 메타 있음");
ok(html.includes('property="og:type" content="website"') && html.includes('name="twitter:card" content="summary_large_image"') && html.includes('name="twitter:image" content="https://sidebatch.github.io/une-phrase/og-image.png"'), "og:type·Twitter Card 메타 있음");
const ogPngPath = path.join(ROOT, "og-image.png");
ok(fs.existsSync(ogPngPath), "og-image.png 있음");
if (fs.existsSync(ogPngPath)) {
  const ogBuf = fs.readFileSync(ogPngPath);
  ok(ogBuf.readUInt32BE(16) === 1200 && ogBuf.readUInt32BE(20) === 630, "og-image.png 실제 크기 1200×630");
}

console.log("\n결과: PASS " + pass + " / FAIL " + fail);
process.exit(fail ? 1 : 0);
