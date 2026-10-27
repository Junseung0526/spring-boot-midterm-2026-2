/* memo/trainer.js — 어노테이션 암기: 카드 · 객관식 · 빈칸 입력 · 전체 목록 */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { esc, shuffle, ANNS, ANN_MAP, known, saveKnown, blank, codeHtml } = IDE.memo;

function mount(root) {
  const A = { mode: 'card', cats: new Set(Object.keys(CATS)), unknownOnly: false, order: [], idx: 0, flip: false, dir: 'name', hide: true, qz: null, qzScore: 0, qzTotal: 0, ty: null, tyScore: 0, tyTotal: 0, q: '' };
  const deck = () => ANNS.filter(a => A.cats.has(a.cat) && (!A.unknownOnly || !known.has(a.name)));
  const rebuild = () => { A.order = shuffle(deck().map(a => a.name)); A.idx = 0; A.flip = false; A.qz = null; A.ty = null; };
  rebuild();
  const pre = src => `<pre class="mcode">${codeHtml(src)}</pre>`;
  const empty = () => '<div class="mempty">조건에 맞는 어노테이션이 없습니다. 필터를 바꾸거나 "모르는 것만"을 해제하세요.</div>';

  const filterBar = () => `<div class="mfilters">${Object.entries(CATS).map(([k, v]) => {
    const all = ANNS.filter(a => a.cat === k), kn = all.filter(a => known.has(a.name)).length;
    return `<button type="button" class="chip ${A.cats.has(k) ? 'on' : ''}" data-act="cat" data-v="${k}">${v} <small>${kn}/${all.length}</small></button>`;
  }).join('')}<button type="button" class="chip ghost" data-act="allcats">전체</button>
    <label class="chk"><input type="checkbox" data-act="unk" ${A.unknownOnly ? 'checked' : ''}> 모르는 것만</label></div>`;
  const modeBar = () => `<div class="mmodes">${[['card', '카드'], ['choice', '객관식'], ['type', '빈칸 입력'], ['list', '전체 목록']].map(([k, l]) => `<button type="button" class="${A.mode === k ? 'on' : ''}" data-act="mode" data-v="${k}">${l}</button>`).join('')}</div>`;

  function cardView() {
    if (!A.order.length) return empty();
    const a = ANN_MAP[A.order[A.idx]];
    const front = A.dir === 'name'
      ? `<div class="big mono">@${a.name}</div><div class="hint">뜻을 떠올려 보세요 — 클릭하면 뒤집힘</div>`
      : `<div class="mini">${CATS[a.cat]}</div><p class="q">${esc(a.desc)}</p>${pre(blank(a))}<div class="hint">알맞은 어노테이션은? — 클릭하면 뒤집힘</div>`;
    const back = A.dir === 'name' ? `<div class="mini">${CATS[a.cat]}</div><p class="q">${esc(a.desc)}</p>${pre(a.code)}` : `<div class="big mono">@${a.name}</div>${pre(a.code)}`;
    return `<div class="cardwrap"><div class="count">${A.idx + 1} / ${A.order.length} ${known.has(a.name) ? '<span class="ok">✓ 외움</span>' : ''}</div>
      <div class="flash ${A.flip ? 'flip' : ''}" data-act="flip" tabindex="0"><div class="face front">${front}</div><div class="face back">${back}</div></div>
      <div class="cardctl"><button type="button" data-act="dont" class="bad">← 헷갈려요</button><button type="button" data-act="flip">뒤집기 (F)</button><button type="button" data-act="know" class="good">외웠어요 →</button></div>
      <div class="cardctl sub"><button type="button" data-act="prev">이전</button><button type="button" data-act="shuf">섞기</button><button type="button" data-act="dir">앞면: ${A.dir === 'name' ? '이름 → 뜻' : '뜻 → 이름'}</button><button type="button" data-act="next">건너뛰기</button></div></div>`;
  }
  function newChoice() {
    const d = deck(); if (!d.length) { A.qz = null; return; }
    const a = d[Math.floor(Math.random() * d.length)];
    const same = ANNS.filter(x => x.cat === a.cat && x.name !== a.name);
    A.qz = { a, opts: shuffle([a, ...shuffle(same.length >= 3 ? same : ANNS.filter(x => x.name !== a.name)).slice(0, 3)]), pick: null };
  }
  function choiceView() {
    if (!A.qz) newChoice(); if (!A.qz) return empty();
    const { a, opts, pick } = A.qz;
    const btns = opts.map(o => `<button type="button" class="opt mono ${pick ? (o.name === a.name ? 'right' : o.name === pick ? 'wrong' : 'dim') : ''}" data-act="pick" data-v="${o.name}" ${pick ? 'disabled' : ''}>@${o.name}</button>`).join('');
    const res = pick ? `<div class="result ${pick === a.name ? 'ok' : 'no'}">${pick === a.name ? '정답!' : `오답 — 정답은 <b>@${a.name}</b>`}<br><small>${esc(a.desc)}</small></div><button type="button" class="primary" data-act="nextq">다음 문제 ▶</button>` : '';
    return `<div class="qbox"><div class="score">점수 ${A.qzScore} / ${A.qzTotal}</div><div class="mini">${CATS[a.cat]}</div><p class="q">${esc(a.desc)}</p>${pre(blank(a))}<div class="opts">${btns}</div>${res}</div>`;
  }
  function newType() { const d = deck(); A.ty = d.length ? { a: d[Math.floor(Math.random() * d.length)], done: null, hint: false } : null; }
  function typeView() {
    if (!A.ty) newType(); if (!A.ty) return empty();
    const { a, done, hint } = A.ty, off = done !== null;
    return `<div class="qbox"><div class="score">점수 ${A.tyScore} / ${A.tyTotal}</div><div class="mini">${CATS[a.cat]}</div><p class="q">${esc(a.desc)}</p>${pre(blank(a))}
      <form data-act="tysubmit" class="tyform"><span class="mono">@</span><input id="tyin" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="어노테이션 이름 (대소문자 무관)" ${off ? 'disabled' : ''}>
      <button type="submit" ${off ? 'disabled' : ''}>확인</button><button type="button" data-act="tyhint" ${off ? 'disabled' : ''}>힌트</button><button type="button" data-act="tyskip" ${off ? 'disabled' : ''}>모르겠음</button></form>
      ${hint ? `<div class="hint">힌트: @${a.name.slice(0, 2)}${'·'.repeat(Math.max(0, a.name.length - 2))} (${a.name.length}글자)</div>` : ''}
      ${off ? `<div class="result ${done ? 'ok' : 'no'}">${done ? '정답!' : `오답 — 정답: <b>@${a.name}</b>`}</div><button type="button" class="primary" data-act="nextt">다음 문제 ▶</button>` : ''}</div>`;
  }
  function listView() {
    const q = A.q.trim().toLowerCase();
    const rows = deck().filter(a => !q || (a.name + a.desc).toLowerCase().includes(q)).map(a => `<tr><td class="mono nm ${A.hide ? 'blur' : ''}" data-act="reveal">@${a.name}</td><td><span class="pill">${CATS[a.cat]}</span></td><td>${esc(a.desc)}</td>
      <td><button type="button" class="mini-btn ${known.has(a.name) ? 'on' : ''}" data-act="toggle" data-v="${a.name}" aria-label="외움 표시">${known.has(a.name) ? '✓' : '○'}</button></td></tr>`).join('');
    return `<div class="listctl"><input type="search" id="lq" placeholder="검색 (이름 또는 설명)" value="${esc(A.q)}"><label class="chk"><input type="checkbox" data-act="hide" ${A.hide ? 'checked' : ''}> 이름 가리기 (클릭하면 보임)</label></div>
      <div class="mtable"><table><thead><tr><th>어노테이션</th><th>분류</th><th>의미</th><th>외움</th></tr></thead><tbody>${rows || '<tr><td colspan="4">결과 없음</td></tr>'}</tbody></table></div>`;
  }
  function render() {
    const body = { card: cardView, choice: choiceView, type: typeView, list: listView }[A.mode]();
    const focus = document.activeElement?.id;
    root.innerHTML = filterBar() + modeBar() + `<div class="mbody">${body}</div>`;
    if (focus === 'lq') { const el = root.querySelector('#lq'); el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    if (A.mode === 'type' && A.ty?.done === null) root.querySelector('#tyin')?.focus();
    IDE.bus.emit('memo');
  }
  const step = d => { A.idx = (A.idx + d + A.order.length) % A.order.length; A.flip = false; };
  const norm = s => s.replace(/^@/, '').trim().toLowerCase();

  root.addEventListener('click', e => {
    const t = e.target.closest('[data-act]');
    if (!t || t.tagName === 'FORM' || (t.tagName === 'INPUT' && t.type !== 'checkbox')) return;
    const act = t.dataset.act, v = t.dataset.v;
    switch (act) {
      case 'cat': A.cats.has(v) ? A.cats.delete(v) : A.cats.add(v); rebuild(); break;
      case 'allcats': A.cats = new Set(Object.keys(CATS)); rebuild(); break;
      case 'unk': A.unknownOnly = t.checked; rebuild(); break;
      case 'mode': A.mode = v; if (v === 'card') rebuild(); break;
      case 'flip': A.flip = !A.flip; break;
      case 'know': known.add(A.order[A.idx]); saveKnown(); step(1); break;
      case 'dont': known.delete(A.order[A.idx]); saveKnown(); step(1); break;
      case 'next': step(1); break;
      case 'prev': step(-1); break;
      case 'shuf': rebuild(); break;
      case 'dir': A.dir = A.dir === 'name' ? 'desc' : 'name'; A.flip = false; break;
      case 'pick':
        if (A.qz.pick) return;
        A.qz.pick = v; A.qzTotal++;
        if (v === A.qz.a.name) A.qzScore++; else { known.delete(A.qz.a.name); saveKnown(); }
        break;
      case 'nextq': newChoice(); break;
      case 'tyhint': A.ty.hint = true; break;
      case 'tyskip': A.ty.done = false; A.tyTotal++; known.delete(A.ty.a.name); saveKnown(); break;
      case 'nextt': newType(); break;
      case 'reveal': t.classList.toggle('blur'); return;
      case 'hide': A.hide = t.checked; break;
      case 'toggle': known.has(v) ? known.delete(v) : known.add(v); saveKnown(); break;
      default: return;
    }
    render();
  });
  root.addEventListener('submit', e => {
    e.preventDefault();
    if (!A.ty || A.ty.done !== null) return;
    const ok = norm(root.querySelector('#tyin').value) === A.ty.a.name.toLowerCase();
    A.ty.done = ok; A.tyTotal++;
    if (ok) { A.tyScore++; known.add(A.ty.a.name); } else known.delete(A.ty.a.name);
    saveKnown(); render();
  });
  root.addEventListener('input', e => { if (e.target.id === 'lq') { A.q = e.target.value; render(); } });
  document.addEventListener('keydown', e => {
    if (A.mode !== 'card' || !A.order.length || root.offsetParent === null || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight') { known.add(A.order[A.idx]); saveKnown(); step(1); }
    else if (e.key === 'ArrowLeft') { known.delete(A.order[A.idx]); saveKnown(); step(1); }
    else if (e.key.toLowerCase() === 'f') A.flip = !A.flip;
    else return;
    e.stopPropagation(); render();
  });
  render();
  return { render, rebuild: () => { rebuild(); render(); } };
}
Object.assign(IDE.memo, { mountTrainer: mount });
})();
