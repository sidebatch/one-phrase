#!/usr/bin/env node
/* One Phrase 상설 자동 점검. 실행: node tests/run-tests.js — 전부 PASS일 때만 푸시. */
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
ok(ITEMS.every(i => ["A1", "A2", "B1", "B2"].includes(i.level)), "레벨은 A1/A2/B1/B2 (A1 도입, v1.33.0)");
ok(ITEMS.length === 346, "프랑스어 문장 총 346개 (실제 " + ITEMS.length + ")");
{ const dist = lv => ITEMS.filter(i => i.level === lv).length;
  ok(dist("A1") === 50 && dist("A2") === 98 && dist("B1") === 96 && dist("B2") === 102, "프랑스어 레벨 분포: A1 50 · A2 98 · B1 96 · B2 102 (A1 40개 추가 반영)"); }
ok(ITEMS.every(i => /(EO 말하기|EE 쓰기|CE 읽기|CO 듣기)/.test(i.tef)), "TEF 표기에 한국어 영역명 병기");
const topics = [...new Set(ITEMS.map(i => i.topic))];
ok(topics.length >= 8, "주제 8종 이상 (실제 " + topics.length + ": " + topics.join(",") + ")");
for (const t of topics) ok(ITEMS.filter(i => i.topic === t).length >= 5, "주제 " + t + " 5문장 이상 (" + ITEMS.filter(i => i.topic === t).length + ")");
ok(!ITEMS.some(i => /selon une étude|d'après une étude|statistique/i.test(i.fr)), "지어낸 연구·통계 인용 없음");

// 망각곡선 복습 순수 함수 소스 묶음 (여러 스모크가 공유)
const SCHED_SRCS = [
  html.match(/const REVIEW_LADDER = [^\n]*/)[0],
  html.match(/const REVIEW_DAILY_CAP = [^\n]*/)[0],
  html.match(/function addDaysKey[\s\S]*?\n\}/)[0],
  html.match(/function cloneReviewState[\s\S]*?\n\}/)[0],
  html.match(/function scheduleOnComplete[\s\S]*?\n\}/)[0],
  html.match(/function nextSchedule[\s\S]*?\n\}/)[0],
  html.match(/function dueReviewIds[\s\S]*?\n\}/)[0],
  html.match(/function applyDailyCap[\s\S]*?\n\}/)[0],
  html.match(/function ensureReviewState[\s\S]*?\n\}/)[0],
  html.match(/function countReviewsToday[\s\S]*?\n\}/)[0],
  html.match(/function curveLitToday[\s\S]*?\n\}/)[0],
  html.match(/function captureDueSnapshot[\s\S]*?\n\}/)[0],
  html.match(/function unresolvedDueIds[\s\S]*?\n\}/)[0],
  html.match(/function sortReviewIds[\s\S]*?\n\}/)[0],
  html.match(/function wrongTodayIds[\s\S]*?\n\}/)[0],
  html.match(/function updateWrongToday[\s\S]*?\n\}/)[0],
  html.match(/function dueUniverseNow[\s\S]*?\n\}/)[0],
  html.match(/function syncCurveDays[\s\S]*?\n\}/)[0],
  html.match(/function prepareReviewQueue\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function curveLineHtml[\s\S]*?\n\}/)[0],
  html.match(/function normId\(id\)\{[\s\S]*?\n\}/)[0],
  html.match(/function cmpIds\(a, b\)\{[\s\S]*?\n\}/)[0]
].join("\n");
const MAPSTRIP_SRC = html.match(/function renderMapStrip\(\)\{[\s\S]*?\n\}/)[0];

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
ok(html.includes("function setStep(n){ currentStep = n; P().step = n; saveProgress(); }"), "단계 이동 시 기록에 단계 저장 (setStep)");
ok(html.includes("currentStep = [1,2,3].includes(P().step) ? P().step : 1;"), "다시 열면 저장된 단계로 복원 (활성 언어 버킷)");
ok(/P\(\)\.index < studyItems\(\)\.length-1\) P\(\)\.index\+\+;\s*\n\s*P\(\)\.step = 1;/.test(html), "문장 완료 시 다음 문장은 1단계부터 (기록 단계 초기화, 레벨 범위 큐 기준)");

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
const atsSrc = html.match(/function allTopicStat\(stats\)\{[\s\S]*?\n\}/)[0];
const qpSrc = html.match(/function quizPool[\s\S]*?\n\}/)[0];
eval(lvArrSrc + "\n" + lvlSrc); eval(xpSrc2); eval(tsSrc); eval(qpSrc);
const LEVELS = eval(lvArrSrc.match(/\[[\s\S]*\]/)[0]);
ok(xpOf(0,0)===0 && xpOf(1,0)===10 && xpOf(0,1)===5 && xpOf(286,0)===2860, "XP 규칙: 신규 완료 +10, 복습 정답 +5");
ok(LEVELS.length===10 && LEVELS.every(l=>l.title && l.title.trim()), "레벨 10단계, 칭호 있음");
ok(LEVELS.every((l,i)=> i===0 ? l.at===0 : l.at>LEVELS[i-1].at), "레벨 임계값 오름차순, Lv.1은 0 XP");
ok(levelOf(0).lv===1 && levelOf(LEVELS[1].at-1).lv===1 && levelOf(LEVELS[1].at).lv===2, "레벨 경계 판정");
ok(LEVELS.map(l=>l.at).join(",") === "0,30,90,190,350,590,940,1420,2080,2900", "레벨 임계값: v1.30.0 곡선 (간격 30→60→100→160→240→350→480→660→820)");
ok(LEVELS.every((l,i)=> i<2 ? true : (l.at-LEVELS[i-1].at) > (LEVELS[i-1].at-LEVELS[i-2].at)), "레벨 곡선: 레벨 간 필요 XP 간격이 단조 증가");
ok(levelOf(xpOf(286,0)).lv===9 && levelOf(xpOf(286,8)).lv===10, "레벨 도달: 전 문장 완료(2860 XP)는 Lv.9, 복습 8개(+40 XP) 더하면 Lv.10");
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
ok(html.includes("progress = migrateProgress(chosen)"), "덧붙임 저장: 로드 시 마이그레이션으로 정규화해 열림 (구버전 저장본 그대로 이어짐)");
ok(html.includes('id="topicMap"') && html.includes("function renderTopicMap"), "정복 지도 UI 있음");
ok(html.includes('id="quizArea"') && html.includes("망각곡선 도전하기") && html.includes("자유 복습 — 끝낸 문장에서 다시 쓰기") && html.includes("P().reviewCorrect"), "복습 진입(오늘의 복습 카드·망각곡선 도전·자유 복습)·XP 적립 코드 있음");
ok(html.includes('id="lvLabel"') && html.includes("다음 레벨까지"), "레벨 행 UI 있음");
ok(html.includes("completedAt[it.id]"), "완료 시 문장별 완료 날짜 기록");

console.log("\n[수동 넘기기·효과음]");
const ctSrc = html.match(/function checkTyping[\s\S]*?\n\}/)[0];
ok(!/setTimeout/.test(ctSrc), "따라 쓰기·가리고 쓰기 정답 경로에 자동 넘김 타이머 없음");
ok(ctSrc.includes("advanceBtn"), "정답 후 명시적 진행 버튼(advanceBtn) 표시");
ok(ctSrc.includes('getElementById("advanceBtn").onclick'), "진행은 버튼을 눌러야만 일어남");
ok(html.includes("function playSound(ok)") && html.includes("AudioContext"), "효과음 모듈(playSound, WebAudio) 있음");
ok(html.includes("sound:true") && html.includes("progress.sound !== false"), "효과음 기본값 ON, 진행 기록에 덧붙여 저장");
ok(html.includes('id="soundBtn"'), "더보기 탭 효과음 켜기/끄기 토글 있음");
ok((html.match(/playSound\(true\)/g) || []).length >= 2 && (html.match(/playSound\(false\)/g) || []).length >= 2, "학습·퀴즈 채점에서 정답/오답 효과음 호출");

console.log("\n[오답 비교: diffWords·wrongHtml]");
const swSrc = html.match(/function splitWords[\s\S]*?\n\}/)[0];
const dwSrc = html.match(/function diffWords[\s\S]*?\n\}/)[0];
const escSrc = html.match(/function esc\(s\)\{[^}]*\}/)[0];
const whSrc = html.match(/function wrongHtml[\s\S]*?\n\}/)[0];
const qwhSrc = html.match(/function quizWrongHtml[\s\S]*?\n\}/)[0];
const qcandSrc = html.match(/function quizCandidates\(\)\{[\s\S]*?\n\}/)[0];
const challengeSrcs = [
  html.match(/function startChallenge\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function startRetryQuiz\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function renderQuizEndState\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function renderQuizResult\(\)\{[\s\S]*?\n\}/)[0]
].join("\n");
const lockSrc = [
  html.match(/const OVERLAY_IDS = \[[^\n]*/)[0],
  html.match(/function syncScrollLock\(\)\{[\s\S]*?\n\}/)[0]
].join("\n");
const mapSheetSrcs = [
  lockSrc, atsSrc,
  html.match(/function renderMapSheet\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function openMapSheet\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function closeMapSheet\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function renderTopicTag\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function setTopicFilter\(t\)\{[\s\S]*?\n\}/)[0],
  html.match(/function setLevelFilter\(lv\)\{[\s\S]*?\n\}/)[0],
  html.match(/function repositionInQueue\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function goToTopicStudy\(topic\)\{[\s\S]*?\n\}/)[0],
  html.match(/function goToItem\(idx, step\)[^\n]*/)[0]
].join("\n");
eval(swSrc); eval(dwSrc); eval(escSrc); eval(whSrc); eval(qwhSrc);
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
{ const h = quizWrongHtml("je cherche un logement", "je cherche un appartement");
  ok(h.indexOf('class="answerbox"') > -1 && h.indexOf('class="answerbox"') < h.indexOf('class="mydiff"'), "복습 오답 피드백(v1.35.1): 정답 블록이 위에 분리되고 내 답 차이는 아래 한 줄");
  ok(h.includes('class="wdiff"') && !h.includes('class="feedback diff"'), "복습 오답 피드백(v1.35.1): 학습 화면과 같은 문법(answerbox)으로 정돈됨");
  const he = quizWrongHtml("", "je cherche un appartement");
  ok(he.includes("아직 쓰지 않았어요") && he.includes('class="answerbox"') && !he.includes("mydiff") && !he.includes("wdiff"), "복습 오답 피드백(v1.35.1): 빈 답 제출 시 diff 없이 정답 블록 + 안내만");
  const hw = quizWrongHtml("   ", "je cherche un appartement");
  ok(hw.includes("아직 쓰지 않았어요"), "복습 오답 피드백(v1.35.1): 공백만 입력해도 빈 답으로 처리"); }
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
    focus(){}, scrollIntoView(){}, querySelector(){ return { hidden: true }; } };
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
// 언어·진도 헬퍼 실제 소스 (스모크 공용)
const helperSrc = [
  html.match(/const LANGS = \{[\s\S]*?\n\};/)[0],
  html.match(/const LANG_CODES = [^\n]*/)[0],
  'const ITEMS_EN = []; const ITEMS_ES = [];',
  html.match(/const ITEMS_BY_LANG = [^\n]*/)[0],
  html.match(/function defaultLangProgress\(\)[^\n]*/)[0],
  html.match(/function defaultProgress\(\)[^\n]*/)[0],
  html.match(/function migrateProgress\(raw\)\{[\s\S]*?\n\}/)[0],
  html.match(/function curLang\(\)\{[^}]*\}/)[0],
  html.match(/function P\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function items\(\)\{[^}]*\}/)[0],
  html.match(/function levelFilter\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function topicFilter\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function topicOptions\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function studyItems\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function levelOptions\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function itemText\(it\)\{[^}]*\}/)[0]
].join("\n");
const smokePrelude = [
  'let progress = null;',
  'let currentStep = 3;',
  'let quizItem = null;',
  'let quizSeen = new Set();',
  'let quizMode = "free";',
  'let quizChallengeTotal = 0;',
  'let quizDueUniverse = [];',
  'let completionInFlight = false;',
  'let quizAnswered = false;',
  'let currentTab = "study";',
  'let menuOpen = false;',
  'let resetStage = 0;',
  'let resetDoneMsg = false;',
  'const document = documentStub;',
  'const window = { scrollTo(){} };',
  'function saveProgress(){}',
  'function renderVaultState(){}',
  'function renderProgress(){}',
  'function renderQuizEntry(){}',
  'function renderResetZone(){}',
  'function renderBrowse(){}',
  'function renderWords(){}',
  'function playSound(){}',
  'function speakFr(){}',
  'function clearSpeakingUI(){}'
].join("\n");
const smokeFns = [
  escSrc, swSrc, dwSrc,
  html.match(/const SPEAKER_SVG = [^\n]*/)[0],
  html.match(/const SPEAKER_SLOW_SVG = [^\n]*/)[0],
  html.match(/function slowListenBtnHtml\(\)[^\n]*/)[0],
  lockSrc,
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
  html.match(/function soundEnabled\(\)[^\n]*/)[0],
  html.match(/const COMPLETE_MOTIFS = \{[\s\S]*?\n\};/)[0],
  html.match(/const COMPLETE_NOTE_GAP = [^\n]*/)[0],
  html.match(/const COMPLETE_NOTE_DUR = [^\n]*/)[0],
  html.match(/function playCompleteSound\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function renderLevelChips\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function renderTopicTag\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function scopeLabel\(\)\{[\s\S]*?\n\}/)[0],
  SCHED_SRCS,
  html.match(/function renderStudy\(\)[\s\S]*?\n\}/)[0],
  ctSrc, csSrc,
  html.match(/function startQuiz[\s\S]*?\n\}/)[0],
  qwhSrc, qcandSrc, challengeSrcs,
  cqSrc,
  html.match(/function endQuiz\(\)\{[^}]*\}/)[0]
].join("\n");
const smokeDriver = [
  'progress = migrateProgress({ index:0, step:3, completed:[], doneDates:[], completedAt:{}, reviewCorrect:0, sound:true });',
  'const BKT = progress.byLang.fr;',
  'currentStep = 3;',
  'renderStudy();',
  'ok(STUB_ELS["studyCard"].innerHTML.includes("typeInput"), "스모크: 앱을 열면 탭 바 없이 공부 화면이 바로 렌더됨");',
  'openMenu();',
  'ok(STUB_ELS["menuOverlay"].hidden === false, "메뉴 스모크: 메뉴 버튼을 누르면 패널이 열림");',
  'closeMenu();',
  'ok(STUB_ELS["menuOverlay"].hidden === true && currentTab === "study", "메뉴 스모크: 닫으면 메뉴만 닫히고 공부는 계속됨");',
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
  'const idx1 = BKT.index, done1 = BKT.completed.length;',
  'STUB_ELS["advanceBtn"].onclick();',
  'STUB_ELS["advanceBtn"].onclick();',
  'completeSentence();',
  'ok(done1 === 1 && BKT.completed.length === 1, "회귀: 완료 버튼 연타·재호출에도 완료는 1회만 (실제 " + BKT.completed.length + "회)");',
  'ok(idx1 === 1 && BKT.index === 1, "회귀: 완료 연타해도 안 본 문장으로 건너뛰지 않음 (index " + BKT.index + ")");',
  'ok(xpOf(BKT.completed.length, BKT.reviewCorrect) === 10, "회귀: XP도 1회분 +10만 적립");',
  'ok(STUB_ELS["studyCard"].innerHTML === "", "회귀: 완료 후 학습 카드가 비어 있음");',
  'ok(STUB_ELS["doneBox"].innerHTML.includes("한 문장 완료") && !!STUB_ELS["oneMoreBtn"], "스모크: 완료 화면이 탭 로직 없이 바로 표시되고 한 문장 더 버튼이 있음");',
  'STUB_ELS["oneMoreBtn"].onclick();',
  'ok(currentStep === 1 && STUB_ELS["studyCard"].innerHTML.includes("goStep2"), "스모크: 한 문장 더를 누르면 다음 문장 1단계로 이어짐");',
  'BKT.completed = [ITEMS[0].id, ITEMS[1].id, ITEMS[2].id];',
  'BKT.index = 0; currentStep = 1;',
  'startQuiz();',
  'ok(!!quizItem, "스모크: 복습 퀴즈 출제됨");',
  'ok(!!STUB_ELS["quizInput"], "스모크: 복습 퀴즈 입력 박스 렌더됨");',
  'STUB_ELS["quizInput"].value = itemText(quizItem);',
  'const rc0 = BKT.reviewCorrect;',
  'checkQuiz(); checkQuiz();',
  'ok(BKT.reviewCorrect === rc0 + 1, "회귀: 퀴즈 정답을 두 번 제출해도 복습 XP는 1회만 (reviewCorrect " + BKT.reviewCorrect + ")");',
  'openMenu();',
  'ok(STUB_ELS["menuOverlay"].hidden === false, "메뉴 스모크: 퀴즈 중에도 메뉴를 열 수 있음");',
  'goMenu("words");',
  'ok(currentTab === "words" && STUB_ELS["menuOverlay"].hidden === true, "메뉴 스모크: 퀴즈 중에 메뉴에서 단어를 고르면 단어 화면으로 이동하고 메뉴는 닫힘");',
  'goMenu("study");',
  'ok(currentTab === "study" && STUB_ELS["menuOverlay"].hidden === true, "메뉴 스모크: 메뉴로 공부하기로 돌아올 수 있음");',
  'goMenu("words");',
  'ok(currentTab === "words", "메뉴 스모크: 메뉴로 단어 화면에 다시 갈 수 있음");',
  'openMenu(); goMenu("about");',
  'ok(currentTab === "about" && STUB_ELS["menuOverlay"].hidden === true, "메뉴 스모크: 단어 화면에서 메뉴를 열어 더보기 화면으로 이동할 수 있음");',
  'goMenu("study");',
  'ok(currentTab === "study", "메뉴 스모크: 메뉴의 공부하기를 고르면 공부 화면으로 이동");'
].join("\n");
eval(smokePrelude + "\n" + helperSrc + "\n" + lvArrSrc + "\n" + lvlSrc + "\n" + xpSrc2 + "\n" + qpSrc + "\n" + normSrc + "\n" + corrSrc + "\n" + smokeFns + "\n" + smokeDriver);

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
ok(html.includes('id="resetZone"') && html.includes("기록 초기화"), "초기화: 더보기 탭에 기록 초기화 진입점 있음");
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
  'const STORAGE_KEY = "une-phrase-progress-v1";',
  'const document = rzDocument;',
  'const rzLocalStore = new Map();',
  'const rzVaultStore = new Map();',
  'const localStorage = { getItem(k){ return rzLocalStore.has(k) ? rzLocalStore.get(k) : null; }, setItem(k,v){ rzLocalStore.set(k, String(v)); }, removeItem(k){ rzLocalStore.delete(k); } };',
  'async function vaultDelete(k){ rzVaultStore.delete(k); }',
  'function renderStudy(){}'
].join("\n");
const rzFns = [
  helperSrc,
  html.match(/function defaultProgress\(\)[^\n]*/)[0],
  html.match(/function soundEnabled\(\)[^\n]*/)[0],
  html.match(/function renderSoundBtn\(\)[^\n]*/)[0],
  html.match(/function renderVaultState\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function closeMenu\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function showTab\(name\)\{[\s\S]*?\n\}/)[0],
  lockSrc,
  rzSrc, drSrc
].join("\n");
const rzDriver = [
  'progress = migrateProgress({ index:5, step:3, completed:[1,2,3], doneDates:["2026-10-21"], completedAt:{1:"2026-10-21"}, reviewCorrect:4, sound:false });',
  'localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));',
  'rzVaultStore.set(STORAGE_KEY, JSON.stringify(progress));',
  'renderResetZone();',
  'ok(!!RZ_ELS["resetBtn"], "초기화 스모크: 처음에는 기록 초기화 버튼만 보임");',
  'RZ_ELS["resetBtn"].onclick();',
  'ok(RZ_ELS["resetZone"].innerHTML.includes("네, 지울게요"), "초기화 스모크: 한 번 누르면 1단계 경고·확인 표시");',
  'ok(localStorage.getItem(STORAGE_KEY) !== null && rzVaultStore.has(STORAGE_KEY) && progress.byLang.fr.completed.length === 3, "초기화 스모크: 1단계(확인 전)에서는 아직 아무것도 지워지지 않음");',
  'RZ_ELS["resetCancel1"].onclick();',
  'ok(progress.byLang.fr.completed.length === 3 && localStorage.getItem(STORAGE_KEY) !== null && RZ_ELS["resetZone"].innerHTML.includes("기록 초기화"), "초기화 스모크: 1단계에서 취소하면 기록 그대로, 버튼 상태로 복귀");',
  'RZ_ELS["resetBtn"].onclick();',
  'RZ_ELS["resetNext1"].onclick();',
  'ok(RZ_ELS["resetZone"].innerHTML.includes("정말 초기화") && localStorage.getItem(STORAGE_KEY) !== null && progress.byLang.fr.completed.length === 3, "초기화 스모크: 2단계(마지막 확인)에서도 아직 지워지지 않음");',
  'showTab("study");',
  'ok(!RZ_ELS["resetZone"].innerHTML.includes("정말 초기화") && progress.byLang.fr.completed.length === 3, "초기화 스모크: 다른 탭으로 가면 확인 상태가 접히고 기록도 그대로");',
  'RZ_ELS["resetBtn"].onclick();',
  'RZ_ELS["resetNext1"].onclick();',
  'RZ_ELS["resetDo"].onclick();',
  'ok(progress.byLang.fr.completed.length === 0 && progress.byLang.fr.index === 0 && progress.byLang.fr.reviewCorrect === 0 && Object.keys(progress.byLang.fr.completedAt).length === 0, "초기화 스모크: 두 번 확인 후 완료·복습·날짜 기록이 기본값으로");',
  'ok(progress.sound === true && currentStep === 1, "초기화 스모크: 효과음 설정 기본값(켜짐), 단계 1로 복귀");',
  'ok(localStorage.getItem(STORAGE_KEY) === null && !rzVaultStore.has(STORAGE_KEY), "초기화 스모크: 로컬과 보관함 복사본이 모두 삭제됨");',
  'const rzLocalAfter = localStorage.getItem(STORAGE_KEY) ? JSON.parse(localStorage.getItem(STORAGE_KEY)) : null;',
  'const rzVaultAfter = rzVaultStore.has(STORAGE_KEY) ? JSON.parse(rzVaultStore.get(STORAGE_KEY)) : null;',
  'ok(pickRestore(rzLocalAfter, rzVaultAfter) === null, "초기화 스모크: 초기화 후 다시 열어도 복구로 부활하지 않음");',
  'renderResetZone();',
  'ok(RZ_ELS["resetZone"].innerHTML.includes("초기화됐어요"), "초기화 스모크: 초기화 완료 안내가 표시됨");'
].join("\n");
eval(rzPrelude + "\n" + rzFns + "\n" + rzDriver);

