/* memo/exam.js — 모의고사: 주제/문항 수 선택 · 즉시 해설 · 오답노트 */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { esc, shuffle, wrong, saveWrong } = IDE.memo;

function mount(root) {
  const X = { phase: 'start', list: [], i: 0, pick: null, score: 0, miss: [], n: 10, tag: 'all' };
  const tags = () => ['all', ...new Set(EXAM.map(q => q.t))];
  function start(ids) {
    X.list = ids.map(id => { const q = EXAM[id]; return { id, q, choices: shuffle(q.c.map((t, k) => ({ t, ok: k === q.a }))) }; });
    Object.assign(X, { phase: 'run', i: 0, pick: null, score: 0, miss: [] });
  }
  function render() {
    if (X.phase === 'start') {
      root.innerHTML = `<div class="qbox"><h3>시작 설정</h3>
        <div class="mfilters">${tags().map(t => `<button type="button" class="chip ${X.tag === t ? 'on' : ''}" data-x="tag" data-v="${t}">${t === 'all' ? '전체 주제' : t}</button>`).join('')}</div>
        <div class="mfilters">${[5, 10, 20, 99].map(n => `<button type="button" class="chip ${X.n === n ? 'on' : ''}" data-x="n" data-v="${n}">${n === 99 ? '전부' : n + '문제'}</button>`).join('')}</div>
        <div class="cardctl"><button type="button" class="primary" data-x="start">모의고사 시작 ▶</button><button type="button" data-x="wrongs" ${wrong.size ? '' : 'disabled'}>오답노트 풀기 (${wrong.size})</button></div>
        <p class="muted">총 ${EXAM.length}문항 · 보기 순서는 매번 섞입니다 · 틀린 문제는 자동으로 오답노트에 저장됩니다.</p></div>`;
      return;
    }
    if (X.phase === 'run') {
      const { q, choices } = X.list[X.i];
      const btns = choices.map((c, k) => `<button type="button" class="opt ${X.pick !== null ? (c.ok ? 'right' : k === X.pick ? 'wrong' : 'dim') : ''}" data-x="pick" data-v="${k}" ${X.pick !== null ? 'disabled' : ''}>${esc(c.t)}</button>`).join('');
      const res = X.pick === null ? '' : `<div class="result ${choices[X.pick].ok ? 'ok' : 'no'}">${choices[X.pick].ok ? '정답!' : '오답'}<br><small>${esc(q.e)}</small></div><button type="button" class="primary" data-x="next">${X.i === X.list.length - 1 ? '결과 보기' : '다음 ▶'}</button>`;
      root.innerHTML = `<div class="qbox"><div class="score">${X.i + 1} / ${X.list.length} · 현재 ${X.score}점 · <span class="pill">${q.t}</span></div><p class="q big-q">${esc(q.q)}</p><div class="opts col">${btns}</div>${res}</div>`;
      return;
    }
    const pct = Math.round(X.score / X.list.length * 100);
    root.innerHTML = `<div class="qbox"><h3>결과: ${X.score} / ${X.list.length} (${pct}점)</h3><div class="meter"><div style="width:${pct}%"></div></div>
      <p>${pct >= 90 ? '완벽해요! 시험장 가도 됩니다' : pct >= 70 ? '좋아요! 틀린 부분만 복습하면 충분합니다.' : '개념 탭을 다시 보고 오답노트를 반복해 보세요'}</p>
      ${X.miss.length ? '<h4>틀린 문제</h4>' + X.miss.map(m => `<div class="miss"><b>${esc(m.q.q)}</b><br>정답: ${esc(m.q.c[m.q.a])}<br><small>${esc(m.q.e)}</small></div>`).join('') : ''}
      <div class="cardctl"><button type="button" class="primary" data-x="again">다시 설정</button>${X.miss.length ? '<button type="button" data-x="redo">틀린 문제만 다시</button>' : ''}</div></div>`;
  }
  root.addEventListener('click', e => {
    const t = e.target.closest('[data-x]'); if (!t) return;
    const v = t.dataset.v;
    switch (t.dataset.x) {
      case 'tag': X.tag = v; break;
      case 'n': X.n = +v; break;
      case 'start': start(shuffle(EXAM.map((_, i) => i).filter(i => X.tag === 'all' || EXAM[i].t === X.tag)).slice(0, X.n)); break;
      case 'wrongs': start(shuffle([...wrong])); break;
      case 'pick': {
        if (X.pick !== null) return;
        X.pick = +v; const cur = X.list[X.i];
        if (cur.choices[X.pick].ok) { X.score++; wrong.delete(cur.id); } else { X.miss.push(cur); wrong.add(cur.id); }
        saveWrong(); break;
      }
      case 'next': X.pick = null; if (X.i === X.list.length - 1) X.phase = 'end'; else X.i++; break;
      case 'again': X.phase = 'start'; break;
      case 'redo': start(X.miss.map(m => m.id)); break;
    }
    render();
  });
  render();
  return { render };
}
Object.assign(IDE.memo, { mountExam: mount });
})();
