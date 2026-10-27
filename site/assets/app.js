/* Spring Boot 4 중간고사 올인원 — 앱 스크립트 (의존성 없음) */
(() => {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 불가 환경 */ } },
};

const ANNS = ANN.map(([name, cat, desc, code]) => ({ name, cat, desc, code }));
const ANN_MAP = Object.fromEntries(ANNS.map(a => [a.name, a]));

/* ───────────── 테마 ───────────── */
const root = document.documentElement;
const savedTheme = store.get('sb4.theme', null);
if (savedTheme) root.dataset.theme = savedTheme;
$('#theme').addEventListener('click', () => {
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  store.set('sb4.theme', root.dataset.theme);
});

/* ───────────── 코드 하이라이트 ───────────── */
const KW = 'public|private|protected|class|interface|record|enum|extends|implements|return|new|final|static|void|import|package|throws|throw|if|else|for|try|catch|this|null|true|false|var|int|long|boolean|String|implementation|runtimeOnly|testImplementation|plugins';
const TOK = new RegExp('(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)|("(?:[^"\\\\\\n]|\\\\.)*")|(@[A-Za-z]\\w*)|\\b(' + KW + ')\\b|\\b(\\d+L?)\\b', 'g');

function highlight(src) {
  let out = '', last = 0, m;
  TOK.lastIndex = 0;
  while ((m = TOK.exec(src))) {
    out += esc(src.slice(last, m.index));
    const t = m[0];
    if (m[3]) {
      const n = t.slice(1);
      out += ANN_MAP[n] ? `<span class="an" data-a="${n}" title="클릭: 설명 보기">${esc(t)}</span>` : `<span class="a">${esc(t)}</span>`;
    } else {
      out += `<span class="${m[1] ? 'c' : m[2] ? 's' : m[4] ? 'k' : 'n'}">${esc(t)}</span>`;
    }
    last = TOK.lastIndex;
  }
  return out + esc(src.slice(last));
}

function codeBlock(src, title) {
  const w = document.createElement('div');
  w.className = 'codewrap';
  w.innerHTML = `<div class="codehead"><span>${esc(title || '')}</span><button class="copy" type="button">복사</button></div><pre><code>${highlight(src)}</code></pre>`;
  $('.copy', w).addEventListener('click', e => {
    navigator.clipboard?.writeText(src).then(() => { e.target.textContent = '복사됨 ✓'; setTimeout(() => (e.target.textContent = '복사'), 1200); });
  });
  return w;
}

/* 어노테이션 클릭 → 설명 패널 */
document.addEventListener('click', e => {
  const el = e.target.closest('.an');
  if (!el) return;
  const a = ANN_MAP[el.dataset.a];
  const wrap = el.closest('.codewrap');
  if (!a || !wrap) return;
  let box = $('.anbox', wrap);
  if (!box) { box = document.createElement('div'); box.className = 'anbox'; wrap.appendChild(box); }
  box.innerHTML = `<b>@${a.name}</b> <span class="pill">${CATS[a.cat]}</span><br>${esc(a.desc)}`;
});

/* 코드 탭 */
$$('.codetabs').forEach(box => {
  const tabs = $$('script[type="text/plain"]', box).map(s => ({ title: s.dataset.title, note: s.dataset.note || '', src: s.textContent.replace(/^\n/, '').replace(/\s+$/, '') }));
  $$('script', box).forEach(s => s.remove());
  const bar = document.createElement('div'); bar.className = 'tabbar'; bar.setAttribute('role', 'tablist');
  const panel = document.createElement('div');
  box.append(bar, panel);
  const show = i => {
    $$('button', bar).forEach((b, j) => { b.classList.toggle('on', i === j); b.setAttribute('aria-selected', i === j); });
    panel.replaceChildren();
    if (tabs[i].note) { const n = document.createElement('p'); n.className = 'tabnote'; n.innerHTML = tabs[i].note; panel.appendChild(n); }
    panel.appendChild(codeBlock(tabs[i].src, tabs[i].title));
  };
  tabs.forEach((t, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.role = 'tab'; b.textContent = t.title;
    b.addEventListener('click', () => show(i));
    bar.appendChild(b);
  });
  show(0);
});