console.log("\n[메뉴 전용 이동 (v1.25.0)·느리게 듣기·하단 버튼 정리·간격]");
ok(!html.includes('id="tabBar"') && !html.includes("tabBtn") && html.includes('id="menuBtn"') && html.includes("☰ 메뉴"), "탭 바 제거: #tabBar·탭 버튼이 없고 헤더 메뉴 버튼만 남음");
ok(!html.includes("✕ 나가기") && !html.includes("exitFocus") && !html.includes("focusOff") && !html.includes("exitbtn"), "메뉴: 기존 나가기 버튼과 포커스 해제 상태(exitFocus·focusOff)가 완전히 제거됨");
ok(html.includes('id="menuOverlay" hidden') && html.includes('id="menuBackdrop"') && html.includes('id="menuCloseBtn"') && html.includes("닫기"), "메뉴: 배경·닫기를 갖춘 메뉴 패널이 처음에는 숨겨져 있음");
ok(html.includes('data-menu="study"') && html.includes('data-menu="browse"') && html.includes('data-menu="words"') && html.includes('data-menu="together"') && html.includes('data-menu="about"') && !html.includes("지금 여기"), "메뉴: 목적지 5곳 행 ('지금 여기' 칩은 제거되고 틴트+점으로 대체)");
ok(html.includes('role="dialog"') && html.includes('aria-haspopup="dialog"'), "메뉴: 패널에 dialog 역할, 버튼에 aria-haspopup 표시");
ok(!/\.tabs\{/.test(html) && !html.includes('class="tabs"'), "탭 바 제거: .tabs CSS도 함께 제거됨");
ok(/\.menubtn\[hidden\]\{display:none\}/.test(html) && /\.menuoverlay\[hidden\]\{display:none\}/.test(html), "메뉴: 메뉴 버튼·패널도 hidden이면 확실히 숨겨짐");
const stSrc2 = html.match(/function showTab\(name\)\{[\s\S]*?\n\}/)[0];
ok(!html.includes("function inFocus") && !html.includes("function applyFocus") && !html.includes("completionShown"), "포커스 잔재 제거: inFocus·applyFocus·completionShown이 앱에서 완전히 사라짐");
ok(stSrc2.includes("currentTab = name") && stSrc2.includes('getElementById("tab-"+t)') && !stSrc2.includes("tabBtn") && !stSrc2.includes("applyFocus"), "화면 전환(showTab): 현재 화면 기록 + 섹션 표시 토글만 함 (탭 버튼·포커스 로직 없음)");
const gmSrc = html.match(/function goMenu\(name\)\{[\s\S]*?\n\}/)[0];
ok(gmSrc.includes("closeMenu()") && gmSrc.includes('showTab("study")') && gmSrc.includes('showTab("browse")') && gmSrc.includes('showTab("words")') && gmSrc.includes('showTab("about")'), "메뉴 선택: 메뉴를 닫고 고른 탭으로 이동 (어느 화면에서 열어도 네 탭 모두 이동 가능)");
ok(html.includes('getElementById("menuBtn").onclick') && html.includes('getElementById("menuCloseBtn").onclick') && html.includes('getElementById("menuBackdrop").onclick'), "메뉴: 메뉴 버튼·닫기·배경 클릭이 모두 연결됨");
ok(html.includes('querySelectorAll("[data-menu]")'), "메뉴: 목적지 행 클릭이 goMenu로 연결됨");
const rsSrc2 = html.match(/function renderStudy\(\)[\s\S]*?\n\}/)[0];
const csSrc2 = html.match(/function completeSentence\(\)[\s\S]*?\n\}/)[0];
ok(!rsSrc2.includes("applyFocus") && !csSrc2.includes("applyFocus") && !csSrc2.includes("completionShown"), "완료 화면: 탭을 다시 보이게 하는 포커스 로직 없이 완료 화면만 표시");
ok(!html.includes('id="prevBtn"') && !html.includes('id="nextBtn"'), "공부하기 하단: 이전/다음 문장 버튼 제거됨 (문장 고르기는 주제별 탭)");
ok(!html.includes('id="listenBtn2"') && !html.includes("다시 듣기"), "공부하기 하단: 중복 다시 듣기 버튼 제거됨 (카드 안 듣기로 충분)");
ok(!html.includes("progress.slow") && !html.includes("speakRate") && !html.includes("🐢 느리게 0.8배속") && !html.includes("slowbtn"), "느리게 듣기: 토글 칩·속도 설정 저장·speakRate가 모두 제거됨 (v1.23.0)");
ok(html.match(/function slowListenBtnHtml\(\)[^\n]*/)[0].includes("SPEAKER_SLOW_SVG") && html.match(/function slowListenBtnHtml\(\)[^\n]*/)[0].includes("느리게 듣기") && html.includes('id="slowListenBtn"'), "느리게 듣기: 누를 때만 0.7배속으로 1회 재생하는 버튼 있음 (스피커 SVG)");
ok(html.includes('u.rate = (typeof rate === "number") ? rate : 1.0;'), "느리게 듣기: speakFr가 명시 속도 인자를 받고 기본값은 1.0");
ok(rsSrc2.includes("slowListenBtnHtml()") && rsSrc2.includes("speakFr(itemText(it), 0.7, slb)") && rsSrc2.includes("speakFr(itemText(it), 1, lb)"), "느리게 듣기: 읽어보기·따라 쓰기에 버튼이 있고 0.7 인자+버튼으로 speakFr를 호출 (듣기는 1배속+버튼)");
// speakFr 스모크: 음성 캐시·로컬 우선·속도·재생 중 표시·대기 경로를 스텁으로 확인
const pickVoiceSrc = html.match(/function pickVoice\(voices, prefix\)\{[\s\S]*?\n\}/)[0];
eval(pickVoiceSrc);
ok(pickVoice([], "fr") === null && pickVoice([{lang:"en-US",localService:true}], "fr") === null, "음성 선택: fr 음성이 없으면 null");
ok(pickVoice([{lang:"fr-FR",localService:false},{lang:"fr-CA",localService:true}], "fr").lang === "fr-CA", "음성 선택: 로컬 fr 음성을 네트워크 음성보다 우선");
ok(pickVoice([{lang:"fr-FR",localService:false}], "fr").lang === "fr-FR", "음성 선택: 로컬이 없으면 첫 fr 음성");
const clearUiSrc = html.match(/function clearSpeakingUI\(\)\{[\s\S]*?\n\}/)[0];
const sfSrc = html.match(/function speakFr\(text, rate, btn\)\{[\s\S]*?\n\}/)[0];
const sfPrelude = [
  'const sfUtterances = [];',
  'const sfTimers = [];',
  'function SpeechSynthesisUtterance(t){ this.text = t; this.lang = ""; this.rate = 1; this.voice = null; this.volume = 1; }',
  'const sfNetVoice = { lang:"fr-FR", localService:false };',
  'const sfLocalVoice = { lang:"fr-FR", localService:true };',
  'const window = { speechSynthesis: { speaking:false, pending:false, cancel(){}, resume(){}, getVoices(){ return [sfNetVoice]; }, speak(u){ sfUtterances.push(u); } } };',
  'const setTimeout = (fn, ms)=>{ sfTimers.push(fn); return sfTimers.length; };',
  'const clearTimeout = ()=>{};',
  'let voiceCache = [];',
  'let speakBtn = null;',
  'let speakSafetyTimer = null;',
  'let speakWaitTimer = null;',
  'let speakSeq = 0;',
  'const LANGS = { fr:{ name:"프랑스어", speech:"fr-FR", prefix:"fr" }, en:{ name:"영어", speech:"en-US", prefix:"en" }, es:{ name:"스페인어", speech:"es-ES", prefix:"es" } };',
  'let progress = { lang:"fr" };',
  'function curLang(){ return progress.lang; }'
].join("\n");
eval(sfPrelude + "\n" + clearUiSrc + "\n" + sfSrc + "\n" + [
  'speakFr("Bonjour.");',
  'ok(sfUtterances.length === 1 && sfUtterances[0].rate === 1.0 && sfUtterances[0].lang === "fr-FR", "듣기 스모크: 인자 없이 부르면 1.0배속 발화");',
  'ok(sfUtterances[0].voice === sfNetVoice, "듣기 스모크: 캐시가 비어 있으면 getVoices의 fr 음성 사용");',
  'voiceCache = [sfLocalVoice];',
  'speakFr("Bonjour.", 0.7);',
  'ok(sfUtterances.length === 2 && sfUtterances[1].rate === 0.7 && sfUtterances[1].voice === sfLocalVoice, "느리게 듣기 스모크: 0.7배속 + 캐시의 로컬 음성 우선");',
  'speakFr("Bonjour.");',
  'ok(sfUtterances.length === 3 && sfUtterances[2].rate === 1.0, "느리게 듣기 스모크: 다음 일반 듣기는 다시 1.0배속 (토글 아님, 상태 없음)");',
  'const fakeBtn = { classes:{} };',
  'fakeBtn.classList = { add(c){ fakeBtn.classes[c] = true; }, remove(c){ delete fakeBtn.classes[c]; } };',
  'speakFr("Bonjour.", 1, fakeBtn);',
  'ok(fakeBtn.classes.playing === true, "재생 표시 스모크: 발화 시작 시 누른 버튼에 playing 클래스");',
  'sfUtterances[3].onend();',
  'ok(fakeBtn.classes.playing !== true, "재생 표시 스모크: 발화 종료(onend) 시 playing 해제");',
  'window.speechSynthesis.speaking = true;',
  'const beforeBusy = sfUtterances.length;',
  'speakFr("Bonjour.");',
  'ok(sfUtterances.length === beforeBusy, "듣기 지연 스모크: 재생 중이면 즉시 speak하지 않고 짧게 대기");',
  'sfTimers[sfTimers.length-1]();',
  'ok(sfUtterances.length === beforeBusy + 1, "듣기 지연 스모크: 대기 타이머가 돌면 발화 시작");',
  'window.speechSynthesis.speaking = false;'
].join("\n"));
ok(sfSrc.includes("ss.resume") && sfSrc.includes("ss.speaking || ss.pending") && sfSrc.includes("40") && !sfSrc.includes("120"), "듣기 지연: speak 직전 resume 호출 + 재생 중일 때만 40ms 대기 (고정 120ms 대기 제거)");
ok(html.includes('"voiceschanged"') && html.includes("refreshVoices();") && html.includes("function warmUpSpeech()") && html.includes('"pointerdown"'), "음성 캐시·예열: voiceschanged로 캐시 갱신, 시작 시 미리 읽기, 첫 pointerdown에 무음 발화로 예열");
ok(/\.btnrow\{[^}]*display:flex[^}]*gap:12px/.test(html), "간격: 카드 안 버튼 묶음은 flex gap 12px (.btnrow)");
ok(!/stepnav/.test(html) && /\.tabbtn\{/.test(html), "간격·정리: 단계 탭 행 없음, 주제 필터 칩(.tabbtn) 스타일은 유지");
ok(/\.resetbtns\{[^}]*gap:12px/.test(html), "간격: 초기화 확인 버튼 gap 12px");
ok(rsSrc2.includes('class="btnrow"'), "간격: 학습 카드 버튼들이 .btnrow로 묶임");
ok(html.match(/function startQuiz[\s\S]*?\n\}/)[0].includes("btnrow") && cqSrc.includes("btnrow"), "간격: 퀴즈 버튼 행도 .btnrow로 묶임");

console.log("\n[학습 흐름 재편: 선형 진행·뒤로·재통과 (v1.23.0)]");
ok(!html.includes('class="stepnav"') && !html.includes('id="stepBtn') && !html.includes(".stepbtn"), "단계 탭: 읽어보기/따라 쓰기/가리고 쓰기 버튼 행이 학습 화면에서 제거됨");
ok(rsSrc2.includes('id="goStep2">따라 쓰기</button>'), "읽어보기: 진행 버튼 라벨이 '따라 쓰기'");
ok(rsSrc2.includes('<button class="primary" id="goStep2">') && rsSrc2.split("} else if(currentStep===2){")[0].includes('<button class="ghost" id="listenBtn">') && !rsSrc2.split("} else if(currentStep===2){")[0].includes('class="primary" id="listenBtn"'), "강조 배분: 읽어보기에서는 '따라 쓰기'가 primary(파란 버튼)이고 듣기는 ghost (v1.23.1)");
ok((rsSrc2.match(/id="backBtn"/g) || []).length === 2, "뒤로: 따라 쓰기와 가리고 쓰기 두 곳에 '← 뒤로' 버튼이 있음");
ok(rsSrc2.includes("setStep(currentStep===3 ? 2 : 1)"), "뒤로: 3단계에서는 2단계로, 2단계에서는 1단계로 돌아감");
ok(!rsSrc2.includes("도움되는 영역") && !html.includes("도움되는 영역"), "메타 줄: 도움 영역 표기는 화면 어디에도 렌더되지 않음 (v1.32.0, 데이터에는 유지)");
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
  'function clearSpeakingUI(){}',
  'function completeSentence(){}'
].join("\n");
const flFns = [
  escSrc, swSrc, dwSrc, normSrc, corrSrc, chSrc, whSrc,
  html.match(/const SPEAKER_SVG = [^\n]*/)[0],
  html.match(/const SPEAKER_SLOW_SVG = [^\n]*/)[0],
  html.match(/function slowListenBtnHtml\(\)[^\n]*/)[0],
  html.match(/function setStep\(n\)\{[^}]*\}/)[0],
  html.match(/function currentItem\(\)\{[^}]*\}/)[0],
  html.match(/function todayKey\(\)\{[^}]*\}/)[0],
  html.match(/function countToday\(p\)\{[^}]*\}/)[0],
  html.match(/function bindWordProg[\s\S]*?\n\}/)[0],
  html.match(/function renderLevelChips\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function renderTopicTag\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function scopeLabel\(\)\{[\s\S]*?\n\}/)[0],
  rsSrc2, ctSrc
].join("\n");
const flDriver = [
  'progress = migrateProgress({ index:0, step:1, completed:[], doneDates:[], completedAt:{}, reviewCorrect:0, sound:true });',
  'currentStep = 1;',
  'renderStudy();',
  'const card1 = FL_ELS["studyCard"].innerHTML;',
  'ok(!card1.includes("도움되는 영역"), "흐름 스모크: 1단계 메타 줄에도 도움 영역 표기가 없음 (v1.32.0 숨김)");',
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
  'ok(FL_ELS["fb"].innerHTML.includes("완료하기"), "흐름 스모크: 3단계 정답 후 버튼은 완료하기");',
  // 강등 흐름 (v1.33.0): 3단계 오답 → 확인 → 2단계로 내려가 재통과해야만 3단계 재진입
  'progress = migrateProgress({ index:1, step:3, completed:[], doneDates:[], completedAt:{}, reviewCorrect:0, sound:true });',
  'currentStep = 3;',
  'renderStudy();',
  'FL_ELS["typeInput"].value = "전혀 다른 문장을 썼어요";',
  'checkTyping();',
  'ok(FL_ELS["fb"].innerHTML.includes("여기가 달라요") && FL_ELS["fb"].innerHTML.includes(\'id="demoteBtn"\'), "강등 스모크: 3단계 오답이면 diff와 확인 버튼(확인하고 다시 따라 쓰기)이 함께 표시됨");',
  'ok(FL_ELS["fb"].innerHTML.includes("확인하고 다시 따라 쓰기"), "강등 스모크: 확인 버튼 라벨이 안내대로임");',
  'ok(FL_ELS["typeInput"].disabled === true, "강등 스모크: 확인 상태에서는 입력이 잠겨 3단계에서 바로 재시도할 수 없음");',
  'ok(FL_ELS["checkBtn"].style.display === "none" && FL_ELS["backBtn"].style.display === "none", "강등 스모크: 확인 상태의 버튼은 확인 계열 하나뿐 (확인하기·뒤로 숨김)");',
  'FL_ELS["demoteBtn"].onclick();',
  'ok(currentStep === 2 && progress.byLang.fr.step === 2, "강등 스모크: 확인을 누르면 자동으로 2단계(따라 쓰기)로 내려감");',
  'const cardD = FL_ELS["studyCard"].innerHTML;',
  'ok(cardD.includes(ITEMS[1].fr) && cardD.includes(\'id="checkBtn"\'), "강등 스모크: 2단계는 문장을 보여주는 따라 쓰기로 다시 열림");',
  'FL_ELS["typeInput"].value = "또 틀린 문장";',
  'checkTyping();',
  'ok(!FL_ELS["fb"].innerHTML.includes("demoteBtn") && FL_ELS["fb"].innerHTML.includes("여기가 달라요"), "강등 스모크: 2단계 오답은 기존처럼 그 자리에서 diff만 보고 다시 시도 가능 (강등 없음)");',
  'FL_ELS["typeInput"].value = ITEMS[1].fr;',
  'checkTyping();',
  'ok(FL_ELS["fb"].innerHTML.includes(\'id="advanceBtn"\'), "강등 스모크: 2단계를 다시 정답으로 통과해야 진행 버튼이 나타남");',
  'FL_ELS["advanceBtn"].onclick();',
  'ok(currentStep === 3, "강등 스모크: 2단계 재통과 후에야 3단계로 재진입함");'
].join("\n");
eval(flPrelude + "\n" + helperSrc + "\n" + flFns + "\n" + flDriver);

console.log("\n[공유 버튼 (v1.21.0)]");
ok(html.includes('id="shareBtn"') && html.includes("🔗 이 앱 공유하기"), "공유: 더보기 탭에 '🔗 이 앱 공유하기' 버튼 있음");
ok(html.indexOf('id="tab-about"') > -1 && html.indexOf('id="shareBtn"') > html.indexOf("어떻게 쓰나요") && html.indexOf('id="shareBtn"') < html.indexOf('id="resetZone"'), "공유: 버튼 위치는 더보기 탭 안, 사용법 아래·보관/초기화 영역 위");
ok(html.includes('const SHARE_URL = "https://sidebatch.github.io/one-phrase/";'), "공유: 공유 주소는 실주소로 고정");
ok(html.includes('const SHARE_TITLE = "One Phrase — 한 문장 외국어";') && html.includes('const SHARE_TEXT = "켜면 바로 시작하는 외국어 한 문장 공부";'), "공유: 제목·소개 문구 고정");
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
  'ok(shareCalls.length === 1 && shareCalls[0].title === SHARE_TITLE && shareCalls[0].text === SHARE_TEXT && shareCalls[0].url === "https://sidebatch.github.io/one-phrase/", "공유 스모크: navigator.share에 제목·소개·실주소가 그대로 전달됨");',
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

console.log("\n[단어 탭 안내 제거·줄바꿈·메뉴 전역화 (v1.24.0)]");
ok(!html.includes("누르면 발음이 나옵니다") && !html.includes("학습 표시는 완료한"), "단어 탭: 발음·학습 표시 안내 문구가 완전히 제거됨");
ok(/\.worditem \.wtext\{[^}]*min-width:0[^}]*overflow-wrap:anywhere/.test(html), "줄바꿈 QA: 단어 행 텍스트(.wtext)에 min-width:0 + overflow-wrap 규칙이 있어 긴 단어도 행 안에서 꺾임");
ok(/\.li-body\{[^}]*overflow-wrap:anywhere/.test(html), "줄바꿈 QA: 주제별 행 본문(.li-body)에도 overflow-wrap 규칙 (같은 부류의 넘침 방지)");
ok(html.includes('class="wtext"'), "단어 행: 텍스트가 .wtext로 감싸져 렌더됨");
ok(!html.includes("focusbar") && !html.includes("Focusbar"), "메뉴 전역화: 공부 전용 포커스 바(focusbar) 마크업·CSS 제거됨");
ok(html.indexOf('id="menuBtn"') > html.indexOf('class="brandrow"') && html.indexOf('id="menuBtn"') < html.indexOf("</header>"), "메뉴 전역화: 메뉴 버튼이 헤더(brandrow) 안에 있음 — 모든 화면에서 보임");
ok(html.indexOf('id="menuOverlay"') < html.indexOf('id="tab-study"'), "메뉴 전역화: 메뉴 패널이 공부 탭 밖(전역)에 있어 어느 탭에서도 열림");
ok((html.match(/class="menudot"/g) || []).length === 5, "메뉴: 다섯 행 모두 활성 표시 점(.menudot)을 갖고 있고, 여는 위치에 따라 표시가 바뀜");
ok((html.match(/class="menutile /g) || []).length === 5, "메뉴: 다섯 행 모두 아이콘 타일(.menutile)을 갖고 있음");
ok(html.includes('class="menuhandle"') && html.includes("이어서 바로 공부") && html.includes("주제 골라 보기") && html.includes("단어 모아 보기") && html.includes("서로의 진도 보기") && html.includes("안내·공유·설정"), "메뉴: 드래그 핸들 + 목적지별 부제 한 줄씩");
ok(/\.menurow\.on\{[^}]*background:var\(--done-bg\)/.test(html) && /\.menudot\{[^}]*background:var\(--blue\)/.test(html), "메뉴: 활성 행은 파랑 틴트 배경 + 파랑 점 (활성 표시는 파랑 한 색만)");
const omSrc = html.match(/function openMenu\(\)\{[\s\S]*?\n\}/)[0];
ok(omSrc.includes('querySelectorAll(".menurow[data-menu]")') && omSrc.includes("currentTab") && omSrc.includes("menudot"), "메뉴: 열 때 현재 탭 행에 틴트(.on)와 점을 다시 맞춤");
// 활성 행 표시 스모크: 현재 탭이 단어일 때 열면 단어 행에만 틴트와 점이 보임
function makeOmRow(name){
  const row = { _name: name, _on: false, _dot: { hidden: true } };
  row.getAttribute = ()=>name;
  row.classList = { toggle(c, v){ if(c === "on") row._on = !!v; } };
  row.querySelector = ()=>row._dot;
  return row;
}
const OM_ROWS = ["study", "browse", "words", "together", "about"].map(makeOmRow);
const omDoc = {
  getElementById(){ return { hidden: true, setAttribute(){} }; },
  querySelectorAll(sel){ return sel === ".menurow[data-menu]" ? OM_ROWS : []; }
};
const omPrelude = [
  'let menuOpen = false;',
  'let currentTab = "words";',
  'const document = omDoc;'
].join("\n");
eval(omPrelude + "\n" + lockSrc + "\n" + omSrc + "\n" + [
  'openMenu();',
  'ok(OM_ROWS.every((r,i)=> r._on === (i === 2) && r._dot.hidden === (i !== 2)), "메뉴 스모크: 단어 탭에서 열면 단어 행만 활성 틴트+점 표시");',
  'currentTab = "together"; openMenu();',
  'ok(OM_ROWS[3]._on === true && OM_ROWS[3]._dot.hidden === false && OM_ROWS[2]._on === false && OM_ROWS[2]._dot.hidden === true && OM_ROWS[4]._on === false, "메뉴 스모크: Ensemble 탭에서 열면 활성 표시가 Ensemble 행으로 이동");',
  'currentTab = "about"; openMenu();',
  'ok(OM_ROWS[4]._on === true && OM_ROWS[4]._dot.hidden === false && OM_ROWS[3]._on === false && OM_ROWS[3]._dot.hidden === true, "메뉴 스모크: 더보기 탭에서 열면 활성 표시가 더보기 행으로 이동");'
].join("\n"));

console.log("\n[목록 행 구조 통일 (v1.25.0)]");
ok(/\.li-ko\{[^}]*display:block/.test(html) && /\.li-meta\{[^}]*display:flex/.test(html), "행 구조: 뜻 줄(.li-ko)과 메타 줄(.li-meta)이 분리된 CSS로 있음");
ok(!html.includes("li-sub"), "행 구조: 뜻 끝에 메타를 붙이던 .li-sub가 제거됨");
const rbSrc = html.match(/function renderBrowse\(\)\{[\s\S]*?\n\}/)[0];
ok(rbSrc.includes('class="li-ko"') && rbSrc.includes('class="li-meta"') && rbSrc.includes('class="donebadge">완료<'), "행 구조: renderBrowse가 뜻 줄·메타 줄·완료 배지를 분리해 렌더");
// 목록 렌더 스모크: 주제별·단어 행을 실제로 그려 구조를 확인
const BW_ELS = {};
function makeBwEl(id){
  const el = { id:id, value:"", style:{}, textContent:"", onclick:null, _html:"", _listeners:{},
    classList:{ toggle(){}, add(){}, remove(){}, contains(){ return false; } },
    setAttribute(){}, getAttribute(){ return null; },
    addEventListener(t,f){ this._listeners[t] = f; },
    focus(){}, scrollIntoView(){} };
  Object.defineProperty(el, "innerHTML", {
    get(){ return this._html; },
    set(v){ this._html = v; const re = /id="([^"]+)"/g; let m; while((m = re.exec(v))){ if(!BW_ELS[m[1]]) BW_ELS[m[1]] = makeBwEl(m[1]); } }
  });
  return el;
}
const bwDocument = {
  getElementById(id){ if(!BW_ELS[id]) BW_ELS[id] = makeBwEl(id); return BW_ELS[id]; },
  querySelectorAll(){ return []; }
};
const bwPrelude = [
  'let progress = null;',
  'let browseTopic = "전체";',
  'const document = bwDocument;',
  'function speakFr(){}'
].join("\n");
const bwFns = [
  escSrc, tsSrc, atsSrc,
  html.match(/function renderTopicMap\(\)\{[\s\S]*?\n\}/)[0],
  rbSrc,
  html.match(/function renderWords\(\)\{[\s\S]*?\n\}/)[0]
].join("\n");
const bwDriver = [
  'progress = migrateProgress({ index:0, step:1, completed:[ITEMS[0].id], doneDates:[], completedAt:{}, reviewCorrect:0, sound:true });',
  'renderBrowse();',
  'const bl = BW_ELS["browseList"].innerHTML;',
  'ok(bl.includes(\'<span class="li-ko">\' + ITEMS[0].ko + \'</span>\'), "행 스모크: 뜻이 메타 없이 자기 줄에만 있음");',
  'ok(ITEMS.every(i => bl.includes(\'<span class="li-ko">\' + i.ko + \'</span>\')), "행 스모크: 모든 뜻 줄이 뜻만으로 끝나고 \'· 주제 · 레벨\'이 붙지 않음");',
  'ok(bl.includes(\'<span class="li-meta">\' + ITEMS[0].topic + \' · \' + ITEMS[0].level + \' <span class="donebadge">완료</span></span>\'), "행 스모크: 완료 문장의 메타 줄 = 주제 · 레벨 + 완료 배지");',
  'ok(bl.includes(\'<span class="li-meta">\' + ITEMS[1].topic + \' · \' + ITEMS[1].level + \'</span>\'), "행 스모크: 미완료 문장도 같은 자리·같은 순서의 메타 줄 (배지만 없음)");',
  'ok((bl.match(/class="li-meta"/g) || []).length === ITEMS.length, "행 스모크: 모든 행에 메타 줄이 하나씩 — 세로 리듬이 동일");',
  'ok((bl.match(/donebadge/g) || []).length === 1, "행 스모크: 완료 배지는 완료한 행에만 하나");',
  'renderWords();',
  'const wl = BW_ELS["wordsList"].innerHTML;',
  'ok((wl.match(/class="wlearned"/g) || []).length === ITEMS[0].words.length, "단어 행 스모크: 완료한 문장의 단어에만 ✓ 학습 칩");',
  'ok(wl.includes(\'</span><span class="wlearned">✓ 학습</span>\'), "단어 행 스모크: ✓ 학습 칩은 뜻 텍스트 밖, 행의 고정 위치(오른쪽)에 따로 붙음");'
].join("\n");
eval(bwPrelude + "\n" + helperSrc + "\n" + bwFns + "\n" + bwDriver);

console.log("\n[Ensemble: Supabase 연동 + 완성도 개편 (v1.27.0)]");
ok(html.includes('const SUPABASE_URL = "https://cmhitsgoicxvmlwtrdrb.supabase.co";') && html.includes('const SUPABASE_KEY = "sb_publishable_'), "Supabase 상수: 프로젝트 URL + publishable 키가 코드에 있음");
ok(html.includes('id="view-together"') && html.includes('id="tab-together" hidden'), "Ensemble: 전용 화면(#view-together)이 탭으로 있고 처음에는 숨겨져 있음");
ok(!html.includes("함께 공부"), "이름 교체: 앱 어디에도 '함께 공부' 표기가 남아 있지 않음");
ok(html.includes('class="viewtitle" id="ensembleViewTitle">Ensemble</h2>') && html.includes("서로의 진도를 보며 같이 공부해요"), "Ensemble: 화면 제목 Ensemble + 상단 한 줄 설명");
ok(html.includes('data-menu="together"') && html.includes('<span class="menulabel" id="ensembleMenuLabel">Ensemble</span>') && html.includes("서로의 진도 보기"), "Ensemble: 메뉴 라벨 Ensemble, 부제는 '서로의 진도 보기'");
ok(html.indexOf('data-menu="words"') < html.indexOf('data-menu="together"') && html.indexOf('data-menu="together"') < html.indexOf('data-menu="about"'), "Ensemble: 메뉴 순서가 단어 → Ensemble → 설명");
ok(html.includes("cdn.jsdelivr.net/npm/@supabase/supabase-js@2") && html.includes('document.createElement("script")') && html.includes("function loadSupabase()"), "Ensemble: supabase-js는 처음부터 넣지 않고 동적 스크립트로 지연 로드");
ok(html.includes("구글로 시작하기") && html.includes('class="card herocard"') && html.includes("heroicon"), "Ensemble: 비로그인 상태는 히어로 카드 + '구글로 시작하기' 버튼");
ok(html.includes("signInWithOAuth") && html.includes('provider: "google"') && html.includes("redirectTo: location.origin + location.pathname"), "Ensemble: 구글 OAuth 로그인 호출 (앱 주소로 복귀)");
ok(html.includes('"23505"') && html.includes("이미 쓰이는 닉네임이에요"), "Ensemble: 닉네임 중복(23505) 안내가 모달 안에 표시됨");
ok(html.includes("네트워크가 필요해요"), "Ensemble: 오프라인·로드 실패 시 안내 문구 있음");
ok(html.includes('id="nickOverlay" hidden') && html.includes('id="nickBackdrop"') && html.includes('id="nickCloseBtn"') && html.includes("닉네임 정하기") && html.includes("다른 참여자에게 보이는 이름이에요"), "닉네임 모달: 바텀시트형 모달(배경·닫기 ✕·제목·안내)이 전역에 있음");
ok(html.includes('id="sbNickBtn">시작하기</button>') && !html.includes('id="sbNickBtn">정하기</button>'), "닉네임 모달: 주 버튼 라벨은 '시작하기'");
const snsSrc = html.match(/function sbSetNickname\(\)\{[\s\S]*?\n\}/)[0];
ok(snsSrc.includes("closeNickModal()") && snsSrc.includes("23505"), "닉네임 모달: 성공하면 닫고, 중복이면 모달을 닫지 않고 오류를 표시 (닫기 호출은 성공 경로에만)");
ok(html.includes("function isOAuthReturn()") && html.includes("[?&]code=") && html.includes("access_token="), "복귀 감지: code 파라미터·access_token 해시가 있을 때만 로그인 복귀로 판정");
ok(html.includes("sbAuthInitPromise = sbAuthReturnInit()") && html.includes("openNickModal(true)"), "복귀 처리: 복귀 시에는 즉시 초기화를 기다릴 수 있게 붙잡아 두고 프로필이 없으면 닉네임 모달을 자동으로 염");
const onmSrc = html.match(/function openNickModal\(auto\)\{[\s\S]*?\n\}/)[0];
ok(onmSrc.includes("nickAutoShown") && onmSrc.includes("return"), "닉네임 모달: 자동 팝업은 실행당 1회만 (닫으면 그 세션에서 다시 자동으로 띄우지 않음)");
const rtSrc = html.match(/async function renderTogether\(\)\{[\s\S]*?\n\}/)[0];
ok(rtSrc.includes("sbOpenNickBtn") && rtSrc.includes("openNickModal(false)") && rtSrc.includes("nickbanner"), "Ensemble: 닉네임이 없으면 얇은 배너 + 버튼으로 모달을 열 수 있음");
const rtmSrc = html.match(/async function renderTogetherMembers\(\)\{[\s\S]*?\n\}/)[0];
ok(rtmSrc.includes("avatarHtml(") && rtmSrc.includes('class="card membercard') && rtmSrc.includes('data-sblang=') && rtmSrc.includes("lvbadge"), "Ensemble: 참여자 카드(본인 포함 단일 렌더)에 아바타 원·Lv 배지가 있음");
ok(rtmSrc.includes("pctOf(") && rtmSrc.includes('class="pfill"') && rtmSrc.includes("Math.round"), "Ensemble: 카드마다 진행 바(완료 N/전체, %)가 있음");
const spSrc = html.match(/function saveProgress\(\)\{[\s\S]*?\n\}/)[0];
ok(spSrc.includes("scheduleSbUpload()"), "동기화: saveProgress가 서버 업로드를 예약함 (디바운스)");
ok(html.includes("setTimeout(()=>{ pushSbProgress(); }, 1500)"), "동기화: 업로드 디바운스 1.5초");
ok(html.includes("reviewIds:[]"), "동기화 재료: 진행 기록 기본값에 reviewIds 배열 있음");
const cqSrc2 = html.match(/function checkQuiz\(\)[\s\S]*?\n\}/)[0];
ok(cqSrc2.includes("P().reviewIds") && cqSrc2.includes("P().reviewIds.push(quizItem.id)"), "동기화 재료: 퀴즈 정답 시 맞힌 문장 id를 활성 언어 버킷의 reviewIds에 기록 (중복 없이)");
ok(html.includes("function syncSbOnLogin()") && html.includes("onAuthStateChange"), "동기화: 로그인·세션 복원 시 1회 병합 동기화 경로 있음");
// mergeProgressData 순수 함수 의미 테스트
const rriSrc = html.match(/function remoteReviewInfo[\s\S]*?\n\}/)[0];
const rrfSrc = html.match(/function remoteReviewFull[\s\S]*?\n\}/)[0];
const mrsSrc = html.match(/function mergeReviewSchedule[\s\S]*?\n\}/)[0];
const crsSrc = html.match(/function cloneReviewState[\s\S]*?\n\}/)[0];
const mpdSrc = html.match(/function mergeProgressData[\s\S]*?\n\}/)[0];
const ptrSrc = html.match(/function progressToRemote[\s\S]*?\n\}/)[0];
const rxpSrc = html.match(/function remoteXpOf[\s\S]*?\n\}/)[0];
const nidSrc = html.match(/function normId\(id\)\{[\s\S]*?\n\}/)[0];
const cmpSrc = html.match(/function cmpIds\(a, b\)\{[\s\S]*?\n\}/)[0];
eval(nidSrc); eval(cmpSrc); eval(rriSrc); eval(crsSrc); eval(rrfSrc); eval(mrsSrc); eval(mpdSrc); eval(ptrSrc); eval(xpSrc2); eval(rxpSrc);
{ const m = mergeProgressData(
    { completed:[1,2], completedAt:{1:"2026-10-20",2:"2026-10-19"}, reviewCorrect:3, reviewIds:[7] },
    { completed:{2:"2026-10-21",3:null}, review_correct:{ ids:[8], count:2 } });
  ok(m.completed.join(",") === "1,2,3", "병합: 완료는 합집합 (로컬 1·2 + 서버 3)");
  ok(m.completedAt[1] === "2026-10-20" && m.completedAt[2] === "2026-10-19", "병합: 날짜는 더 이른 쪽 유지 (서버의 늦은 날짜로 덮지 않음)");
  ok(!("3" in m.completedAt), "병합: 서버 날짜가 null이면 completedAt에 날짜를 만들지 않음");
  ok(m.reviewIds.join(",") === "7,8", "병합: reviewIds 합집합");
  ok(m.reviewCorrect === 3, "병합: reviewCorrect는 max(로컬 3, 서버 count 2, 합집합 길이 2) = 3"); }
{ const m = mergeProgressData(
    { completed:[5], completedAt:{}, reviewCorrect:0, reviewIds:[] },
    { completed:{5:"2026-10-18"}, review_correct:{ ids:[], count:0 } });
  ok(m.completedAt[5] === "2026-10-18", "병합: 로컬 날짜가 없으면 서버 날짜를 채택");
  const m2 = mergeProgressData({ completed:[1], completedAt:{1:"2026-10-20"}, reviewCorrect:1, reviewIds:[2] }, null);
  ok(m2.completed.join(",") === "1" && m2.reviewCorrect === 1 && m2.reviewIds.join(",") === "2", "병합: 서버 기록이 없으면(null) 로컬 그대로");
  const m3 = mergeProgressData({ completed:[], completedAt:{}, reviewCorrect:0, reviewIds:[] },
    { completed:{}, review_correct:[4,9] });
  ok(m3.reviewIds.join(",") === "4,9" && m3.reviewCorrect === 2, "병합: 레거시 배열형 review_correct는 id 목록이자 개수로 간주");
  const rt = progressToRemote({ completed:[1,2], completedAt:{1:"2026-10-20"}, reviewCorrect:4, reviewIds:[3] });
  ok(Object.keys(rt.completed).join(",") === "1,2" && rt.completed[1] === "2026-10-20" && rt.completed[2] === null, "업로드 모양: completed는 {id: 날짜|null} 객체");
  ok(rt.review_correct.count === 4 && rt.review_correct.ids.join(",") === "3", "업로드 모양: review_correct는 {ids, count} 객체");
  ok(remoteXpOf({ completed:{1:null,2:null,3:null}, review_correct:{ ids:[], count:2 } }) === 40, "참여자 XP: 완료 3개×10 + 복습 count 2×5 = 40");
  ok(remoteXpOf({ completed:{1:null}, review_correct:[5,6] }) === 20, "참여자 XP: 레거시 배열은 길이로 계산 (10 + 2×5)");
  ok(remoteXpOf(null) === 0 && remoteXpOf({}) === 0, "참여자 XP: 기록이 없으면 0"); }

