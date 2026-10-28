/* ui/missions.js — 미션 체크리스트 · 힌트 · 정답 보기 · 초기화 */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { state, store, bus, highlight } = IDE;

function create(host, modal, toast) {
  const openHints = new Set();
  const drafts = new Map();   // 해석 미션에 입력 중인 답 (다시 그려도 유지)
  let verifyingId = null;
  const peek = new Set();      // 순서를 건너뛰고 미리 열어 본 미션
  const esc = highlight.esc;
  const diagCtx = () => ({ files: state.files, session: state.session, server: state.server, problems: state.problems, tests: state.session.tests });
  const diagOf = m => { try { return (m.diagnose ? m.diagnose(diagCtx()) : []).filter(Boolean); } catch { return []; } };
  let showDone = false;      // 완료한 미션 묶음(맨 위 토글)을 펼쳤는지
  /* 미션 카드 한 장 (완료 / 현재 / 미리 연 미션) */
  const card = (m, cur) => {
    const i = IDE.MISSIONS.indexOf(m), done = state.done.has(m.id), isCur = m.id === cur?.id, vr = state.verify[m.id];
    return `<div class="mi ${done ? 'done' : ''} ${isCur ? 'current' : ''} ${!done && !isCur ? 'upcoming' : ''}" data-mission="${m.id}" title="클릭하면 작업 위치로 이동합니다">
        <div class="mt"><span class="ck">${done ? '✔' : i + 1}</span><b>${m.title}</b>${isCur ? '<span class="next">NEXT</span>' : ''}</div>
        <p>${m.goal}</p>
        <div class="crit"><b>채점 기준</b> ${esc(m.criteria || '')}</div>
        ${isCur && diagOf(m)[0] ? `<div class="diag"><b>지금 코드</b> ${esc(diagOf(m)[0])}</div>` : ''}
        ${vr ? `<div class="vres ${vr.ok ? 'ok' : 'bad'}"><b>${vr.ok ? '✔ 정답입니다!' : '✖ 아직이에요'}</b> ${vr.ok ? '' : esc(vr.msg)}${vr.detail ? `<small>${esc(vr.detail)}</small>` : ''}</div>` : ''}
        ${m.quiz ? `<textarea class="qin" data-qin="${m.id}" rows="3" spellcheck="false" placeholder="답을 적어 보세요 — 핵심 단어가 들어 있으면 정답 (Ctrl+Enter 제출)">${esc(drafts.get(m.id) || '')}</textarea>
        <div class="vbar"><button class="verify" data-qsubmit="${m.id}">${done ? '다시 제출' : '답 제출'}</button><span class="vhint">띄어쓰기 · 대소문자는 상관없어요</span></div>
        ${done ? `<div class="qa"><b>모범 답안</b> ${esc(m.quiz.answer)}</div>` : ''}`
        : `<div class="vbar"><button class="verify" data-verify="${m.id}" ${verifyingId ? 'disabled' : ''}>${verifyingId === m.id ? '채점 중…' : done ? '다시 확인' : '정답 확인'}</button><span class="vhint">${m.auto.static ? '빈칸을 검사해요 (앱 실행 없음)' : m.auto.tests ? '빈칸을 검사하고 테스트를 실행해요' : '빈칸을 검사하고 앱을 새로 실행해 요청을 보내요'}</span></div>`}
        <div class="ma"><button data-goto="${m.id}" class="goto">${m.quiz ? '관련 코드 보기' : '위치로 이동'}</button><button data-hint="${m.id}">힌트${openHints.has(m.id) ? ' 닫기' : ''}</button><button data-open="${m.study}">개념</button></div>
        ${openHints.has(m.id) ? hintBox(m, done) : ''}</div>`;
  };
  /* 힌트 사다리: 일반 힌트는 1개 + 정답 확인 실패 1번마다 1개씩, 정답 예시는 2번 실패(또는 완료) 후에 열린다 */
  const SNIP_AFTER = 2;
  const hintBox = (m, done) => {
    const f = state.fails[m.id] || 0, n = done ? m.hints.length : Math.min(m.hints.length, 1 + f), snipOpen = done || f >= SNIP_AFTER;
    const more = n < m.hints.length ? `<li class="lockedhint">${m.quiz ? '답 제출' : '정답 확인'}을 한 번 더 틀리면 다음 힌트가 열려요</li>` : '';
    return `<div class="mh2">${diagOf(m).length ? `<div class="dg">현재 코드 진단</div><ul>${diagOf(m).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}<div class="dg">일반 힌트</div><ol>${m.hints.slice(0, n).map(h => `<li>${esc(h)}</li>`).join('')}${more}</ol>${m.snippet || m.quiz ? `<div class="dg">${m.quiz ? '모범 답안' : '정답 예시'}</div>${snipOpen ? (m.quiz ? `<p class="qa">${esc(m.quiz.answer)}</p>` : `<pre class="snip">${highlight.lines(m.snippet, 'x.java').join('\n')}</pre>`) : `<p class="lockedhint">${m.quiz ? '답 제출' : '정답 확인'}을 ${SNIP_AFTER - f}번 더 틀리면 열려요 (지금 ${f}번)</p>`}` : ''}</div>`;
  };
  const lockedCard = m => `<div class="mi locked" data-mission="${m.id}"><div class="mt"><span class="ck"><svg class="ic"><use href="#i-lock"/></svg></span><span class="sk w60"></span></div><span class="sk w95"></span><span class="sk w70"></span><div class="ma"><span class="lockmsg">앞 미션을 완료하면 열려요</span><button data-peek="${m.id}">미리 열기</button></div></div>`;

  const draw = () => {
    const sc = host.closest('.twb') || host, top = sc.scrollTop;
    const ae = document.activeElement, fq = ae && ae.dataset && ae.dataset.qin, sel = fq ? [ae.selectionStart, ae.selectionEnd] : null;
    const cur = IDE.MISSIONS.find(m => !state.done.has(m.id));
    const total = IDE.MISSIONS.length, doneList = IDE.MISSIONS.filter(m => state.done.has(m.id)), n = doneList.length;
    const rest = IDE.MISSIONS.filter(m => !state.done.has(m.id));     // 현재 · 미리 연 · 잠긴 미션
    // 위쪽 토글: 완료한 미션은 접어 두고 필요할 때만 펼친다
    const doneBlock = n ? `<div class="donebox"><button class="donetoggle ${showDone ? 'open' : ''}" data-toggle-done aria-expanded="${showDone}"><span class="dtitle">✔ 완료한 미션 <b>${n}</b>개</span> ${showDone ? '<span class="tgl">접기</span>' : `<span class="chips">${doneList.map(m => `<i>${m.id.slice(1)}</i>`).join('')}</span>`}</button>${showDone ? `<div class="donelist">${doneList.map(m => card(m, cur)).join('')}</div>` : ''}</div>` : '';
    let shownLockHead = false, prevStage = null;
    const restHtml = rest.map(m => {
      const isCur = m.id === cur?.id, locked = !isCur && !peek.has(m.id);
      const first = m.stage !== prevStage; prevStage = m.stage;
      const groupVisible = rest.some(x => x.stage === m.stage && (x.id === cur?.id || peek.has(x.id)));
      const head = !first ? '' : groupVisible ? `<div class="stage">${m.stage}</div>` : (shownLockHead ? '' : '<div class="stage lockedstage">이후 단계는 앞 미션을 완료하면 열려요</div>');
      if (first && !groupVisible) shownLockHead = true;
      return head + (locked ? lockedCard(m) : card(m, cur));
    }).join('');
    host.innerHTML = `<div class="mh"><span>진행도</span><span>${n} / ${total} 완료</span></div><div class="mbar"><div style="width:${n / total * 100}%"></div></div>` + doneBlock +
      (rest.length ? restHtml : '<div class="alldone">모든 미션을 완료했어요!<small>위의 "완료한 미션"을 펼쳐 다시 확인하거나, 모의고사에 도전해 보세요.</small></div>') +
      `<div class="mfoot"><button data-sol>정답 코드 보기</button><button data-reset>⟲ 프로젝트 초기화</button></div>
       <p class="mnote">TIP · 코드의 <b>___</b> 가 빈칸이에요 ([미션 N] 주석이 달린 줄). 빈칸 미션은 <b>정답 확인</b>, 해석 미션은 답을 적고 <b>답 제출</b>. 직접 Run 하고 요청을 보내 확인해도 됩니다.<br>앞 미션을 끝내면 다음 미션이 열려요. 순서를 건너뛰고 싶으면 "미리 열기" — 아무 미션이나 먼저 해도, 미션 밖의 코드를 직접 써도 실행됩니다. (단 HTTP 미션은 앱이 켜져 있어야 함)<br>위에서부터 <b>순서대로</b> 따라 하면 엔티티 → DTO · 서비스 → 컨트롤러 → 트랜잭션 → 테스트 → 설정 → AOP 순으로, 시험처럼 <b>빈칸 채우기</b>와 <b>코드 해석</b>을 번갈아 풀어요.<br>코드 수정 후에는 <b>Rerun ⟳</b> 해야 반영됩니다 (실제 IntelliJ 와 동일).<br>단축키 · Shift+F10 실행 · Ctrl+Space 자동완성 · Ctrl+Enter 요청 전송 · Ctrl+/ 주석 · Ctrl+D 줄 복제</p>`;
    sc.scrollTop = top;
    if (fq) { const q = host.querySelector(`[data-qin="${fq}"]`); if (q) { q.focus(); q.setSelectionRange(...sel); } }
  };
  function check() {
    let changed = false;
    for (const m of IDE.MISSIONS) if (!state.done.has(m.id) && m.check(state.session, state.files)) {
      state.done.add(m.id); changed = true;
      const nxt = IDE.MISSIONS.find(x => !state.done.has(x.id) && x !== m);
      toast(`미션 완료: ${m.title}${nxt ? ` — 다음: ${nxt.title}` : ' — 모두 완료! 모의고사에 도전해 보세요'}`);
      bus.emit('console-msg', { text: `✔ 미션 ${m.id.slice(1)} 완료 — ${m.title}${nxt ? '   (다음: 미션 ' + nxt.id.slice(1) + ' ' + nxt.title + ')' : '   (모든 미션 완료!)'}`, cls: 'ok' });
    }
    if (changed) { store.save(); draw(); }
  }
  host.addEventListener('click', e => {
    if (e.target.closest('[data-toggle-done]')) { showDone = !showDone; draw(); return; }
    if (e.target.closest('textarea')) return;
    const qs = e.target.closest('[data-qsubmit]'); if (qs) { submitQuiz(qs.dataset.qsubmit); return; }
    const vf = e.target.closest('[data-verify]'); if (vf) { bus.emit('verify', IDE.MISSIONS.find(m => m.id === vf.dataset.verify)); return; }
    const pk = e.target.closest('[data-peek]'); if (pk) { peek.add(pk.dataset.peek); draw(); return; }
    if (e.target.closest('.mi.locked')) return;
    const g = e.target.closest('[data-goto]') || (!e.target.closest('button') ? e.target.closest('[data-mission]') : null);
    if (g) { const id = g.dataset.goto || g.dataset.mission; bus.emit('goto', IDE.MISSIONS.find(m => m.id === id).target); return; }
    const h = e.target.closest('[data-hint]');
    if (h) { const id = h.dataset.hint; openHints.has(id) ? openHints.delete(id) : openHints.add(id); draw(); }
    const o = e.target.closest('[data-open]'); if (o) store.openFile(o.dataset.open);
    if (e.target.closest('[data-sol]')) { if (IDE.MISSIONS.every(m => state.done.has(m.id)) || confirm('모든 미션의 최종 정답 코드가 한꺼번에 보입니다. 직접 풀기 전에 보면 실습 효과가 크게 줄어요. 그래도 볼까요?')) openSolutions(); }
    if (e.target.closest('[data-reset]') && confirm('작성한 코드와 미션 진행 상태를 모두 초기화할까요?')) store.resetProject();
  });

  /* 해석 미션 채점: 핵심어 그룹이 모두 들어 있으면 정답 */
  function submitQuiz(id) {
    const m = IDE.MISSIONS.find(x => x.id === id), r = IDE.gradeAnswer(m, drafts.get(id));
    state.verify[id] = { ok: r.ok, msg: r.msg };
    if (r.ok) {
      if (!state.done.has(id)) { state.done.add(id); const nxt = IDE.MISSIONS.find(x => !state.done.has(x.id)); toast(`미션 ${id.slice(1)} 정답!${nxt ? ` — 다음: ${nxt.title}` : ''}`); }
    } else if (norm(drafts.get(id))) state.fails[id] = (state.fails[id] || 0) + 1;
    store.save(); draw();
  }
  const norm = x => String(x || '').trim();
  host.addEventListener('input', e => { const q = e.target.closest('[data-qin]'); if (q) drafts.set(q.dataset.qin, q.value); });
  host.addEventListener('keydown', e => { const q = e.target.closest('[data-qin]'); if (q && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.stopPropagation(); submitQuiz(q.dataset.qin); } });

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
  bus.on('verifying', id => { verifyingId = id; draw(); }); bus.on('verified', () => { verifyingId = null; draw(); });
  // 내 코드/실행 상태가 바뀌면 진단 문구를 갱신 (타이핑 중에는 잠깐 기다렸다가)
  let dt = null; const soon = () => { clearTimeout(dt); dt = setTimeout(draw, 450); };
  ['edit', 'server', 'problems', 'tests'].forEach(ev => bus.on(ev, soon));
  draw();
}
Object.assign(IDE, { Missions: { create } });
})();