$$('script.code').forEach(s => {
  s.replaceWith(codeBlock(s.textContent.replace(/^\n/, '').replace(/\s+$/, ''), s.dataset.title));
});

/* ───────────── 단계별 시뮬레이터 ───────────── */
function stepper(rootEl) {
  const steps = STEPS[rootEl.dataset.stepper];
  const svg = $('svg.dia', rootEl);
  const ui = document.createElement('div');
  ui.className = 'st-ui';
  ui.innerHTML = `
    <div class="st-ctl">
      <button type="button" data-k="reset" aria-label="처음으로">⟲</button>
      <button type="button" data-k="prev">◀ 이전</button>
      <button type="button" data-k="next" class="primary">다음 ▶</button>
      <button type="button" data-k="play">▶ 자동재생</button>
      <span class="st-dots"></span>
    </div>
    <div class="st-body"><h4 class="st-title"></h4><p class="st-desc"></p><div class="st-code"></div></div>`;
  rootEl.appendChild(ui);
  const dots = $('.st-dots', ui);
  steps.forEach((_, i) => {
    const d = document.createElement('button');
    d.type = 'button'; d.className = 'dot'; d.textContent = i + 1; d.setAttribute('aria-label', `${i + 1}단계`);
    d.addEventListener('click', () => go(i));
    dots.appendChild(d);
  });
  let i = 0, timer = null;
  const stop = () => { clearInterval(timer); timer = null; $('[data-k=play]', ui).textContent = '▶ 자동재생'; };
  function go(n) {
    i = Math.max(0, Math.min(steps.length - 1, n));
    const s = steps[i];
    svg.classList.add('stepping');
    $$('.sn', svg).forEach(el => el.classList.remove('on'));
    s.on.forEach(id => svg.querySelector('#' + id)?.classList.add('on'));
    $$('.dot', dots).forEach((d, j) => { d.classList.toggle('on', j === i); d.classList.toggle('done', j < i); });
    $('.st-title', ui).textContent = s.t;
    $('.st-desc', ui).textContent = s.d;
    $('.st-code', ui).replaceChildren(codeBlock(s.code, '이 단계의 코드'));
    $('[data-k=prev]', ui).disabled = i === 0;
    $('[data-k=next]', ui).disabled = i === steps.length - 1;
  }
  ui.addEventListener('click', e => {
    const k = e.target.dataset.k;
    if (k === 'next') { stop(); go(i + 1); }
    else if (k === 'prev') { stop(); go(i - 1); }
    else if (k === 'reset') { stop(); go(0); }
    else if (k === 'play') {
      if (timer) return stop();
      if (i === steps.length - 1) go(0);
      e.target.textContent = '⏸ 멈춤';
      timer = setInterval(() => { if (i >= steps.length - 1) stop(); else go(i + 1); }, 3200);
    }
  });
  go(0);
}
$$('[data-stepper]').forEach(stepper);

/* ───────────── 진행도 ───────────── */
const known = new Set(store.get('sb4.known', []));
const wrongSet = new Set(store.get('sb4.wrong', []));
const saveKnown = () => { store.set('sb4.known', [...known]); updateStats(); };
const saveWrong = () => { store.set('sb4.wrong', [...wrongSet]); updateStats(); };
function updateStats() {
  $('#st-known').textContent = `${known.size} / ${ANNS.length}`;
  $('#st-bar').style.width = (known.size / ANNS.length * 100) + '%';
  $('#st-wrong').textContent = wrongSet.size;
}

/* ───────────── 어노테이션 트레이너 ───────────── */
const A = { mode: 'card', cats: new Set(Object.keys(CATS)), unknownOnly: false, order: [], idx: 0, flip: false, dir: 'name', hide: true,
  qz: null, qzScore: 0, qzTotal: 0, ty: null, tyScore: 0, tyTotal: 0, q: '' };
const annRoot = $('#ann-app');
const blank = a => a.code.replace(new RegExp('@' + a.name + '\\b'), '@_____');
const deck = () => ANNS.filter(a => A.cats.has(a.cat) && (!A.unknownOnly || !known.has(a.name)));
const rebuildOrder = () => { A.order = shuffle(deck().map(a => a.name)); A.idx = 0; A.flip = false; A.qz = null; A.ty = null; };
rebuildOrder();