console.log("\n[버전·파일]");
const ver = html.match(/const APP_VERSION = "([^"]+)"/)[1];
ok(read("README.md").includes("v" + ver), "README 버전 일치 (v" + ver + ")");
ok(read("sw.js").includes("une-phrase-v" + ver), "sw 캐시 버전 일치");
ok(html.includes("v" + ver + " · © 2026 sidebatch"), "버전: 사용자에게 보이는 버전 표기는 푸터에만 있음 (v" + ver + ")");
ok(!html.includes('class="verpill"') && !html.includes("버전 " + ver), "버전: 헤더 버전 칩 제거됨");
ok(!html.includes('class="menuver"'), "버전: 메뉴 헤더 버전 표기 제거됨");
ok(fs.existsSync(path.join(ROOT, "manifest.webmanifest")), "manifest 있음");
ok(fs.existsSync(path.join(ROOT, "icons/icon-192.png")) && fs.existsSync(path.join(ROOT, "icons/icon-512.png")), "아이콘 있음");
const man = JSON.parse(read("manifest.webmanifest"));
ok(man.name.includes("One Phrase"), "manifest 이름 확인");
ok(html.includes('<script data-goatcounter="https://une-phrase.goatcounter.com/count"') && html.includes('async src="//gc.zgo.at/count.js"></script>'), "GoatCounter 카운트 스크립트 있음 (une-phrase)");
ok(html.includes('class="gcvisits" id="gcBadge" hidden'), "방문 카운트 요소 있음 (처음엔 숨김)");
ok(html.indexOf('id="gcBadge"') > html.indexOf("</header>") && html.indexOf('id="gcBadge"') > html.indexOf('id="tab-together"') && html.indexOf('id="gcBadge"') < html.indexOf('id="view-together"'), "방문 카운트 위치: 헤더가 아니라 Ensemble 화면 상단 (제목 아래)");
ok((html.match(/id="gcBadge"/g) || []).length === 1, "방문 카운트 요소는 하나만 있음");
ok(html.includes("fetch('https://une-phrase.goatcounter.com/counter/TOTAL.json')") && html.includes("'👥 지금까지 ' + Number(d.count).toLocaleString()") && html.includes("명이 다녀갔어요") && html.includes(".catch(function(){})"), "방문 카운트 fetch: une-phrase TOTAL.json(누적 방문 수)을 라벨과 함께 표시, 실패하면 줄이 숨은 채로 남음");
ok(!html.includes("'👥 ' + d.count"), "방문 카운트 표기: 숫자만 있던 기존 표기는 라벨 포함으로 교체됨");
ok(html.includes('property="og:image" content="https://sidebatch.github.io/one-phrase/og-image.png"'), "og:image 절대 URL 있음");
ok(html.includes('property="og:image:width" content="1200"') && html.includes('property="og:image:height" content="630"'), "og:image 크기 메타 있음");
ok(html.includes('property="og:type" content="website"') && html.includes('name="twitter:card" content="summary_large_image"') && html.includes('name="twitter:image" content="https://sidebatch.github.io/one-phrase/og-image.png"'), "og:type·Twitter Card 메타 있음");
const ogPngPath = path.join(ROOT, "og-image.png");
ok(fs.existsSync(ogPngPath), "og-image.png 있음");
if (fs.existsSync(ogPngPath)) {
  const ogBuf = fs.readFileSync(ogPngPath);
  ok(ogBuf.readUInt32BE(16) === 1200 && ogBuf.readUInt32BE(20) === 630, "og-image.png 실제 크기 1200×630");
}

console.log("\n[개명 (v1.31.0) · 아이콘 워드마크 복원 (v1.31.1) · 표기 교체 (v1.31.2)]");
ok(html.includes('<span class="wordmark" id="wordmarkEl">ONE PHRASE</span>'), "워드마크: 헤더 기본 표기는 ONE PHRASE (언어별로 동적 교체)");
ok(html.includes("UNE PHRASE") && html.includes("Une Phrase"), "다언어: 프랑스어 워드마크(UNE PHRASE)·앱 이름(Une Phrase)은 LANGS 표기로 존재");
ok(!html.includes("<title>Une Phrase"), "개명: <title>의 정적 표기는 One Phrase 유지 (언어별 이름은 화면 표기만 동적 교체)");
ok(html.includes("<title>One Phrase — 한 문장 외국어 | 켜자마자 한 문장</title>"), "개명: <title>이 새 이름 (TEF Canada 표기 없음)");
ok(html.includes('property="og:title" content="One Phrase — 한 문장 외국어"'), "개명: og:title이 새 이름");
ok(html.includes('property="og:url" content="https://sidebatch.github.io/one-phrase/"'), "개명: og:url이 새 주소");
ok(html.includes('const SHARE_URL = "https://sidebatch.github.io/one-phrase/";'), "개명: 공유 주소가 새 주소");
ok(man.name === "One Phrase — 한 문장 외국어" && man.short_name === "One Phrase", "manifest: name·short_name이 새 이름");
ok(html.includes('class="logo" id="logoTile" aria-hidden="true">O</span>') && html.includes('class="footlogo" id="footTile" aria-hidden="true">O</span>'), "로고: 헤더·푸터 로고 타일 기본값은 글자 O (언어별로 동적 교체)");
const iconSvg = read("icons/icon.svg");
ok(iconSvg.includes('fill="#1C3A71"') && iconSvg.includes('fill="#FFFFFF"') && iconSvg.includes(">One</text>") && iconSvg.includes('fill="#FFD166"') && iconSvg.includes(">PHRASE</text>"), "아이콘 소스 SVG: 파랑 배경·흰 'One'·금색 'PHRASE' 워드마크");
function pngPixel(buf, x, y) {
  const zlib = require("zlib");
  let pos = 8, w = 0, h = 0, colorType = 2; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString("ascii", pos + 4, pos + 8);
    if (type === "IHDR") { w = buf.readUInt32BE(pos + 8); h = buf.readUInt32BE(pos + 12); colorType = buf[pos + 17]; }
    if (type === "IDAT") idat.push(buf.subarray(pos + 8, pos + 8 + len));
    if (type === "IEND") break;
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = colorType === 6 ? 4 : 3, stride = w * bpp, out = Buffer.alloc(h * stride);
  for (let row = 0; row < h; row++) {
    const f = raw[row * (stride + 1)], src = raw.subarray(row * (stride + 1) + 1, (row + 1) * (stride + 1)), dst = out.subarray(row * stride, (row + 1) * stride), prev = row ? out.subarray((row - 1) * stride, row * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? dst[i - bpp] : 0, b = prev ? prev[i] : 0, c = i >= bpp && prev ? prev[i - bpp] : 0;
      let v = src[i];
      if (f === 1) v = (v + a) & 255; else if (f === 2) v = (v + b) & 255; else if (f === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255; }
      dst[i] = v;
    }
  }
  const off = (y * w + x) * bpp;
  return [out[off], out[off + 1], out[off + 2]];
}
for (const [f, w, h] of [["icons/icon-192.png",192,192],["icons/icon-512.png",512,512],["icons/apple-touch-icon.png",180,180],["icons/maskable-512.png",512,512]]) {
  const fp = path.join(ROOT, f);
  ok(fs.existsSync(fp), "아이콘 파일 있음: " + f);
  if (fs.existsSync(fp)) {
    const b = fs.readFileSync(fp);
    ok(b.readUInt32BE(16) === w && b.readUInt32BE(20) === h, "아이콘 실제 크기 " + w + "×" + h + ": " + f);
    const corner = pngPixel(b, 0, 0), cornerR = pngPixel(b, w - 1, 0);
    ok(corner[0] === 28 && corner[1] === 58 && corner[2] === 113 && cornerR[0] === 28 && cornerR[1] === 58 && cornerR[2] === 113, "아이콘 모서리 픽셀 = 배경 파랑 #1C3A71: " + f);
  }
}

console.log("\n[테마 3종 (v1.28.0)]");
const dpSrc = html.match(/function defaultProgress\(\)[^\n]*/)[0];
eval(html.match(/function defaultLangProgress\(\)[^\n]*/)[0] + "\n" + dpSrc);
{ const dp = defaultProgress(); ok(dp.theme === "light", "테마: 진행 기록 기본값은 라이트"); }
ok(html.indexOf('localStorage.getItem("une-phrase-progress-v1")') > -1 && html.indexOf('localStorage.getItem("une-phrase-progress-v1")') < html.indexOf("<style>"), "테마: head 이른 스크립트가 저장된 테마를 스타일보다 먼저 읽음 (깜빡임 방지)");
ok(html.includes("document.documentElement.dataset.theme = t") && html.indexOf("dataset.theme") < html.indexOf("<style>"), "테마: 부팅 스크립트가 첫 페인트 전에 data-theme 세팅");
ok(html.includes('data-theme-opt="light"') && html.includes('data-theme-opt="black"') && html.includes('data-theme-opt="paper"'), "테마: 더보기 탭에 라이트·블랙·페이퍼 선택 3종 있음");
ok(html.includes('class="themesw sw-light"') && html.includes('class="themesw sw-black"') && html.includes('class="themesw sw-paper"'), "테마: 각 옵션에 실제 색 견본 칩 있음");
ok(html.includes("<summary>테마</summary>"), "테마: 더보기 탭 테마 구역 있음");
ok(html.includes("--dim:") && html.includes(".menubackdrop{position:absolute;inset:0;background:var(--dim)}") && html.includes(".modalbackdrop{position:absolute;inset:0;background:var(--dim)}"), "테마 검수: 메뉴·모달 딤 오버레이는 --dim 변수 사용");
ok(html.includes("box-shadow:var(--sheet-shadow)") && html.includes("box-shadow:var(--focus-shadow)") && html.includes("box-shadow:var(--accent-shadow)") && html.includes("var(--diff-under)") && html.includes("linear-gradient(90deg,var(--gold),var(--gold2))"), "테마 검수: 시트 그림자·입력 포커스·완료 서클·diff 밑줄·금색 그라데이션이 하드코딩 없이 변수 사용");
ok(html.includes('html[data-theme="paper"] .t-study') && html.includes('html[data-theme="paper"] .t-together') && html.includes('html[data-theme="paper"] .t-about'), "테마 검수: 페이퍼에서도 메뉴 타일 색을 전용 파스텔로 재정의");
const blackBlock = (html.match(/html\[data-theme="black"\]\{[\s\S]*?\n\}/) || [""])[0];
const paperBlock = (html.match(/html\[data-theme="paper"\]\{[\s\S]*?\n\}/) || [""])[0];
ok(blackBlock.includes("--bg:#050607") && blackBlock.includes("--card:#14171c") && blackBlock.includes("--ink:#eef1f4") && blackBlock.includes("--sub:#9aa3ad"), "테마: 블랙 변수 블록 (배경 #050607·카드 #14171c·글자 #eef1f4·보조 #9aa3ad)");
ok(paperBlock.includes("--bg:#f6efe3") && paperBlock.includes("--card:#fffaf0") && paperBlock.includes("--ink:#33302a") && paperBlock.includes("--line:#e3d9c6"), "테마: 페이퍼 변수 블록 (배경 #f6efe3·카드 #fffaf0·글자 #33302a·경계 #e3d9c6)");
ok(blackBlock.includes("--dim:rgba(0,0,0,.65)") && blackBlock.includes("--focus-shadow:") && blackBlock.includes("--gold2:") && blackBlock.includes("--diff-under:") && blackBlock.includes("--sheet-shadow:"), "테마 검수: 블랙 블록에서 딤·시트 그림자·포커스 링·diff 밑줄·금색 끝 색을 어두운 테마용으로 재정의");
ok(html.includes('html[data-theme="black"] .t-study'), "테마: 블랙에서 메뉴 타일 어두운 변형 있음");
const rootBlock = (html.match(/:root\{[\s\S]*?\n\}/) || [""])[0];
ok(rootBlock.includes("--bg:#fffdf8") && rootBlock.includes("--card:#fff;") || rootBlock.includes("--bg:#fffdf8"), "테마: 라이트(:root) 기본값은 기존 색 그대로");
const themeOfSrc = html.match(/function themeOf\(\)\{[\s\S]*?\n\}/)[0];
const applySrc = html.match(/function applyTheme\(name, save\)\{[\s\S]*?\n\}/)[0];
const renderOptsSrc = html.match(/function renderThemeOpts\(\)\{[\s\S]*?\n\}/)[0];
{
  const savedThemes = [];
  const fakeMeta = { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };
  const fakeDoc = {
    documentElement: { dataset: {} },
    querySelector(sel) { return sel.indexOf("theme-color") > -1 ? fakeMeta : null; },
    querySelectorAll() { return []; }
  };
  let progress = { theme: "light" };
  const saveProgress = () => savedThemes.push(progress.theme);
  const api = new Function("document", "progress", "saveProgress",
    "function renderProfileBtn(){}\nconst THEME_META_COLORS = { light:'#1C3A71', black:'#050607', paper:'#F6EFE3' };\n" + themeOfSrc + "\n" + renderOptsSrc + "\n" + applySrc + "\nreturn { themeOf, applyTheme };")(fakeDoc, progress, saveProgress);
  ok(api.themeOf() === "light", "테마: themeOf 기본 라이트");
  api.applyTheme("black", true);
  ok(fakeDoc.documentElement.dataset.theme === "black" && progress.theme === "black" && savedThemes.join() === "black", "테마: applyTheme(블랙) → data-theme 세팅 + 진행 기록에 저장");
  ok(fakeMeta.attrs.content === "#050607", "테마: 블랙에서 theme-color 메타 갱신");
  api.applyTheme("paper", false);
  ok(fakeDoc.documentElement.dataset.theme === "paper" && fakeMeta.attrs.content === "#F6EFE3", "테마: applyTheme(페이퍼) → data-theme·메타 갱신");
  api.applyTheme("light", false);
  ok(!("theme" in fakeDoc.documentElement.dataset) && fakeMeta.attrs.content === "#1C3A71", "테마: 라이트로 돌리면 data-theme 제거, 메타는 기본 파랑");
  progress = { theme: "neon" };
  const api2 = new Function("document", "progress", "saveProgress",
    "const THEME_META_COLORS = { light:'#1C3A71', black:'#050607', paper:'#F6EFE3' };\n" + themeOfSrc + "\nreturn { themeOf };")(fakeDoc, progress, saveProgress);
  ok(api2.themeOf() === "light", "테마: 알 수 없는 테마 값은 라이트로 취급");
}
ok(/\.themelabel\{[^}]*white-space:\s*nowrap/.test(html), "테마: 이름 라벨이 가로 한 줄로 표시됨 (nowrap)");
ok(/\.themeopt\{[^}]*min-width:\s*132px/.test(html), "테마: 카드 최소 폭 132px으로 한 줄 라벨이 들어갈 폭 보장");
const ptrSrcT = html.match(/function progressToRemote\(p\)\{[\s\S]*?\n\}/)[0];
eval(ptrSrcT);
{
  const payload = progressToRemote({ completed: [1, 2], completedAt: { 1: "2026-10-22" }, reviewIds: [1], reviewCorrect: 3, theme: "black", index: 5, sound: false });
  ok(!("theme" in payload) && JSON.stringify(payload).indexOf("theme") === -1, "테마: Supabase 동기화 페이로드에 theme 미포함 (기기별 설정)");
  ok(Object.keys(payload).sort().join(",") === "completed,review_correct", "테마: 동기화 페이로드는 완료·복습 두 필드만");
}

console.log("\n[레벨 메달·내 정보·더보기 개편 (v1.29.0)]");
const pencilArtSrc = html.match(/function penPencilArt\([\s\S]*?\n\}/)[0];
const fountainArtSrc = html.match(/function penFountainArt\([\s\S]*?\n\}/)[0];
const iconArtSrc = html.match(/const LEVEL_ICON_ART = \[[\s\S]*?\n\];/)[0];
const iconFnSrc = html.match(/function levelIcon\(lv, size\)\{[\s\S]*?\n\}/)[0];
const iconSrc = pencilArtSrc + "\n" + fountainArtSrc + "\n" + iconArtSrc + "\n" + iconFnSrc;
eval(pencilArtSrc + "\n" + fountainArtSrc);
const LEVEL_ICON_ART_EVAL = eval(iconArtSrc.match(/\[[\s\S]*\]/)[0]);
eval(iconSrc);
ok(LEVEL_ICON_ART_EVAL.length === 10, "펜 아이콘: 레벨 1~10 아이콘이 10개 있음");
ok(LEVEL_ICON_ART_EVAL[0].includes("#f2c14e") && LEVEL_ICON_ART_EVAL[1].includes("#f5b921") && LEVEL_ICON_ART_EVAL[2].includes("#4a4f57") && LEVEL_ICON_ART_EVAL[3].includes("#2f6bd8") && LEVEL_ICON_ART_EVAL[4].includes("#dde3ea"), "펜 아이콘: 1~5단계가 몽당연필·연필·샤프펜슬·볼펜·메탈 볼펜 순서");
ok(LEVEL_ICON_ART_EVAL[5].includes("#23262b") && LEVEL_ICON_ART_EVAL[5].includes("#cfd6de") && LEVEL_ICON_ART_EVAL[6].includes("#eec25e") && LEVEL_ICON_ART_EVAL[7].includes("#1e4fa3") && LEVEL_ICON_ART_EVAL[7].includes("#7db4ff") && LEVEL_ICON_ART_EVAL[8].includes("#f4fbff") && LEVEL_ICON_ART_EVAL[8].includes("#6db3f2") && LEVEL_ICON_ART_EVAL[9].includes('stroke="#eec25e"') && LEVEL_ICON_ART_EVAL[9].includes("#232d38"), "펜 아이콘: 6~10단계가 실버·골드·사파이어·다이아 만년필과 깃털펜 순서");
ok(levelIcon(1).includes("<svg") && levelIcon(1).includes('data-lv="1"') && levelIcon(10, 64).includes('width="64"') && levelIcon(10, 64).includes('data-lv="10"'), "펜 아이콘: levelIcon이 단계·크기에 맞는 인라인 SVG를 돌려줌");
ok(!levelIcon(1).includes("#fdf6e9") && !levelIcon(5).includes('r="48"') && !levelIcon(9).includes("#e7d9b8") && levelIcon(1).includes("scale(1.34)") && levelIcon(9).includes("scale(1)") && levelIcon(10).includes("scale(1.08)"), "펜 아이콘: 크림 원판 제거 + 단계별 확대로 프레임을 채워 표시");
const fxCount = (lv, cls) => (levelIcon(lv).match(new RegExp(cls, "g")) || []).length;
ok(!levelIcon(1).includes("lvfx") && !levelIcon(2).includes("lvfx") && !levelIcon(3).includes("lvfx"), "빛 효과: Lv.1~3은 효과 없이 깨끗한 시작");
ok(fxCount(4, "lvfx-spk") === 1 && !levelIcon(4).includes("lvfx-glow") && fxCount(5, "lvfx-spk") === 1 && !levelIcon(5).includes("lvfx-glow"), "빛 효과: Lv.4~5는 금색 반짝이 1개만");
ok(levelIcon(6).includes("lvfx-glow") && fxCount(6, "lvfx-spk") === 1 && levelIcon(7).includes("lvfx-glow") && fxCount(7, "lvfx-spk") === 1 && !levelIcon(7).includes("lvfx-ring"), "빛 효과: Lv.6~7은 후광 + 반짝이 1개 (링 없음)");
ok(levelIcon(8).includes("lvfx-glow") && fxCount(8, "lvfx-spk") === 2 && !levelIcon(8).includes("lvfx-ring"), "빛 효과: Lv.8은 후광 + 반짝이 2개 (링 없음)");
ok(levelIcon(9).includes("lvfx-glow") && levelIcon(9).includes("lvfx-ring") && fxCount(9, "lvfx-spk") === 3 && !levelIcon(9).includes("lvfx-ray"), "빛 효과: Lv.9는 후광 + 빛 링 + 반짝이 3개 (빛줄기 없음)");
ok(levelIcon(10).includes("lvfx-glow") && levelIcon(10).includes("lvfx-ring") && fxCount(10, "lvfx-ray") === 8 && fxCount(10, "lvfx-spk") === 3, "빛 효과: Lv.10은 후광 + 빛 링 + 빛줄기 8방향 + 반짝이 3개로 가장 화려함");
ok([3,5,7,8,9].every(lv => fxCount(lv, "lvfx") < fxCount(lv+1, "lvfx")) && [1,2,3,4,5,6,7,8,9].every(lv => fxCount(lv, "lvfx") <= fxCount(lv+1, "lvfx")), "빛 효과: 효과 요소 수가 줄지 않고 구간마다 늘어남 (농도·크기 증가 포함 단조 증가)");
ok(!html.includes("LEVEL_MEDALS") && !html.includes("medalOf"), "펜 아이콘: 기존 이모지 메달 체계(LEVEL_MEDALS·medalOf)가 제거됨");
ok(lvArrSrc.includes('title:"몽당연필"') && lvArrSrc.includes('title:"실버 만년필"') && lvArrSrc.includes('title:"골드 만년필"') && lvArrSrc.includes('title:"다이아 만년필"') && lvArrSrc.includes('title:"깃털펜"'), "펜 아이콘: 레벨 이름이 펜 사다리(몽당연필→깃털펜)로 교체됨");
ok(rtmSrc.includes("levelIcon(lv.lv") && rtmSrc.includes("pl.icon"), "펜 아이콘: Ensemble 참여자 카드의 Lv 배지와 언어별 칩에 펜 아이콘 표시");
ok(html.includes('id="profileBtn"') && html.indexOf('id="profileBtn"') > html.indexOf('class="brandrow"') && html.indexOf('id="profileBtn"') < html.indexOf('id="menuBtn"'), "내 정보: 헤더 아바타 버튼이 메뉴 버튼 왼쪽에 있음");
ok(html.includes('id="profileOverlay" hidden') && html.includes('id="profileBackdrop"') && html.includes('id="profileCloseBtn"') && html.includes('aria-label="내 정보"'), "내 정보: 바텀시트 모달(배경·닫기 ✕)이 전역에 있고 처음에는 숨겨져 있음");
ok(html.includes('getElementById("profileBtn").onclick') && html.includes("function openProfile()") && html.includes("renderProfile();"), "내 정보: 버튼을 누르면 모달이 열리고 열 때마다 최신 데이터로 렌더");
const rpSrc = html.match(/function renderProfile\(\)\{[\s\S]*?\n\}/)[0];
ok(rpSrc.includes("levelIcon(lv.lv") && rpSrc.includes("profilemedal") && rpSrc.includes("다음 레벨까지") && rpSrc.includes("복습 맞힘"), "내 정보: 펜 아이콘 크게 + 다음 레벨까지 진행 바 + 복습 맞힘 수 표시");
ok(rpSrc.includes("게스트") && rpSrc.includes('id="profileLoginBtn"') && rpSrc.includes("구글로 시작하기") && rpSrc.includes("sbLogin()"), "내 정보: 비로그인이면 게스트로 로컬 통계를 보여주고, 그 자리에서 구글로 시작하기(지연 로드+OAuth) 실행");
ok(rpSrc.includes("sbUser.email") && rpSrc.includes("profileemail") && rpSrc.includes('id="profileLogoutBtn"') && rpSrc.includes("로그아웃"), "내 정보: 로그인 상태면 마스킹된 이메일과 로그아웃 버튼 표시");
ok(html.includes("function renderProfileBtn()") && html.includes("renderProfileBtn();"), "내 정보: 로그인·닉네임 상태가 바뀌면 헤더 아바타(닉네임 첫 글자/👤)도 갱신됨");
ok(html.includes('<span class="menulabel">더보기</span>') && !html.includes('<span class="menulabel">설명</span>'), "더보기: 메뉴 라벨이 '설명'에서 '더보기'로 교체됨");
ok(!html.includes("이 문장들이 TEF Canada와 어떻게 연결되나요") && html.includes("특정 시험 전용이 아니라, 일상에서 바로 쓰는 외국어 문장을 익히는 앱이에요"), "더보기: TEF 연결 섹션은 삭제되고 일상 프랑스어 앱이라는 한 줄로 교체");
ok(html.includes("기록은 이 기기에 저장되고, 로그인하면 서버에도 보관돼 기기를 바꿔도 이어서 공부할 수 있어요") && !html.includes("그 경우를 막을 완전한 방법은 아직 없습니다"), "더보기: 기록 보관 설명이 기기 저장 + 로그인 시 서버 보관으로 짧게 현행화");
ok(html.includes('<summary id="ensembleAboutTitle">Ensemble</summary>') && html.includes("서로의 레벨과 완료 문장을 볼 수 있어요"), "더보기: Ensemble 안내 한 줄이 있음");
ok(html.includes("<summary>어떻게 쓰나요</summary>") && html.includes("한 문장을 3단계로 외우는 앱이에요"), "더보기: 사용법이 3단계 한 줄로 단축됨");

