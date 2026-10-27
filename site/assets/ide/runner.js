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

  async function run(opts = {}) {
    if (running) return;
    try { await runInner(opts); } catch (e) { con.line('❌ 실행 중 오류: ' + IDE.highlight.esc(e.message || e), 'err'); state.server = { running: false, ctx: null, dirty: false }; status(); } finally { running = false; }
  }
  async function runInner(opts) {
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
    running = false; status(); bus.emit('session'); if (!opts.quiet) bus.emit('graded', 'run');
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
      if (r.txHit) state.session.txHit = true;
    }
    bus.emit('session');
  }
  /* 테스트 실행: only = { cls, method } 이면 해당 클래스/메서드만 (IntelliJ 거터 ▶) */
  async function runTests(only) {
    con.show('tests'); bus.emit('testing', true);
    await new Promise(r => setTimeout(r, 160));
    const r = IDE.runTests({ ...state.files }, only);
    if (r.build) { state.problems = r.problems; bus.emit('problems'); con.showTests(r); con.show('problems'); bus.emit('testing', false); return r; }
    // 일부만 실행했다면 이전 결과에 합쳐서 전체 현황을 유지
    if (only && state.session.tests && !state.session.tests.build) {
      const keep = state.session.tests.results.filter(x => !r.results.some(n => n.cls === x.cls && n.method === x.method));
      r.results = [...keep, ...r.results];
      r.summary = { pass: 0, fail: 0, skip: 0 }; r.results.forEach(x => { r.summary[x.status]++; });
    }
    state.session.tests = r; con.showTests(r); bus.emit('tests', r); bus.emit('session'); bus.emit('testing', false); bus.emit('graded', 'tests');
    return r;
  }
  /* ✅ 정답 확인: 앱을 새로 실행(DB 초기화) → 필요한 요청/테스트를 자동 실행 → 그 결과만으로 채점 */
  let verifying = false;
  async function verify(m) {
    if (verifying || running) return;
    verifying = true; bus.emit('verifying', m.id);
    const fresh = { started: false, responses: [], aspectHit: false, txHit: false, tests: null };
    const n = m.id.slice(1);
    try {
      con.show('run'); con.line(`🔍 미션 ${n} 채점 — 앱을 새로 실행하고 필요한 ${m.auto.tests ? '테스트를' : '요청을'} 자동으로 실행합니다`, 'hint');
      if (m.auto.requests) {
        await run({ quiet: true });
        fresh.started = state.server.running;
        if (state.server.running) for (const q of m.auto.requests) {
          const r = IDE.handle(state.server.ctx, { method: q.method, url: 'http://localhost:' + state.server.ctx.port + q.path, headers: q.body ? { 'Content-Type': 'application/json' } : {}, body: q.body });
          r.logs.forEach(it => con.item(it));
          con.line(`   ${q.method} ${q.path} → ${r.status}${r.status && IDE.REASON[r.status] ? ' ' + IDE.REASON[r.status] : ''}`, 'dim');
          fresh.responses.push({ method: q.method, path: q.path, status: r.status, body: r.body });
          if (r.aspectHit) fresh.aspectHit = true; if (r.txHit) fresh.txHit = true;
        }
      }
      if (m.auto.tests) { fresh.tests = await runTests(); }
      const ok = !!m.check(fresh);
      const detail = fresh.responses.map(r => `${r.method} ${r.path} → ${r.status}`).join(' · ') || (fresh.tests && !fresh.tests.build ? `테스트 ${fresh.tests.summary.pass}/${fresh.tests.results.length} 통과` : '');
      if (ok) {
        state.verify[m.id] = { ok: true, msg: '정답입니다!', detail };
        if (!state.done.has(m.id)) { state.done.add(m.id); IDE.store.save(); }
        state.session.started = state.session.started || fresh.started; fresh.responses.forEach(r => state.session.responses.push(r));
        if (fresh.aspectHit) state.session.aspectHit = true; if (fresh.txHit) state.session.txHit = true;
        con.line(`✅ 미션 ${n} 정답! — ${m.title}`, 'ok'); IDE.toast?.(`✅ 미션 ${n} 정답!`);
        bus.emit('session');
      } else {
        const why = !fresh.started && m.auto.requests && m.auto.requests.length ? (state.server.running ? '' : '앱이 실행되지 않았어요 — 콘솔의 오류를 먼저 해결하세요.') : '';
        const d = (m.diagnose ? m.diagnose({ files: state.files, session: fresh, server: { running: state.server.running, dirty: false }, problems: state.problems, tests: fresh.tests }) : []).filter(Boolean);
        state.verify[m.id] = { ok: false, msg: why || d[0] || '아직 조건을 만족하지 못했어요.', detail };
        con.line(`❌ 미션 ${n} 아직이에요 — ${state.verify[m.id].msg}`, 'err');
      }
    } catch (e) { state.verify[m.id] = { ok: false, msg: '채점 중 오류: ' + (e.message || e), detail: '' }; con.line('❌ 채점 중 오류: ' + IDE.highlight.esc(e.message || e), 'err'); }
    finally { verifying = false; bus.emit('verified', m.id); }
  }
  return { run, stop, send, runTests, verify };
}
Object.assign(IDE, { Runner: { create, parseRequest } });
})();