function filterBar() {
  const chips = Object.entries(CATS).map(([k, v]) => {
    const n = ANNS.filter(a => a.cat === k).length, kn = ANNS.filter(a => a.cat === k && known.has(a.name)).length;
    return `<button type="button" class="chip ${A.cats.has(k) ? 'on' : ''}" data-act="cat" data-v="${k}">${v} <small>${kn}/${n}</small></button>`;
  }).join('');
  return `<div class="filters">${chips}
    <button type="button" class="chip ghost" data-act="allcats">전체 선택</button>
    <label class="chk"><input type="checkbox" data-act="unk" ${A.unknownOnly ? 'checked' : ''}> 모르는 것만</label></div>`;
}

function modeBar() {
  const m = [['card', '🃏 카드'], ['choice', '✅ 객관식'], ['type', '⌨️ 빈칸 입력'], ['list', '📋 전체 목록']];
  return `<div class="modes" role="tablist">${m.map(([k, l]) => `<button type="button" role="tab" class="${A.mode === k ? 'on' : ''}" data-act="mode" data-v="${k}">${l}</button>`).join('')}</div>`;
}

const empty = () => `<div class="empty">조건에 맞는 어노테이션이 없습니다. 필터를 바꿔 보세요. 🎉 (전부 외웠다면 "모르는 것만"을 해제하세요)</div>`;

function cardView() {
  if (!A.order.length) return empty();
  const a = ANN_MAP[A.order[A.idx]];
  const front = A.dir === 'name'
    ? `<div class="big mono">@${a.name}</div><div class="hint">뜻을 떠올려 보세요 — 클릭하면 뒤집힘</div>`
    : `<div class="mini">${CATS[a.cat]}</div><p class="q">${esc(a.desc)}</p><pre class="blankcode">${esc(blank(a))}</pre><div class="hint">알맞은 어노테이션은? — 클릭하면 뒤집힘</div>`;
  const back = A.dir === 'name'
    ? `<div class="mini">${CATS[a.cat]}</div><p class="q">${esc(a.desc)}</p><div class="codeslot"></div>`
    : `<div class="big mono">@${a.name}</div><div class="codeslot"></div>`;
  return `<div class="cardwrap">
    <div class="count">${A.idx + 1} / ${A.order.length} ${known.has(a.name) ? '<span class="ok">✓ 외움</span>' : ''}</div>
    <div class="flash ${A.flip ? 'flip' : ''}" data-act="flip" tabindex="0">
      <div class="face front">${front}</div><div class="face back">${back}</div></div>
    <div class="cardctl">
      <button type="button" data-act="dont" class="bad">← 헷갈려요</button>
      <button type="button" data-act="flip">뒤집기 (F)</button>
      <button type="button" data-act="know" class="good">외웠어요 →</button>
    </div>
    <div class="cardctl sub">
      <button type="button" data-act="prev">이전</button>
      <button type="button" data-act="shuf">🔀 섞기</button>
      <button type="button" data-act="dir">앞면: ${A.dir === 'name' ? '이름 → 뜻' : '뜻 → 이름'}</button>
      <button type="button" data-act="next">건너뛰기</button>
    </div></div>`;
}