console.log("\n[듣기 개선·이메일 가리기·레벨 곡선·SVG 아이콘 (v1.30.0)]");
const maskSrc = html.match(/function maskEmail\(email\)\{[\s\S]*?\n\}/)[0];
eval(maskSrc);
ok(maskEmail("going123@gmail.com") === "go***@gmail.com", "이메일 가리기: 아이디 앞 2글자만 남기고 마스킹 (go***@gmail.com)");
ok(maskEmail("ab@example.com") === "a***@example.com" && maskEmail("a@example.com") === "a***@example.com", "이메일 가리기: 짧은 아이디는 1글자만 남김");
ok(maskEmail("") === "" && maskEmail("no-at-sign") === "no-at-sign", "이메일 가리기: 이메일 형식이 아니면 그대로 반환");
ok(rpSrc.includes("maskEmail(sbUser.email)") && rpSrc.includes('id="profileEmail"') && rpSrc.includes('id="profileEmailTxt"') && rpSrc.includes("탭하면 보이기") && rpSrc.includes("탭하면 가리기"), "내 정보: 이메일은 마스킹이 기본값, 탭하면 전체 표시/다시 가리기 토글 + 힌트 문구");
ok(html.includes('getElementById("lvLabel").innerHTML = levelIcon(lv.lv, 26)+'), "첫 화면: 공부하기 레벨 표시줄에 현재 레벨 펜 아이콘 함께 표시");
ok(html.includes("button.ghost.playing") && html.includes(".worditem.playing"), "재생 표시: 재생 중 버튼 스타일(.playing)이 듣기 버튼과 단어 버튼에 정의됨");
ok(rsSrc2.includes("clearSpeakingUI();") && stSrc2.includes("clearSpeakingUI();"), "재생 표시: 단계·화면이 바뀌면 재생 중 표시 해제");
ok(["t-study","t-browse","t-words","t-together","t-about"].every(c=>html.includes('menutile '+c+'" aria-hidden="true"><svg')), "아이콘: 메뉴 타일 5종이 모두 인라인 SVG로 교체됨");
ok(!html.includes("📖") && !html.includes("🗂️") && !html.includes("🔤") && !html.includes("ℹ️"), "아이콘: 메뉴 타일의 기존 이모지 제거됨");
ok(html.includes("const SPEAKER_SVG") && html.includes("const SPEAKER_SLOW_SVG") && !html.includes("🔊") && !html.includes("🐢"), "아이콘: 듣기·느리게 듣기 버튼이 스피커 SVG로 교체됨 (파형 수·0.7 표기로 구분)");
ok(html.includes("const PERSON_SVG") && html.includes("const PEOPLE_SVG") && !html.includes("👤"), "아이콘: 게스트 아바타·Ensemble 히어로가 사람 실루엣 SVG로 교체됨");
ok(html.includes("PERSON_SVG") && html.match(/function renderProfileBtn\(\)\{[\s\S]*?\n\}/)[0].includes("PERSON_SVG"), "아이콘: 헤더 아바타 버튼의 게스트 표시도 PERSON_SVG 사용");


console.log("\n[다언어 콘텐츠·표기 (v1.32.0)]");
const ITEMS_EN_REAL = JSON.parse(html.match(/const ITEMS_EN = (\[[\s\S]*?\n\]);/)[1]);
const ITEMS_ES_REAL = JSON.parse(html.match(/const ITEMS_ES = (\[[\s\S]*?\n\]);/)[1]);
const FR_TOPICS = [...new Set(ITEMS.map(i => i.topic))];
for (const [arr, code, levels] of [[ITEMS_EN_REAL, "en", ["A1", "A2", "B1", "B2"]], [ITEMS_ES_REAL, "es", ["A1", "A2", "B1"]]]) {
  ok(arr.length === 30, "다언어 콘텐츠: " + code + " 문장 30개 (기존 10 + A1~A2 신규 20, 실제 " + arr.length + ")");
  ok(new Set(arr.map(i => i.id)).size === arr.length && arr.every(i => i.id.startsWith(code + "-")), "다언어 콘텐츠: " + code + " id가 " + code + "- 접두·중복 없음");
  ok(arr.every(i => i.lang === code && i.text && i.text.trim() && i.ko && i.ko.trim()), "다언어 콘텐츠: " + code + " lang·문장·한국어 뜻 완비");
  ok(arr.every(i => Array.isArray(i.chunks) && i.chunks.length >= 2 && i.chunks.length <= 4 && i.chunks.every(c => c[0] && c[1])), "다언어 콘텐츠: " + code + " 덩어리 2~4개, 내용 있음");
  ok(arr.every(i => i.pattern && i.pattern.length >= 10), "다언어 콘텐츠: " + code + " 패턴 한 줄 있음");
  ok(arr.every(i => Array.isArray(i.words) && i.words.length === 2 && i.words.every(w => w[0] && w[1])), "다언어 콘텐츠: " + code + " 핵심 단어 정확히 2개씩");
  ok(arr.every(i => FR_TOPICS.includes(i.topic) && levels.includes(i.level)), "다언어 콘텐츠: " + code + " 주제는 기존 체계, 레벨은 " + levels.join("/") + " 범위");
}
{ const distE = lv => ITEMS_EN_REAL.filter(i => i.level === lv).length;
  const distS = lv => ITEMS_ES_REAL.filter(i => i.level === lv).length;
  ok(distE("A1") === 10 && distE("A2") === 10 && distE("B1") === 6 && distE("B2") === 4, "영어 레벨 분포: A1 10 · A2 10 · B1 6 · B2 4");
  ok(distS("A1") === 10 && distS("A2") === 14 && distS("B1") === 6, "스페인어 레벨 분포: A1 10 · A2 14 · B1 6");
  ok(ITEMS_EN_REAL.slice(10).every(i => i.level === "A1" || i.level === "A2") && ITEMS_ES_REAL.slice(10).every(i => i.level === "A1" || i.level === "A2"), "신규 20개씩은 전부 A1~A2 (en-11~30, es-11~30)"); }
{ const enText = ITEMS_EN_REAL.map(i => i.text.toLowerCase()).join(" ");
  ok(["because of", "even though", "used to", "about to", "ended up", "turns out", "would rather", "as long as", "no choice but to"].every(p => enText.includes(p)), "다언어 콘텐츠: 영어 10문장에 핵심 패턴이 실제로 들어 있음"); }
{ const esText = ITEMS_ES_REAL.map(i => i.text.toLowerCase()).join(" ");
  ok(["tengo que", "voy a", "me gustaría", "porque", "aunque", "estoy estudiando", "hace dos años", "quiero", "por la mañana"].every(p => esText.includes(p)), "다언어 콘텐츠: 스페인어 10문장에 핵심 패턴이 실제로 들어 있음"); }
const langsSrcEq = html.match(/const LANGS = \{[\s\S]*?\n\};/)[0];
eval(langsSrcEq + "\n" + [
  'ok(LANGS.fr.appName === "Une Phrase" && LANGS.fr.wordmark === "UNE PHRASE" && LANGS.fr.tile === "U" && LANGS.fr.ensemble === "Ensemble" && LANGS.fr.speech === "fr-FR" && LANGS.fr.prefix === "fr", "LANGS 표기: fr = Une Phrase / UNE PHRASE / Ensemble / fr-FR");',
  'ok(LANGS.en.appName === "One Phrase" && LANGS.en.wordmark === "ONE PHRASE" && LANGS.en.tile === "O" && LANGS.en.ensemble === "Together" && LANGS.en.speech === "en-US" && LANGS.en.prefix === "en", "LANGS 표기: en = One Phrase / ONE PHRASE / Together / en-US");',
  'ok(LANGS.es.appName === "Una Frase" && LANGS.es.wordmark === "UNA FRASE" && LANGS.es.tile === "U" && LANGS.es.ensemble === "Juntos" && LANGS.es.speech === "es-ES" && LANGS.es.prefix === "es", "LANGS 표기: es = Una Frase / UNA FRASE / Juntos / es-ES");'
].join("\n"));
ok(html.includes('data-lang="fr"') && html.includes('data-lang="en"') && html.includes('data-lang="es"'), "언어 선택: 메뉴 세그먼트에 프랑스어·영어·스페인어 3개");
ok(html.indexOf('class="langseg"') > html.indexOf('id="menuOverlay"') && html.indexOf('class="langseg"') < html.indexOf('data-menu="study"'), "언어 선택: 세그먼트가 메뉴 목적지 행들보다 위에 있음");
ok(html.includes("function setLang(code)") && html.includes("function applyLangLabels()"), "언어 전환: setLang·applyLangLabels 함수 있음");
ok(!html.includes("도움되는 영역") && ITEMS.every(i => i.tef), "도움 영역: 화면 표기는 전부 숨김, 문장 데이터의 tef 필드는 그대로 유지");

console.log("\n[다언어 마이그레이션·진도 분리]");
const migSrcEq = html.match(/function migrateProgress\(raw\)\{[\s\S]*?\n\}/)[0];
const dlpSrcEq = html.match(/function defaultLangProgress\(\)[^\n]*/)[0];
const dpSrcEq = html.match(/function defaultProgress\(\)[^\n]*/)[0];
eval(dlpSrcEq); eval(dpSrcEq); eval(html.match(/const LANG_CODES = [^\n]*/)[0] + "\n" + migSrcEq);
{ const m = migrateProgress({ index: 12, completed: [1, 2, 3], doneDates: ["2026-10-20"], step: 2, reviewCorrect: 4, reviewIds: [7], completedAt: { 1: "2026-10-20" }, sound: false, theme: "black" });
  ok(m.lang === "fr" && m.byLang.fr.index === 12 && m.byLang.fr.completed.join(",") === "1,2,3" && m.byLang.fr.step === 2 && m.byLang.fr.reviewCorrect === 4, "마이그레이션: 구 flat 저장본이 프랑스어 버킷으로 그대로 이전됨");
  ok(m.byLang.en.completed.length === 0 && m.byLang.es.completed.length === 0, "마이그레이션: 영어·스페인어 버킷은 빈 상태로 시작");
  ok(m.sound === false && m.theme === "black", "마이그레이션: 기기 설정(효과음·테마)은 최상위에 유지");
  const m2 = migrateProgress({ lang: "es", byLang: { es: { completed: ["es-1"], index: 3 } }, sound: true, theme: "paper" });
  ok(m2.lang === "es" && m2.byLang.es.completed.join(",") === "es-1" && m2.byLang.es.index === 3 && m2.byLang.fr.completed.length === 0, "마이그레이션: 신 구조는 언어·버킷을 정규화해 유지");
  const m3 = migrateProgress(null);
  ok(m3.lang === "fr" && m3.byLang.fr.completed.length === 0 && m3.sound === true && m3.theme === "light", "마이그레이션: 저장본이 없으면 기본값 (프랑스어·빈 버킷)");
  const m4 = migrateProgress({ lang: "xx", byLang: {} });
  ok(m4.lang === "fr", "마이그레이션: 알 수 없는 언어 코드는 프랑스어로 되돌림"); }
{ const aNew = activityOf({ byLang: { fr: { completed: [1, 2], reviewCorrect: 0, index: 0 }, en: { completed: ["en-1"], reviewCorrect: 0, index: 0 } } });
  const aOld = activityOf({ completed: [1, 2], reviewCorrect: 0, index: 0 });
  ok(aNew === 300000 && aOld === 200000 && pickRestore({ completed: [1] }, { byLang: { fr: { completed: [1, 2, 3] } } }).byLang.fr.completed.length === 3, "보관함 판정: 신 구조는 전 언어 활동량 합산, 구·신 구조를 섞어 비교해도 많은 쪽 선택"); }
{ const m = mergeProgressData({ completed: ["en-1", "en-3"], completedAt: { "en-1": "2026-10-21" }, reviewCorrect: 1, reviewIds: ["en-2"] },
    { completed: { "en-2": "2026-10-20", "en-3": null }, review_correct: { ids: ["en-2"], count: 1 } });
  ok(m.completed.join(",") === "en-1,en-2,en-3", "병합: 문자열 id(en-*)도 합집합으로 병합됨");
  ok(m.reviewIds.join(",") === "en-2" && m.completedAt["en-2"] === "2026-10-20", "병합: 문자열 id의 복습 기록·날짜도 유지");
  const rt = progressToRemote({ completed: ["es-1", "es-2"], completedAt: { "es-1": "2026-10-21" }, reviewCorrect: 0, reviewIds: [] });
  ok(Object.keys(rt.completed).join(",") === "es-1,es-2", "업로드 모양: 문자열 id가 키로 그대로 나감"); }
ok(pickVoice([{ lang: "fr-FR", localService: true }, { lang: "en-US", localService: false }, { lang: "en-GB", localService: true }], "en").lang === "en-GB", "음성 선택: en 접두사로는 로컬 en 음성 우선");
ok(pickVoice([{ lang: "en-US", localService: true }, { lang: "es-ES", localService: true }], "es").lang === "es-ES", "음성 선택: es 접두사로는 es 음성 선택");

console.log("\n[기능 동등성 스모크: 영어·스페인어로 전 기능 완주]");
const EQ_ELS = {};
function makeEqEl(id) {
  const el = { id: id, value: "", style: {}, textContent: "", onclick: null, _html: "", _listeners: {},
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    setAttribute() {}, getAttribute() { return null; },
    addEventListener(t, f) { this._listeners[t] = f; },
    focus() {}, scrollIntoView() {} };
  Object.defineProperty(el, "innerHTML", {
    get() { return this._html; },
    set(v) { this._html = v; const re = /id="([^"]+)"/g; let m; while ((m = re.exec(v))) { if (!EQ_ELS[m[1]]) EQ_ELS[m[1]] = makeEqEl(m[1]); } }
  });
  return el;
}
const EQ_LANGBTNS = ["fr", "en", "es"].map(code => ({ _code: code, _on: false,
  getAttribute(k) { return k === "data-lang" ? this._code : null; },
  setAttribute() {},
  classList: { toggle(c, v) { if (c === "on") this._on = !!v; } } }));
const eqDocument = {
  getElementById(id) { if (!EQ_ELS[id]) EQ_ELS[id] = makeEqEl(id); return EQ_ELS[id]; },
  querySelectorAll(sel) { return sel === "[data-lang]" ? EQ_LANGBTNS : []; }
};
const eqUtterances = [];
const EQ_VOICES = [
  { lang: "fr-FR", localService: true },
  { lang: "en-US", localService: false },
  { lang: "en-GB", localService: true },
  { lang: "es-ES", localService: true }
];
const eqHelperSrc = [
  langsSrcEq,
  html.match(/const LANG_CODES = [^\n]*/)[0],
  'const ITEMS_EN = ' + JSON.stringify(ITEMS_EN_REAL) + ';',
  'const ITEMS_ES = ' + JSON.stringify(ITEMS_ES_REAL) + ';',
  html.match(/const ITEMS_BY_LANG = [^\n]*/)[0],
  dlpSrcEq, dpSrcEq, migSrcEq,
  html.match(/function curLang\(\)\{[^}]*\}/)[0],
  html.match(/function P\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function items\(\)\{[^}]*\}/)[0],
  html.match(/function levelFilter\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function topicFilter\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function topicOptions\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function studyItems\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function levelOptions\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function itemText\(it\)\{[^}]*\}/)[0]
].join("\n");
const eqPrelude = [
  'let progress = null;',
  'let currentStep = 1;',
  'let quizItem = null;',
  'let quizSeen = new Set();',
  'let quizMode = "free";',
  'let quizChallengeTotal = 0;',
  'let quizDueUniverse = [];',
  'let completionInFlight = false;',
  'let quizAnswered = false;',
  'let currentTab = "study";',
  'let menuOpen = false;',
  'let browseTopic = "전체";',
  'let voiceCache = EQ_VOICES;',
  'let speakBtn = null;',
  'let speakSafetyTimer = null;',
  'let speakWaitTimer = null;',
  'let speakSeq = 0;',
  'const document = eqDocument;',
  'function SpeechSynthesisUtterance(t){ this.text = t; this.lang = ""; this.rate = 1; this.voice = null; this.volume = 1; }',
  'const window = { scrollTo(){}, speechSynthesis: { speaking: false, pending: false, cancel(){}, resume(){}, getVoices(){ return EQ_VOICES; }, speak(u){ eqUtterances.push(u); } } };',
  'const requestAnimationFrame = fn => fn();',
  'function saveProgress(){}',
  'function renderVaultState(){}',
  'function playSound(){}',
  'function showTab(){}',
  'function renderTogether(){}'
].join("\n");
const eqFns = [
  escSrc, swSrc, dwSrc, normSrc, corrSrc, chSrc, whSrc,
  lvArrSrc, lvlSrc, xpSrc2, tsSrc, atsSrc, qpSrc,
  html.match(/const SPEAKER_SVG = [^\n]*/)[0],
  html.match(/const SPEAKER_SLOW_SVG = [^\n]*/)[0],
  html.match(/function slowListenBtnHtml\(\)[^\n]*/)[0],
  html.match(/function setStep\(n\)\{[^}]*\}/)[0],
  html.match(/function currentItem\(\)\{[^}]*\}/)[0],
  html.match(/function todayKey\(\)\{[^}]*\}/)[0],
  html.match(/function countToday\(p\)\{[^}]*\}/)[0],
  html.match(/function bindWordProg[\s\S]*?\n\}/)[0],
  html.match(/function soundEnabled\(\)[^\n]*/)[0],
  html.match(/const COMPLETE_MOTIFS = \{[\s\S]*?\n\};/)[0],
  html.match(/const COMPLETE_NOTE_GAP = [^\n]*/)[0],
  html.match(/const COMPLETE_NOTE_DUR = [^\n]*/)[0],
  html.match(/function playCompleteSound\(\)\{[\s\S]*?\n\}/)[0],
  SCHED_SRCS, MAPSTRIP_SRC,
  html.match(/function renderProgress\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function renderLevelChips\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function renderTopicTag\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function scopeLabel\(\)\{[\s\S]*?\n\}/)[0],
  rsSrc2, ctSrc, csSrc,
  html.match(/function renderQuizEntry\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function startQuiz[\s\S]*?\n\}/)[0],
  qwhSrc, qcandSrc, challengeSrcs,
  cqSrc,
  html.match(/function endQuiz\(\)\{[^}]*\}/)[0],
  html.match(/function renderTopicMap\(\)\{[\s\S]*?\n\}/)[0],
  rbSrc,
  html.match(/function renderWords\(\)\{[\s\S]*?\n\}/)[0],
  pickVoiceSrc, clearUiSrc, sfSrc,
  html.match(/function applyLangLabels\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function setLang\(code\)\{[\s\S]*?\n\}/)[0]
].join("\n");
function eqDriver(code, speech, voiceLang, wordmark, tagline, ensembleName) {
  return [
    'progress = defaultProgress(); progress.lang = "' + code + '"; currentStep = 1; quizItem = null;',
    'const B = progress.byLang["' + code + '"];',
    'applyLangLabels();',
    'ok(EQ_ELS["wordmarkEl"].textContent === "' + wordmark + '" && EQ_ELS["footKo"].textContent === "' + tagline + '" && EQ_ELS["ensembleMenuLabel"].textContent === "' + ensembleName + '" && EQ_ELS["ensembleViewTitle"].textContent === "' + ensembleName + '", "동등성 ' + code + ': 워드마크·태그라인·Ensemble 이름이 ' + code + ' 표기로 전환됨");',
    'eqUtterances.length = 0;',
    'speakFr(itemText(items()[0]), 1, null);',
    'ok(eqUtterances.length === 1 && eqUtterances[0].lang === "' + speech + '" && eqUtterances[0].voice && eqUtterances[0].voice.lang === "' + voiceLang + '", "동등성 ' + code + ': 듣기가 ' + speech + ' 발화 + 해당 언어 음성(' + voiceLang + ')으로 호출됨");',
    'speakFr(itemText(items()[0]), 0.7, null);',
    'ok(eqUtterances.length === 2 && eqUtterances[1].rate === 0.7 && eqUtterances[1].lang === "' + speech + '", "동등성 ' + code + ': 느리게 듣기도 ' + speech + '·0.7배속으로 호출됨");',
    'renderStudy();',
    'ok(EQ_ELS["studyCard"].innerHTML.includes(itemText(items()[0])) && EQ_ELS["studyCard"].innerHTML.includes(items()[0].ko), "동등성 ' + code + ': 1단계 읽어보기에 문장·뜻이 렌더됨");',
    'EQ_ELS["goStep2"].onclick();',
    'ok(currentStep === 2, "동등성 ' + code + ': 따라 쓰기 단계로 진행");',
    'EQ_ELS["typeInput"].value = itemText(items()[0]); checkTyping();',
    'ok(!!EQ_ELS["advanceBtn"], "동등성 ' + code + ': 따라 쓰기 정답 시 진행 버튼 표시");',
    'EQ_ELS["advanceBtn"].onclick();',
    'ok(currentStep === 3, "동등성 ' + code + ': 가리고 쓰기 단계로 진행");',
    'EQ_ELS["typeInput"].value = itemText(items()[0]); checkTyping();',
    'EQ_ELS["advanceBtn"].onclick();',
    'ok(B.completed.length === 1 && B.completed[0] === items()[0].id, "동등성 ' + code + ': 3단계 완주 시 완료 처리됨");',
    'ok(xpOf(B.completed.length, B.reviewCorrect) === 10 && EQ_ELS["doneBox"].innerHTML.includes("한 문장 완료"), "동등성 ' + code + ': 완료 XP +10 적립 + 완료 화면 표시");',
    'renderQuizEntry();',
    'ok(EQ_ELS["quizArea"].innerHTML.includes("오늘 복습 없음") && !EQ_ELS["quizArea"].innerHTML.includes("quizStartBtn"), "동등성 ' + code + ': 완료 1개·due는 내일이라 오늘은 시작 버튼 없이 곡선 상태 카드만 표시");',
    'B.completed = items().slice(0, 3).map(i => i.id); renderQuizEntry();',
    'ok(!!EQ_ELS["quizStartBtn"], "동등성 ' + code + ': 완료 3개에서 복습 퀴즈 진입 버튼 표시");',
    'startQuiz();',
    'ok(!!quizItem && items().indexOf(quizItem) > -1, "동등성 ' + code + ': 퀴즈가 활성 언어 문장에서 출제됨");',
    'EQ_ELS["quizInput"].value = itemText(quizItem); checkQuiz();',
    'ok(B.reviewCorrect === 1 && B.reviewIds.join(",") === String(quizItem.id) && xpOf(B.completed.length, B.reviewCorrect) === 35, "동등성 ' + code + ': 퀴즈 정답 채점 +5 XP, 맞힌 id가 버킷에 기록됨");',
    'renderBrowse();',
    'ok(EQ_ELS["browseList"].innerHTML.includes(itemText(items()[1])) && (EQ_ELS["browseList"].innerHTML.match(/class="li-meta"/g) || []).length === items().length, "동등성 ' + code + ': 주제별 목록이 활성 언어 문장 전체로 렌더됨");',
    'ok(EQ_ELS["topicMap"].innerHTML.includes(items()[0].topic), "동등성 ' + code + ': 정복 지도가 활성 언어 주제로 집계됨");',
    'renderWords();',
    'ok(EQ_ELS["wordsList"].innerHTML.includes(items()[0].words[0][0]) && EQ_ELS["wordsList"].innerHTML.includes(items()[0].words[0][1]), "동등성 ' + code + ': 단어 화면이 활성 언어 단어로 렌더됨");',
    'progress.byLang.fr.completed = [1, 2]; progress.byLang.fr.index = 5;',
    'setLang("fr");',
    'ok(curLang() === "fr" && P().completed.join(",") === "1,2" && P().index === 5, "동등성 ' + code + ': 프랑스어로 전환하면 기존 프랑스어 진도가 그대로 보임");',
    'setLang("' + code + '");',
    'ok(curLang() === "' + code + '" && B.completed.length === 3 && B.reviewCorrect === 1, "동등성 ' + code + ': 다시 돌아와도 ' + code + ' 진도가 그대로 보존됨");',
    'ok(progress.byLang.fr.completed.join(",") === "1,2", "동등성 ' + code + ': 왕복 전환 후에도 프랑스어 진도 무손상");'
  ].join("\n");
}
eval(eqPrelude + "\n" + eqHelperSrc + "\n" + eqFns + "\n" + eqDriver("en", "en-US", "en-GB", "ONE PHRASE", "한 문장 영어", "Together"));
eval(eqPrelude + "\n" + eqHelperSrc + "\n" + eqFns + "\n" + eqDriver("es", "es-ES", "es-ES", "UNA FRASE", "한 문장 스페인어", "Juntos"));

console.log("\n[기능 동등성: 언어별 동기화 페이로드]");
{ const captured = [];
  const sbStubEq = { from() { return { upsert(a, o) { captured.push({ a: a, o: o }); return Promise.resolve({ error: null }); } }; } };
  const payloadPrelude = [
    'let sb = sbStubEq;',
    'let sbUser = { id: "user-1" };',
    'let sbProfile = { nickname: "테스터" };',
    'let progress = null;'
  ].join("\n");
  const pushSrcEq = html.match(/async function pushSbProgress\(\)\{[\s\S]*?\n\}/)[0];
  eval(payloadPrelude + "\n" + eqHelperSrc + "\n" + ptrSrc + "\n" + pushSrcEq + "\n" + [
    'progress = defaultProgress(); progress.lang = "es";',
    'progress.byLang.es.completed = ["es-1", "es-2"]; progress.byLang.es.completedAt = { "es-1": "2026-10-21" };',
    'pushSbProgress();',
    'ok(captured.length === 1 && captured[0].a.lang === "es" && captured[0].a.user_id === "user-1", "동기화 페이로드: 활성 언어(es) 행으로 upsert됨");',
    'ok(Object.keys(captured[0].a.completed).join(",") === "es-1,es-2" && captured[0].o && captured[0].o.onConflict === "user_id,lang", "동기화 페이로드: 완료는 활성 언어 버킷 기준, onConflict는 user_id,lang");',
    'progress.lang = "en"; progress.byLang.en.completed = ["en-1"];',
    'pushSbProgress();',
    'ok(captured.length === 2 && captured[1].a.lang === "en" && Object.keys(captured[1].a.completed).join(",") === "en-1", "동기화 페이로드: 언어를 바꾸면 그 언어 행으로 나감");'
  ].join("\n"));
}

console.log("\n[레벨 분리: 언어마다 XP·레벨·메달이 독립]");
eval(eqHelperSrc + "\n" + xpSrc2 + "\n" + lvArrSrc + "\n" + lvlSrc + "\n" + [
  'let progress = defaultProgress();',
  'progress.byLang.fr.completed = [1, 2, 3];',
  'progress.byLang.en.completed = ["en-1", "en-2", "en-3", "en-4", "en-5", "en-6", "en-7", "en-8", "en-9"];',
  'progress.lang = "fr";',
  'const lvFr = levelOf(xpOf(P().completed.length, P().reviewCorrect || 0));',
  'progress.lang = "en";',
  'const lvEn = levelOf(xpOf(P().completed.length, P().reviewCorrect || 0));',
  'progress.lang = "es";',
  'const lvEs = levelOf(xpOf(P().completed.length, P().reviewCorrect || 0));',
  'ok(lvFr.lv === 2 && lvEn.lv === 3 && lvEs.lv === 1, "레벨 분리: fr 3개(30 XP)=Lv.2, en 9개(90 XP)=Lv.3, es 0개=Lv.1 — 서로 합산되지 않음 (합산이면 fr도 Lv.3이 됨)");',
  'ok(xpOf(P().completed.length, 0) === 0, "레벨 분리: 활성 언어 버킷만으로 XP를 계산함");'
].join("\n"));
const rpSrcEq = html.match(/function renderProfile\(\)\{[\s\S]*?\n\}/)[0];
ok(rpSrcEq.includes("langLinesHtml") && rpSrcEq.includes("progress.byLang"), "내 정보: 언어별 한 줄 요약이 로컬 진도 전체(byLang)로 표시됨");
ok(html.includes("function langLineOf(code, count, reviewCorrect)") && html.includes("function langLinesHtml(lines, activeCode)"), "언어별 요약: 레벨·메달·완료 수를 언어 단위로 만드는 공용 헬퍼 있음");

