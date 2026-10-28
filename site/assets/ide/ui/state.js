/* ui/state.js — 앱 상태 · 이벤트 버스 · localStorage 저장 */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const KEY = 'sb4.ide.v1';
const listeners = {};
const bus = { on(e, f) { (listeners[e] ||= []).push(f); }, emit(e, a) { (listeners[e] || []).forEach(f => f(a)); } };

const state = {
  files: {}, open: [], active: null, done: new Set(),
  session: { started: false, responses: [], aspectHit: false, txHit: false, tests: null },
  server: { running: false, ctx: null, dirty: false },
  problems: [],
  git: { base: {}, commits: [], pushed: 1, branch: 'main' },
  migrated: false,
  verify: {},          // 미션별 정답 확인 결과 { ok, msg, detail }
  fails: {},           // 미션별 정답 확인 실패 횟수 → 힌트·정답 예시가 단계적으로 열린다
};

const isConcept = p => !!IDE.concepts?.isConcept(p);
const defaultOpen = () => ['concept:welcome', IDE.JAVA_ROOT + 'service/BlogService.java', 'requests.http'];

function load() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { /* 저장소 사용 불가 */ }
  // 저장 당시의 시작 코드 버전이 다르면(사이트가 업데이트됨) 낡은 코드가 새 파일과 어긋나 앱이 안 뜰 수 있으므로 새 버전으로 초기화
  state.migrated = !!(saved.ver && saved.ver !== IDE.STARTER_VER) || !!(saved.files && !saved.ver);
  if (state.migrated) saved = {};
  state.files = { ...IDE.STARTER, ...(saved.files || {}) };
  state.open = (saved.open || []).filter(p => p in state.files || isConcept(p));
  if (!state.open.length) state.open = defaultOpen();
  // 접속할 때마다 첫 화면은 항상 Concepts 의 "시작하기" (열어 둔 다른 탭은 그대로 유지)
  if (!state.open.includes('concept:welcome')) state.open.unshift('concept:welcome');
  state.active = 'concept:welcome';
  state.done = new Set(saved.done || []);
  state.fails = saved.fails || {};
  // Git(시뮬레이션): 마지막 커밋 시점의 파일(base)은 시작 코드와 다른 것만 저장
  const g = saved.git;
  state.git = g ? { base: { ...IDE.STARTER, ...(g.baseDiff || {}) }, commits: g.commits || [], pushed: g.pushed ?? 0, branch: g.branch || 'main' }
    : { base: { ...IDE.STARTER }, commits: [{ id: 'a1f3c9e', msg: 'Initial commit — 스프링부트4 실습 프로젝트', time: Date.now(), files: Object.keys(IDE.STARTER).length }], pushed: 1, branch: 'main' };
}
let timer = null;
function save() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const files = {};
    for (const [p, c] of Object.entries(state.files)) if (c !== IDE.STARTER[p]) files[p] = c;
    const baseDiff = {}; for (const [p, c] of Object.entries(state.git.base)) if (c !== IDE.STARTER[p]) baseDiff[p] = c;
    try { localStorage.setItem(KEY, JSON.stringify({ ver: IDE.STARTER_VER, files, open: state.open, active: state.active, done: [...state.done], fails: state.fails, git: { baseDiff, commits: state.git.commits, pushed: state.git.pushed, branch: state.git.branch } })); } catch { /* 무시 */ }
  }, 250);
}
const modified = p => state.files[p] !== IDE.STARTER[p];

function openFile(p) {
  if (!(p in state.files) && !isConcept(p)) return;
  if (!state.open.includes(p)) state.open.push(p);
  state.active = p; save(); bus.emit('tabs');
}
function closeFile(p) {
  const i = state.open.indexOf(p); if (i < 0) return;
  state.open.splice(i, 1);
  if (state.active === p) state.active = state.open[Math.min(i, state.open.length - 1)] || null;
  save(); bus.emit('tabs');
}
function setContent(p, text) {
  state.files[p] = text;
  if (state.server.running) state.server.dirty = true;
  save(); bus.emit('edit', p);
}
function resetProject() {
  state.files = { ...IDE.STARTER }; state.open = defaultOpen(); state.active = state.open[0];
  state.done = new Set(); state.session = { started: false, responses: [], aspectHit: false, txHit: false, tests: null };
  state.git = { base: { ...IDE.STARTER }, commits: [{ id: 'a1f3c9e', msg: 'Initial commit — 스프링부트4 실습 프로젝트', time: Date.now(), files: Object.keys(IDE.STARTER).length }], pushed: 1, branch: 'main' };
  state.verify = {}; state.fails = {};
  save(); bus.emit('reset');
}

Object.assign(IDE, { bus, state, store: { load, save, modified, openFile, closeFile, setContent, resetProject } });
})();
