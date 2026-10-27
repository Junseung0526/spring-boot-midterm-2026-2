/* ui/missions.js — 미션 체크리스트 · 힌트 · 정답 보기 · 초기화 */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { state, store, bus, highlight } = IDE;

function create(host, modal, toast) {
  const openHints = new Set();
  const esc = highlight.esc;
  const diagCtx = () => ({ files: state.files, session: state.session, server: state.server, problems: state.problems, tests: state.session.tests });
  const diagOf = m => { try { return (m.diagnose ? m.diagnose(diagCtx()) : []).filter(Boolean); } catch { return []; } };
  const draw = () => {
    const sc = host.closest('.twb') || host, top = sc.scrollTop;
    const cur = IDE.MISSIONS.find(m => !state.done.has(m.id));
    const total = IDE.MISSIONS.length, n = IDE.MISSIONS.filter(m => state.done.has(m.id)).length;
    host.innerHTML = `<div class="mh"><span>진행도</span><span>${n} / ${total} 완료</span></div><div class="mbar"><div style="width:${n / total * 100}%"></div></div>` +
      IDE.MISSIONS.map((m, i) => (i === 0 || IDE.MISSIONS[i - 1].stage !== m.stage ? `<div class="stage">${m.stage}</div>` : '') + `<div class="mi ${state.done.has(m.id) ? 'done' : ''} ${m.id === cur?.id ? 'current' : ''} ${!state.done.has(m.id) && m.id !== cur?.id ? 'upcoming' : ''}" data-mission="${m.id}" title="클릭하면 작업 위치로 이동합니다">
        <div class="mt"><span class="ck">${state.done.has(m.id) ? '✔' : i + 1}</span><b>${m.title}</b>${m.id === cur?.id ? '<span class="next">NEXT</span>' : ''}</div>
        <p>${m.goal}</p>
        ${m.id === cur?.id && diagOf(m)[0] ? `<div class="diag"><b>🔎 지금 코드</b> ${esc(diagOf(m)[0])}</div>` : ''}
        <div class="ma"><button data-goto="${m.id}" class="goto">📍 위치로 이동</button><button data-hint="${m.id}">💡 힌트${openHints.has(m.id) ? ' 닫기' : ''}</button><button data-open="${m.study}">📖 개념</button></div>
        ${openHints.has(m.id) ? `<div class="mh2">${diagOf(m).length ? `<div class="dg">🔎 현재 코드 진단</div><ul>${diagOf(m).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}<div class="dg">일반 힌트</div><ol>${m.hints.map(h => `<li>${esc(h)}</li>`).join('')}</ol></div>` : ''}</div>`).join('') +
      `<div class="mfoot"><button data-sol>✅ 정답 코드 보기</button><button data-reset>⟲ 프로젝트 초기화</button></div>
       <p class="mnote">TIP · 순서는 <b>권장일 뿐 잠기지 않습니다</b> — 아무 미션이나 먼저 해도, 미션 밖의 코드를 직접 써도 실행됩니다. (단 HTTP 미션은 앱이 켜져 있어야 함)<br>위에서부터 <b>순서대로</b> 따라 하면 IoC/DI → MVC → CRUD → 트랜잭션 → AOP → 테스트 순으로 스프링이 익숙해집니다.<br>코드 수정 후에는 <b>Rerun ⟳</b> 해야 반영됩니다 (실제 IntelliJ 와 동일).<br>단축키 · Shift+F10 실행 · Ctrl+Space 자동완성 · Ctrl+Enter 요청 전송 · Ctrl+/ 주석 · Ctrl+D 줄 복제</p>`;
    sc.scrollTop = top;
  };
  function check() {
    let changed = false;
    for (const m of IDE.MISSIONS) if (!state.done.has(m.id) && m.check(state.session)) {
      state.done.add(m.id); changed = true;
      const nxt = IDE.MISSIONS.find(x => !state.done.has(x.id) && x !== m);
      toast(`🎉 미션 완료: ${m.title}${nxt ? ` — 다음: ${nxt.title}` : ' — 모두 완료! 모의고사에 도전해 보세요'}`);
    }
    if (changed) { store.save(); draw(); }
  }
  host.addEventListener('click', e => {
    const g = e.target.closest('[data-goto]') || (!e.target.closest('button') ? e.target.closest('[data-mission]') : null);
    if (g) { const id = g.dataset.goto || g.dataset.mission; bus.emit('goto', IDE.MISSIONS.find(m => m.id === id).target); return; }
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
  // 내 코드/실행 상태가 바뀌면 진단 문구를 갱신 (타이핑 중에는 잠깐 기다렸다가)
  let dt = null; const soon = () => { clearTimeout(dt); dt = setTimeout(draw, 450); };
  ['edit', 'server', 'problems', 'tests'].forEach(ev => bus.on(ev, soon));
  draw();
}
Object.assign(IDE, { Missions: { create } });
})();
