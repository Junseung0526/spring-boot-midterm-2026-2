/* ui/state.js — 앱 상태 · 이벤트 버스 · localStorage 저장 */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const KEY = 'sb4.ide.v1';
const listeners = {};
const bus = { on(e, f) { (listeners[e] ||= []).push(f); }, emit(e, a) { (listeners[e] || []).forEach(f => f(a)); } };

const state = {
  files: {}, open: [], active: null, done: new Set(),
  session: { started: false, responses: [], aspectHit: false },
  server: { running: false, ctx: null, dirty: false },
  problems: [],
};

const defaultOpen = () => [IDE.JAVA_ROOT + 'service/PostService.java', 'requests.http'];

function load() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { /* 저장소 사용 불가 */ }
  state.files = { ...IDE.STARTER, ...(saved.files || {}) };
  state.open = (saved.open || []).filter(p => p in state.files);
  if (!state.open.length) state.open = defaultOpen();
  state.active = state.open.includes(saved.active) ? saved.active : state.open[0];
  state.done = new Set(saved.done || []);
}
let timer = null;
function save() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const files = {};
    for (const [p, c] of Object.entries(state.files)) if (c !== IDE.STARTER[p]) files[p] = c;
    try { localStorage.setItem(KEY, JSON.stringify({ files, open: state.open, active: state.active, done: [...state.done] })); } catch { /* 무시 */ }
  }, 250);
}
const modified = p => state.files[p] !== IDE.STARTER[p];

function openFile(p) {
  if (!(p in state.files)) return;
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
  state.done = new Set(); state.session = { started: false, responses: [], aspectHit: false };
  save(); bus.emit('reset');
}

Object.assign(IDE, { bus, state, store: { load, save, modified, openFile, closeFile, setContent, resetProject } });
})();
