/* ui/missions.js — 미션 체크리스트 · 힌트 · 정답 보기 · 초기화 */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { state, store, bus, highlight } = IDE;

function create(host, modal, toast) {
  const openHints = new Set();
  const draw = () => {
    const total = IDE.MISSIONS.length, n = IDE.MISSIONS.filter(m => state.done.has(m.id)).length;
    host.innerHTML = `<div class="mh"><span>진행도</span><span>${n} / ${total} 완료</span></div><div class="mbar"><div style="width:${n / total * 100}%"></div></div>` +
      IDE.MISSIONS.map((m, i) => `<div class="mi ${state.done.has(m.id) ? 'done' : ''}">
        <div class="mt"><span class="ck">${state.done.has(m.id) ? '✔' : i + 1}</span><b>${m.title}</b></div>
        <p>${m.goal}</p>
        <div class="ma"><button data-hint="${m.id}">💡 힌트${openHints.has(m.id) ? ' 닫기' : ''}</button><button data-open="${m.study}">📖 개념</button></div>
        ${openHints.has(m.id) ? `<ol class="mh2">${m.hints.map(h => `<li>${h}</li>`).join('')}</ol>` : ''}</div>`).join('') +
      `<div class="mfoot"><button data-sol>✅ 정답 코드 보기</button><button data-reset>⟲ 프로젝트 초기화</button></div>
       <p class="mnote">TIP · 코드 수정 후에는 <b>Rerun ⟳</b> 해야 반영됩니다 (실제 IntelliJ 와 동일).<br>단축키 · Shift+F10 실행 · Ctrl+Space 자동완성 · Ctrl+Enter 요청 전송 · Ctrl+/ 주석 · Ctrl+D 줄 복제</p>`;
  };
  function check() {
    let changed = false;
    for (const m of IDE.MISSIONS) if (!state.done.has(m.id) && m.check(state.session)) { state.done.add(m.id); changed = true; toast(`🎉 미션 완료: ${m.title}`); }
    if (changed) { store.save(); draw(); }
  }
  host.addEventListener('click', e => {
    const h = e.target.closest('[data-hint]');
    if (h) { const id = h.dataset.hint; openHints.has(id) ? openHints.delete(id) : openHints.add(id); draw(); }
    const o = e.target.closest('[data-open]'); if (o) store.openFile(o.dataset.open);
    if (e.target.closest('[data-sol]')) openSolutions();
    if (e.target.closest('[data-reset]') && confirm('작성한 코드와 미션 진행 상태를 모두 초기화할까요?')) store.resetProject();
  });

  function openSolutions() {
    const entries = Object.entries(IDE.SOLUTIONS);
    const showTab = i => {
      const [p, code] = entries[i];
      modal.querySelector('.mbody').innerHTML = `<div class="stabs">${entries.map(([q], k) => `<button class="${k === i ? 'on' : ''}" data-k="${k}">${q.split('/').pop()}</button>`).join('')}</div>
        <pre class="solcode">${highlight.lines(code, p).join('\n')}</pre>
        <div class="sact"><button data-apply="${i}">이 파일을 에디터에 적용</button><button data-close>닫기</button></div>`;
    };
    modal.hidden = false; showTab(0);
    modal.onclick = e => {
      if (e.target === modal || e.target.closest('[data-close]')) modal.hidden = true;
      const k = e.target.closest('[data-k]'); if (k) showTab(+k.dataset.k);
      const a = e.target.closest('[data-apply]');
      if (a) { const [p, code] = entries[+a.dataset.apply]; store.setContent(p, code); store.openFile(p); bus.emit('reload'); modal.hidden = true; toast('정답 코드를 적용했습니다 — Rerun 하세요'); }
    };
  }
  bus.on('session', check); bus.on('reset', draw);
  draw();
}
Object.assign(IDE, { Missions: { create } });
})();
