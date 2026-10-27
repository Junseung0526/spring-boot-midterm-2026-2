/* runner.js — Run / Stop / HTTP 요청 실행 (엔진 ↔ UI 연결) */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { state, bus } = IDE;

function parseRequest(text, line) {
  const L = text.split('\n'); let s = line - 1;
  while (s >= 0 && !/^(GET|POST|PUT|PATCH|DELETE)\s/.test(L[s])) { if (/^###/.test(L[s])) return null; s--; }
  if (s < 0) return null;
  const m = /^(\w+)\s+(\S+)/.exec(L[s]); let i = s + 1; const headers = {};
  for (; i < L.length && L[i].trim() && !/^###/.test(L[i]); i++) { const h = /^([\w-]+):\s*(.*)$/.exec(L[i]); if (h) headers[h[1]] = h[2]; }
  const body = []; for (i++; i < L.length && !/^###/.test(L[i]) && !/^(GET|POST|PUT|PATCH|DELETE)\s/.test(L[i]); i++) body.push(L[i]);
  return { method: m[1], url: m[2], headers, body: body.join('\n').trim(), line: s + 1 };
}

function create(con) {
  let running = false;
  const status = () => bus.emit('server');

  async function run() {
    if (running) return;
    if (state.server.running) stop(true);
    running = true; con.clear(); con.show('run'); bus.emit('building');
    const files = { ...state.files };
    con.line(`/usr/lib/jvm/java-21-openjdk/bin/java -XX:TieredStopAtLevel=1 -Dspring.output.ansi.enabled=always -classpath build/classes/java/main:... com.example.blog.BlogApplication`, 'dim');
    await new Promise(r => setTimeout(r, 120));
    const r = IDE.boot(files);
    if (r.build) {
      con.line(`❌ Build failed — ${r.problems.length} error${r.problems.length > 1 ? 's' : ''}`, 'err');
      r.problems.forEach(p => con.line(`${p.path.split('/').pop()}:${p.line}  java: ${IDE.highlight.esc(p.msg)}${p.hint ? '  💡 ' + IDE.highlight.esc(p.hint) : ''}`, 'err'));
      con.line('', ''); con.line('Process finished with exit code 1', 'dim');
      con.show('problems'); running = false; return status();
    }
    await con.stream(r.items);
    if (r.ok) {
      state.server = { running: true, ctx: r.ctx, dirty: false };
      state.session.started = true;
    } else {
      con.line('', ''); con.line('Process finished with exit code 1', 'dim');
      state.server = { running: false, ctx: null, dirty: false };
    }
    running = false; status(); bus.emit('session');
  }
  function stop(silent) {
    if (!state.server.running) return;
    if (!silent) { con.line('', ''); con.line('Process finished with exit code 130 (interrupted by signal 2:SIGINT)', 'dim'); }
    state.server = { running: false, ctx: null, dirty: false }; status();
  }
  async function send(text, line) {
    const req = parseRequest(text, line);
    if (!req) return;
    const t0 = performance.now();
    if (!state.server.running) { con.showResponse(req, { status: 0, error: 'java.net.ConnectException: Connection refused: connect — 서버가 실행 중이 아닙니다. 먼저 ▶ Run 하세요.' }, 0); return; }
    const r = IDE.handle(state.server.ctx, req);
    r.logs.forEach(it => con.item(it));
    const ms = Math.max(3, Math.round(performance.now() - t0) + 4 + Math.floor(Math.random() * 12));
    con.showResponse(req, r, ms);
    if (r.status) {
      state.session.responses.push({ method: req.method, path: new URL(req.url).pathname, status: r.status, body: r.body });
      if (r.aspectHit) state.session.aspectHit = true;
    }
    bus.emit('session');
  }
  return { run, stop, send };
}
Object.assign(IDE, { Runner: { create, parseRequest } });
})();
