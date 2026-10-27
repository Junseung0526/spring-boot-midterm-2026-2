/* ui/tabs.js — 에디터 상단 파일 탭 */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { state, store, bus } = IDE;

function create(host) {
  /* 활성 탭이 항상 보이게: 실제 화면 좌표로 계산해 가로 스크롤만 조정 */
  const reveal = () => {
    const on = host.querySelector('.tab.on'); if (!on) return;
    const h = host.getBoundingClientRect(), r = on.getBoundingClientRect();
    if (r.left < h.left + 4) host.scrollLeft -= h.left + 4 - r.left;
    else if (r.right > h.right - 4) host.scrollLeft += r.right - (h.right - 4);
  };
  const draw = () => {
    host.innerHTML = state.open.map(p => {
      const err = state.problems.some(x => x.path === p && x.sev === 'error');
      const c = IDE.concepts.isConcept(p) ? IDE.concepts.fromPath(p) : null;
      const label = c ? `<i class="fi f-doc">${c.icon}</i><span>${c.title}</span>` : `<span>${p.split('/').pop()}</span>`;
      return `<div class="tab ${p === state.active ? 'on' : ''} ${err ? 'haserr' : ''}" data-file="${p}" title="${c ? c.title : p}">${label}<b class="x" data-close="${p}" aria-label="닫기">×</b></div>`;
    }).join('');
    reveal(); requestAnimationFrame(reveal); setTimeout(reveal, 150);   // 늦게 확정되는 레이아웃까지 대비
  };
  host.addEventListener('wheel', e => { if (e.deltaY && !e.shiftKey && host.scrollWidth > host.clientWidth) { host.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
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
