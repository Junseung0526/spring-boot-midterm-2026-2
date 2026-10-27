/* ui/concept-pane.js — 에디터 영역에 열리는 개념 탭: scene 은 플레이어, doc 은 정적 문서 */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { store } = IDE;

function create(host) {
  let current = null;
  const destroy = () => { current?.destroy?.(); current = null; };
  function show(concept) {
    destroy();
    if (concept.kind === 'scene') { host.innerHTML = ''; current = IDE.player.mount(host, concept); }
    else { host.innerHTML = `<div class="doc">${IDE.docs[concept.doc]}</div>`; }
    host.scrollTop = 0;
  }
  // 문서 안의 카드/링크: data-open="concept:ioc" | "<파일경로>", data-memo="ann|exam"
  host.addEventListener('click', e => {
    const o = e.target.closest('[data-open]'); if (o) { store.openFile(o.dataset.open); return; }
    const m = e.target.closest('[data-memo]'); if (m) IDE.memo.open(m.dataset.memo);
  });
  return { show, hide: destroy };
}
Object.assign(IDE, { ConceptPane: { create } });
})();