function newChoice() {
  const d = deck();
  if (!d.length) { A.qz = null; return; }
  const a = d[Math.floor(Math.random() * d.length)];
  const same = ANNS.filter(x => x.cat === a.cat && x.name !== a.name);
  const others = shuffle(same.length >= 3 ? same : ANNS.filter(x => x.name !== a.name)).slice(0, 3);
  A.qz = { a, opts: shuffle([a, ...others]), pick: null };
}
function choiceView() {
  if (!A.qz) newChoice();
  if (!A.qz) return empty();
  const { a, opts, pick } = A.qz;
  const btns = opts.map(o => {
    let cls = '';
    if (pick) cls = o.name === a.name ? 'right' : (o.name === pick ? 'wrong' : 'dim');
    return `<button type="button" class="opt mono ${cls}" data-act="pick" data-v="${o.name}" ${pick ? 'disabled' : ''}>@${o.name}</button>`;
  }).join('');
  const res = pick ? `<div class="result ${pick === a.name ? 'ok' : 'no'}">${pick === a.name ? '정답! 🎯' : `오답 — 정답은 <b>@${a.name}</b>`}<br><small>${esc(a.desc)}</small></div><button type="button" class="primary" data-act="nextq">다음 문제 ▶</button>` : '';
  return `<div class="quizbox"><div class="score">점수 ${A.qzScore} / ${A.qzTotal}</div>
    <div class="mini">${CATS[a.cat]}</div><p class="q">${esc(a.desc)}</p><pre class="blankcode">${esc(blank(a))}</pre>
    <div class="opts">${btns}</div>${res}</div>`;
}

function newType() {
  const d = deck();
  A.ty = d.length ? { a: d[Math.floor(Math.random() * d.length)], done: null, hint: false } : null;
}
function typeView() {
  if (!A.ty) newType();
  if (!A.ty) return empty();
  const { a, done, hint } = A.ty;
  const h = hint ? `<div class="hint">힌트: @${a.name.slice(0, 2)}${'·'.repeat(Math.max(0, a.name.length - 2))} (${a.name.length}글자)</div>` : '';
  const res = done === null ? '' : `<div class="result ${done ? 'ok' : 'no'}">${done ? '정답! 🎯' : `오답 — 정답: <b>@${a.name}</b>`}</div><button type="button" class="primary" data-act="nextt">다음 문제 ▶</button>`;
  return `<div class="quizbox"><div class="score">점수 ${A.tyScore} / ${A.tyTotal}</div>
    <div class="mini">${CATS[a.cat]}</div><p class="q">${esc(a.desc)}</p><pre class="blankcode">${esc(blank(a))}</pre>
    <form data-act="tysubmit" class="tyform"><span class="mono">@</span><input id="tyin" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="어노테이션 이름 (대소문자 무관)" ${done === null ? '' : 'disabled'}>
    <button type="submit" ${done === null ? '' : 'disabled'}>확인</button><button type="button" data-act="tyhint" ${done === null ? '' : 'disabled'}>힌트</button><button type="button" data-act="tyskip" ${done === null ? '' : 'disabled'}>모르겠음</button></form>${h}${res}</div>`;
}

function listView() {
  const q = A.q.trim().toLowerCase();
  const rows = deck().filter(a => !q || (a.name + a.desc).toLowerCase().includes(q)).map(a => `
    <tr><td class="mono nm ${A.hide ? 'blur' : ''}" data-act="reveal">@${a.name}</td><td><span class="pill">${CATS[a.cat]}</span></td><td>${esc(a.desc)}</td>
    <td><button type="button" class="mini-btn ${known.has(a.name) ? 'on' : ''}" data-act="toggle" data-v="${a.name}" aria-label="외움 표시">${known.has(a.name) ? '✓' : '○'}</button></td></tr>`).join('');
  return `<div class="listctl"><input type="search" id="lq" placeholder="검색 (이름 또는 설명)" value="${esc(A.q)}">
    <label class="chk"><input type="checkbox" data-act="hide" ${A.hide ? 'checked' : ''}> 이름 가리기 (클릭하면 보임)</label></div>
    <div class="tablewrap"><table class="ann"><thead><tr><th>어노테이션</th><th>분류</th><th>의미</th><th>외움</th></tr></thead><tbody>${rows || '<tr><td colspan="4">결과 없음</td></tr>'}</tbody></table></div>`;
}

