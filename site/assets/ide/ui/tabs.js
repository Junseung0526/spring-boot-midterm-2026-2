/* ui/tabs.js — 에디터 상단 파일 탭 */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { state, store, bus } = IDE;

function create(host) {
  const draw = () => {
    host.innerHTML = state.open.map(p => {
      const err = state.problems.some(x => x.path === p && x.sev === 'error');
      return `<div class="tab ${p === state.active ? 'on' : ''} ${err ? 'haserr' : ''}" data-file="${p}" title="${p}"><span>${p.split('/').pop()}</span><b class="x" data-close="${p}" aria-label="닫기">×</b></div>`;
    }).join('');
  };
  host.addEventListener('click', e => {
    const c = e.target.closest('[data-close]');
    if (c) { e.stopPropagation(); store.closeFile(c.dataset.close); return; }
    const t = e.target.closest('[data-file]'); if (t) store.openFile(t.dataset.file);
  });
  host.addEventListener('auxclick', e => { const t = e.target.closest('[data-file]'); if (t && e.button === 1) store.closeFile(t.dataset.file); });
  ['tabs', 'problems', 'reset'].forEach(ev => bus.on(ev, draw));
  draw();
}
Object.assign(IDE, { Tabs: { create } });
})();
