/* ui/console.js — 하단 도구창: Run 콘솔 · Problems · HTTP Response */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { highlight, bus, state } = IDE;
const { esc } = highlight;

function create(host, hooks) {
  host.innerHTML = `
    <div class="bt"><button data-t="run" class="on">▶ Run</button><button data-t="problems">⚠ Problems <b class="cnt" id="pcnt"></b></button><button data-t="http">≋ HTTP Response</button><span class="sp"></span><button data-clear title="지우기">🗑</button></div>
    <div class="bp" data-p="run"></div><div class="bp" data-p="problems" hidden></div><div class="bp" data-p="http" hidden></div>`;
  const pane = n => host.querySelector(`[data-p="${n}"]`), runP = pane('run');
  const show = n => { host.querySelectorAll('.bt button[data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === n)); host.querySelectorAll('.bp').forEach(p => { p.hidden = p.dataset.p !== n; }); };
  host.querySelector('.bt').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.t) show(b.dataset.t);
    if (b.hasAttribute('data-clear')) { runP.innerHTML = ''; pane('http').innerHTML = ''; }
  });
  const scroll = () => { runP.scrollTop = runP.scrollHeight; };

  function fmt(it) {
    if (it.k === 'raw') return `<div class="ln ${it.cls || ''}">${esc(it.text) || '&nbsp;'}</div>`;
    const lg = esc(it.logger.length > 40 ? it.logger.slice(-40) : it.logger.padEnd(40));
    return `<div class="ln lv-${it.lvl} ${it.dim ? 'dim' : ''}"><span class="ts">${it.ts}</span> <span class="lv">${it.lvl.padStart(5)}</span> <span class="pid">${it.pid}</span> --- <span class="meta">[blog] [${esc(it.thread.padStart(15))}]</span> <span class="lg">${lg}</span> : ${esc(it.msg)}</div>`;
  }
  const line = (html, cls) => { runP.insertAdjacentHTML('beforeend', `<div class="ln ${cls || ''}">${html}</div>`); scroll(); };
  const item = it => { runP.insertAdjacentHTML('beforeend', fmt(it)); scroll(); };
  const stream = (items, delay = 28) => new Promise(res => {
    let i = 0;
    const step = () => { if (i >= items.length) return res(); item(items[i++]); setTimeout(step, items[i - 1].k === 'raw' && items[i - 1].cls === 'banner' ? 4 : delay); };
    step();
  });

  function showProblems(list) {
    const errs = list.filter(p => p.sev === 'error');
    host.querySelector('#pcnt').textContent = errs.length || '';
    const byFile = {};
    list.forEach(p => (byFile[p.path] ||= []).push(p));
    pane('problems').innerHTML = !list.length ? '<div class="ln dim">문제가 없습니다. No problems found ✔</div>' :
      Object.entries(byFile).map(([f, ps]) => `<div class="pf">${esc(f.split('/').pop())} <small>${ps.length} problem${ps.length > 1 ? 's' : ''}</small></div>` + ps.map(p => `<div class="pr" data-path="${p.path}" data-line="${p.line}"><i class="gerr"></i>${esc(p.msg)} <small>:${p.line}${p.hint ? ' · 💡 ' + esc(p.hint) : ''}${p.kind === 'spring' ? ' · Spring' : ''}</small></div>`).join('')).join('');
  }
  pane('problems').addEventListener('click', e => { const r = e.target.closest('.pr'); if (r) hooks.onGoto?.(r.dataset.path, +r.dataset.line); });

  function showResponse(req, r, ms) {
    const head = r.status === 0 ? `<div class="rs err">${esc(r.error)}</div>` :
      `<div class="rs s${String(r.status)[0]}">HTTP/1.1 ${r.status} ${IDE.REASON[r.status] || ''}</div><div class="rh">${Object.entries(r.headers).map(([k, v]) => `<div><b>${esc(k)}</b>: ${esc(v)}</div>`).join('')}<div><b>Transfer-Encoding</b>: chunked</div><div><b>Date</b>: ${new Date().toUTCString()}</div></div>`;
    const body = r.body ? `<pre class="rb">${highlight.jsonish(r.body)}</pre>` : '<div class="dim">(본문 없음)</div>';
    const foot = r.status === 0 ? '' : `<div class="rf">Response code: ${r.status}; Time: ${ms} ms; Content length: ${new TextEncoder().encode(r.body || '').length} B</div>`;
    pane('http').insertAdjacentHTML('afterbegin', `<div class="rblock"><div class="rq">${esc(req.method)} ${esc(req.url)}</div>${head}${body}${foot}</div>`);
    show('http');
  }
  bus.on('problems', () => showProblems(state.problems));
  return { show, line, item, stream, clear() { runP.innerHTML = ''; }, showProblems, showResponse };
}
Object.assign(IDE, { Console: { create } });
})();