function renderAnn() {
  const body = { card: cardView, choice: choiceView, type: typeView, list: listView }[A.mode]();
  const focus = document.activeElement?.id;
  annRoot.innerHTML = filterBar() + modeBar() + `<div class="annbody">${body}</div>`;
  const slot = $('.codeslot', annRoot);
  if (slot && A.order.length) slot.appendChild(codeBlock(ANN_MAP[A.order[A.idx]].code, '예제'));
  if (focus === 'lq') { const el = $('#lq'); el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  if (A.mode === 'type' && A.ty?.done === null) $('#tyin')?.focus();
  updateStats();
}

const nextCard = d => { A.idx = (A.idx + d + A.order.length) % A.order.length; A.flip = false; };
const norm = s => s.replace(/^@/, '').trim().toLowerCase();

annRoot.addEventListener('click', e => {
  const t = e.target.closest('[data-act]');
  if (!t || t.tagName === 'FORM' || t.tagName === 'INPUT' && t.type !== 'checkbox') return;
  const act = t.dataset.act, v = t.dataset.v;
  if (e.target.closest('.codewrap')) return;
  switch (act) {
    case 'cat': A.cats.has(v) ? A.cats.delete(v) : A.cats.add(v); rebuildOrder(); break;
    case 'allcats': A.cats = new Set(Object.keys(CATS)); rebuildOrder(); break;
    case 'unk': A.unknownOnly = t.checked; rebuildOrder(); break;
    case 'mode': A.mode = v; if (v === 'card') rebuildOrder(); break;
    case 'flip': A.flip = !A.flip; break;
    case 'know': { const n = A.order[A.idx]; known.add(n); saveKnown(); nextCard(1); break; }
    case 'dont': { const n = A.order[A.idx]; known.delete(n); saveKnown(); nextCard(1); break; }
    case 'next': nextCard(1); break;
    case 'prev': nextCard(-1); break;
    case 'shuf': rebuildOrder(); break;
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
  renderAnn();
});
annRoot.addEventListener('submit', e => {
  e.preventDefault();
  if (!A.ty || A.ty.done !== null) return;
  const ok = norm($('#tyin').value) === A.ty.a.name.toLowerCase();
  A.ty.done = ok; A.tyTotal++;
  if (ok) { A.tyScore++; known.add(A.ty.a.name); } else known.delete(A.ty.a.name);
  saveKnown(); renderAnn();
});
annRoot.addEventListener('input', e => { if (e.target.id === 'lq') { A.q = e.target.value; renderAnn(); } });
document.addEventListener('keydown', e => {
  if (A.mode !== 'card' || !A.order.length || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  const r = annRoot.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) return;
  if (e.key === 'ArrowRight') { known.add(A.order[A.idx]); saveKnown(); nextCard(1); }
  else if (e.key === 'ArrowLeft') { known.delete(A.order[A.idx]); saveKnown(); nextCard(1); }
  else if (e.key.toLowerCase() === 'f') A.flip = !A.flip;
  else return;
  renderAnn();
});
$('#reset-known').addEventListener('click', () => {
  if (confirm('외운 표시와 오답노트를 모두 초기화할까요?')) { known.clear(); wrongSet.clear(); saveKnown(); saveWrong(); rebuildOrder(); renderAnn(); renderExam(); }
});

/* ───────────── 모의고사 ───────────── */
const X = { phase: 'start', list: [], i: 0, pick: null, score: 0, miss: [], n: 10, tag: 'all' };
const examRoot = $('#exam-app');

function startExam(ids) {
  X.list = ids.map(id => {
    const q = EXAM[id];
    const choices = q.c.length > 2 ? shuffle(q.c.map((t, k) => ({ t, ok: k === q.a }))) : q.c.map((t, k) => ({ t, ok: k === q.a }));
    return { id, q, choices };
  });
  Object.assign(X, { phase: 'run', i: 0, pick: null, score: 0, miss: [] });
}

function renderExam() {
  const tags = ['all', ...new Set(EXAM.map(q => q.t))];
  if (X.phase === 'start') {
    examRoot.innerHTML = `<div class="quizbox">
      <h4>시작 설정</h4>
      <div class="filters">${tags.map(t => `<button type="button" class="chip ${X.tag === t ? 'on' : ''}" data-x="tag" data-v="${t}">${t === 'all' ? '전체 주제' : t}</button>`).join('')}</div>
      <div class="filters">${[5, 10, 20, 99].map(n => `<button type="button" class="chip ${X.n === n ? 'on' : ''}" data-x="n" data-v="${n}">${n === 99 ? '전부' : n + '문제'}</button>`).join('')}</div>
      <div class="cardctl"><button type="button" class="primary" data-x="start">모의고사 시작 ▶</button>
      <button type="button" data-x="wrongs" ${wrongSet.size ? '' : 'disabled'}>📝 오답노트 풀기 (${wrongSet.size})</button></div>
      <p class="muted">총 ${EXAM.length}문항 · 보기 순서는 매번 섞입니다 · 틀린 문제는 자동으로 오답노트에 저장됩니다.</p></div>`;
    updateStats(); return;
  }
  if (X.phase === 'run') {
    const { q, choices } = X.list[X.i];
    const btns = choices.map((c, k) => {
      let cls = '';
      if (X.pick !== null) cls = c.ok ? 'right' : (k === X.pick ? 'wrong' : 'dim');
      return `<button type="button" class="opt ${cls}" data-x="pick" data-v="${k}" ${X.pick !== null ? 'disabled' : ''}>${esc(c.t)}</button>`;
    }).join('');
    const res = X.pick === null ? '' : `<div class="result ${choices[X.pick].ok ? 'ok' : 'no'}">${choices[X.pick].ok ? '정답! 🎯' : '오답'}<br><small>${esc(q.e)}</small></div>
      <button type="button" class="primary" data-x="next">${X.i === X.list.length - 1 ? '결과 보기' : '다음 ▶'}</button>`;
    examRoot.innerHTML = `<div class="quizbox"><div class="score">${X.i + 1} / ${X.list.length} · 현재 ${X.score}점 · <span class="pill">${q.t}</span></div>
      <p class="q big-q">${esc(q.q)}</p><div class="opts col">${btns}</div>${res}</div>`;
    return;
  }
  const pct = Math.round(X.score / X.list.length * 100);
  examRoot.innerHTML = `<div class="quizbox"><h4>결과: ${X.score} / ${X.list.length} (${pct}점)</h4>
    <div class="meter"><div style="width:${pct}%"></div></div>
    <p>${pct >= 90 ? '완벽해요! 시험장 가도 됩니다 🏆' : pct >= 70 ? '좋아요! 틀린 부분만 복습하면 충분합니다.' : '개념 섹션을 다시 훑고 오답노트를 반복해 보세요 💪'}</p>
    ${X.miss.length ? '<h5>틀린 문제</h5>' + X.miss.map(m => `<div class="missitem"><b>${esc(m.q.q)}</b><br>정답: ${esc(m.q.c[m.q.a])}<br><small>${esc(m.q.e)}</small></div>`).join('') : ''}
    <div class="cardctl"><button type="button" class="primary" data-x="again">다시 설정</button>
    ${X.miss.length ? '<button type="button" data-x="redo">틀린 문제만 다시</button>' : ''}</div></div>`;
  updateStats();
}

examRoot.addEventListener('click', e => {
  const t = e.target.closest('[data-x]');
  if (!t) return;
  const v = t.dataset.v;
  switch (t.dataset.x) {
    case 'tag': X.tag = v; break;
    case 'n': X.n = +v; break;
    case 'start': {
      const ids = shuffle(EXAM.map((_, i) => i).filter(i => X.tag === 'all' || EXAM[i].t === X.tag)).slice(0, X.n);
      startExam(ids); break;
    }
    case 'wrongs': startExam(shuffle([...wrongSet])); break;
    case 'pick': {
      if (X.pick !== null) return;
      X.pick = +v;
      const cur = X.list[X.i];
      if (cur.choices[X.pick].ok) { X.score++; wrongSet.delete(cur.id); }
      else { X.miss.push(cur); wrongSet.add(cur.id); }
      saveWrong(); break;
    }
    case 'next': X.pick = null; if (X.i === X.list.length - 1) X.phase = 'end'; else X.i++; break;
    case 'again': X.phase = 'start'; break;
    case 'redo': startExam(X.miss.map(m => m.id)); break;
  }
  renderExam();
});

/* ───────────── 내비게이션 ───────────── */
const links = $$('nav a');
const io = new IntersectionObserver(es => {
  es.forEach(en => {
    if (en.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id));
  });
}, { rootMargin: '-40% 0px -55% 0px' });
$$('main > section[id]').forEach(s => io.observe(s));

renderAnn();
renderExam();
})();
