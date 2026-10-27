/* ide/concepts/player.js — 개념 애니메이션 플레이어
   코드 타이핑 + SVG 단계 강조 + 이동하는 패킷 + 자동재생 + 장면 끝 학습 동선(이해 확인 퀴즈 · 다음 개념 · 관련 실습) */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let uid = 0;
const ICON = { play: '<svg class="ic"><use href="#i-play"/></svg>', pause: '<svg class="ic"><use href="#i-pause"/></svg>' };

function mount(host, concept) {
  const steps = STEPS[concept.steps], N = steps.length;
  host.innerHTML = `<div class="cp">
    <div class="cp-l">
      <div class="cp-svg">${IDE.svg[concept.svg]}</div>
      <div class="cp-legend"><i class="ldot o"></i>주황 테두리 = 지금 설명하는 곳 &nbsp;·&nbsp; <i class="ldot y"></i>움직이는 점 = 호출/데이터 이동 &nbsp;·&nbsp; 점선 = 응답</div>
      <div class="cp-ctl">
        <button data-k="reset" title="처음으로"><svg class="ic"><use href="#i-rerun"/></svg></button><button data-k="prev" title="이전 단계 (←)"><svg class="ic"><use href="#i-prev"/></svg></button>
        <button data-k="play" class="play" title="재생 / 정지 (스페이스)">${ICON.pause}</button><button data-k="next" title="다음 단계 (→)"><svg class="ic"><use href="#i-next"/></svg></button>
        <span class="cp-hint">← → 이동 · 스페이스 재생/정지</span>
        <span class="cp-dots">${steps.map((_, i) => `<button class="dot" data-i="${i}" aria-label="${i + 1}단계">${i + 1}</button>`).join('')}</span>
      </div>
    </div>
    <div class="cp-card"><div class="cp-step"></div><h3 class="cp-t"></h3><p class="cp-d"></p></div>
    <div class="cp-code"><div class="cp-file"><span class="fi j-class">C</span><b>${esc(concept.title)}</b><em></em></div><div class="cp-pre"></div></div>
    <div class="cp-end" hidden></div></div>`;
  const $ = s => host.querySelector(s), svg = $('.cp-svg svg'), pre = $('.cp-pre');
  let i = 0, playing = false, typeT = null, nextT = null, quizBuilt = false;

  /* append: true 인 단계는 이전 단계 코드 뒤에 이어서 타이핑한다 */
  const fullCode = n => (steps[n].append && n > 0 ? fullCode(n - 1) + '\n' + steps[n].code : steps[n].code);
  const prefixLen = n => (steps[n].append && n > 0 ? fullCode(n - 1).length + 1 : 0);

  function packets() {
    svg.querySelectorAll('.pkt').forEach(n => n.remove());
    if (reduce) return;
    svg.querySelectorAll('.sn.on path.edge').forEach(p => {
      if (!p.id) p.id = 'pk' + (++uid);
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('r', '6'); c.setAttribute('class', 'pkt');
      const a = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion');
      a.setAttribute('dur', '1.5s'); a.setAttribute('repeatCount', 'indefinite');
      const m = document.createElementNS('http://www.w3.org/2000/svg', 'mpath'); m.setAttribute('href', '#' + p.id);
      a.appendChild(m); c.appendChild(a); svg.appendChild(c);
    });
  }
  function draw(text, cursor) {
    const lines = IDE.highlight.lines(text, 'x.java');
    pre.innerHTML = lines.map((l, n) => `<div class="cl"><i>${n + 1}</i><span>${l || ' '}${cursor && n === lines.length - 1 ? '<b class="caret"></b>' : ''}</span></div>`).join('');
    pre.scrollTop = pre.scrollHeight;
  }
  function type(n, done) {
    clearInterval(typeT);
    const code = fullCode(n), from = prefixLen(n);
    if (reduce) { draw(code, false); return done(); }
    let k = from; const per = Math.max(1, Math.ceil((code.length - from) / 60));
    draw(code.slice(0, k), true);
    typeT = setInterval(() => {
      k = Math.min(code.length, k + per); draw(code.slice(0, k), k < code.length);
      if (k >= code.length) { clearInterval(typeT); done(); }
    }, 22);
  }

  /* ── 장면 끝: 이해 확인 · 다음 개념 · 관련 실습 ── */
  function buildEnd() {
    const end = $('.cp-end'), M = IDE.memo, next = IDE.concepts.nextScene(concept.id), pr = concept.practice;
    const pool = M ? EXAM.map((q, idx) => ({ q, idx })).filter(x => x.q.t === concept.tag) : [];
    const picks = M ? M.shuffle(pool).slice(0, 2).map(x => ({ ...x, choices: M.shuffle(x.q.c.map((t, k) => ({ t, ok: k === x.q.a }))) })) : [];
    end.innerHTML = `<div class="end-h">🎉 이 개념을 끝까지 봤어요 <small>${esc(concept.title)}</small></div>
      ${picks.length ? `<div class="end-quiz"><b>✅ 이해 확인</b>${picks.map((p, qi) => `<div class="eq" data-q="${qi}"><p>${esc(p.q.q)}</p><div class="eo">${p.choices.map((c, k) => `<button data-q="${qi}" data-k="${k}">${esc(c.t)}</button>`).join('')}</div><div class="ex" hidden>${esc(p.q.e)}</div></div>`).join('')}</div>` : ''}
      <div class="end-go">${pr ? `<button data-open="${pr.file}" class="go practice">🧪 ${esc(pr.label)}</button>` : ''}
        ${next ? `<button data-open="concept:${next.id}" class="go">다음 개념 · ${esc(next.title)} ▶</button>` : `<button data-memo="exam" class="go">📝 모의고사로 마무리 ▶</button>`}
        <button data-k="reset" class="go ghost">↻ 처음부터 다시</button></div>`;
    end.onclick = e => {
      const b = e.target.closest('button[data-q]'); if (!b || b.disabled) return;
      const p = picks[+b.dataset.q], ok = p.choices[+b.dataset.k].ok, card = b.closest('.eq');
      card.querySelectorAll('button').forEach((x, k) => { x.disabled = true; x.classList.add(p.choices[k].ok ? 'right' : (x === b ? 'wrong' : 'dim')); });
      const ex = card.querySelector('.ex'); ex.hidden = false; ex.textContent = (ok ? '정답! ' : '오답 — ') + p.q.e;
      if (ok) M.wrong.delete(p.idx); else M.wrong.add(p.idx);
      M.saveWrong();
    };
    quizBuilt = true;
  }
  function showEnd() {
    if (!quizBuilt) buildEnd();
    $('.cp-end').hidden = false; IDE.concepts.markSeen(concept.id);
    setTimeout(() => $('.cp-end').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' }), 80);
  }

  function go(n) {
    clearTimeout(nextT); i = Math.max(0, Math.min(N - 1, n));
    const s = steps[i];
    svg.classList.add('stepping');
    svg.querySelectorAll('.sn').forEach(e => e.classList.remove('on', 'off'));
    s.on.forEach(id => svg.querySelector('#' + id)?.classList.add('on'));
    (s.off || []).forEach(id => svg.querySelector('#' + id)?.classList.add('off'));   // 이 단계에서는 존재하지 않는 요소(예: @WebMvcTest 에는 진짜 Service 가 없음)
    packets();
    $('.cp-step').textContent = `STEP ${i + 1} / ${N}`; $('.cp-t').textContent = s.t; $('.cp-d').textContent = s.d;
    $('.cp-file em').textContent = `${i + 1}/${N}`;
    host.querySelectorAll('.dot').forEach((d, j) => { d.classList.toggle('on', j === i); d.classList.toggle('done', j < i); });
    host.querySelector('[data-k=prev]').disabled = i === 0; host.querySelector('[data-k=next]').disabled = i === N - 1;
    if (i < N - 1) $('.cp-end').hidden = true;
    type(i, () => {
      if (i === N - 1) { showEnd(); stop(); }
      else if (playing) nextT = setTimeout(() => go(i + 1), 2600);
    });
  }
  function stop() { playing = false; clearTimeout(nextT); host.querySelector('.play').innerHTML = ICON.play; }
  host.addEventListener('click', e => {
    const b = e.target.closest('.cp-ctl button, .cp-end [data-k]'); if (!b || !host.contains(b)) return;
    if (b.dataset.i !== undefined) { stop(); go(+b.dataset.i); return; }
    const k = b.dataset.k;
    if (k === 'next') { stop(); go(i + 1); } else if (k === 'prev') { stop(); go(i - 1); } else if (k === 'reset') { stop(); go(0); host.scrollTop = 0; }
    else if (k === 'play') {
      if (playing) return stop();
      playing = true; b.innerHTML = ICON.pause; if (i >= N - 1) go(0); else go(i);
    }
  });
  const onKey = e => { if (host.offsetParent === null || /INPUT|TEXTAREA/.test(e.target.tagName) || e.ctrlKey || e.altKey) return; if (e.key === 'ArrowRight') { stop(); go(i + 1); } else if (e.key === 'ArrowLeft') { stop(); go(i - 1); } else if (e.key === ' ') { e.preventDefault(); host.querySelector('.play').click(); } };
  document.addEventListener('keydown', onKey);
  playing = true;            // 열자마자 자동재생 (⏸️ 로 멈출 수 있음)
  go(0);
  return { destroy() { clearInterval(typeT); clearTimeout(nextT); document.removeEventListener('keydown', onKey); } };
}
Object.assign(IDE, { player: { mount } });
})();
