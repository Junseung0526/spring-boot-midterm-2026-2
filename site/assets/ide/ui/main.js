/* ui/main.js — 부트스트랩: 모듈 조립 · 툴바 · 상태바 · 전역 단축키 */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { state, store, bus } = IDE;
const $ = s => document.querySelector(s);

store.load();
const toastEl = $('#toast');
let toastT; const toast = m => { toastEl.textContent = m; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2600); };

const con = IDE.Console.create($('#console'), { onGoto: (p, l) => { store.openFile(p); setTimeout(() => ed.goto(l), 30); } });
const runner = IDE.Runner.create(con);

const ed = IDE.Editor.create($('#editor'), {
  onChange: t => { if (state.active) { store.setContent(state.active, t); IDE.analysis.soon(); } },
  onRun: () => runner.run(),
  onSend: line => runner.send(ed.value(), line),
  onSave: () => toast('Saved ✔ (자동 저장됩니다)'),
  onCaret: (l, c) => { $('#st-pos').textContent = `${l}:${c}`; },
});

function showActive() {
  const p = state.active;
  $('#st-file').textContent = p ? p.replace('src/main/java/', '').replace(/\//g, ' › ') : '';
  ed.setFile(p || '', p ? state.files[p] : '');
  decorate();
}
function decorate() {
  const p = state.active; if (!p) return;
  ed.setProblems(IDE.analysis.forFile(p));
  ed.setRunLines(/\.http$/.test(p) ? state.files[p].split('\n').map((l, i) => /^(GET|POST|PUT|PATCH|DELETE)\s/.test(l) ? i + 1 : 0).filter(Boolean) : []);
}
IDE.Tabs.create($('#tabs'));
IDE.Tree.create($('#tree'));
IDE.Missions.create($('#missions'), $('#modal'), toast);

bus.on('tabs', showActive);
bus.on('reload', showActive);
bus.on('reset', () => { if (state.server.running) runner.stop(true); con.clear(); IDE.analysis.run(); showActive(); });
bus.on('problems', () => {
  decorate();
  const e = state.problems.filter(p => p.sev === 'error').length;
  $('#st-prob').textContent = e ? `✖ ${e} error${e > 1 ? 's' : ''}` : '✔ No problems';
  $('#st-prob').className = e ? 'bad' : 'good';
});

/* 서버 상태 표시 */
function paintServer(building) {
  const s = state.server, chip = $('#srv');
  chip.className = building ? 'build' : s.running ? (s.dirty ? 'dirty' : 'on') : 'off';
  chip.textContent = building ? 'Building…' : s.running ? (s.dirty ? `:${s.ctx.port} — 코드 변경됨, Rerun 필요` : `Running :${s.ctx.port}`) : 'Stopped';
  $('#btn-stop').disabled = !s.running;
  $('#btn-rerun').classList.toggle('hot', s.running && s.dirty);
}
bus.on('server', () => paintServer(false));
bus.on('building', () => paintServer(true));
bus.on('edit', () => { if (state.server.running) paintServer(false); });

$('#btn-run').addEventListener('click', () => runner.run());
$('#btn-rerun').addEventListener('click', () => runner.run());
$('#btn-stop').addEventListener('click', () => runner.stop());
$('#btn-left').addEventListener('click', () => $('.ide').classList.toggle('noleft'));
$('#btn-right').addEventListener('click', () => $('.ide').classList.toggle('noright'));
document.addEventListener('keydown', e => {
  if (e.key === 'F10' && e.shiftKey) { e.preventDefault(); runner.run(); }
  if (e.key === 'F2' && e.ctrlKey) { e.preventDefault(); runner.stop(); }
  if (e.key === 'Escape') $('#modal').hidden = true;
});

IDE.analysis.run();
showActive();
paintServer(false);
})();
