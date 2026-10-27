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
  state.problems = [...java, ...spring];
  bus.emit('problems');
}
const soon = () => { clearTimeout(timer); timer = setTimeout(run, 350); };
const forFile = p => { const m = new Map(); state.problems.filter(x => x.path === p).forEach(x => { if (!m.has(x.line)) m.set(x.line, x.msg + (x.hint ? '  (' + x.hint + ')' : '')); }); return m; };

Object.assign(IDE, { analysis: { run, soon, forFile } });
})();