console.log("\n[기능 동등성: Ensemble이 활성 언어 기준으로 표시]");
async function runEqEnsembleSmoke() {
  const E2_ELS = {};
  function makeE2El(id) {
    const el = { id: id, value: "", style: {}, textContent: "", onclick: null, _html: "", _listeners: {},
      classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
      setAttribute() {}, getAttribute() { return null; },
      addEventListener(t, f) { this._listeners[t] = f; },
      focus() {}, scrollIntoView() {} };
    Object.defineProperty(el, "innerHTML", {
      get() { return this._html; },
      set(v) { this._html = v; const re = /id="([^"]+)"/g; let m; while ((m = re.exec(v))) { if (!E2_ELS[m[1]]) E2_ELS[m[1]] = makeE2El(m[1]); } }
    });
    return el;
  }
  const e2Document = {
    getElementById(id) { if (!E2_ELS[id]) E2_ELS[id] = makeE2El(id); return E2_ELS[id]; },
    querySelectorAll() { return []; }
  };
  const PROFILES_EQ = [{ id: "user-1", nickname: "테스터" }, { id: "user-2", nickname: "친구" }];
  const PROGRESS_EQ = [
    { user_id: "user-1", lang: "fr", completed: { "1": "2026-10-01", "2": "2026-10-02", "3": "2026-10-03" }, review_correct: { ids: [], count: 0 } },
    { user_id: "user-1", lang: "es", completed: { "es-1": "2026-10-21", "es-2": "2026-10-21" }, review_correct: { ids: [], count: 1 } },
    { user_id: "user-2", lang: "es", completed: { "es-1": "2026-10-20" }, review_correct: { ids: [], count: 0 } },
    { user_id: "user-2", lang: "fr", completed: { "1": "2026-10-01" }, review_correct: { ids: [], count: 0 } }
  ];
  const eqConds = [];
  function sbTableEq(table) {
    const chain = { _conds: [],
      select() { return chain; },
      eq(col, val) { chain._conds.push([col, val]); eqConds.push(table + ":" + col + "=" + val); return chain; },
      then(res, rej) {
        const rows = (table === "profiles" ? PROFILES_EQ : PROGRESS_EQ).filter(r => chain._conds.every(([c, v]) => r[c] === v));
        return Promise.resolve({ data: rows, error: null }).then(res, rej);
      } };
    return chain;
  }
  const prelude = [
    'let sb = { from(t) { return sbTableEq(t); } };',
    'let sbUser = { id: "user-1" };',
    'let sbMemberCache = {};',
    'let progress = null;',
    'const document = e2Document;',
    'function renderProfileBtn(){}',
    'function sbLogout(){}'
  ].join("\n");
  const fns = [
    escSrc, lvArrSrc, lvlSrc, xpSrc2, rriSrc, rxpSrc,
    html.match(/const AVATAR_PASTELS = \[[^\n]*/)[0],
    html.match(/const AVATAR_PASTELS_DARK = \[[^\n]*/)[0],
    html.match(/function avatarBg\(nickname\)\{[\s\S]*?\n\}/)[0],
    html.match(/function avatarHtml\(nickname, big\)\{[\s\S]*?\n\}/)[0],
    html.match(/function langLineOf\(code, count, reviewCorrect\)\{[\s\S]*?\n\}/)[0],
    html.match(/function langLinesHtml\(lines, activeCode\)\{[\s\S]*?\n\}/)[0],
    nidSrc, cmpSrc,
    html.match(/async function renderTogetherMembers\(\)\{[\s\S]*?\n\}/)[0],
    html.match(/async function memberPerLang\(userId\)\{[\s\S]*?\n\}/)[0],
    html.match(/async function toggleMemberLang\(userId, code, btn\)\{[\s\S]*?\n\}/)[0]
  ].join("\n");
  eval(prelude + "\n" + eqHelperSrc + "\n" + fns + "\n" + 'progress = defaultProgress(); progress.lang = "es";');
  await renderTogetherMembers();
  const h = E2_ELS["view-together"].innerHTML;
  ok(!eqConds.some(c => c.indexOf("progress:lang=") === 0), "동등성 Ensemble: progress는 언어로 걸러지 않고 전 언어 행을 가져옴");
  ok(h.includes("완료 2 / 30"), "동등성 Ensemble: 메인 진행 바는 활성 언어(es) 기준 2/30 (fr 기록 3개가 섞이지 않음)");
  ok(h.includes("프랑스어 <svg") && h.includes('data-lv="2"') && h.includes("Lv.2 · 3/346문장"), "동등성 Ensemble: 내 카드 칩에 프랑스어 펜 아이콘 (Lv.2 · 3/346문장 — 완료 3개=30 XP로 따로 계산)");
  ok(h.includes("스페인어 <svg") && h.includes("Lv.1 · 2/30문장"), "동등성 Ensemble: 내 카드 칩에 스페인어 (Lv.1 · 2/30문장 — 언어가 합산되지 않음)");
  ok(h.includes("영어 <svg") && h.includes("Lv.1 · 0/30문장"), "동등성 Ensemble: 진도가 없는 언어도 Lv.1 · 0문장으로 표시되어 3개 언어가 전부 보임");
  ok(h.includes("스페인어 <svg") && h.includes("Lv.1 · 1/30문장") && h.includes("프랑스어 <svg") && h.includes("Lv.1 · 1/346문장"), "동등성 Ensemble: 다른 참여자 카드에도 언어별 레벨·완료 수가 표시됨");
  ok((h.match(/\(나\)/g) || []).length === 1 && !h.includes("mycard"), "회귀(F): 본인 카드는 참여자 목록에서 한 번만 렌더됨 (별도 내 카드 중복 제거)");
  ok(!h.includes("sbRefreshBtn") && !h.includes("sbLogoutBtn"), "Ensemble 정리(G): 새로고침·로그아웃 버튼이 목록 화면에 없음 (로그아웃은 내 정보 모달에만)");
  const fakeBtn = { _attrs: {}, setAttribute(k, v){ this._attrs[k] = v; }, getAttribute(k){ return this._attrs[k]; } };
  await toggleMemberLang("user-2", "fr", fakeBtn);
  ok(E2_ELS["sbdone-user-2-fr"].innerHTML.includes(ITEMS[0].fr), "동등성 Ensemble 펼침: 프랑스어 줄을 누르면 프랑스어 완료 문장만 펼쳐짐");
  ok(fakeBtn._attrs["aria-expanded"] === "true", "동등성 Ensemble 펼침: 펼친 언어 줄은 aria-expanded=true로 표시됨");
  ok(E2_ELS["sbdone-user-2-es"].innerHTML === "" && E2_ELS["sbdone-user-2-en"].innerHTML === "", "동등성 Ensemble 펼침: 다른 언어는 펼쳐지지 않음");
  await toggleMemberLang("user-2", "es", fakeBtn);
  ok(E2_ELS["sbdone-user-2-es"].innerHTML.includes(ITEMS_ES_REAL[0].text) && E2_ELS["sbdone-user-2-fr"].innerHTML.includes(ITEMS[0].fr), "동등성 Ensemble 펼침: 스페인어를 펼쳐도 프랑스어 펼침은 유지됨 (언어별 독립 토글)");
  ok(E2_ELS["sbdone-user-2-es"].innerHTML.includes("<b>1.</b>") && !E2_ELS["sbdone-user-2-es"].innerHTML.includes("es-1"), "번호 통일(v1.35.5): 스페인어 완료 문장도 원본 id(es-1)가 아닌 순서 번호(1.)로 표시됨");
  await toggleMemberLang("user-2", "en", fakeBtn);
  ok(E2_ELS["sbdone-user-2-en"].innerHTML.includes("아직 완료한 문장이 없어요"), "동등성 Ensemble 펼침: 완료 0개 언어 줄은 빈 상태 문구가 펼쳐짐");
  await toggleMemberLang("user-2", "fr", fakeBtn);
  ok(E2_ELS["sbdone-user-2-fr"].innerHTML === "" && E2_ELS["sbdone-user-2-es"].innerHTML.includes(ITEMS_ES_REAL[0].text), "동등성 Ensemble 펼침: 프랑스어 줄을 다시 누르면 그 언어만 접힘");
}

console.log("\n[완료 효과음: 언어별 모티프 (v1.33.0)]");
const motifSrc = html.match(/const COMPLETE_MOTIFS = \{[\s\S]*?\n\};/)[0];
const COMPLETE_MOTIFS = eval(motifSrc + "\nCOMPLETE_MOTIFS;");
ok(["fr", "en", "es"].every(c => Array.isArray(COMPLETE_MOTIFS[c]) && COMPLETE_MOTIFS[c].length >= 2 && COMPLETE_MOTIFS[c].length <= 3), "완료 효과음: 언어별 모티프가 2~3음으로 구성됨");
ok(["fr", "en", "es"].every(c => COMPLETE_MOTIFS[c].every((f, i, a) => i === 0 || f > a[i - 1])), "완료 효과음: 언어별 모티프가 부드러운 상승 진행");
ok(new Set(["fr", "en", "es"].map(c => COMPLETE_MOTIFS[c].join(","))).size === 3, "완료 효과음: fr·en·es 모티프가 서로 다름");
{ const gap = parseFloat(html.match(/const COMPLETE_NOTE_GAP = ([\d.]+);/)[1]);
  const dur = parseFloat(html.match(/const COMPLETE_NOTE_DUR = ([\d.]+);/)[1]);
  ok((3 - 1) * gap + dur <= 0.4, "완료 효과음: 3음을 다 재생해도 전체 길이가 0.4초 이내 (" + ((3 - 1) * gap + dur).toFixed(2) + "초)"); }
const pcsSrc = html.match(/function playCompleteSound\(\)\{[\s\S]*?\n\}/)[0];
ok(pcsSrc.includes("soundEnabled()") && pcsSrc.includes("COMPLETE_MOTIFS[curLang()]") && pcsSrc.includes("0.18") && pcsSrc.includes("exponentialRampToValueAtTime"), "완료 효과음: 사운드 설정을 존중하고, 언어별 모티프를 작은 볼륨·부드러운 envelope로 합성 (외부 파일 없음)");
ok(!pcsSrc.includes("http") && !pcsSrc.includes(".mp3") && !pcsSrc.includes("Audio("), "완료 효과음: 외부 오디오 파일을 쓰지 않음 (WebAudio 합성만)");
ok(csSrc.includes("playCompleteSound()"), "완료 효과음: 문장 완료 처리(completeSentence)에서 호출됨");
ok(!ctSrc.includes("playCompleteSound") && !cqSrc.includes("playCompleteSound"), "완료 효과음: 단계 정답·복습 퀴즈 정답에서는 호출되지 않음 (신규 문장 완료만)");
// 완료 효과음 기능 스모크: 가짜 AudioContext로 언어별 주파수·무음 설정을 확인
const SND_ELS = {};
const sndPrelude = [
  'const sndFreqs = [];',
  'function FakeGain(){ this.gain = { value: 0, setValueAtTime(){}, exponentialRampToValueAtTime(){} }; }',
  'FakeGain.prototype.connect = function(){};',
  'function FakeOsc(){ this.type = ""; this.frequency = { value: 0 }; }',
  'FakeOsc.prototype.connect = function(){};',
  'FakeOsc.prototype.start = function(){ sndFreqs.push(this.frequency.value); };',
  'FakeOsc.prototype.stop = function(){};',
  'function FakeAC(){ this.currentTime = 0; this.state = "running"; this.destination = {}; }',
  'FakeAC.prototype.createGain = function(){ return new FakeGain(); };',
  'FakeAC.prototype.createOscillator = function(){ return new FakeOsc(); };',
  'FakeAC.prototype.resume = function(){};',
  'const window = { AudioContext: FakeAC };',
  'let audioCtx = null;',
  'let progress = { lang: "fr", sound: true };'
].join("\n");
eval(sndPrelude + "\n" + langsSrcEq + "\n" + motifSrc + "\n"
  + html.match(/const COMPLETE_NOTE_GAP = [^\n]*/)[0] + "\n"
  + html.match(/const COMPLETE_NOTE_DUR = [^\n]*/)[0] + "\n"
  + html.match(/function curLang\(\)\{[^}]*\}/)[0] + "\n"
  + html.match(/function soundEnabled\(\)[^\n]*/)[0] + "\n"
  + pcsSrc + "\n" + [
  'playCompleteSound();',
  'ok(sndFreqs.join(",") === COMPLETE_MOTIFS.fr.join(","), "완료 효과음 스모크: 프랑스어에서는 fr 모티프가 재생됨");',
  'sndFreqs.length = 0; progress.lang = "en";',
  'playCompleteSound();',
  'ok(sndFreqs.join(",") === COMPLETE_MOTIFS.en.join(","), "완료 효과음 스모크: 영어에서는 en 모티프가 재생됨");',
  'sndFreqs.length = 0; progress.lang = "es";',
  'playCompleteSound();',
  'ok(sndFreqs.join(",") === COMPLETE_MOTIFS.es.join(","), "완료 효과음 스모크: 스페인어에서는 es 모티프가 재생됨");',
  'sndFreqs.length = 0; progress.sound = false;',
  'playCompleteSound();',
  'ok(sndFreqs.length === 0, "완료 효과음 스모크: 효과음이 꺼져 있으면 아무 소리도 나지 않음");'
].join("\n"));

console.log("\n[레벨 선택 (v1.33.0)]");
ok(html.includes('id="levelChips"'), "레벨 선택: 공부 화면 상단에 레벨 칩 행이 있음");
ok(html.includes('levelFilter:"전체"') && html.includes("function levelFilter()") && html.includes("function studyItems()") && html.includes("function setLevelFilter(lv)"), "레벨 선택: 선택은 언어별 버킷(levelFilter)에 저장되고 기본값은 전체");
ok(rsSrc2.includes("renderLevelChips()"), "레벨 선택: 공부 화면을 그릴 때 칩 행도 함께 그림");
ok(html.includes('data-lv="'), "레벨 선택: 칩은 data-lv로 렌더됨");
eval(eqHelperSrc + "\n" + html.match(/function levelOptions\(\)\{[\s\S]*?\n\}/)[0] + "\n" + html.match(/function currentItem\(\)\{[^}]*\}/)[0] + "\n" + [
  'let progress = defaultProgress();',
  'ok(levelOptions().join(",") === "전체,A1,A2,B1,B2", "레벨 선택 의미: 프랑스어 칩은 전체+A1+A2+B1+B2");',
  'progress.byLang.fr.levelFilter = "A2";',
  'ok(studyItems().length === 98 && studyItems().every(i => i.level === "A2"), "레벨 선택 의미: A2를 고르면 순차 큐가 A2 98개로 제한됨");',
  'progress.byLang.fr.levelFilter = "A1";',
  'ok(studyItems().length === 50 && currentItem().level === "A1", "레벨 선택 의미: A1 큐에서는 현재 문장도 A1");',
  'progress.lang = "es"; progress.byLang.es.levelFilter = "B2";',
  'ok(levelFilter() === "전체" && studyItems().length === 30, "레벨 선택 의미: 그 언어에 없는 레벨이 저장돼 있으면 전체로 안전하게 동작");',
  'ok(levelOptions().join(",") === "전체,A1,A2,B1", "레벨 선택 의미: 스페인어 칩은 있는 레벨만 표시 (B2 없음)");',
  'progress.byLang.es.levelFilter = "A1";',
  'ok(studyItems().length === 10 && studyItems().every(i => i.level === "A1"), "레벨 선택 의미: 스페인어 A1 큐도 10개로 제한됨");',
  'progress.lang = "fr"; progress.byLang.fr.levelFilter = "전체";',
  'ok(P().completed.length === 0 && progress.byLang.es.levelFilter === "A1", "레벨 선택 의미: 선택은 언어별로 따로 저장됨 (fr 전체, es A1 동시 유지)");'
].join("\n"));
// 레벨 칩 DOM 스모크: 칩 클릭 → 필터·시작 위치·상단 표기가 실제로 바뀜
const LV_ELS = {};
const LV_CHIPS = [];
function makeLvEl(id) {
  const el = { id: id, value: "", style: {}, textContent: "", onclick: null, _html: "", _listeners: {},
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    setAttribute() {}, getAttribute() { return null; },
    addEventListener(t, f) { this._listeners[t] = f; },
    focus() {}, scrollIntoView() {} };
  Object.defineProperty(el, "innerHTML", {
    get() { return this._html; },
    set(v) {
      this._html = v;
      const re = /id="([^"]+)"/g; let m; while ((m = re.exec(v))) { if (!LV_ELS[m[1]]) LV_ELS[m[1]] = makeLvEl(m[1]); }
      if (id === "levelChips") {
        LV_CHIPS.length = 0;
        const re2 = /data-lv="([^"]+)"/g; let m2;
        while ((m2 = re2.exec(v))) { const lvName = m2[1]; LV_CHIPS.push({ _lv: lvName, onclick: null, getAttribute(k) { return k === "data-lv" ? this._lv : null; } }); }
      }
    }
  });
  return el;
}
const lvDocument = {
  getElementById(id) { if (!LV_ELS[id]) LV_ELS[id] = makeLvEl(id); return LV_ELS[id]; },
  querySelectorAll(sel) { return sel === "[data-lv]" ? LV_CHIPS : []; }
};
const lvPrelude = [
  'let progress = null;',
  'let currentStep = 1;',
  'let quizItem = null;',
  'let completionInFlight = false;',
  'let quizAnswered = false;',
  'let currentTab = "study";',
  'const document = lvDocument;',
  'const requestAnimationFrame = fn => fn();',
  'function saveProgress(){}',
  'function renderVaultState(){}',
  'function renderQuizEntry(){}',
  'function playSound(){}',
  'function speakFr(){}',
  'function clearSpeakingUI(){}'
].join("\n");
const lvFns = [
  escSrc, swSrc, dwSrc, normSrc, corrSrc, chSrc, whSrc,
  lvArrSrc, lvlSrc, xpSrc2, iconSrc,
  html.match(/const SPEAKER_SVG = [^\n]*/)[0],
  html.match(/const SPEAKER_SLOW_SVG = [^\n]*/)[0],
  html.match(/function slowListenBtnHtml\(\)[^\n]*/)[0],
  html.match(/function setStep\(n\)\{[^}]*\}/)[0],
  html.match(/function levelOptions\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function renderLevelChips\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function renderTopicTag\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function scopeLabel\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function setLevelFilter\(lv\)\{[\s\S]*?\n\}/)[0],
  html.match(/function repositionInQueue\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function currentItem\(\)\{[^}]*\}/)[0],
  html.match(/function todayKey\(\)\{[^}]*\}/)[0],
  html.match(/function countToday\(p\)\{[^}]*\}/)[0],
  html.match(/function bindWordProg[\s\S]*?\n\}/)[0],
  tsSrc, MAPSTRIP_SRC,
  html.match(/function renderProgress\(\)\{[\s\S]*?\n\}/)[0],
  rsSrc2, ctSrc
].join("\n");
eval(lvPrelude + "\n" + helperSrc + "\n" + lvFns + "\n" + [
  'progress = migrateProgress(null);',
  'const B = progress.byLang.fr;',
  'B.completed = [ITEMS.find(i => i.level === "A2").id];',
  'currentStep = 1;',
  'renderStudy();',
  'const chipsHtml = LV_ELS["levelChips"].innerHTML;',
  'ok(chipsHtml.includes(\'data-lv="전체"\') && chipsHtml.includes(\'data-lv="A1"\') && chipsHtml.includes(\'data-lv="A2"\') && chipsHtml.includes(\'data-lv="B1"\') && chipsHtml.includes(\'data-lv="B2"\'), "레벨 스모크: 칩 행에 전체·A1·A2·B1·B2가 렌더됨");',
  'ok(LV_CHIPS.length === 5, "레벨 스모크: 칩 버튼 5개가 클릭 대상으로 잡힘");',
  'LV_CHIPS.find(c => c._lv === "A2").onclick();',
  'ok(B.levelFilter === "A2" && currentItem().level === "A2", "레벨 스모크: A2 칩을 누르면 큐가 A2로 제한되고 현재 문장도 A2");',
  'ok(B.index === 1 && currentStep === 1, "레벨 스모크: 범위 안 첫 미완료 문장(두 번째 A2)부터 1단계로 시작");',
  'ok(LV_ELS["progressLine"].textContent.indexOf("A2에서 1 / 98문장 완료") === 0 && LV_ELS["progressLine"].textContent.includes("전체 1 / 346문장"), "레벨 스모크: 상단 진행 표기가 범위 기준 + 전체 병행 (실제: " + LV_ELS["progressLine"].textContent + ")");',
  'ok(LV_ELS["progressPct"].textContent.indexOf("A2 ") === 0, "레벨 스모크: 진행률 표기도 범위 기준");',
  'LV_CHIPS.find(c => c._lv === "전체").onclick();',
  'ok(B.levelFilter === "전체" && LV_ELS["progressLine"].textContent.indexOf("지금까지 1 / 346문장 완료") === 0, "레벨 스모크: 전체 칩으로 돌아오면 기존 전체 표기로 복귀");'
].join("\n"));

console.log("\n[Ensemble 개편: 전 언어 표시·중복 제거·버튼 정리 (v1.33.0)]");
ok(!html.includes('id="sbRefreshBtn"') && !html.includes('id="sbLogoutBtn"'), "Ensemble 정리(G): 새로고침·로그아웃 버튼이 앱에서 제거됨");
ok(html.includes('id="profileLogoutBtn"'), "Ensemble 정리(G): 로그아웃은 내 정보 모달에만 남음");
ok(!rtmSrc.includes("mycard") && !rtmSrc.includes("const mine"), "회귀(F): renderTogetherMembers에 별도 내 카드 렌더 경로가 없음 — 본인은 참여자 목록에서 한 번만 그림");
ok(rtmSrc.includes("LANG_CODES.map") && rtmSrc.includes("pl.count+'/'+pl.total") && !rtmSrc.includes(".filter(Boolean)"), "Ensemble(E): 카드 칩은 3개 언어 전부를 완료수/전체수로 표시하고, 진도 없는 언어도 생략하지 않음 (기존 생략 규칙이 원인이었음)");
const tmlSrc = html.match(/async function toggleMemberLang\(userId, code, btn\)\{[\s\S]*?\n\}/)[0];
const mplSrc = html.match(/async function memberPerLang\(userId\)\{[\s\S]*?\n\}/)[0];
ok(tmlSrc.includes("memlangsec") && tmlSrc.includes("pfill") && tmlSrc.includes("아직 완료한 문장이 없어요"), "Ensemble(E): 언어 줄 펼침은 그 언어 섹션(진행 바 + 완료 문장 목록)으로 구성되고, 진도 없는 언어는 빈 상태를 보여줌");
ok(rtmSrc.includes("sbMemberCache") && mplSrc.includes("sbMemberCache"), "Ensemble(E): 펼침은 목록을 불러올 때 함께 받은 전 언어 진도를 재사용함");
ok(!html.includes("data-sbcard") && !rtmSrc.includes("완료 문장 보기") && rtmSrc.includes("data-sblang") && tmlSrc.includes('"sbdone-" + userId + "-" + code'), "Ensemble 개편(v1.35.3): 카드 본문 탭·완료 문장 보기 버튼으로는 열리지 않고, 언어 줄 버튼이 그 언어 목록만 펼침");

console.log("\n[로그인 유지: 부팅 시 세션 복원 (v1.33.1)]");
const srsSrc = html.match(/function sbRestoreSession\(\)\{[\s\S]*?\n\}/)[0];
ok(srsSrc.includes("loadSupabase()") && srsSrc.includes("wireSbAuth()") && srsSrc.includes("sbCurrentUser()"), "세션 복원: 부팅 복원이 Supabase를 로드해 저장된 세션을 확인함 (getSession 경로)");
ok(srsSrc.includes("syncSbOnLogin()") && srsSrc.includes("renderProfileBtn()"), "세션 복원: 세션이 있으면 현재 언어 동기화를 돌리고 아바타 버튼을 갱신함");
ok(srsSrc.includes("if(sbRestorePromise) return sbRestorePromise;") && srsSrc.includes("finally{ sbRestoreDone = true; }"), "세션 복원: 한 번만 실행되고, 성공·실패와 무관하게 완료로 표시됨 (실패·오프라인이면 게스트로 조용히 동작)");
ok(html.includes("try{ sbRestoreSession(); }catch(e){}\nif(isOAuthReturn()){ sbAuthInitPromise = sbAuthReturnInit();"), "세션 복원: 모든 부팅에서 복원이 실행됨 (OAuth 복귀 초기화를 대신 실행하는 구조가 아님)");
const opSrc = html.match(/async function openProfile\(\)\{[\s\S]*?\n\}/)[0];
ok(opSrc.includes("로그인 상태를 확인하고 있어요") && opSrc.indexOf("로그인 상태를 확인하고 있어요") < opSrc.indexOf("renderProfile();"), "내 정보: 복원이 끝나기 전에는 게스트로 확정 렌더하지 않고 확인 중 표시 뒤에 최종 상태로 그림");
ok(opSrc.includes("await Promise.all(pending)") && opSrc.includes("if(ov.hidden) return;"), "내 정보: 복원을 기다리는 동안 모달을 닫으면 닫힌 모달에 뒤늦게 렌더하지 않음");
ok(!drSrc.includes("localStorage.clear") && !html.includes("localStorage.clear"), "초기화 회귀: 기록 초기화를 포함해 앱 어디에도 localStorage 전체 삭제가 없음 (Supabase 인증 토큰 키가 남음)");

