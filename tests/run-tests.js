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

console.log("\n[버전·파일]");
const ver = html.match(/const APP_VERSION = "([^"]+)"/)[1];
ok(read("README.md").includes("v" + ver), "README 버전 일치 (v" + ver + ")");
ok(read("sw.js").includes("une-phrase-v" + ver), "sw 캐시 버전 일치");
ok(html.includes("버전 " + ver), "화면 버전 표시 일치");
ok(fs.existsSync(path.join(ROOT, "manifest.webmanifest")), "manifest 있음");
ok(fs.existsSync(path.join(ROOT, "icons/icon-192.png")) && fs.existsSync(path.join(ROOT, "icons/icon-512.png")), "아이콘 있음");
const man = JSON.parse(read("manifest.webmanifest"));
ok(man.name.includes("Une Phrase"), "manifest 이름 확인");

console.log("\n결과: PASS " + pass + " / FAIL " + fail);
process.exit(fail ? 1 : 0);
