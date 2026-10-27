/* ui/concepts-list.js — 왼쪽 "Concepts" 도구창: 개념 목록(클릭하면 탭으로 열림) */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { state, store, bus } = IDE;

function create(host) {
  const draw = () => {
    const groups = [];
    IDE.concepts.LIST.forEach(c => { let g = groups.find(x => x.name === c.group); if (!g) groups.push(g = { name: c.group, items: [] }); g.items.push(c); });
    host.innerHTML = groups.map(g => `${g.name ? `<div class="cg">${g.name}</div>` : ''}${g.items.map(c => {
      const on = state.active === IDE.concepts.PREFIX + c.id;
      return `<div class="tr cn ${on ? 'on' : ''}" style="--d:0" data-open="${IDE.concepts.PREFIX}${c.id}"><span class="arrow"></span><i class="fi f-doc">${c.icon}</i><span class="nm">${c.title}</span>${c.kind === 'scene' ? '<small>▶ 애니메이션</small>' : ''}</div>`;
    }).join('')}`).join('');
  };
  host.addEventListener('click', e => { const t = e.target.closest('[data-open]'); if (t) store.openFile(t.dataset.open); });
  bus.on('tabs', draw); bus.on('reset', draw);
  draw();
}
Object.assign(IDE, { ConceptsList: { create } });
})();