async function runBootRestoreSmoke() {
  function makeBrWorld() {
    const els = {};
    function makeEl(id) {
      const el = { id: id, value: "", style: {}, textContent: "", onclick: null, _html: "", _listeners: {}, hidden: false,
        classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
        setAttribute() {}, getAttribute() { return null; },
        addEventListener(t, f) { this._listeners[t] = f; },
        focus() {}, scrollIntoView() {} };
      Object.defineProperty(el, "innerHTML", {
        get() { return this._html; },
        set(v) { this._html = v; const re = /id="([^"]+)"/g; let m; while ((m = re.exec(v))) { if (!els[m[1]]) els[m[1]] = makeEl(m[1]); } }
      });
      return el;
    }
    const doc = { documentElement: { dataset: {} },
      getElementById(id) { if (!els[id]) els[id] = makeEl(id); return els[id]; },
      querySelectorAll() { return []; } };
    return { els: els, doc: doc };
  }
  function fakeSbClient(store, sessionUser, gate) {
    return {
      auth: {
        onAuthStateChange(cb) { store.authCb = cb; },
        getSession() { const base = gate ? gate.promise : Promise.resolve(); return base.then(() => ({ data: { session: sessionUser ? { user: sessionUser } : null } })); },
        signOut() { return Promise.resolve({}); }
      },
      from(table) {
        const chain = { _eqs: [],
          select() { return chain; },
          eq(c, v) { chain._eqs.push([c, v]); return chain; },
          maybeSingle() { const rows = (store[table] || []).filter(r => chain._eqs.every(([c, v]) => r[c] === v)); return Promise.resolve({ data: rows[0] || null, error: null }); },
          upsert(row) { store.progress = (store.progress || []).filter(r => !(r.user_id === row.user_id && r.lang === row.lang)); store.progress.push(row); return Promise.resolve({ error: null }); }
        };
        return chain;
      }
    };
  }
  let BR_DOC = null, FAKE_CLIENT = null;
  const brPrelude = [
    'let sb = null;', 'let sbLoadPromise = null;', 'let sbAuthWired = false;',
    'let sbUser = null;', 'let sbProfile = null;', 'let sbSyncedLangs = {};', 'let sbMemberCache = {};',
    'let sbMerging = false;', 'let sbUploadTimer = null;',
    'let sbRestoreDone = false;', 'let sbRestorePromise = null;', 'let sbAuthInitPromise = null;',
    'let progress = null;', 'let currentTab = "study";', 'let emailShown = false;',
    'const document = BR_DOC;',
    'const window = { supabase: { createClient() { return FAKE_CLIENT; } } };',
    'function saveProgress(){}', 'function renderVaultState(){}', 'function renderProgress(){}',
    'function renderTogether(){}', 'function openNickModal(){}', 'function closeProfile(){}',
    'function sbLogin(){}', 'function sbLogout(){}'
  ].join("\n");
  const brFns = [
    lockSrc,
    html.match(/const SUPABASE_URL = [^\n]*/)[0],
    html.match(/const SUPABASE_KEY = [^\n]*/)[0],
    html.match(/const SUPABASE_JS_URL = [^\n]*/)[0],
    escSrc, lvArrSrc, lvlSrc, xpSrc2,
    iconSrc,
    html.match(/function langLineOf\(code, count, reviewCorrect\)\{[\s\S]*?\n\}/)[0],
    html.match(/function langLinesHtml\(lines, activeCode\)\{[\s\S]*?\n\}/)[0],
    html.match(/function maskEmail\(email\)\{[\s\S]*?\n\}/)[0],
    html.match(/const PERSON_SVG = [^\n]*/)[0],
    html.match(/const AVATAR_PASTELS = \[[^\n]*/)[0],
    html.match(/const AVATAR_PASTELS_DARK = \[[^\n]*/)[0],
    html.match(/function avatarBg\(nickname\)\{[\s\S]*?\n\}/)[0],
    html.match(/function avatarHtml\(nickname, big\)\{[\s\S]*?\n\}/)[0],
    nidSrc, cmpSrc, rriSrc, crsSrc, rrfSrc, mrsSrc, mpdSrc, ptrSrc,
    html.match(/function loadSupabase\(\)\{[\s\S]*?\n\}/)[0],
    html.match(/function wireSbAuth\(\)\{[\s\S]*?\n\}/)[0],
    html.match(/async function sbCurrentUser\(\)\{[\s\S]*?\n\}/)[0],
    html.match(/async function loadSbProfile\(\)\{[\s\S]*?\n\}/)[0],
    html.match(/async function fetchSbRemote\(\)\{[\s\S]*?\n\}/)[0],
    html.match(/async function pushSbProgress\(\)\{[\s\S]*?\n\}/)[0],
    html.match(/async function mergeSbAndPush\(\)\{[\s\S]*?\n\}/)[0],
    html.match(/async function syncSbOnLogin\(\)\{[\s\S]*?\n\}/)[0],
    html.match(/function sbRestoreSession\(\)\{[\s\S]*?\n\}/)[0],
    html.match(/function renderProfileBtn\(\)\{[\s\S]*?\n\}/)[0],
    html.match(/async function openProfile\(\)\{[\s\S]*?\n\}/)[0],
    html.match(/function renderProfile\(\)\{[\s\S]*?\n\}/)[0]
  ].join("\n");

  // 시나리오 A: 저장된 세션이 있는 상태로 부팅 → 로그인 복원 + 진도 병합 + 아바타 닉네임
  const worldA = makeBrWorld(); BR_DOC = worldA.doc;
  const storeA = { profiles: [{ id: "user-1", nickname: "테스터" }],
    progress: [{ user_id: "user-1", lang: "fr", completed: { "1": "2026-10-01", "2": "2026-10-02" }, review_correct: { ids: [], count: 1 } }] };
  FAKE_CLIENT = fakeSbClient(storeA, { id: "user-1", email: "tester@example.com" }, null);
  eval(brPrelude + "\n" + eqHelperSrc + "\n" + brFns + "\n" + 'progress = defaultProgress();');
  await sbRestoreSession();
  ok(worldA.els["profileBtn"].textContent === "테", "부팅 복원 스모크: 저장된 세션이 있으면 부팅만으로 아바타 버튼이 닉네임 첫 글자로 바뀜");
  ok(storeA.progress.some(r => r.user_id === "user-1" && r.lang === "fr"), "부팅 복원 스모크: 복원 시 현재 언어 진도 동기화(병합 후 업로드)가 실행됨");
  await openProfile();
  ok(worldA.els["profileBody"].innerHTML.includes("테스터") && worldA.els["profileBody"].innerHTML.includes('id="profileLogoutBtn"'), "부팅 복원 스모크: 내 정보를 열면 게스트가 아니라 닉네임·로그아웃이 있는 로그인 상태로 표시됨");
  ok(worldA.els["profileBody"].innerHTML.includes("완료 2 / 346문장") && worldA.els["profileBody"].innerHTML.includes("복습 맞힘 1개"), "부팅 복원 스모크: 서버 진도(완료 2·복습 1)가 병합되어 내 정보 통계에 반영됨");

  // 시나리오 B: 세션 없이 부팅 → 게스트 그대로
  const worldB = makeBrWorld(); BR_DOC = worldB.doc;
  FAKE_CLIENT = fakeSbClient({ profiles: [], progress: [] }, null, null);
  eval(brPrelude + "\n" + eqHelperSrc + "\n" + brFns + "\n" + 'progress = defaultProgress();');
  await sbRestoreSession();
  ok(worldB.doc.getElementById("profileBtn").textContent === "", "부팅 복원 스모크: 세션이 없으면 아바타 버튼이 닉네임으로 바뀌지 않음");
  await openProfile();
  ok(worldB.els["profileBody"].innerHTML.includes("게스트") && worldB.els["profileBody"].innerHTML.includes("구글로 시작하기"), "부팅 복원 스모크: 세션이 없으면 내 정보는 기존처럼 게스트 화면");

  // 시나리오 C: 복원이 끝나기 전에 내 정보를 열면 게스트로 확정되지 않음
  const worldC = makeBrWorld(); BR_DOC = worldC.doc;
  let resolveGate = null;
  const gate = { promise: new Promise(r => { resolveGate = r; }) };
  const storeC = { profiles: [{ id: "user-1", nickname: "테스터" }], progress: [] };
  FAKE_CLIENT = fakeSbClient(storeC, { id: "user-1", email: "tester@example.com" }, gate);
  eval(brPrelude + "\n" + eqHelperSrc + "\n" + brFns + "\n" + 'progress = defaultProgress();');
  const openP = openProfile();
  ok(worldC.els["profileBody"].innerHTML.includes("로그인 상태를 확인하고 있어요"), "부팅 복원 스모크: 복원 중 내 정보를 열면 확인 중 표시가 먼저 나옴");
  ok(!worldC.els["profileBody"].innerHTML.includes("구글로 시작하기") && !worldC.els["profileBody"].innerHTML.includes("게스트"), "부팅 복원 스모크: 복원 중에는 게스트로 확정 렌더되지 않음");
  resolveGate();
  await openP;
  ok(worldC.els["profileBody"].innerHTML.includes("테스터"), "부팅 복원 스모크: 복원이 끝나면 내 정보가 최종 로그인 상태로 렌더됨");
}

async function runResetTokenSmoke() {
  const RT_STORE = new Map();
  const RT_VAULT = new Set();
  const rtLocalStorage = { getItem(k) { return RT_STORE.has(k) ? RT_STORE.get(k) : null; }, setItem(k, v) { RT_STORE.set(k, String(v)); }, removeItem(k) { RT_STORE.delete(k); } };
  const rtPrelude = [
    'let progress = null;', 'let currentStep = 3;', 'let quizItem = { id: 1 };',
    'let completionInFlight = true;', 'let quizAnswered = true;', 'let vaultReady = false;',
    'let resetStage = 0;', 'let resetDoneMsg = false;',
    'const STORAGE_KEY = "une-phrase-progress-v1";',
    'const localStorage = rtLocalStorage;',
    'async function vaultDelete(k) { RT_VAULT.delete(k); }',
    'function applyTheme(){}', 'function renderVaultState(){}', 'function renderSoundBtn(){}',
    'function renderResetZone(){}', 'function renderStudy(){}'
  ].join("\n");
  const rtFns = [
    dpSrcEq,
    html.match(/function themeOf\(\)\{[\s\S]*?\n\}/)[0],
    html.match(/async function doReset\(\)\{[\s\S]*?\n\}/)[0]
  ].join("\n");
  eval(rtPrelude + "\n" + rtFns);
  progress = defaultProgress();
  rtLocalStorage.setItem("une-phrase-progress-v1", JSON.stringify(progress));
  rtLocalStorage.setItem("sb-cmhitsgoicxvmlwtrdrb-auth-token", JSON.stringify({ access_token: "dummy" }));
  RT_VAULT.add("une-phrase-progress-v1");
  await doReset();
  ok(!RT_STORE.has("une-phrase-progress-v1") && !RT_VAULT.has("une-phrase-progress-v1"), "초기화 스모크: 기록 초기화로 진도 키(로컬·보관함)는 지워짐");
  ok(RT_STORE.get("sb-cmhitsgoicxvmlwtrdrb-auth-token") !== undefined, "초기화 스모크: 기록 초기화를 해도 Supabase 인증 토큰 키는 그대로 남음 (로그인 유지)");
}

console.log("\n[망각곡선 복습 (v1.35.0)]");
// 구조 단언
ok(html.includes('id="mapStrip"') && html.indexOf('id="mapStrip"') < html.indexOf('id="quizArea"') && html.indexOf('id="quizArea"') < html.indexOf('id="levelChips"'), "지도 스트립: 공부 탭 상단(지도 스트립 → 오늘의 복습 → 레벨 칩) 순서로 배치");
ok((html.match(/id="quizArea"/g) || []).length === 1, "오늘의 복습: quizArea는 상단 한 곳에만 있음");
ok(html.includes('reviewState:{}') && html.includes('curveDays:[]'), "망각곡선: 버킷 기본값에 reviewState·curveDays가 있음");
ok(html.includes("function renderMapStrip()") && html.match(/function renderProgress\(\)\{[\s\S]*?\n\}/)[0].includes("renderMapStrip()"), "지도 스트립: 진행 렌더 때마다 스트립도 갱신됨");
ok(csSrc.includes("scheduleOnComplete") && csSrc.includes("countReviewsToday") && csSrc.includes("curveLitToday") && csSrc.includes('id="doneForTodayBtn"') && csSrc.includes("오늘은 여기까지"), "세션 완료 화면: 완료 시 스케줄 편입 + 오늘 복습 수·곡선 상태·'오늘은 여기까지' 버튼 포함");
ok(cqSrc.includes("nextSchedule") && cqSrc.includes("syncCurveDays"), "복습 채점: 정답·오답 모두 스케줄 전이 + 곡선 기록 갱신");
ok(html.includes("망각곡선 복습") && html.includes("1일 · 3일 · 7일 · 16일 · 35일"), "더보기: 망각곡선 복습 안내(사다리·빚 없음 원칙) 있음");
ok(html.includes("복습 순서는 오래 기다린 문장부터, 단계가 낮은 문장부터"), "더보기: 복습 큐 순서(due 이른 순 → step 낮은 순) 안내 한 줄 있음");
ok(html.includes('id="mapOverlay"') && html.includes('id="mapSheetGrid"') && html.includes('id="mapCloseBtn"') && html.includes('id="mapBackdrop"'), "지도 시트(v1.35.1): 바텀시트 오버레이·그리드·닫기·배경이 전역에 있음");
ok(html.includes('id="browseBackBtn"') && html.includes("← 공부로 돌아가기"), "주제별(v1.35.1): 상단에 공부로 돌아가기 버튼 있음");
ok(MAPSTRIP_SRC.includes("openMapSheet") && !MAPSTRIP_SRC.includes('showTab("browse")'), "지도 스트립(v1.35.1): 탭하면 탭 이동이 아니라 지도 시트를 염");
ok(html.match(/function startQuiz[\s\S]*?\n\}/)[0].includes("quizCandidates") && !html.includes("Math.floor(Math.random()*pool.length)"), "복습 출제(v1.35.1): 무작위 선택 없이 결정적 큐 순서로 출제");
ok(html.includes("function renderQuizResult()") && html.includes("공부로 돌아가기") && html.includes("오늘 해결한 문장"), "도전 결과 화면(v1.35.1): 곡선 점등·기록·오늘 해결 수·공부로 돌아가기 포함");
{ const it43 = ITEMS.find(i => i.id === 43);
  ok(it43 && it43.ko === "모바일 앱은 일상생활을 더 편리하게 만든다. 예를 들면 결제하거나 이동할 때처럼.", "콘텐츠 수정: 프랑스어 43번 한국어 뜻이 다듬어짐 (fr·청크는 그대로)"); }
// 순수 함수 의미 테스트
const tkSrc = html.match(/function todayKey\(\)\{[^}]*\}/)[0];
eval(SCHED_SRCS + "\n" + tkSrc + "\n" + `const T = "2026-10-22";
  ok(REVIEW_LADDER.join(",") === "1,3,7,16,35" && REVIEW_DAILY_CAP === 20, "사다리: 간격 [1,3,7,16,35]일, 하루 상한 20개");
  ok(addDaysKey(T, 1) === "2026-10-23" && addDaysKey("2026-10-31", 1) === "2026-11-01" && addDaysKey("2026-12-31", 1) === "2027-01-01", "날짜 계산: +1일이 월·연 경계를 넘김");
  const s0 = scheduleOnComplete({}, 7, T);
  ok(s0[7].step === 0 && s0[7].due === "2026-10-23" && s0[7].last === T, "스케줄 편입: 신규 완료는 step 0, due는 내일");
  const s0b = scheduleOnComplete({ 7: { step: 2, due: "2026-11-01", last: "2026-10-20" } }, 7, T);
  ok(s0b[7].step === 2 && s0b[7].due === "2026-11-01", "스케줄 편입: 이미 스케줄이 있으면 덮지 않음");
  let st = { 7: { step: 0, due: "2026-10-23", last: "2026-10-22" } };
  st = nextSchedule(st, 7, true, "2026-10-23");
  ok(st[7].step === 1 && st[7].due === "2026-10-26" && st[7].last === "2026-10-23", "전이: 정답 step0→1, due +3일");
  st = nextSchedule(st, 7, true, "2026-10-26");
  ok(st[7].step === 2 && st[7].due === "2026-11-02", "전이: 정답 step1→2, due +7일");
  st = nextSchedule(st, 7, true, "2026-11-02");
  ok(st[7].step === 3 && st[7].due === "2026-11-18", "전이: 정답 step2→3, due +16일");
  st = nextSchedule(st, 7, true, "2026-11-18");
  ok(st[7].step === 4 && st[7].due === "2026-12-23", "전이: 정답 step3→4, due +35일");
  st = nextSchedule(st, 7, true, "2026-12-23");
  ok(st[7].step === 4 && st[7].due === "2027-01-27", "전이: 마지막 칸 정답은 step 4 유지, +35일 반복");
  const sw = nextSchedule({ 7: { step: 3, due: "2026-11-18", last: "2026-11-02" } }, 7, false, "2026-11-10");
  ok(sw[7].step === 0 && sw[7].due === "2026-11-11" && sw[7].last === "2026-11-10", "전이: 오답이면 step 0으로, due는 내일");
  const sm = nextSchedule({}, "en-3", true, T);
  ok(sm["en-3"].step === 1 && sm["en-3"].due === "2026-10-25", "전이: 스케줄이 없는 문장도 정답이면 step 1부터 시작");
  const dueSet = { 1: { step: 0, due: "2026-10-21", last: "2026-10-20" }, 2: { step: 1, due: T, last: "2026-10-19" }, 3: { step: 0, due: "2026-10-25", last: T }, "en-5": { step: 0, due: T, last: T } };
  ok(JSON.stringify(dueReviewIds(dueSet, T)) === JSON.stringify([1, 2, "en-5"]), "큐: 지난 due·오늘 due만, 미래 due는 제외 (연체도 페널티 없이 포함)");
  const many = {}; for (let i = 1; i <= 25; i++) many[i] = { step: 0, due: T, last: "2026-10-21" };
  ok(dueReviewIds(many, T).length === 20 && dueReviewIds(many, T)[19] === 20, "큐 상한: due 25개여도 오늘 출제는 20개까지");
  const capped = applyDailyCap(many, T);
  ok(dueReviewIds(capped, T).length === 20 && [21, 22, 23, 24, 25].every(i => capped[i].due === "2026-10-23"), "큐 상한: 초과 5개는 due가 다음 날로 미뤄짐 (빚이 아니라 순서)");
  ok(many[21].due === T && many[25].due === T, "순수성: applyDailyCap은 원본 상태를 바꾸지 않음");
  const legacy = ensureReviewState({ completed: [1, 2, 3], completedAt: { 1: "2026-10-01" }, reviewState: {} }, T);
  ok(legacy[1].step === 0 && legacy[1].due === T && legacy[1].last === "2026-10-01" && legacy[2].last === T && legacy[3].due === T, "레거시 편입: 스케줄 없는 완료 문장은 step 0·due 오늘로 편입 (last는 완료일 우선)");
  const legacyMany = { completed: [], completedAt: {}, reviewState: {} };
  for (let i = 1; i <= 25; i++) legacyMany.completed.push(i);
  const lm = ensureReviewState(legacyMany, T);
  ok(dueReviewIds(lm, T).length === 20 && [21, 25].every(i => lm[i].due === "2026-10-23"), "레거시 편입: 25개 편입 시 20개만 오늘, 나머지는 내일로");
  const keep = ensureReviewState({ completed: [1], completedAt: {}, reviewState: { 1: { step: 3, due: "2026-11-01", last: "2026-10-16" } } }, T);
  ok(keep[1].step === 3 && keep[1].due === "2026-11-01", "레거시 편입: 기존 스케줄은 그대로 유지됨");
  const overdue = { 9: { step: 2, due: "2026-10-01", last: "2026-09-24" } };
  const re = nextSchedule(overdue, 9, true, T);
  ok(re[9].step === 3 && re[9].due === "2026-11-07" && re[9].last === T, "연체 재시작: 늦게 처리해도 오늘 기준으로 다음 간격 계산 (페널티 없음)");
  ok(countReviewsToday({ reviewDates: [T, T, "2026-10-21"] }, T) === 2 && countReviewsToday({}, T) === 0, "오늘 처리한 복습 수: reviewDates에서 오늘 처리 건수 집계");
  ok(curveLitToday({ reviewState: {}, doneDates: [T] }, T) === true, "곡선 판정: due 없고 오늘 신규 학습 → 켜짐");
  ok(curveLitToday({ reviewState: { 1: { step: 0, due: T, last: "2026-10-20" } }, doneDates: [T] }, T) === false, "곡선 판정: 오늘 due가 남아 있으면 학습해도 꺼짐");
  ok(curveLitToday({ reviewState: { 1: { step: 1, due: "2026-10-25", last: T, lastOk: T } }, doneDates: [] }, T) === true, "곡선 판정: 오늘 due를 정답으로 해결하면 켜짐 (lastOk 기준)");
  ok(curveLitToday({ reviewState: {}, doneDates: [] }, T) === false, "곡선 판정: 아무 학습이 없으면 꺼짐");
  ok(curveLitToday({ reviewState: { 1: { step: 0, due: "2026-10-01", last: "2026-09-30" } }, doneDates: [] }, T) === false, "곡선 판정: 연체 due가 남아 있어도 꺼짐");
  const cd1 = syncCurveDays({ reviewState: {}, doneDates: [T], curveDays: ["2026-10-20"] }, T);
  ok(cd1.join(",") === "2026-10-20,2026-10-22", "곡선 기록: 켜진 날이 누적에 더해짐");
  const cd2 = syncCurveDays({ reviewState: { 1: { step: 0, due: T, last: "2026-10-20" } }, doneDates: [], curveDays: ["2026-10-20"] }, T);
  ok(cd2.join(",") === "2026-10-20", "곡선 기록: 하루를 빠져도 누적은 줄지 않음 (리셋 없음)");
  const cl = cloneReviewState({ 1: { step: "x", due: 5, last: null } });
  ok(cl[1].step === 0 && cl[1].due === null && cl[1].last === null, "정규화: 깨진 스케줄 항목은 안전한 기본값으로");
  ok(cl[1].lastOk === null, "정규화: lastOk도 안전한 기본값으로");
  const lok = nextSchedule({ 7: { step: 0, due: T, last: "2026-10-21", lastOk: "2026-10-21" } }, 7, false, T);
  ok(lok[7].lastOk === "2026-10-21", "전이: 오답이어도 이전 lastOk는 보존됨 (해결 이력 유지)");
  const snapB = ids => ({ reviewState: {}, dueSnapshot: { date: T, ids: ids }, doneDates: [], curveDays: [] });
  const wrongB = snapB([1]); wrongB.reviewState = { 1: { step: 0, due: "2026-10-23", last: T, lastOk: null } };
  ok(curveLitToday(wrongB, T) === false, "곡선 판정(v1.35.1): due를 틀려 due가 내일로 가도 스냅샷 기준 미해결이라 꺼짐");
  const partB = snapB([1, 2]); partB.reviewState = { 1: { step: 1, due: "2026-10-25", last: T, lastOk: T }, 2: { step: 0, due: "2026-10-23", last: T, lastOk: null } };
  ok(curveLitToday(partB, T) === false, "곡선 판정(v1.35.1): 일부만 정답이면 꺼짐");
  const allB = snapB([1, 2]); allB.reviewState = { 1: { step: 1, due: "2026-10-25", last: T, lastOk: T }, 2: { step: 2, due: "2026-10-29", last: T, lastOk: T } };
  ok(curveLitToday(allB, T) === true, "곡선 판정(v1.35.1): 전부 정답으로 해결하면 켜짐");
  let wst = { 1: { step: 0, due: T, last: "2026-10-21", lastOk: null } };
  const wB = { reviewState: wst, dueSnapshot: { date: T, ids: [1] }, doneDates: [], curveDays: [] };
  wst = nextSchedule(wst, 1, false, T); wB.reviewState = wst;
  ok(curveLitToday(wB, T) === false, "곡선 판정(v1.35.1): 오답 직후에는 꺼짐");
  wst = nextSchedule(wst, 1, true, T); wB.reviewState = wst;
  ok(curveLitToday(wB, T) === true && wst[1].lastOk === T, "곡선 판정(v1.35.1): 그날 다시 풀어 맞히면 해결로 전환되어 켜짐");
  const attemptB = { reviewState: { 1: { step: 0, due: "2026-10-25", last: T, lastOk: null } }, doneDates: [], curveDays: [] };
  ok(curveLitToday(attemptB, T) === false, "곡선 판정(v1.35.1): due 없는 날 오답 시도만으로는 켜지지 않음 (시도≠해결)");
  ok(syncCurveDays(wrongB, T).length === 0, "곡선 기록(v1.35.1): 전부 오답인 날은 기록에 더해지지 않음");
  let wtx = updateWrongToday(null, 5, false, T);
  ok(wtx.date === T && wtx.ids.join(",") === "5", "틀린 문장: 오답이면 오늘 목록에 저장됨");
  wtx = updateWrongToday(wtx, 5, true, T);
  ok(wtx.ids.length === 0, "틀린 문장: 다시 맞히면 목록에서 빠짐");
  ok(wrongTodayIds({ wrongToday: { date: "2026-10-21", ids: [5] } }, T).length === 0, "틀린 문장: 날짜가 바뀌면 어제 목록은 무효 (일반 due로 흡수)");
  const qs = { 1: { step: 2, due: "2026-10-20" }, 2: { step: 3, due: "2026-10-19" }, 3: { step: 1, due: "2026-10-19" }, 4: { step: 1, due: "2026-10-19" } };
  ok(JSON.stringify(sortReviewIds(qs, [1, 2, 3, 4])) === JSON.stringify([3, 4, 2, 1]), "큐 순서: due 이른 순 → step 낮은 순 → id 순");
  ok(JSON.stringify(sortReviewIds(qs, [4, 3])) === JSON.stringify([3, 4]), "큐 순서: 같은 due·step이면 id 순");
  ok(JSON.stringify(unresolvedDueIds(wrongB, T)) === JSON.stringify([1]), "미해결: 스냅샷에 있고 오늘 정답이 없으면 미해결");
  ok(JSON.stringify(dueUniverseNow(allB, T)) === JSON.stringify([1, 2]), "도전 범위: 오늘 due 전체(스냅샷 포함)가 잡힘");`);
