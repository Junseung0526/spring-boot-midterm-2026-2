/* ui/main.js — 부트스트랩: 모듈 조립 · 툴바 · 상태바 · 전역 단축키 */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { state, store, bus } = IDE;
const $ = s => document.querySelector(s);

store.load();
const toastEl = $('#toast');
let toastT; const toast = IDE.toast = m => { toastEl.textContent = m; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2600); };

const con = IDE.Console.create($('#console'), { onGoto: (p, l) => { store.openFile(p); setTimeout(() => ed.goto(l), 30); }, onRunTests: () => runner.runTests() });
const runner = IDE.Runner.create(con);

const ed = IDE.Editor.create($('#editor'), {
  onChange: t => { if (state.active) { store.setContent(state.active, t); IDE.analysis.soon(); } },
  onRun: () => runner.run(),
  onSend: line => {
    const p = state.active;
    if (/\.http$/.test(p)) runner.send(ed.value(), line);
    else if (IDE.isTestPath(p)) { const t = IDE.testTargets(p, ed.value()).find(x => x.line === line); if (t) runner.runTests({ cls: t.cls, method: t.method }); }
  },
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
  if (/\.http$/.test(p)) ed.setRunLines(state.files[p].split('\n').map((l, i) => /^(GET|POST|PUT|PATCH|DELETE)\s/.test(l) ? { line: i + 1, title: '요청 실행 (Ctrl+Enter)' } : 0).filter(Boolean));
  else if (IDE.isTestPath(p)) {   // 테스트 파일: 클래스/@Test 줄에 ▶ (실행 후에는 ✔ / ✖ 로 바뀜)
    const res = state.session.tests && !state.session.tests.build ? state.session.tests.results : [];
    ed.setRunLines(IDE.testTargets(p, state.files[p]).map(t => {
      const mine = res.filter(r => r.cls === t.cls && (!t.method || r.method === t.method));
      const st = !mine.length ? '' : mine.some(r => r.status === 'fail') ? 'fail' : mine.some(r => r.status === 'skip') ? 'skip' : 'pass';
      const first = mine.find(r => r.status !== 'pass');
      return { line: t.line, state: st, title: st === 'fail' ? '실패: ' + (first.msg || '').split('\n').filter(Boolean)[0] : t.method ? `${t.method} 실행` : `${t.cls} 전체 실행` };
    }));
  } else ed.setRunLines([]);
}
const cpane = IDE.ConceptPane.create($('#concept'));
IDE.Tabs.create($('#tabs'));
IDE.Tree.create($('#tree'));
IDE.ConceptsList.create($('#clist'));
IDE.Git.create($('#gitpane'), toast);
IDE.Missions.create($('#missions'), $('#modal'), toast);

bus.on('console', () => $('#center').classList.remove('cmode'));   // 개념 탭이 열려 있어도 Run/HTTP 결과는 보이게
/* 미션 클릭 → 해당 파일을 열고 TODO 줄로 이동 + 번쩍임 */
bus.on('goto', ({ file, find }) => {
  store.openFile(file);
  const idx = (state.files[file] || '').split('\n').findIndex(l => l.includes(find));
  setTimeout(() => { if (idx >= 0) { ed.goto(idx + 1); ed.flash(idx + 1); } }, 60);
});
bus.on('console-msg', m => con.line(IDE.highlight.esc(m.text), m.cls));
/* Run / 테스트가 끝나면 아직 완료되지 않은 "현재 미션"이 왜 미완인지 콘솔에도 알려 준다 */
bus.on('graded', kind => setTimeout(() => {
  const cur = IDE.MISSIONS.find(m => !state.done.has(m.id)); if (!cur) return;
  const d = (cur.diagnose ? cur.diagnose({ files: state.files, session: state.session, server: state.server, problems: state.problems, tests: state.session.tests }) : [])[0];
  if (d) con.line(`📋 미션 ${cur.id.slice(1)} (${IDE.highlight.esc(cur.title)}) 아직 미완 — ${IDE.highlight.esc(d)}`, 'hint');
}, 80));
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
  const paneId = { tree: '#tree', clist: '#clist', git: '#gitpane' }[which];
  const ide = $('.ide'), same = !ide.classList.contains('noleft') && !$(paneId).hidden;
  if (same) { ide.classList.add('noleft'); } else { ide.classList.remove('noleft'); }
  $('#tree').hidden = which !== 'tree'; $('#clist').hidden = which !== 'clist'; $('#gitpane').hidden = which !== 'git';
  $('#ltw-title').textContent = { tree: 'Project', clist: 'Concepts', git: 'Commit' }[which];
  $('#btn-newfile').style.display = which === 'tree' ? '' : 'none';
  $('#sb-project').classList.toggle('on', !ide.classList.contains('noleft') && which === 'tree');
  $('#sb-concepts').classList.toggle('on', !ide.classList.contains('noleft') && which === 'clist');
  $('#sb-git').classList.toggle('on', !ide.classList.contains('noleft') && which === 'git');
};
$('#sb-project').addEventListener('click', () => showTw('tree'));
$('#sb-concepts').addEventListener('click', () => showTw('clist'));
$('#sb-git').addEventListener('click', () => showTw('git'));
$('#btn-branch').addEventListener('click', () => showTw('git'));
$('#btn-concepts').addEventListener('click', () => {
  showTw('clist');
  if (!state.open.some(p => IDE.concepts.isConcept(p) && IDE.concepts.fromPath(p).kind === 'scene')) store.openFile('concept:mvcpattern');
});
document.body.classList.toggle('opened', IDE.concepts.isOpened());
bus.on('opened', () => document.body.classList.add('opened'));
bus.on('tests', () => decorate());                 // 테스트 결과를 거터 아이콘에 반영
bus.on('testing', on => { $('#btn-test').disabled = on; });
$('#btn-test').addEventListener('click', () => runner.runTests());
$('#btn-newfile').addEventListener('click', () => IDE.NewFile.open(toast));
bus.on('reset-tree', () => { IDE.analysis.run(); });
if (!IDE.concepts.isOpened()) showTw('clist');   // 첫 방문: 개념 애니메이션 목록을 먼저 보여 준다
$('#btn-ann').addEventListener('click', () => IDE.memo.open('ann'));
$('#btn-exam').addEventListener('click', () => IDE.memo.open('exam'));
$('#sb-tasks').addEventListener('click', () => toggleTw('#sb-tasks', 'noright'));
document.querySelectorAll('[data-console]').forEach(b => b.addEventListener('click', () => con.show(b.dataset.console)));
document.addEventListener('keydown', e => {
  if (e.key === 'F10' && e.shiftKey) { e.preventDefault(); runner.run(); }
  if (e.key === 'F2' && e.ctrlKey) { e.preventDefault(); runner.stop(); }
  if (e.key === 'Escape') $('#modal').hidden = true;
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'k') { e.preventDefault(); showTw('git'); }
});

IDE.analysis.run();
showActive();
if (state.migrated) setTimeout(() => toast('사이트가 업데이트되어 저장된 예전 코드를 새 시작 코드로 초기화했어요'), 600);
paintServer(false);
})();
