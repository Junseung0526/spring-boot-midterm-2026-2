/* ui/analysis.js — 실시간 인스펙션 (컴파일 오류 + Spring 'Could not autowire' 경고) */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { state, bus } = IDE;
let timer = null;

function run() {
  const model = IDE.buildModel(state.files);
  const java = IDE.javaProblems(model);
  const rb = IDE.resolveBeans(model);
  const spring = rb.fatal ? [] : rb.failures.map(f => ({ path: f.path, line: f.line, msg: f.tip, sev: 'error', kind: 'spring' }));
  // 실습 빈칸(___)은 오류가 아니라 경고로 표시 — 채우기 전에도 앱은 뜬다
  const blanks = Object.entries(state.files).flatMap(([path, text]) => text.split('\n').flatMap((l, i) => /\b___\b/.test(l) ? [{ path, line: i + 1, msg: '빈칸 — 채워 넣으세요' + ((/\[미션 (\d+)\]/.exec(l) || [])[1] ? ` (미션 ${/\[미션 (\d+)\]/.exec(l)[1]})` : ''), sev: 'warn', kind: 'blank' }] : []));
  state.problems = [...java, ...spring, ...blanks];
  bus.emit('problems');
}
const soon = () => { clearTimeout(timer); timer = setTimeout(run, 350); };
const forFile = p => { const m = new Map(); state.problems.filter(x => x.path === p).forEach(x => { if (!m.has(x.line)) m.set(x.line, x.msg + (x.hint ? '  (' + x.hint + ')' : '')); }); return m; };

Object.assign(IDE, { analysis: { run, soon, forFile } });
})();