// 병합 확장 (schedule·curveDays) — mpdSrc·ptrSrc는 Ensemble 섹션에서 이미 eval됨
{ const m = mergeProgressData(
    { completed: [1], completedAt: {}, reviewCorrect: 0, reviewIds: [], reviewState: { 1: { step: 1, due: "2026-10-23", last: "2026-10-20" } }, curveDays: ["2026-10-19"] },
    { completed: {}, review_correct: { ids: [], count: 0, schedule: { 1: { step: 2, due: "2026-10-28", last: "2026-10-21" }, 2: { step: 0, due: "2026-10-23", last: "2026-10-21" } }, curveDays: ["2026-10-20", "2026-10-19"] } });
  ok(m.reviewState[1].step === 2 && m.reviewState[2].step === 0, "병합 확장: schedule은 id별로 last가 더 최근인 쪽을 채택");
  ok(m.curveDays.join(",") === "2026-10-19,2026-10-20", "병합 확장: curveDays는 합집합");
  const m2 = mergeProgressData(
    { completed: [], completedAt: {}, reviewCorrect: 0, reviewIds: [], reviewState: { 1: { step: 3, due: "2026-11-07", last: "2026-10-22" } }, curveDays: [] },
    { completed: {}, review_correct: { ids: [], count: 0, schedule: { 1: { step: 2, due: "2026-10-28", last: "2026-10-21" } }, curveDays: [] } });
  ok(m2.reviewState[1].step === 3, "병합 확장: 로컬 last가 더 최근이면 로컬 스케줄 유지");
  const m3 = mergeProgressData(
    { completed: [5], completedAt: {}, reviewCorrect: 0, reviewIds: [], reviewState: { 5: { step: 1, due: "2026-10-25", last: "2026-10-22" } }, curveDays: ["2026-10-22"] },
    { completed: {}, review_correct: { ids: [], count: 0 } });
  ok(m3.reviewState[5].step === 1 && m3.curveDays.join(",") === "2026-10-22", "병합 확장: 구버전 페이로드(확장 필드 없음)와 섞여도 로컬 스케줄·곡선 기록 유지");
  const m4 = mergeProgressData({ completed: [], completedAt: {}, reviewCorrect: 0, reviewIds: [] }, { completed: {}, review_correct: [3] });
  ok(m4.reviewState && Object.keys(m4.reviewState).length === 0 && Array.isArray(m4.curveDays), "병합 확장: 레거시 배열형 review_correct에서도 깨지지 않음");
  const rt = progressToRemote({ completed: [1], completedAt: {}, reviewCorrect: 1, reviewIds: [1], reviewState: { 1: { step: 0, due: "2026-10-23", last: "2026-10-22" } }, curveDays: ["2026-10-22"] });
  ok(rt.review_correct.schedule[1].due === "2026-10-23" && rt.review_correct.curveDays.join(",") === "2026-10-22", "업로드 확장: review_correct 안에 schedule·curveDays가 함께 나감 (스키마 변경 없음)");
  const rf1 = remoteReviewFull([1, 2]);
  ok(Object.keys(rf1.schedule).length === 0 && rf1.curveDays.length === 0 && rf1.count === 2, "원격 해석: 레거시 배열은 schedule·curveDays가 빈 값으로 안전하게 해석됨");
  const rf2 = remoteReviewFull({ ids: [], count: 0, schedule: { 3: { step: 1, due: "2026-10-25", last: "2026-10-22" } }, curveDays: ["2026-10-22"] });
  ok(rf2.schedule[3].step === 1 && rf2.curveDays[0] === "2026-10-22", "원격 해석: 확장 필드가 있으면 schedule·curveDays를 읽음");
}
{ const m5 = mergeProgressData(
    { completed: [], completedAt: {}, reviewCorrect: 0, reviewIds: [], reviewState: { 1: { step: 1, due: "2026-10-25", last: "2026-10-22", lastOk: "2026-10-22" } }, curveDays: [], dueSnapshot: { date: "2026-10-22", ids: [1, 2] }, wrongToday: { date: "2026-10-22", ids: [2] } },
    { completed: {}, review_correct: { ids: [], count: 0, schedule: {}, curveDays: [], dueSnapshot: { date: "2026-10-22", ids: [2, 3] }, wrongToday: { date: "2026-10-22", ids: [3] } } });
  ok(m5.dueSnapshot && m5.dueSnapshot.ids.join(",") === "1,2,3", "병합 확장(v1.35.1): 같은 날짜 due 스냅샷은 합집합");
  ok(m5.wrongToday && m5.wrongToday.ids.join(",") === "2,3", "병합 확장(v1.35.1): 틀린 문장은 합집합 (해결된 것은 스케줄 lastOk로 제외)");
  const rt3 = progressToRemote({ completed: [], completedAt: {}, reviewCorrect: 0, reviewIds: [], reviewState: {}, curveDays: [], dueSnapshot: { date: "2026-10-22", ids: [1] }, wrongToday: { date: "2026-10-22", ids: [1] } });
  ok(rt3.review_correct.dueSnapshot.ids.join(",") === "1" && rt3.review_correct.wrongToday.ids.join(",") === "1", "업로드 확장(v1.35.1): dueSnapshot·wrongToday도 review_correct에 함께 나감");
}
// UI 스모크: 지도 스트립·오늘의 복습 카드 3상태·큐 우선 출제·세션 요약
const RV_ELS = {};
function makeRvEl(id) {
  const el = { id: id, value: "", style: {}, textContent: "", onclick: null, _html: "", _listeners: {},
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    setAttribute() {}, getAttribute() { return null; },
    addEventListener(t, f) { this._listeners[t] = f; },
    focus() {}, scrollIntoView() {} };
  Object.defineProperty(el, "innerHTML", {
    get() { return this._html; },
    set(v) { this._html = v; const re = /id="([^"]+)"/g; let m; while ((m = re.exec(v))) { if (!RV_ELS[m[1]]) RV_ELS[m[1]] = makeRvEl(m[1]); } }
  });
  return el;
}
const rvDocument = {
  getElementById(id) { if (!RV_ELS[id]) RV_ELS[id] = makeRvEl(id); return RV_ELS[id]; },
  querySelectorAll() { return []; }
};
const rvPrelude = [
  'let progress = null;',
  'let currentStep = 1;',
  'let quizItem = null;',
  'let quizSeen = new Set();',
  'let quizMode = "free";',
  'let quizChallengeTotal = 0;',
  'let quizDueUniverse = [];',
  'let completionInFlight = false;',
  'let quizAnswered = false;',
  'let currentTab = "study";',
  'const document = rvDocument;',
  'const window = { scrollTo() {} };',
  'const requestAnimationFrame = fn => fn();',
  'function saveProgress(){}',
  'function renderVaultState(){}',
  'function playSound(){}',
  'function speakFr(){}',
  'function clearSpeakingUI(){}',
  'function showTab(){}',
  'function renderBrowse(){}',
  'function renderWords(){}'
].join("\n");
const rvFns = [
  escSrc, swSrc, dwSrc, normSrc, corrSrc, chSrc, whSrc,
  lvArrSrc, lvlSrc, xpSrc2, tsSrc, qpSrc,
  SCHED_SRCS, MAPSTRIP_SRC,
  html.match(/const SPEAKER_SVG = [^\n]*/)[0],
  html.match(/const SPEAKER_SLOW_SVG = [^\n]*/)[0],
  html.match(/function slowListenBtnHtml\(\)[^\n]*/)[0],
  html.match(/function setStep\(n\)\{[^}]*\}/)[0],
  html.match(/function currentItem\(\)\{[^}]*\}/)[0],
  tkSrc,
  html.match(/function countToday\(p\)\{[^}]*\}/)[0],
  html.match(/function bindWordProg[\s\S]*?\n\}/)[0],
  html.match(/function soundEnabled\(\)[^\n]*/)[0],
  html.match(/const COMPLETE_MOTIFS = \{[\s\S]*?\n\};/)[0],
  html.match(/const COMPLETE_NOTE_GAP = [^\n]*/)[0],
  html.match(/const COMPLETE_NOTE_DUR = [^\n]*/)[0],
  html.match(/function playCompleteSound\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function renderProgress\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function renderLevelChips\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function renderTopicTag\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function scopeLabel\(\)\{[\s\S]*?\n\}/)[0],
  rsSrc2, ctSrc, csSrc,
  html.match(/function renderQuizEntry\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function startQuiz[\s\S]*?\n\}/)[0],
  qwhSrc, qcandSrc, challengeSrcs,
  cqSrc,
  html.match(/function endQuiz\(\)\{[^}]*\}/)[0]
].join("\n");
eval(rvPrelude + "\n" + helperSrc + "\n" + rvFns + "\n" + [
  'progress = migrateProgress(null);',
  'const B = progress.byLang.fr;',
  'const TK = todayKey();',
  // 지도 스트립
  'B.completed = ITEMS.slice(0, 5).map(i => i.id);',
  'renderMapStrip();',
  'ok((RV_ELS["mapStrip"].innerHTML.match(/class="mapcell"/g) || []).length === 10, "지도 스트립 스모크: 주제 10개 셀이 한 줄로 렌더됨");',
  'ok(RV_ELS["mapStrip"].innerHTML.includes("정복 지도") && RV_ELS["mapStrip"].innerHTML.includes(ITEMS[0].topic), "지도 스트립 스모크: 제목·주제 이름이 표시됨");',
  'ok(!!RV_ELS["mapStripBtn"], "지도 스트립 스모크: 누르면 지도 시트를 여는 버튼이 있음");',
  // 카드 상태 3: 완료 없음 → 안내 상태 (숨기지 않음)
  'B.completed = []; B.reviewState = {}; B.curveDays = []; B.doneDates = [];',
  'renderQuizEntry();',
  'ok(RV_ELS["quizArea"].innerHTML.includes("오늘 복습 없음 · 곡선 위에 있어요") && RV_ELS["quizArea"].innerHTML.includes("첫 문장을 완료하면"), "복습 카드 스모크: 완료가 없어도 카드는 상태를 보여줌 (첫 문장 안내)");',
  // 실제 흐름으로 1문장 완료 → 스케줄 편입 + 세션 요약 화면
  'B.index = 0; currentStep = 3; renderStudy();',
  'RV_ELS["typeInput"].value = ITEMS[0].fr; checkTyping(); RV_ELS["advanceBtn"].onclick();',
  'const id0 = ITEMS[0].id;',
  'ok(B.reviewState[id0] && B.reviewState[id0].step === 0 && B.reviewState[id0].due === addDaysKey(TK, 1), "완료 스모크: 문장을 완료하면 복습 스케줄(step 0, due 내일)에 편입됨");',
  'ok(RV_ELS["doneBox"].innerHTML.includes("오늘은 여기까지") && !!RV_ELS["doneForTodayBtn"], "세션 완료 스모크: 완료 화면에 [오늘은 여기까지] 버튼이 있음");',
  'ok(RV_ELS["doneBox"].innerHTML.includes("오늘 복습 0개 처리") && RV_ELS["doneBox"].innerHTML.includes("망각곡선"), "세션 완료 스모크: 오늘 복습 처리 수·곡선 상태가 요약에 표시됨");',
  'ok(B.curveDays.includes(TK), "완료 스모크: 오늘 학습했으므로 곡선 기록에 오늘이 누적됨");',
  // 카드 상태 2: due 없음 → 곡선 위에 있어요 + 곡선 켜짐 표시
  'renderQuizEntry();',
  'ok(RV_ELS["quizArea"].innerHTML.includes("오늘 복습 없음 · 곡선 위에 있어요") && RV_ELS["quizArea"].innerHTML.includes("망각곡선 기록 +1일") && RV_ELS["quizArea"].innerHTML.includes("오늘의 곡선 켜짐"), "복습 카드 스모크: due가 없으면 곡선 상태와 기록(+1일)이 표시됨");',
  // 카드 상태 1: due 있음 → 개수와 시작 버튼, 완료 수 무관하게 시작 가능
  'B.completed = [ITEMS[0].id, ITEMS[1].id, ITEMS[2].id];',
  'B.reviewState = {}; B.reviewState[ITEMS[0].id] = { step: 0, due: TK, last: "2026-10-20" }; B.reviewState[ITEMS[1].id] = { step: 1, due: addDaysKey(TK, 3), last: TK }; B.reviewState[ITEMS[2].id] = { step: 0, due: addDaysKey(TK, 1), last: TK };',
  'B.index = 1; currentStep = 1;',
  'renderQuizEntry();',
  'ok(RV_ELS["quizArea"].innerHTML.includes("오늘 복습할 문장 <b>1개</b>") && RV_ELS["quizArea"].innerHTML.includes("망각곡선 도전하기"), "복습 카드 스모크: due가 있으면 개수와 망각곡선 도전 버튼이 표시됨");',
  'ok(quizItem === null, "복습 카드 스모크: 도전하기 전에는 due가 자동으로 출제되지 않음");',
  'RV_ELS["quizStartBtn"].onclick();',
  'ok(!!quizItem && quizItem.id === ITEMS[0].id, "복습 출제 스모크: due 문장이 자유 복습보다 먼저 출제됨");',
  'ok(RV_ELS["quizArea"].innerHTML.includes("망각곡선 도전 · 해결 0/1"), "복습 출제 스모크: due 출제는 망각곡선 도전 + 진행(해결 0/1)으로 표시됨");',
  'RV_ELS["quizInput"].value = itemText(quizItem); checkQuiz();',
  'ok(B.reviewState[ITEMS[0].id].step === 1 && B.reviewState[ITEMS[0].id].due === addDaysKey(TK, 3), "복습 채점 스모크: 정답이면 step 1, due +3일로 전이");',
  'ok(B.reviewCorrect === 1 && B.reviewIds.join(",") === String(ITEMS[0].id), "복습 채점 스모크: 정답 XP 재료(reviewCorrect·reviewIds)도 기존처럼 기록됨");',
  'endQuiz();',
  'ok(RV_ELS["quizArea"].innerHTML.includes("오늘 복습 없음"), "복습 종료 스모크: due를 다 처리하면 카드가 곡선 위 상태로 돌아감");',
  // 오답 전이: 다시 due로 만들어 틀리면 step 0·due 내일
  'B.reviewState[ITEMS[0].id] = { step: 2, due: TK, last: "2026-10-19" };',
  'renderQuizEntry(); RV_ELS["quizStartBtn"].onclick();',
  'ok(!!quizItem && quizItem.id === ITEMS[0].id, "복습 출제 스모크: 다시 due가 된 문장이 또 먼저 출제됨");',
  'RV_ELS["quizInput"].value = "전혀 다른 문장"; checkQuiz();',
  'ok(B.reviewState[ITEMS[0].id].step === 0 && B.reviewState[ITEMS[0].id].due === addDaysKey(TK, 1), "복습 채점 스모크: 오답이면 step 0, due는 내일");',
  'ok(countReviewsToday(B, TK) >= 1, "복습 채점 스모크: 오늘 처리한 복습 수가 집계됨");',
  'ok(wrongTodayIds(B, TK).join(",") === String(ITEMS[0].id) && B.dueSnapshot && B.dueSnapshot.date === TK, "복습 채점 스모크: 틀린 문장과 오늘 due 스냅샷이 진도에 저장됨 (껐다 켜도 유지)");',
  'ok(curveLitToday(B, TK) === false, "복습 채점 스모크: due를 틀린 채로 두면 곡선이 켜지지 않음");',
  'endQuiz();',
  'ok(RV_ELS["quizArea"].innerHTML.includes("틀린 문장") && !!RV_ELS["quizRetryBtn"], "복습 카드 스모크: 미해결 오답이 있으면 카드에 틀린 문장 상태와 다시 풀기 버튼이 남음");'
].join("\n"));

console.log("\n[지도 시트·망각곡선 도전 (v1.35.1)]");
eval(rvPrelude + "\n" + helperSrc + "\n" + rvFns + "\n" + mapSheetSrcs + "\n" + [
  'progress = migrateProgress(null);',
  'const B = progress.byLang.fr;',
  'const TK = todayKey();',
  'const i0 = ITEMS[0], i1 = ITEMS[1], i2 = ITEMS[2], i3 = ITEMS[3];',
  // --- 지도 시트: 열면 공부 위치 그대로, 주제를 누르면 그 주제로 이동 ---
  'B.completed = ITEMS.slice(0, 5).map(i => i.id); B.index = 2; currentStep = 1;',
  'renderMapStrip();',
  'RV_ELS["mapStripBtn"].onclick();',
  'ok(RV_ELS["mapOverlay"].hidden === false, "지도 시트 스모크: 스트립을 누르면 탭 이동 없이 시트가 열림");',
  'ok(RV_ELS["mapSheetGrid"].innerHTML.includes(i0.topic) && (RV_ELS["mapSheetGrid"].innerHTML.match(/class="mapcard"/g) || []).length === 10, "지도 시트 스모크: 주제 10개 진행 카드가 시트에 렌더됨");',
  'ok(B.index === 2 && currentStep === 1, "지도 시트 스모크: 시트를 열어도 공부 위치는 그대로");',
  'closeMapSheet();',
  'ok(RV_ELS["mapOverlay"].hidden === true && B.index === 2, "지도 시트 스모크: 그냥 닫으면 보던 문장 위치로 복귀");',
  'const expIdx = ITEMS.findIndex(x => x.topic === i0.topic && !B.completed.includes(x.id));',
  'goToTopicStudy(i0.topic);',
  'ok(B.index === expIdx && currentStep === 1, "지도 시트 스모크: 주제를 누르면 그 주제의 첫 미완료 문장으로 공부 이동");',
  // --- 망각곡선 도전: 자동 출제 없음 → 도전 → 오답 → 재풀기 → 결과 화면 ---
  'B.completed = [i0.id, i1.id, i2.id];',
  'B.reviewState = {}; B.reviewState[i0.id] = { step: 0, due: TK, last: "2026-10-20", lastOk: null }; B.reviewState[i1.id] = { step: 1, due: TK, last: "2026-10-20", lastOk: null }; B.reviewState[i2.id] = { step: 0, due: addDaysKey(TK, 7), last: TK, lastOk: null };',
  'B.doneDates = []; B.curveDays = []; B.wrongToday = null; B.dueSnapshot = null; B.reviewDates = []; B.reviewCorrect = 0; B.reviewIds = []; B.index = 2;',
  'endQuiz(); renderQuizEntry();',
  'ok(quizItem === null && RV_ELS["quizArea"].innerHTML.includes("망각곡선 도전하기") && RV_ELS["quizArea"].innerHTML.includes("오늘 복습할 문장 <b>2개</b>"), "도전 스모크: 도전하기 전에는 due가 자동 출제되지 않고 진입 카드만 보임");',
  'RV_ELS["quizStartBtn"].onclick();',
  'ok(!!quizItem && quizItem.id === i0.id, "도전 스모크: 도전하면 due 큐 첫 문장(step 낮은 순)부터 출제됨");',
  'ok(RV_ELS["quizArea"].innerHTML.includes("망각곡선 도전 · 해결 0/2"), "도전 스모크: 상단에 진행 표시(해결 0/2)");',
  'RV_ELS["quizInput"].value = "전혀 다른 문장"; checkQuiz();',
  'ok(wrongTodayIds(B, TK).join(",") === String(i0.id) && curveLitToday(B, TK) === false, "도전 스모크: 틀리면 미해결로 쌓이고 곡선은 켜지지 않음");',
  'ok(!!RV_ELS["quizMoreBtn"], "도전 스모크: 남은 due가 있으면 한 문제 더로 이어짐");',
  'RV_ELS["quizMoreBtn"].onclick();',
  'ok(!!quizItem && quizItem.id === i1.id && RV_ELS["quizArea"].innerHTML.includes("해결 0/2"), "도전 스모크: 다음 due 출제, 진행은 아직 0/2");',
  'RV_ELS["quizInput"].value = itemText(quizItem); checkQuiz();',
  'ok(RV_ELS["quizFb"].innerHTML.includes("틀린 문장 <b>1개</b>가 남았어요") && !!RV_ELS["quizRetryBtn"], "도전 스모크: due를 다 돌면 종료가 아니라 틀린 문장 재풀기 안내가 뜸");',
  'RV_ELS["quizRetryBtn"].onclick();',
  'ok(!!quizItem && quizItem.id === i0.id && RV_ELS["quizArea"].innerHTML.includes("틀린 문장 다시 풀기 · 해결 1/2"), "도전 스모크: 재풀기는 틀린 문장만, 진행 1/2 표시");',
  'RV_ELS["quizInput"].value = itemText(quizItem); checkQuiz();',
  'ok(!!RV_ELS["quizResultBtn"] && B.curveDays.includes(TK), "도전 스모크: 전부 해결하면 결과 보기 버튼 + 곡선 기록에 오늘 누적");',
  'RV_ELS["quizResultBtn"].onclick();',
  'ok(RV_ELS["quizArea"].innerHTML.includes("오늘의 곡선 켜짐") && RV_ELS["quizArea"].innerHTML.includes("망각곡선 기록 +1일") && RV_ELS["quizArea"].innerHTML.includes("오늘 해결한 문장 <b>2개</b>") && !!RV_ELS["quizToStudyBtn"], "도전 결과 스모크: 점등·기록 +1일·오늘 해결 2개·공부로 돌아가기 표시");',
  'RV_ELS["quizToStudyBtn"].onclick();',
  'ok(quizItem === null && RV_ELS["quizArea"].innerHTML.includes("오늘 복습 없음"), "도전 결과 스모크: 공부로 돌아가면 진입 카드 상태로 복귀");',
  // --- 자유 복습 격리: 스케줄·곡선 무영향 ---
  'B.completed = [i0.id, i1.id, i2.id];',
  'B.reviewState = {}; B.reviewState[i0.id] = { step: 2, due: addDaysKey(TK, 7), last: "2026-10-20", lastOk: null }; B.reviewState[i1.id] = { step: 1, due: addDaysKey(TK, 3), last: "2026-10-20", lastOk: null }; B.reviewState[i2.id] = { step: 0, due: addDaysKey(TK, 1), last: TK, lastOk: null };',
  'B.dueSnapshot = { date: TK, ids: [] }; B.wrongToday = null; B.curveDays = []; B.reviewCorrect = 0; B.reviewIds = []; B.index = 0;',
  'endQuiz(); renderQuizEntry();',
  'ok(!!RV_ELS["quizFreeBtn"], "자유 복습 스모크: due가 없으면 카드에 자유 복습 버튼이 있음");',
  'const stBefore = JSON.stringify(B.reviewState);',
  'RV_ELS["quizFreeBtn"].onclick();',
  'ok(!!quizItem && quizItem.id !== i0.id, "자유 복습 스모크: 끝낸 문장에서 출제됨 (현재 문장 제외)");',
  'RV_ELS["quizInput"].value = "전혀 다른 문장"; checkQuiz();',
  'ok(JSON.stringify(B.reviewState) === stBefore && wrongTodayIds(B, TK).length === 0 && B.curveDays.length === 0, "자유 복습 스모크: 틀려도 스케줄·틀린 목록·곡선 기록이 변하지 않음");',
  'RV_ELS["quizMoreBtn"].onclick();',
  'RV_ELS["quizInput"].value = itemText(quizItem); checkQuiz();',
  'ok(B.reviewCorrect === 1 && JSON.stringify(B.reviewState) === stBefore, "자유 복습 스모크: 맞히면 XP 재료만 기록되고 스케줄은 그대로");',
  'endQuiz();',
  // --- 결정적 순서: due 이른 순 → step 낮은 순 → id 순 ---
  'B.completed = [i0.id, i1.id, i2.id, i3.id];',
  'B.reviewState = {}; B.reviewState[i0.id] = { step: 3, due: addDaysKey(TK, -2), last: "2026-10-19", lastOk: null }; B.reviewState[i1.id] = { step: 0, due: TK, last: "2026-10-19", lastOk: null }; B.reviewState[i2.id] = { step: 0, due: TK, last: "2026-10-19", lastOk: null }; B.reviewState[i3.id] = { step: 1, due: TK, last: "2026-10-19", lastOk: null };',
  'B.dueSnapshot = null; B.wrongToday = null; B.curveDays = []; B.index = 4;',
  'endQuiz(); renderQuizEntry();',
  'const order = [];',
  'RV_ELS["quizStartBtn"].onclick(); order.push(quizItem.id);',
  'RV_ELS["quizInput"].value = itemText(quizItem); checkQuiz(); RV_ELS["quizMoreBtn"].onclick(); order.push(quizItem.id);',
  'RV_ELS["quizInput"].value = itemText(quizItem); checkQuiz(); RV_ELS["quizMoreBtn"].onclick(); order.push(quizItem.id);',
  'RV_ELS["quizInput"].value = itemText(quizItem); checkQuiz(); RV_ELS["quizMoreBtn"].onclick(); order.push(quizItem.id);',
  'RV_ELS["quizInput"].value = itemText(quizItem); checkQuiz();',
  'ok(order.join(",") === [i0.id, i1.id, i2.id, i3.id].join(","), "도전 순서 스모크: due 이른 순 → step 낮은 순 → id 순으로 결정적 출제 (실제 " + order.join(",") + ")");',
  'ok(!!RV_ELS["quizResultBtn"], "도전 순서 스모크: 전부 해결하면 결과 보기 버튼이 뜸");',
  'endQuiz();',
  // --- (v1.35.3) 주제·레벨 쌍 유지 + 지도에서 선택하면 시트 닫힘 ---
  'B.completed = []; B.topicFilter = "전체"; B.levelFilter = "전체"; B.index = 0; currentStep = 1;',
  'renderMapStrip(); RV_ELS["mapStripBtn"].onclick();',
  'ok(RV_ELS["mapOverlay"].hidden === false, "쌍 유지 스모크: 지도 시트가 열림");',
  'ok(RV_ELS["mapSheetGrid"].innerHTML.includes(\'data-mapsheet="전체"\') && RV_ELS["mapSheetGrid"].innerHTML.indexOf(\'data-mapsheet="전체"\') < RV_ELS["mapSheetGrid"].innerHTML.indexOf(\'data-mapsheet="이민"\'), "전체 카드 스모크: 지도 시트 맨 앞에 전체 카드가 있음");',
  'ok(RV_ELS["mapSheetGrid"].innerHTML.includes(\'class="mapcard selected" data-mapsheet="전체"\'), "전체 카드 스모크: 전체 주제로 공부 중일 때는 전체 카드가 색칠됨");',
  'goToTopicStudy("이민");',
  'ok(RV_ELS["mapOverlay"].hidden === true, "제보1 스모크: 지도에서 주제를 선택하면 시트가 자동으로 닫힘");',
  'ok(B.topicFilter === "이민" && B.levelFilter === "전체" && currentItem().topic === "이민", "쌍 유지 스모크: 지도 선택은 주제만 정하고 레벨은 건드리지 않음");',
  'setLevelFilter("A1");',
  'ok(B.topicFilter === "이민" && B.levelFilter === "A1" && currentItem().topic === "이민" && currentItem().level === "A1", "제보2 스모크: 이민을 본 채로 A1을 눌러도 일상으로 돌아가지 않고 이민 A1이 표시됨");',
  'ok(RV_ELS["progressLine"].textContent.indexOf("이민 · A1에서") === 0, "쌍 유지 스모크: 진행 표기가 이민 · A1 범위를 표시 (실제: " + RV_ELS["progressLine"].textContent + ")");',
  'setTopicFilter("교통");',
  'ok(B.topicFilter === "교통" && B.levelFilter === "A1" && currentItem().topic === "교통" && currentItem().level === "A1", "쌍 유지 스모크: 주제를 바꿔도 레벨 A1이 유지됨");',
  'renderMapStrip(); RV_ELS["mapStripBtn"].onclick();',
  'ok(RV_ELS["mapOverlay"].hidden === false, "제보1 스모크: 지도 시트가 다시 열림");',
  'const gi = ITEMS.findIndex(x => x.topic === "건강" && x.level === "B1");',
  'goToItem(gi, 1);',
  'ok(RV_ELS["mapOverlay"].hidden === true && B.topicFilter === "건강" && B.levelFilter === "B1" && currentItem().id === ITEMS[gi].id, "제보1 스모크: 지도에서 문장을 선택해도 시트가 닫히고 (주제, 레벨) 쌍이 그 문장에 맞춰짐");',
  'goToTopicStudy("전체");',
  'ok(B.topicFilter === "전체" && B.levelFilter === "B1" && RV_ELS["topicTag"].innerHTML === "", "전체 카드 스모크: 전체를 고르면 주제는 해제되고 레벨(B1) 쌍은 유지되며 주제 태그가 사라짐");'
].join("\n"));


console.log("\n[지도 교통정리·시트 닫힘·스크롤 잠금·단어 듣기 표기 (v1.35.3)]");
ok(html.indexOf('id="topicChips"') === -1, "공부 탭 정리(v1.35.4): 공부 화면에 주제 칩 행이 없음");
ok(html.indexOf('id="topicTag"') > -1 && html.indexOf('id="topicTag"') < html.indexOf('id="levelChips"'), "공부 탭 정리(v1.35.4): 주제 태그 자리가 레벨 칩 위에 있음");
ok(html.match(/function defaultLangProgress\(\)[^\n]*/)[0].includes('topicFilter:"전체"'), "주제 필터: 언어별 진도 기본값에 topicFilter(전체)가 있음");
ok(html.match(/function migrateProgress\(raw\)\{[\s\S]*?\n\}/)[0].includes('"topicFilter"'), "주제 필터: 구 저장본 마이그레이션이 topicFilter를 기본값으로 채움");
ok(rsSrc2.includes("renderTopicTag()"), "주제 태그: 공부 렌더가 주제 태그를 함께 그림");
const gttSrc = html.match(/function goToTopicStudy\(topic\)\{[\s\S]*?\n\}/)[0];
ok(gttSrc.includes("closeMapSheet()") && gttSrc.includes("topicFilter") && !gttSrc.includes("levelFilter"), "제보1·2: 지도 주제 선택은 시트부터 닫고 주제만 바꾸며 레벨은 건드리지 않음");
const gtiLine = html.match(/function goToItem\(idx, step\)[^\n]*/)[0];
ok(gtiLine.includes("closeMapSheet()") && gtiLine.includes("P().topicFilter = it.topic") && gtiLine.includes("P().levelFilter = it.level"), "제보1·2: 지도 문장 선택은 시트부터 닫고 (주제, 레벨) 쌍을 그 문장에 맞춤");
const slfSrc = html.match(/function setLevelFilter\(lv\)\{[\s\S]*?\n\}/)[0];
const stfSrc = html.match(/function setTopicFilter\(t\)\{[\s\S]*?\n\}/)[0];
ok(slfSrc.includes("repositionInQueue()") && !slfSrc.includes("topicFilter ="), "제보2: 레벨 변경은 주제를 초기화하지 않고 쌍 큐 안에서만 위치를 다시 잡음");
ok(stfSrc.includes("repositionInQueue()") && !stfSrc.includes("levelFilter ="), "제보2: 주제 변경은 레벨을 초기화하지 않고 쌍 큐 안에서만 위치를 다시 잡음");

