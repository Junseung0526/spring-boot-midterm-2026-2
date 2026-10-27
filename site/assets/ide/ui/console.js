/* ui/console.js — 하단 도구창: Run 콘솔 · Problems · HTTP Response */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { highlight, bus, state } = IDE;
const { esc } = highlight;

function create(host, hooks) {
  host.innerHTML = `
    <div class="bt"><button data-t="run" class="on"><svg class="ic"><use href="#i-term"/></svg>Run</button><button data-t="tests"><svg class="ic"><use href="#i-test"/></svg>Tests <b class="tcnt" id="tcnt"></b></button><button data-t="problems"><svg class="ic"><use href="#i-warn"/></svg>Problems <b class="cnt" id="pcnt"></b></button><button data-t="http"><svg class="ic"><use href="#i-http"/></svg>HTTP Response</button><span class="sp"></span><button data-clear title="지우기">Clear</button></div>
    <div class="bp" data-p="run"></div><div class="bp" data-p="tests" hidden></div><div class="bp" data-p="problems" hidden></div><div class="bp" data-p="http" hidden></div>`;
  const pane = n => host.querySelector(`[data-p="${n}"]`), runP = pane('run');
  const show = n => { bus.emit('console'); host.querySelectorAll('.bt button[data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === n)); host.querySelectorAll('.bp').forEach(p => { p.hidden = p.dataset.p !== n; }); };
  host.querySelector('.bt').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.t) show(b.dataset.t);
    if (b.hasAttribute('data-clear')) { runP.innerHTML = ''; pane('http').innerHTML = ''; pane('tests').innerHTML = ''; }
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
      Object.entries(byFile).map(([f, ps]) => `<div class="pf">${esc(f.split('/').pop())} <small>${ps.length} problem${ps.length > 1 ? 's' : ''}</small></div>` + ps.map(p => `<div class="pr" data-path="${p.path}" data-line="${p.line}"><i class="gerr"></i>${esc(p.msg)} <small>:${p.line}${p.hint ? ' · ' + esc(p.hint) : ''}${p.kind === 'spring' ? ' · Spring' : ''}</small></div>`).join('')).join('');
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
  /* 테스트 결과: 요약 + 클래스별 트리, 실패는 메시지 펼침 */
  function showTests(r) {
    const tp = pane('tests');
    if (r.build) { tp.innerHTML = `<div class="ln err">✖ 테스트 컴파일 실패 — ${r.problems.length}개 오류 (Problems 탭 참고)</div>`; host.querySelector('#tcnt').textContent = ''; show('tests'); return; }
    const sm = r.summary, total = sm.pass + sm.fail + sm.skip;
    const byCls = {}; r.results.forEach(x => (byCls[x.cls] ||= []).push(x));
    const icon = st => ({ pass: '<i class="tp">✔</i>', fail: '<i class="tf">✖</i>', skip: '<i class="ts2">⚠</i>' }[st]);
    tp.innerHTML = `<div class="tsum ${sm.fail ? 'bad' : 'good'}"><b>${sm.fail ? '✖ 실패가 있습니다' : '✔ 모든 테스트 통과'}</b> — ${total}개 중 ${sm.pass} 통과 · ${sm.fail} 실패${sm.skip ? ' · ' + sm.skip + ' 실행불가' : ''} <small>${r.ms} ms</small>
        <button class="tgo" data-tests-run>▶ 전체 다시 실행</button></div>` +
      Object.entries(byCls).map(([cls, list]) => { const f = list.some(x => x.status === 'fail'), k = list.every(x => x.status === 'pass');
        return `<div class="tcls"><div class="tch">${f ? '<i class="tf">✖</i>' : k ? '<i class="tp">✔</i>' : '<i class="ts2">⚠</i>'}<b>${esc(cls)}</b> <small>${list.filter(x => x.status === 'pass').length}/${list.length}</small></div>` +
        list.map(x => `<div class="tm ${x.status}" data-path="${x.path}" data-line="${x.line}">${icon(x.status)}<span>${esc(x.display || x.method)}</span><small>${esc(x.method)}() · ${x.ms} ms</small></div>${x.msg ? `<pre class="tmsg ${x.status}">${esc(x.msg)}</pre>` : ''}`).join('') + '</div>'; }).join('');
    host.querySelector('#tcnt').textContent = sm.fail ? sm.fail : '';
    show('tests');
  }
  pane('tests').addEventListener('click', e => {
    if (e.target.closest('[data-tests-run]')) { hooks.onRunTests?.(); return; }
    const r = e.target.closest('.tm'); if (r) hooks.onGoto?.(r.dataset.path, +r.dataset.line);
  });
  bus.on('problems', () => showProblems(state.problems));
  return { show, line, item, stream, clear() { runP.innerHTML = ''; }, showProblems, showResponse, showTests };
}
Object.assign(IDE, { Console: { create } });
})();
