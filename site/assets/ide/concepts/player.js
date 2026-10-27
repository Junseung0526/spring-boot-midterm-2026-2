/* ide/concepts/player.js — 개념 애니메이션 플레이어: 코드 타이핑 + SVG 단계 강조 + 이동하는 패킷 + 자동재생 */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let uid = 0;

function mount(host, concept) {
  const steps = STEPS[concept.steps], N = steps.length;
  host.innerHTML = `<div class="cp">
    <div class="cp-l">
      <div class="cp-svg">${IDE.svg[concept.svg]}</div>
      <div class="cp-ctl">
        <button data-k="reset" title="처음으로">⏮</button><button data-k="prev" title="이전 (←)">◀</button>
        <button data-k="play" class="play" title="자동재생">▶ 자동재생</button><button data-k="next" title="다음 (→)">▶▶</button>
        <span class="cp-dots">${steps.map((_, i) => `<button class="dot" data-i="${i}" aria-label="${i + 1}단계">${i + 1}</button>`).join('')}</span>
      </div>
    </div>
    <div class="cp-r">
      <div class="cp-card"><div class="cp-step"></div><h3 class="cp-t"></h3><p class="cp-d"></p></div>
      <div class="cp-code"><div class="cp-file"><span class="fi j-class">C</span><b>${concept.title}</b><em></em></div><div class="cp-pre"></div></div>
    </div></div>`;
  const $ = s => host.querySelector(s), svg = $('.cp-svg svg'), pre = $('.cp-pre');
  let i = 0, playing = false, typeT = null, nextT = null;

  function packets(on) {
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
  }
  function type(code, done) {
    clearInterval(typeT);
    if (reduce) { draw(code, false); return done(); }
    let k = 0; const per = Math.max(1, Math.ceil(code.length / 60));
    typeT = setInterval(() => {
      k = Math.min(code.length, k + per); draw(code.slice(0, k), k < code.length);
      if (k >= code.length) { clearInterval(typeT); done(); }
    }, 22);
  }
  function go(n) {
    clearTimeout(nextT); i = Math.max(0, Math.min(N - 1, n));
    const s = steps[i];
    svg.classList.add('stepping');
    svg.querySelectorAll('.sn').forEach(e => e.classList.remove('on'));
    s.on.forEach(id => svg.querySelector('#' + id)?.classList.add('on'));
    packets();
    $('.cp-step').textContent = `STEP ${i + 1} / ${N}`; $('.cp-t').textContent = s.t; $('.cp-d').textContent = s.d;
    $('.cp-file em').textContent = `${i + 1}/${N}`;
    host.querySelectorAll('.dot').forEach((d, j) => { d.classList.toggle('on', j === i); d.classList.toggle('done', j < i); });
    host.querySelector('[data-k=prev]').disabled = i === 0; host.querySelector('[data-k=next]').disabled = i === N - 1;
    type(s.code, () => { if (playing) nextT = setTimeout(() => (i < N - 1 ? go(i + 1) : stop()), 2600); });
  }
  function stop() { playing = false; clearTimeout(nextT); host.querySelector('.play').textContent = '▶ 자동재생'; }
  host.querySelector('.cp-ctl').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.i !== undefined) { stop(); go(+b.dataset.i); return; }
    const k = b.dataset.k;
    if (k === 'next') { stop(); go(i + 1); } else if (k === 'prev') { stop(); go(i - 1); } else if (k === 'reset') { stop(); go(0); }
    else if (k === 'play') {
      if (playing) return stop();
      playing = true; b.textContent = '⏸ 멈춤'; if (i >= N - 1) go(0); else go(i);
    }
  });
  const onKey = e => { if (host.offsetParent === null || /INPUT|TEXTAREA/.test(e.target.tagName)) return; if (e.key === 'ArrowRight') { stop(); go(i + 1); } else if (e.key === 'ArrowLeft') { stop(); go(i - 1); } };
  document.addEventListener('keydown', onKey);
  go(0);
  return { destroy() { clearInterval(typeT); clearTimeout(nextT); document.removeEventListener('keydown', onKey); } };
}
Object.assign(IDE, { player: { mount } });
})();
