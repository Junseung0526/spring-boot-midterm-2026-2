/* memo/modal.js — 상단 버튼으로 여는 "어노테이션 암기 · 모의고사" 전체화면 모달 */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const M = IDE.memo;
let el, panes = {}, mounted = {};

function build() {
  el = document.createElement('div'); el.id = 'memo'; el.hidden = true;
  el.innerHTML = `<div class="mwin" role="dialog" aria-modal="true" aria-label="암기와 시험">
    <header><div class="mtabs"><button data-tab="ann">어노테이션 암기</button><button data-tab="exam">모의고사</button></div>
      <span class="mstat"></span><button class="mreset" title="진행도 초기화">초기화</button><button class="mclose" aria-label="닫기">✕</button></header>
    <div class="mpane" data-pane="ann"></div><div class="mpane" data-pane="exam"></div></div>`;
  document.body.appendChild(el);
  el.querySelectorAll('.mpane').forEach(p => { panes[p.dataset.pane] = p; });
  el.addEventListener('click', e => {
    if (e.target === el || e.target.closest('.mclose')) close();
    const t = e.target.closest('[data-tab]'); if (t) open(t.dataset.tab);
    if (e.target.closest('.mreset') && confirm('외운 표시와 오답노트를 모두 초기화할까요?')) { M.known.clear(); M.wrong.clear(); M.saveKnown(); M.saveWrong(); mounted.ann?.rebuild(); mounted.exam?.render(); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !el.hidden) close(); });
  IDE.bus.on('memo', stat);
}
function stat() { if (el) el.querySelector('.mstat').textContent = `외운 어노테이션 ${M.known.size} / ${M.ANNS.length}  ·  오답노트 ${M.wrong.size}`; }
function open(tab = 'ann') {
  if (!el) build();
  el.hidden = false;
  if (!mounted[tab]) mounted[tab] = tab === 'ann' ? M.mountTrainer(panes.ann) : M.mountExam(panes.exam);
  el.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  Object.entries(panes).forEach(([k, p]) => { p.hidden = k !== tab; });
  stat();
}
function close() { if (el) el.hidden = true; }

Object.assign(M, { open, close });
})();
