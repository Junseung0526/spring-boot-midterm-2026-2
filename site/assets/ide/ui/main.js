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
  const p = state.active, isC = !!p && IDE.concepts.isConcept(p);
  $('#st-file').textContent = !p ? '' : isC ? 'blog › Concepts › ' + IDE.concepts.fromPath(p).title : 'blog › ' + p.replace(/\//g, ' › ');
  $('#center').classList.toggle('cmode', isC);
  $('#editor').hidden = isC; $('#concept').hidden = !isC;
  if (isC) { cpane.show(IDE.concepts.fromPath(p)); return; }
  cpane.hide();
  ed.setFile(p || '', p ? state.files[p] : '');
  decorate();
}
function decorate() {
  const p = state.active; if (!p || IDE.concepts.isConcept(p)) return;
  ed.setProblems(IDE.analysis.forFile(p));
  ed.setRunLines(/\.http$/.test(p) ? state.files[p].split('\n').map((l, i) => /^(GET|POST|PUT|PATCH|DELETE)\s/.test(l) ? i + 1 : 0).filter(Boolean) : []);
}
const cpane = IDE.ConceptPane.create($('#concept'));
IDE.Tabs.create($('#tabs'));
IDE.Tree.create($('#tree'));
IDE.ConceptsList.create($('#clist'));
IDE.Missions.create($('#missions'), $('#modal'), toast);

bus.on('console', () => $('#center').classList.remove('cmode'));   // 개념 탭이 열려 있어도 Run/HTTP 결과는 보이게
/* 미션 클릭 → 해당 파일을 열고 TODO 줄로 이동 + 번쩍임 */
bus.on('goto', ({ file, find }) => {
  store.openFile(file);
  const idx = (state.files[file] || '').split('\n').findIndex(l => l.includes(find));
  setTimeout(() => { if (idx >= 0) { ed.goto(idx + 1); ed.flash(idx + 1); } }, 60);
});
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
/* 스트립: 도구창 토글 + 하단 도구창 탭 열기 */
const toggleTw = (btn, cls) => { const off = $('.ide').classList.toggle(cls); $(btn).classList.toggle('on', !off); };
const showTw = which => {          // which: 'tree' | 'clist' — 같은 걸 다시 누르면 접기
  const ide = $('.ide'), same = !ide.classList.contains('noleft') && !$('#' + which).hidden;
  if (same) { ide.classList.add('noleft'); } else { ide.classList.remove('noleft'); }
  $('#tree').hidden = which !== 'tree'; $('#clist').hidden = which !== 'clist';
  $('#ltw-title').textContent = which === 'tree' ? 'Project' : 'Concepts';
  $('#sb-project').classList.toggle('on', !ide.classList.contains('noleft') && which === 'tree');
  $('#sb-concepts').classList.toggle('on', !ide.classList.contains('noleft') && which === 'clist');
};
$('#sb-project').addEventListener('click', () => showTw('tree'));
$('#sb-concepts').addEventListener('click', () => showTw('clist'));
$('#btn-concepts').addEventListener('click', () => {
  showTw('clist');
  if (!state.open.some(p => IDE.concepts.isConcept(p) && IDE.concepts.fromPath(p).kind === 'scene')) store.openFile('concept:mvcpattern');
});
document.body.classList.toggle('opened', IDE.concepts.isOpened());
bus.on('opened', () => document.body.classList.add('opened'));
if (!IDE.concepts.isOpened()) showTw('clist');   // 첫 방문: 개념 애니메이션 목록을 먼저 보여 준다
$('#btn-ann').addEventListener('click', () => IDE.memo.open('ann'));
$('#btn-exam').addEventListener('click', () => IDE.memo.open('exam'));
$('#sb-tasks').addEventListener('click', () => toggleTw('#sb-tasks', 'noright'));
document.querySelectorAll('[data-console]').forEach(b => b.addEventListener('click', () => con.show(b.dataset.console)));
document.addEventListener('keydown', e => {
  if (e.key === 'F10' && e.shiftKey) { e.preventDefault(); runner.run(); }
  if (e.key === 'F2' && e.ctrlKey) { e.preventDefault(); runner.stop(); }
  if (e.key === 'Escape') $('#modal').hidden = true;
});

IDE.analysis.run();
showActive();
paintServer(false);
})();