console.log("\n[주제 선택 피드백·공부 탭 주제 태그 (v1.35.4)]");
const rttSrc = html.match(/function renderTopicTag\(\)\{[\s\S]*?\n\}/)[0];
ok(rttSrc.includes('id="topicTagClear"') && rttSrc.includes('setTopicFilter("전체")'), "주제 태그: 특정 주제일 때만 태그가 뜨고 ✕로 전체로 해제됨");
ok(!rttSrc.includes("data-tfilter") && html.indexOf('data-tfilter') === -1, "공부 탭 정리: 주제 칩(data-tfilter)이 페이지에서 완전히 제거됨");
ok(html.includes(".mapcard.selected{"), "주제 선택 피드백: 선택된 주제 카드 색칠 CSS(.mapcard.selected)가 있음");
const rtmSrc2 = html.match(/function renderTopicMap\(\)\{[\s\S]*?\n\}/)[0];
ok(rtmSrc2.includes("selected") && rtmSrc2.includes("browseTopic"), "주제 선택 피드백: 주제별 지도 카드가 browseTopic과 같으면 selected로 색칠됨");
ok(rtmSrc2.includes("scrollToBrowseList()"), "주제 선택 피드백: 주제별 지도에서 주제를 누르면 목록으로 스크롤함");
const sblSrc = html.match(/function scrollToBrowseList\(\)\{[\s\S]*?\n\}/)[0];
ok(sblSrc.includes("scrollIntoView") && sblSrc.includes('"smooth"'), "주제 선택 피드백: 스크롤은 browseList로 부드럽게 이동함");
ok(!rbSrc.includes("data-topic") && !rbSrc.includes('getElementById("topicFilter")') && html.indexOf('id="topicFilter"') === -1, "주제 일원화(v1.35.5): 동그란 주제 필터 버튼 행이 주제별 탭에서 제거됨 (주제 선택은 지도로만)");
ok(rtmSrc2.includes('data-mtopic="전체"') && rtmSrc2.includes("allTopicStat"), "주제 일원화(v1.35.5): 주제별 지도 맨 앞에 전체 카드가 있음");
const rmsSrc2 = html.match(/function renderMapSheet\(\)\{[\s\S]*?\n\}/)[0];
ok(rmsSrc2.includes("selected") && rmsSrc2.includes("topicFilter()"), "주제 선택 피드백: 지도 시트 카드도 현재 공부 주제와 같으면 selected로 색칠됨");
ok(rmsSrc2.includes('data-mapsheet="전체"') && rmsSrc2.includes("allTopicStat"), "주제 일원화(v1.35.5): 공부 탭 지도 시트 맨 앞에도 전체 카드가 있음");
// 주제 태그 스모크: 지도에서 고르면 태그가 뜨고, ✕를 누르면 사라짐
eval(rvPrelude + "\n" + helperSrc + "\n" + rvFns + "\n" + mapSheetSrcs + "\n" + [
  'progress = migrateProgress(null);',
  'const B = progress.byLang.fr;',
  'renderStudy();',
  'ok(RV_ELS["topicTag"].innerHTML === "", "주제 태그 스모크: 전체 주제일 때는 태그가 표시되지 않음");',
  'goToTopicStudy("이민");',
  'ok(RV_ELS["topicTag"].innerHTML.includes("주제 · 이민") && !!RV_ELS["topicTagClear"], "주제 태그 스모크: 지도에서 주제를 고르면 공부 탭에 태그 하나로만 표시됨");',
  'RV_ELS["topicTagClear"].onclick();',
  'ok(B.topicFilter === "전체" && RV_ELS["topicTag"].innerHTML === "", "주제 태그 스모크: 태그 ✕를 누르면 전체 주제로 해제되고 태그가 사라짐");'
].join("\n"));
// 주제별 스모크: 지도 카드를 누르면 색칠 + 목록 세팅 + 자동 스크롤
const BR_ELS = {};
const brScrollCalls = [];
function makeBrEl(id){
  return { id: id, hidden: true, value: "", textContent: "", innerHTML: "", style: {},
    setAttribute(){}, getAttribute(){ return null; }, focus(){},
    scrollIntoView(opts){ if(id === "browseList") brScrollCalls.push(opts || {}); },
    classList: { toggle(){}, add(){}, remove(){}, contains(){ return false; } } };
}
function makeBrBtn(topic){
  return { _topic: topic, onclick: null, getAttribute(){ return this._topic; }, setAttribute(){} };
}
const brTopicBtns = ["전체"].concat([...new Set(ITEMS.map(i=>i.topic))]).map(makeBrBtn);
const brDocument = {
  getElementById(id){ if(!BR_ELS[id]) BR_ELS[id] = makeBrEl(id); return BR_ELS[id]; },
  querySelectorAll(sel){
    if(sel === "[data-mtopic]") return brTopicBtns;
    return [];
  },
  body: makeBrEl("body")
};
const brPrelude = [
  'let progress = null;',
  'const document = brDocument;',
  'function goToItem(){}'
].join("\n");
const brSrcs = [
  escSrc, tsSrc, atsSrc,
  html.match(/let browseTopic = "전체";/)[0],
  html.match(/function scrollToBrowseList\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function renderTopicMap\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function renderBrowse\(\)\{[\s\S]*?\n\}/)[0]
].join("\n");
eval(brPrelude + "\n" + helperSrc + "\n" + brSrcs + "\n" + [
  'progress = migrateProgress(null);',
  'renderBrowse();',
  'brTopicBtns.find(b => b._topic === "이민").onclick();',
  'ok(browseTopic === "이민", "주제별 스모크: 지도 카드를 누르면 그 주제가 선택됨");',
  'ok(BR_ELS["topicMap"].innerHTML.includes(\'class="mapcard selected" data-mtopic="이민"\') && (BR_ELS["topicMap"].innerHTML.match(/ selected"/g) || []).length === 1, "주제별 스모크: 선택한 주제 카드만 색칠됨");',
  'ok(BR_ELS["browseList"].innerHTML.includes("이민") && brScrollCalls.length === 1 && brScrollCalls[0].behavior === "smooth", "주제별 스모크: 선택하면 그 주제 문장이 세팅되고 목록 위치로 부드럽게 스크롤함");',
  'ok(BR_ELS["browseList"].innerHTML.includes("<b>" + (ITEMS.findIndex(x => x.topic === "이민") + 1) + ". "), "번호 통일(v1.35.5) 스모크: 주제별 목록 번호가 순서 번호로 표시됨");',
  'brTopicBtns.find(b => b._topic === "전체").onclick();',
  'ok(browseTopic === "전체" && brScrollCalls.length === 2, "주제별 스모크: 전체 카드를 누르면 필터가 해제되고 다시 목록으로 스크롤함");',
  'ok(BR_ELS["topicMap"].innerHTML.includes(\'class="mapcard selected" data-mtopic="전체"\') && (BR_ELS["topicMap"].innerHTML.match(/ selected"/g) || []).length === 1, "주제별 스모크: 전체를 고르면 전체 카드만 색칠됨");',
  'ok(BR_ELS["browseList"].innerHTML.includes(ITEMS[0].fr) && BR_ELS["browseList"].innerHTML.includes(ITEMS.find(x => x.topic === "교통").fr), "주제별 스모크: 전체에서는 모든 주제의 문장이 목록에 나옴");'
].join("\n"));
ok(html.includes("body.noscroll{overflow:hidden"), "스크롤 잠금: body.noscroll이 스크롤을 막는 CSS가 있음");
ok(/\.menuoverlay\{[^}]*overscroll-behavior:contain/.test(html) && /\.modaloverlay\{[^}]*overscroll-behavior:contain/.test(html) && /\.menupanel\{[^}]*overscroll-behavior:contain/.test(html) && /\.modalpanel\{[^}]*overscroll-behavior:contain/.test(html), "스크롤 잠금: 오버레이와 패널이 overscroll 전파를 차단함");
const lockFnSrcs = [
  html.match(/function openMenu\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function closeMenu\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function openNickModal\(auto\)\{[\s\S]*?\n\}/)[0],
  html.match(/function closeNickModal\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/async function openProfile\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function closeProfile\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function openMapSheet\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function closeMapSheet\(\)\{[\s\S]*?\n\}/)[0]
];
ok(lockFnSrcs.every(s => s.includes("syncScrollLock();")), "스크롤 잠금: 메뉴·닉네임·내 정보·지도 시트의 열기/닫기 8곳 전부 syncScrollLock을 호출함");
// 스크롤 잠금 동작 스모크: 겹쳐 열어도 마지막 하나가 닫힐 때만 해제
const LK_ELS = {};
function makeLkEl(id){
  const el = { id: id, hidden: true, value: "", textContent: "", innerHTML: "", style: {}, _cls: new Set(),
    setAttribute(){}, getAttribute(){ return null; }, focus(){}, addEventListener(){},
    classList: { toggle(c, v){ if(v) el._cls.add(c); else el._cls.delete(c); }, add(c){ el._cls.add(c); }, remove(c){ el._cls.delete(c); }, contains(c){ return el._cls.has(c); } } };
  return el;
}
const lkDocument = {
  getElementById(id){ if(!LK_ELS[id]) LK_ELS[id] = makeLkEl(id); return LK_ELS[id]; },
  querySelectorAll(){ return []; },
  body: makeLkEl("body")
};
const lkPrelude = [
  'let menuOpen = false;',
  'let currentTab = "study";',
  'let nickAutoShown = false;',
  'const document = lkDocument;',
  'function renderMapSheet(){}'
].join("\n");
const lkFns = [
  lockSrc,
  html.match(/function openMenu\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function closeMenu\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function openNickModal\(auto\)\{[\s\S]*?\n\}/)[0],
  html.match(/function closeNickModal\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function openMapSheet\(\)\{[\s\S]*?\n\}/)[0],
  html.match(/function closeMapSheet\(\)\{[\s\S]*?\n\}/)[0]
].join("\n");
eval(lkPrelude + "\n" + lkFns + "\n" + [
  'openMenu();',
  'ok(lkDocument.body.classList.contains("noscroll") && LK_ELS["menuOverlay"].hidden === false, "잠금 스모크: 메뉴를 열면 body 스크롤이 잠김");',
  'openMapSheet();',
  'closeMenu();',
  'ok(lkDocument.body.classList.contains("noscroll"), "잠금 스모크: 지도 시트가 열려 있으면 메뉴를 닫아도 잠금이 유지됨");',
  'closeMapSheet();',
  'ok(!lkDocument.body.classList.contains("noscroll"), "잠금 스모크: 마지막 시트를 닫으면 잠금이 해제됨");',
  'openNickModal(false);',
  'ok(lkDocument.body.classList.contains("noscroll"), "잠금 스모크: 닉네임 모달을 열어도 잠김");',
  'closeNickModal();',
  'ok(!lkDocument.body.classList.contains("noscroll"), "잠금 스모크: 닉네임 모달을 닫으면 해제됨");'
].join("\n"));
// 빈 조합(영어 약속+B2): 멋대로 이동 없이 빈 상태만 표시
eval(eqPrelude + "\n" + eqHelperSrc + "\n" + eqFns + "\n" + [
  'progress = defaultProgress(); progress.lang = "en"; currentStep = 1;',
  'const B = progress.byLang.en;',
  'B.topicFilter = "약속"; B.levelFilter = "B2"; B.index = 0;',
  'ok(studyItems().length === 0, "빈 조합 스모크: 영어 약속+B2에는 문장이 없음 (전제 확인)");',
  'renderStudy();',
  'ok(EQ_ELS["studyCard"].innerHTML.includes("이 주제·레벨에는 아직 문장이 없어요"), "빈 조합 스모크: 다른 주제로 멋대로 이동하지 않고 빈 상태 문구를 보여줌");',
  'ok(B.topicFilter === "약속" && B.levelFilter === "B2", "빈 조합 스모크: 빈 조합에서도 (주제, 레벨) 선택이 그대로 유지됨");',
  'renderWords();',
  'ok(EQ_ELS["wordsList"].innerHTML.includes(\'data-word="live"\') && EQ_ELS["wordsList"].innerHTML.includes(\'data-say="liv"\'), "단어 듣기 표기: live 버튼은 화면 표기 data-word=live와 듣기 전용 data-say=liv를 함께 가짐");'
].join("\n"));
// 단어 듣기 표기: 클릭하면 듣기 표기로 발화됨
const WS_ELS = {};
function makeWsEl(id){
  const el = { id: id, value: "", style: {}, textContent: "", onclick: null, _html: "",
    classList: { toggle(){}, add(){}, remove(){}, contains(){ return false; } },
    setAttribute(){}, getAttribute(){ return null; }, focus(){}, scrollIntoView(){} };
  Object.defineProperty(el, "innerHTML", { get(){ return this._html; }, set(v){ this._html = v; } });
  return el;
}
const WS_BTN_CACHE = { html: null, btns: [] };
const wsDocument = {
  getElementById(id){ if(!WS_ELS[id]) WS_ELS[id] = makeWsEl(id); return WS_ELS[id]; },
  querySelectorAll(sel){
    if(sel !== "[data-word]") return [];
    const h = WS_ELS["wordsList"] ? WS_ELS["wordsList"]._html : "";
    if(WS_BTN_CACHE.html === h) return WS_BTN_CACHE.btns;
    const out = []; const re = /data-word="([^"]+)" data-say="([^"]+)"/g; let m;
    while((m = re.exec(h))){ const attrs = { "data-word": m[1], "data-say": m[2] }; out.push({ _attrs: attrs, onclick: null, getAttribute(k){ return this._attrs[k]; }, setAttribute(){}, classList: { toggle(){} } }); }
    WS_BTN_CACHE.html = h; WS_BTN_CACHE.btns = out;
    return out;
  }
};
const wsPrelude = [
  'let progress = null;',
  'const document = wsDocument;',
  'const saidWords = [];',
  'function speakFr(t){ saidWords.push(t); }'
].join("\n");
eval(wsPrelude + "\n" + eqHelperSrc + "\n" + escSrc + "\n" + html.match(/function renderWords\(\)\{[\s\S]*?\n\}/)[0] + "\n" + [
  'progress = defaultProgress(); progress.lang = "en";',
  'renderWords();',
  'const btns = document.querySelectorAll("[data-word]");',
  'const liveBtn = btns.find(b => b.getAttribute("data-word") === "live");',
  'ok(!!liveBtn && liveBtn.getAttribute("data-say") === "liv", "단어 듣기 스모크: live 버튼이 듣기 전용 표기 liv를 가짐");',
  'liveBtn.onclick();',
  'ok(saidWords.length === 1 && saidWords[0] === "liv", "단어 듣기 스모크: live를 누르면 화면 표기가 아닌 liv로 발화 큐에 들어감 (살다 /lɪv/)");',
  'const stuBtn = btns.find(b => b.getAttribute("data-word") === "student");',
  'stuBtn.onclick();',
  'ok(saidWords[1] === "student", "단어 듣기 스모크: 듣기 표기가 없는 단어는 원래 표기 그대로 발화됨");',
  'ok(WS_ELS["wordsList"].innerHTML.includes("<b>live</b>"), "단어 듣기 스모크: 화면 표시는 원래 표기 live 그대로");'
].join("\n"));
const rwSrc = html.match(/function renderWords\(\)\{[\s\S]*?\n\}/)[0];
ok(rwSrc.includes("w[2] || w[0]") && rwSrc.includes('getAttribute("data-say")'), "단어 듣기 표기: 단어 재생은 듣기 전용 표기(세 번째 항목)를 우선 사용함");
const sayFixes = [];
[["fr", ITEMS], ["en", ITEMS_EN_REAL], ["es", ITEMS_ES_REAL]].forEach(pair => pair[1].forEach(i => i.words.forEach(w => { if(w[2]) sayFixes.push(pair[0] + ":" + w[0] + "→" + w[2]); })));
ok(sayFixes.length === 1 && sayFixes[0] === "en:live→liv", "단어 듣기 표기: 전 언어(영어·스페인어·프랑스어) 핵심 단어 전수 점검 결과 교정은 영어 live→liv 1건뿐 (실제 목록에 있는 동형어만)");

/* ---------- 부팅 스모크: 페이지의 실제 메인 스크립트 전체를 실행 ----------
   함수 단위 테스트가 못 잡는 부팅 전체 흐름의 예외(선언 누락·초기화 순서)를 잡는다.
   선언을 테스트가 주입하지 않고 index.html의 스크립트를 통째로 실행하는 것이 핵심이다. */
async function runFullBootSmoke() {
  console.log("\n[부팅 스모크: 실제 초기화 시퀀스 전체 실행]");
  const vm = require("vm");
  const lines = html.split("\n");
  const starts = [];
  lines.forEach((l, i) => { if (l.trim() === "<script>") starts.push(i); });
  let mainSrc = "";
  if (starts.length >= 2) {
    let e = starts[1] + 1;
    while (e < lines.length && lines[e].trim() !== "</script>") e++;
    mainSrc = lines.slice(starts[1] + 1, e).join("\n");
  }
  ok(mainSrc.length > 10000, "부팅 스모크: 메인 스크립트 추출됨 (" + mainSrc.length + "자)");
  if (!mainSrc) return;

  class BootEl {
    constructor(tag) {
      this.tagName = String(tag || "div").toUpperCase();
      this.children = []; this.style = {}; this.dataset = {}; this._attrs = {};
      this._classes = new Set(); this._html = ""; this._text = "";
      this.hidden = false; this.value = ""; this.disabled = false;
      const self = this;
      this.classList = {
        add: (...cs) => cs.forEach(c => self._classes.add(c)),
        remove: (...cs) => cs.forEach(c => self._classes.delete(c)),
        toggle: (c, f) => { if (f === undefined) f = !self._classes.has(c); if (f) self._classes.add(c); else self._classes.delete(c); return f; },
        contains: c => self._classes.has(c)
      };
    }
    get innerHTML() { return this._html; }
    set innerHTML(v) { this._html = String(v); }
    get textContent() { return this._text; }
    set textContent(v) { this._text = String(v); }
    setAttribute(k, v) { this._attrs[k] = String(v); }
    getAttribute(k) { return k in this._attrs ? this._attrs[k] : null; }
    removeAttribute(k) { delete this._attrs[k]; }
    addEventListener() {} removeEventListener() {}
    appendChild(c) { this.children.push(c); return c; }
    removeChild(c) { return c; }
    insertBefore(c) { this.children.push(c); return c; }
    querySelector() { return null; }
    querySelectorAll() { return []; }
    focus() {} blur() {} click() {} scrollIntoView() {}
    getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0 }; }
  }

  async function bootOnce(fixture) {
    const byId = new Map();
    const rafCbs = [];
    const errors = [];
    const store = new Map(Object.entries(fixture || {}));
    const doc = {
      documentElement: new BootEl("html"), head: new BootEl("head"), body: new BootEl("body"),
      getElementById: id => { if (!byId.has(id)) byId.set(id, new BootEl("div")); return byId.get(id); },
      querySelector: () => null, querySelectorAll: () => [],
      createElement: t => new BootEl(t),
      addEventListener: () => {}, removeEventListener: () => {}
    };
    const sandbox = {
      console, setTimeout, clearTimeout, setInterval, clearInterval,
      document: doc,
      localStorage: {
        getItem: k => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => { store.set(k, String(v)); },
        removeItem: k => { store.delete(k); },
        clear: () => store.clear()
      },
      navigator: { storage: { persist: async () => true, persisted: async () => true }, userAgent: "bootsmoke" },
      location: { origin: "https://sidebatch.github.io", pathname: "/one-phrase/", search: "", hash: "", href: "https://sidebatch.github.io/one-phrase/" },
      requestAnimationFrame: cb => { rafCbs.push(cb); return rafCbs.length; },
      fetch: () => Promise.reject(new Error("no network in stub")),
      alert: () => {}, URL, Blob
    };
    sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
    const ctx = vm.createContext(sandbox);
    const onRej = e2 => { const st = String((e2 && e2.stack) || e2); if (st.includes("index-main.js")) errors.push("unhandled: " + String((e2 && e2.message) || e2)); };
    process.on("unhandledRejection", onRej);
    try { vm.runInContext(mainSrc, ctx, { filename: "index-main.js" }); }
    catch (e) { errors.push("sync: " + String((e && e.message) || e)); }
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 5));
      while (rafCbs.length) { const cb = rafCbs.shift(); try { cb(0); } catch (e) { errors.push("raf: " + String((e && e.message) || e)); } }
    }
    process.removeListener("unhandledRejection", onRej);
    const study = byId.get("studyCard"), quiz = byId.get("quizArea");
    return { errors, studyHtml: study ? study.innerHTML : "", quizHtml: quiz ? quiz.innerHTML : "", store };
  }

  const KEY = "une-phrase-progress-v1";
  const b1350 = extra => Object.assign({
    index: 3, completed: [1, 2, 3], doneDates: ["2026-10-21", "2026-10-22"], step: 1, reviewCorrect: 1,
    completedAt: { "1": "2026-10-20", "2": "2026-10-21", "3": "2026-10-22" }, reviewIds: [2], levelFilter: "전체",
    reviewState: { "1": { step: 0, due: "2026-10-21", last: "2026-10-20" }, "2": { step: 1, due: "2026-10-24", last: "2026-10-21" }, "3": { step: 0, due: "2026-10-23", last: "2026-10-22" } },
    curveDays: ["2026-10-22"], reviewDates: ["2026-10-22", "2026-10-22"]
  }, extra || {});
  const e1350 = () => ({ index: 0, completed: [], doneDates: [], step: 1, reviewCorrect: 0, completedAt: {}, reviewIds: [], levelFilter: "전체", reviewState: {}, curveDays: [], reviewDates: [] });
  const b134 = () => ({ index: 2, completed: [1, 2], doneDates: ["2026-10-21"], step: 1, reviewCorrect: 0, completedAt: { "1": "2026-10-20", "2": "2026-10-21" }, reviewIds: [], levelFilter: "전체" });
  const wrap = fr => ({ [KEY]: JSON.stringify({ lang: "fr", sound: true, theme: "light", byLang: { fr, en: e1350(), es: e1350() } }) });

  const cases = [
    ["신규(저장본 없음)", {}],
    ["v1.35.0 형식 저장본", wrap(b1350())],
    ["v1.34 형식 저장본(reviewState 없음)", { [KEY]: JSON.stringify({ lang: "fr", sound: true, theme: "light", byLang: { fr: b134(), en: b134(), es: b134() } }) }],
    ["손상된 필드(dueSnapshot·wrongToday·reviewState·curveDays 타입 오류)", wrap(b1350({ dueSnapshot: { date: 42, ids: "junk" }, wrongToday: "oops", reviewState: { "1": null, "2": { step: "x", due: 7 }, "zz": { step: 0, due: "2026-10-01", last: "2026-10-01" } }, curveDays: "notarray" }))]
  ];
  for (const [label, fixture] of cases) {
    const r = await bootOnce(fixture);
    ok(r.errors.length === 0, "부팅 스모크 " + label + ": 초기화 예외 없음", r.errors.join(" | "));
    ok(r.studyHtml.length > 0, "부팅 스모크 " + label + ": 첫 렌더(공부 카드) 도달");
    ok(r.quizHtml.length > 0, "부팅 스모크 " + label + ": 복습 카드 렌더 도달");
    if (label.startsWith("v1.35.0")) {
      let kept = null;
      try { kept = JSON.parse(r.store.get(KEY)); } catch (e) {}
      ok(!!kept && JSON.stringify(kept.byLang.fr.completed) === "[1,2,3]", "부팅 스모크 v1.35.0 형식: 기존 진도(완료 3개)가 삭제·초기화되지 않음");
    }
  }
}

console.log("\n[번호 표기 통일·레벨 안내 (v1.35.5)]");
const tmlSrc2 = html.match(/async function toggleMemberLang\(userId, code, btn\)\{[\s\S]*?\n\}/)[0];
const tmlPlain = tmlSrc2.replace(/\\/g, "");
ok(tmlPlain.includes("(idx+1)+'.</b>") && !tmlPlain.includes("i.id+'.</b>"), "번호 통일(v1.35.5): Ensemble 완료 문장 목록은 원본 id가 아니라 순서 번호(1. 2. 3…)로 표시됨");
ok(rbSrc.includes("(items().indexOf(i)+1)+'. '") && !rbSrc.includes("i.id+'. '"), "번호 통일(v1.35.5): 주제별 목록도 원본 id가 아니라 순서 번호로 표시됨");
ok(html.includes('id="levelOverlay" hidden') && html.includes('id="levelInfoBody"') && html.includes('id="levelCloseBtn"') && html.includes('id="levelBackdrop"'), "레벨 안내: 바텀시트 오버레이·본문·닫기·배경이 전역에 있고 처음에는 숨겨져 있음");
ok(html.includes('<button class="lvlabel" id="lvLabel"'), "레벨 안내: 공부 첫 화면의 레벨 배지가 버튼이라 누를 수 있음");
ok(html.match(/const OVERLAY_IDS = \[[^\n]*/)[0].includes('"levelOverlay"'), "레벨 안내: 배경 스크롤 잠금 대상 오버레이에 포함됨");
const liOpenSrc = html.match(/function openLevelInfo\(\)\{[\s\S]*?\n\}/)[0];
const liCloseSrc = html.match(/function closeLevelInfo\(\)\{[\s\S]*?\n\}/)[0];
ok(liOpenSrc.includes("syncScrollLock();") && liCloseSrc.includes("syncScrollLock();"), "레벨 안내: 열기/닫기 모두 배경 스크롤 잠금을 갱신함");
const rlInfoSrc = html.match(/function renderLevelInfo\(\)\{[\s\S]*?\n\}/)[0];
ok(rlInfoSrc.includes("levelOf(") && rlInfoSrc.includes("xpOf(") && html.match(/function levelRowsHtml\(curLv\)\{[\s\S]*?\n\}/)[0].includes("LEVELS.map"), "레벨 안내: 전체 레벨표는 LEVELS 데이터로 만들고, 현재 레벨은 지금 언어의 XP로 판정함");
ok(html.includes('document.getElementById("lvLabel").onclick = ()=>openLevelInfo();') && html.includes('document.getElementById("levelCloseBtn").onclick = ()=>closeLevelInfo();') && html.includes('document.getElementById("levelBackdrop").onclick = ()=>closeLevelInfo();'), "레벨 안내: 배지 탭·닫기 버튼·배경 탭이 모두 연결됨");
ok(html.includes('id="profileLvBtn"') && html.includes("lvb.onclick = ()=>openLevelInfo();"), "레벨 안내: 내 정보 창의 레벨 표기도 같은 안내창을 염");
// 레벨 안내 동작 스모크: 열면 전체 레벨 행 + 현재 레벨 강조 + 배경 잠금, 닫으면 해제
const LI_ELS = {};
function makeLiEl(id){
  const el = { id: id, hidden: true, value: "", textContent: "", innerHTML: "", style: {}, _cls: new Set(),
    setAttribute(){}, getAttribute(){ return null; }, focus(){}, addEventListener(){},
    classList: { toggle(c, v){ if(v) el._cls.add(c); else el._cls.delete(c); }, add(c){ el._cls.add(c); }, remove(c){ el._cls.delete(c); }, contains(c){ return el._cls.has(c); } } };
  return el;
}
const liInfoDocument = {
  getElementById(id){ if(!LI_ELS[id]) LI_ELS[id] = makeLiEl(id); return LI_ELS[id]; },
  querySelectorAll(){ return []; },
  body: makeLiEl("body")
};
const lvInfoSrcs = [
  lockSrc, helperSrc, escSrc, lvArrSrc, iconSrc, lvlSrc, xpSrc2,
  html.match(/function levelRowsHtml\(curLv\)\{[\s\S]*?\n\}/)[0],
  rlInfoSrc, liOpenSrc, liCloseSrc
].join("\n");
eval('let progress = null;\nconst document = liInfoDocument;\n' + lvInfoSrcs + "\n" + [
  'progress = migrateProgress(null);',
  'progress.byLang.fr.completed = [1, 2, 3];',
  'openLevelInfo();',
  'ok(LI_ELS["levelOverlay"].hidden === false && liInfoDocument.body.classList.contains("noscroll"), "레벨 안내 스모크: 열면 창이 뜨고 배경 스크롤이 잠김");',
  'ok((LI_ELS["levelInfoBody"].innerHTML.match(/<div class="lvrow/g) || []).length === LEVELS.length, "레벨 안내 스모크: 전체 레벨 행이 레벨 수만큼 표시됨");',
  'ok(LI_ELS["levelInfoBody"].innerHTML.includes(\'class="lvrow cur"\') && LI_ELS["levelInfoBody"].innerHTML.includes("Lv.2 연필") && LI_ELS["levelInfoBody"].innerHTML.includes("지금 내 레벨"), "레벨 안내 스모크: 완료 3개(30 XP)=Lv.2 행이 강조되고 레벨 이름이 보임");',
  'ok(LI_ELS["levelInfoBody"].innerHTML.includes(\'data-lv="10"\') && LI_ELS["levelInfoBody"].innerHTML.includes("2900 XP부터") && LI_ELS["levelInfoBody"].innerHTML.includes("0 XP부터"), "레벨 안내 스모크: 각 행에 펜 아이콘과 필요 XP가 표시됨");',
  'closeLevelInfo();',
  'ok(LI_ELS["levelOverlay"].hidden === true && !liInfoDocument.body.classList.contains("noscroll"), "레벨 안내 스모크: 닫으면 배경 잠금이 풀림");'
].join("\n"));

(async function finish() {
  try { await runFullBootSmoke(); } catch (e) { ok(false, "부팅 스모크: 실행 오류", String((e && e.stack) || e)); }
  try { await runEqEnsembleSmoke(); } catch (e) { ok(false, "동등성 Ensemble: 스모크 실행 오류", String((e && e.message) || e)); }
  try { await runBootRestoreSmoke(); } catch (e) { ok(false, "부팅 복원: 스모크 실행 오류", String((e && e.stack) || e)); }
  try { await runResetTokenSmoke(); } catch (e) { ok(false, "초기화 토큰: 스모크 실행 오류", String((e && e.stack) || e)); }
  console.log("\n결과: PASS " + pass + " / FAIL " + fail);
  process.exit(fail ? 1 : 0);
})();
