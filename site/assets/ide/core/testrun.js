/* core/testrun.js — 테스트 실행 시뮬레이션.
   클래스 종류별로 컨텍스트를 만들고(@SpringBootTest / @WebMvcTest / @DataJpaTest / Mockito 단위),
   각 @Test 메서드를 minijava 로 해석해 통과·실패·실행불가(skip)를 판정한다. */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { hasAnn, getAnn, simple, decap, fqn } = IDE;
const { Interp, Unsupported, AssertionFail, JavaThrow, show, deepEq, toPlain, optOf, isInst, isOpt, isMock } = IDE.mini;

const isTestPath = p => /(^|\/)src\/test\/java\//.test(p);
const ANY = { __any: true };
const RET_DEFAULT = (retType) => {
  const r = String(retType || '').trim();
  if (/^(List|Set|Collection)\b/.test(r)) return [];
  if (/^Optional\b/.test(r)) return optOf(null);
  if (/^(int|long|short|byte|double|float)$/.test(r)) return 0;
  if (r === 'boolean') return false;
  return null;
};

/* ── Mockito ── */
function newMock(typeName, model) { return { __mock: true, type: typeName, T: model.types.get(typeName), stubs: [], calls: [] }; }
const argsMatch = (stubArgs, actual) => stubArgs === null || (stubArgs.length === actual.length && stubArgs.every((s, i) => deepEq(actual[i], s)));
function mockCall(mock, name, args) {
  mock.calls.push({ name, args });
  for (let i = mock.stubs.length - 1; i >= 0; i--) {
    const s = mock.stubs[i];
    if (s.name === name && argsMatch(s.args, args)) { if (s.thr) throw new JavaThrow(s.thr, ''); return s.ret; }
  }
  const m = mock.T && mock.T.methods.find(x => x.name === name);
  if (m) return RET_DEFAULT(m.retType);
  if (/^findById$/.test(name)) return optOf(null);
  if (/^findAll/.test(name)) return [];
  if (/^(count)$/.test(name)) return 0;
  if (/^(existsById)$/.test(name)) return false;
  return null;
}

/* ── 인메모리 Repository (@DataJpaTest) ── */
function newRepo(model, entityName) {
  return { __repo: true, rows: [], seq: 1, entity: entityName, T: model.types.get(entityName) };
}
function repoCall(r, name, args) {
  const idOf = e => e && e.f ? e.f.id : e;
  switch (name) {
    case 'save': { const e = args[0]; if (e.f.id === null || e.f.id === undefined) e.f.id = r.seq++; if (!r.rows.includes(e)) r.rows = r.rows.filter(x => x.f.id !== e.f.id).concat(e); return e; }
    case 'saveAll': return args[0].map(e => repoCall(r, 'save', [e]));
    case 'findById': return optOf(r.rows.find(x => x.f.id === args[0]) || null);
    case 'findAll': return r.rows.slice();
    case 'count': return r.rows.length;
    case 'existsById': return r.rows.some(x => x.f.id === args[0]);
    case 'deleteById': r.rows = r.rows.filter(x => x.f.id !== args[0]); return undefined;
    case 'delete': r.rows = r.rows.filter(x => x.f.id !== idOf(args[0])); return undefined;
    case 'deleteAll': r.rows = []; return undefined;
    default: throw new Unsupported(`Repository.${name}() 는 지원하지 않습니다 (save / findById / findAll / count / existsById / deleteById / delete)`);
  }
}

/* ── JSON path / MockMvc 결과 ── */
function jsonPathGet(json, path) {
  let cur = json; const re = /\.length\(\)|\.size\(\)|\.([A-Za-z_]\w*)|\[(\d+)\]/g; let m, last = 1;
  if (!path.startsWith('$')) throw new Unsupported('jsonPath 는 $ 로 시작해야 합니다');
  while ((m = re.exec(path.slice(1)))) {
    if (m[0].startsWith('.length') || m[0].startsWith('.size')) cur = Array.isArray(cur) ? cur.length : (cur && typeof cur === 'object' ? Object.keys(cur).length : null);
    else if (m[1] !== undefined) cur = cur == null ? undefined : cur[m[1]];
    else cur = cur == null ? undefined : cur[+m[2]];
  }
  return cur;
}
const STATUS_NAMES = { isOk: 200, isCreated: 201, isAccepted: 202, isNoContent: 204, isBadRequest: 400, isUnauthorized: 401, isForbidden: 403, isNotFound: 404, isMethodNotAllowed: 405, isUnsupportedMediaType: 415, isInternalServerError: 500 };
const statusCheck = (name, args) => {
  if (name in STATUS_NAMES) { const exp = STATUS_NAMES[name]; return res => { if (res.status !== exp) throw new AssertionFail(`Status expected:<${exp}> but was:<${res.status}>`); }; }
  if (name === 'is') return res => { if (res.status !== args[0]) throw new AssertionFail(`Status expected:<${args[0]}> but was:<${res.status}>`); };
  if (name === 'is2xxSuccessful') return res => { if (res.status < 200 || res.status > 299) throw new AssertionFail(`Range for response status value ${res.status} expected:<SUCCESSFUL> but was:<${res.status}>`); };
  if (name === 'is4xxClientError') return res => { if (res.status < 400 || res.status > 499) throw new AssertionFail(`Range for response status value ${res.status} expected:<CLIENT_ERROR>`); };
  throw new Unsupported(`status().${name}()`);
};
const parseBody = res => { try { return res.body ? JSON.parse(res.body) : null; } catch { return undefined; } };

/* ── AssertJ / JUnit ── */
function assertion(actual, name, args) {
  const fail = m => { throw new AssertionFail(m); };
  const exp = args[0];
  switch (name) {
    case 'isEqualTo': case 'isEqualByComparingTo': if (!deepEq(actual, exp)) fail(`\nExpecting actual:\n  ${show(actual)}\nto be equal to:\n  ${show(exp)}\nbut was not.`); return;
    case 'isNotEqualTo': if (deepEq(actual, exp)) fail(`\nExpecting actual:\n  ${show(actual)}\nnot to be equal to:\n  ${show(exp)}`); return;
    case 'isNull': if (actual !== null && actual !== undefined) fail(`\nExpecting actual:\n  ${show(actual)}\nto be null`); return;
    case 'isNotNull': if (actual === null || actual === undefined) fail('\nExpecting actual not to be null'); return;
    case 'isTrue': if (actual !== true) fail(`\nExpecting value to be true but was ${show(actual)}`); return;
    case 'isFalse': if (actual !== false) fail(`\nExpecting value to be false but was ${show(actual)}`); return;
    case 'isZero': if (actual !== 0) fail(`\nExpecting actual:\n  ${show(actual)}\nto be equal to:\n  0`); return;
    case 'isPositive': if (!(actual > 0)) fail(`\nExpecting actual:\n  ${show(actual)}\nto be greater than:\n  0`); return;
    case 'isGreaterThan': if (!(actual > exp)) fail(`\nExpecting actual:\n  ${show(actual)}\nto be greater than:\n  ${show(exp)}`); return;
    case 'isLessThan': if (!(actual < exp)) fail(`\nExpecting actual:\n  ${show(actual)}\nto be less than:\n  ${show(exp)}`); return;
    case 'hasSize': { const n = Array.isArray(actual) ? actual.length : -1; if (n !== exp) fail(`\nExpected size: ${exp} but was: ${n} in:\n  ${show(actual)}`); return; }
    case 'isEmpty': { const e = actual === null || (Array.isArray(actual) || typeof actual === 'string' ? actual.length === 0 : isOpt(actual) ? actual.v === null : false); if (!e) fail(`\nExpecting empty but was:\n  ${show(actual)}`); return; }
    case 'isNotEmpty': { const e = Array.isArray(actual) || typeof actual === 'string' ? actual.length > 0 : isOpt(actual) ? actual.v !== null : true; if (!e) fail('\nExpecting actual not to be empty'); return; }
    case 'isPresent': if (!isOpt(actual) || actual.v === null) fail('\nExpecting Optional to contain a value but it was empty'); return;
    case 'contains': { const ok = typeof actual === 'string' ? actual.includes(exp) : Array.isArray(actual) && actual.some(x => deepEq(x, exp)); if (!ok) fail(`\nExpecting actual:\n  ${show(actual)}\nto contain:\n  ${show(exp)}`); return; }
    case 'startsWith': if (!(typeof actual === 'string' && actual.startsWith(exp))) fail(`\nExpecting actual:\n  ${show(actual)}\nto start with:\n  ${show(exp)}`); return;
    case 'isInstanceOf': case 'as': case 'describedAs': return;
    default: throw new Unsupported(`assertThat(...).${name}()`);
  }
}

/* ── 테스트 인터프리터 훅 ── */
function makeHooks(env) {
  const { model } = env;
  return {
    /* given/when/verify 는 인자를 AST 로 받아야 하므로 evCall 이전에 가로챈다 */
    special(n, sc, I) {
      if (n.obj === null && (n.n === 'given' || n.n === 'when') && n.args.length === 1) {
        const a = n.args[0];
        if (a.k !== 'call' || !a.obj) throw new Unsupported(`${n.n}(...) 안은 mock.method(...) 형태여야 합니다`);
        const mock = I.ev(a.obj, sc);
        if (!isMock(mock)) throw new Unsupported(`${n.n}(...) 의 대상이 mock 이 아닙니다`);
        return { v: { __stubb: { mock, name: a.n, args: a.args.map(x => I.ev(x, sc)) } } };
      }
      if (n.obj === null && n.n === 'verify') {
        const mock = I.ev(n.args[0], sc); const mode = n.args[1] ? I.ev(n.args[1], sc) : { __times: 1 };
        return { v: { __verify: { mock, mode } } };
      }
      return undefined;
    },
    builtin(cls, name, args) {
      if (cls !== null && cls !== undefined) return undefined;
      switch (name) {
        case 'any': case 'anyLong': case 'anyString': case 'anyInt': case 'isA': return { v: ANY };
        case 'eq': return { v: args[0] };
        case 'times': return { v: { __times: args[0] } };
        case 'never': return { v: { __times: 0 } };
        case 'assertThat': return { v: { __assert: args[0] } };
        case 'assertEquals': if (!deepEq(args[1], args[0])) throw new AssertionFail(`expected: <${show(args[0])}> but was: <${show(args[1])}>`); return { v: undefined };
        case 'assertTrue': if (args[0] !== true) throw new AssertionFail('expected: <true> but was: <false>'); return { v: undefined };
        case 'assertFalse': if (args[0] !== false) throw new AssertionFail('expected: <false> but was: <true>'); return { v: undefined };
        case 'assertNull': if (args[0] != null) throw new AssertionFail(`expected: <null> but was: <${show(args[0])}>`); return { v: undefined };
        case 'assertNotNull': if (args[0] == null) throw new AssertionFail('expected: not <null>'); return { v: undefined };
        case 'fail': throw new AssertionFail(args[0] || 'fail()');
        case 'get': case 'post': case 'put': case 'delete': case 'patch': return { v: { __req: { method: name.toUpperCase(), url: args[0], headers: {}, body: '' } } };
        case 'status': return { v: { __m: 'status' } };
        case 'jsonPath': return { v: { __m: 'json', path: args[0] } };
        case 'content': return { v: { __m: 'content' } };
        case 'print': return { v: { __noop: true } };
        default: return undefined;
      }
    },
    method(t, name, args, node, I) {
      if (t && t.__stubb) {
        const b = t.__stubb;
        if (/^(willReturn|thenReturn)$/.test(name)) { b.mock.stubs.push({ name: b.name, args: b.args.some(x => x === ANY) && b.args.every(x => x === ANY) ? null : b.args, ret: args[0] }); return { v: t }; }
        if (/^(willThrow|thenThrow)$/.test(name)) { b.mock.stubs.push({ name: b.name, args: b.args, thr: args[0] && args[0].__class || 'Exception' }); return { v: t }; }
        throw new Unsupported(`${name}()`);
      }
      if (t && t.__verify) { // verify(mock).method(args)
        const { mock, mode } = t.__verify; const times = mode.__times;
        const hit = mock.calls.filter(c => c.name === name && argsMatch(args.length ? args : null, c.args) || (c.name === name && args.length === c.args.length && args.every((a, i) => deepEq(c.args[i], a))));
        if (times === 0 && hit.length) throw new AssertionFail(`Never wanted here, but invoked: ${mock.type}.${name}(...)`);
        if (times > 0 && hit.length !== times) throw new AssertionFail(hit.length ? `Wanted ${times} time(s) but was ${hit.length}: ${mock.type}.${name}(...)` : `Wanted but not invoked: ${decap(mock.type)}.${name}(${args.map(show).join(', ')})`);
        return { v: undefined };
      }
      if (isMock(t)) return { v: mockCall(t, name, args) };
      if (t && t.__repo) return { v: repoCall(t, name, args) };
      if (t && t.__assert !== undefined && Object.prototype.hasOwnProperty.call(t, '__assert')) { assertion(t.__assert, name, args); return { v: t }; }
      if (t && t.__req) {
        if (name === 'contentType') t.__req.headers['Content-Type'] = args[0] && args[0].__class ? 'application/json' : String(args[0]);
        else if (name === 'content') t.__req.body = String(args[0]);
        else if (name === 'header') t.__req.headers[args[0]] = args[1];
        else if (name === 'accept') { /* 무시 */ } else throw new Unsupported(`MockHttpServletRequestBuilder.${name}()`);
        return { v: t };
      }
      if (t && t.__mvc) {
        if (name !== 'perform') throw new Unsupported(`mockMvc.${name}()`);
        const rq = args[0].__req, res = env.mvcCall(rq);
        return { v: { __ra: { res } } };
      }
      if (t && t.__ra) {
        if (name === 'andExpect') { const m = args[0]; if (!m || !m.__check) throw new Unsupported('andExpect(...) 인자'); m.__check(t.__ra.res); return { v: t }; }
        if (name === 'andDo' || name === 'andReturn') return { v: t };
        throw new Unsupported(`ResultActions.${name}()`);
      }
      if (t && t.__m === 'status') return { v: { __check: statusCheck(name, args) } };
      if (t && t.__m === 'json') {
        const p = t.path;
        if (name === 'value') return { v: { __check: res => { const j = parseBody(res); const a = jsonPathGet(j, p); const ok = deepEq(a, args[0]) || String(a) === String(args[0]); if (!ok) throw new AssertionFail(`JSON path "${p}" expected:<${show(args[0])}> but was:<${show(a)}>`); } } };
        if (name === 'exists') return { v: { __check: res => { if (jsonPathGet(parseBody(res), p) === undefined) throw new AssertionFail(`No value at JSON path "${p}"`); } } };
        if (name === 'doesNotExist') return { v: { __check: res => { if (jsonPathGet(parseBody(res), p) !== undefined) throw new AssertionFail(`Expected no value at JSON path "${p}"`); } } };
        if (name === 'isArray') return { v: { __check: res => { if (!Array.isArray(jsonPathGet(parseBody(res), p))) throw new AssertionFail(`Expected an array at JSON path "${p}"`); } } };
        throw new Unsupported(`jsonPath().${name}()`);
      }
      if (t && t.__m === 'content') {
        if (name === 'string') return { v: { __check: res => { if (res.body !== args[0]) throw new AssertionFail(`Response content expected:<${args[0]}> but was:<${res.body}>`); } } };
        if (name === 'contentType') return { v: { __check: () => {} } };
        throw new Unsupported(`content().${name}()`);
      }
      if (t && t.__noop) return { v: t };
      return undefined;
    },
  };
}

/* ── 테스트 대상 탐색 ── */
function testClasses(model) {
  return [...model.types.values()].filter(t => isTestPath(t.path) && t.kind === 'class' && t.methods.some(m => hasAnn(m, 'Test')));
}
function testTargets(path, text) { // 에디터 거터의 ▶ 위치: 클래스 + 각 @Test 메서드
  if (!isTestPath(path)) return [];
  const u = IDE.parseJava(text, path), out = [];
  for (const t of u.types) {
    if (!t.methods.some(m => hasAnn(m, 'Test'))) continue;
    out.push({ line: t.line, cls: t.name, method: null });
    for (const m of t.methods) { const a = getAnn(m, 'Test'); if (a) out.push({ line: a.line, cls: t.name, method: m.name }); }
  }
  return out;
}

/* ── 실행 ── */
function runTests(files, only) {
  const t0 = Date.now();
  const model = IDE.buildModel(files);
  const probs = IDE.javaProblems(model);
  if (probs.length) return { build: true, problems: probs, results: [] };
  const mainFiles = Object.fromEntries(Object.entries(files).filter(([p]) => !isTestPath(p)));
  const rb = IDE.resolveBeans(model), results = [];
  const cfg = IDE.readConfig(files);

  for (const T of testClasses(model)) {
    if (only && only.cls && only.cls !== T.name) continue;
    const methods = T.methods.filter(m => hasAnn(m, 'Test') && (!only || !only.method || only.method === m.name));
    const kind = hasAnn(T, 'SpringBootTest') ? 'boot' : hasAnn(T, 'WebMvcTest') ? 'web' : hasAnn(T, 'DataJpaTest') ? 'jpa' : 'unit';
    const report = (m, status, msg) => results.push({ cls: T.name, kind, method: m.name, display: (() => { const d = getAnn(m, 'DisplayName'); return d ? (/"([^"]*)"/.exec(d.args) || [])[1] : null; })(), status, msg: msg || '', ms: 3 + Math.floor(Math.random() * 18), path: T.path, line: m.line });
    const failAll = msg => methods.forEach(m => report(m, 'fail', msg));

    // ── 컨텍스트
    const mocks = new Map();
    const env = { model };
    let bootCtx = null, sliceCtx = null;
    if (kind === 'boot') {
      const r = IDE.boot({ ...mainFiles });
      if (!r.ok) { failAll('java.lang.IllegalStateException: Failed to load ApplicationContext\n' + (r.failure ? 'Caused by: ' + (r.failure.ex || 'BeanCreationException') + ': ' + (r.failure.desc || r.failure.cause || '') : (r.problems || []).map(p => p.msg).join('\n'))); continue; }
      bootCtx = r.ctx;
    }
    if (kind === 'web') {
      const ct = (/(\w+)\.class/.exec((getAnn(T, 'WebMvcTest') || {}).args || '') || [])[1];
      const ctrl = ct ? model.types.get(ct) : null;
      const mockTypes = new Set(T.fields.filter(f => hasAnn(f, 'MockitoBean')).map(f => simple(f.type)));
      if (rb.fatal) { failAll(rb.fatal); continue; }
      // @WebMvcTest 는 웹 계층 빈(@Controller 등)만 올린다 → 컨트롤러가 의존하는 타입은 @MockitoBean 으로 제공되어야 한다
      const webBeans = rb.beans.filter(b => !b.repo && !b.fromBean && (!ctrl || b.t === ctrl) && (hasAnn(b.t, 'RestController') || hasAnn(b.t, 'Controller')));
      let bad = null;
      for (const wb of webBeans) for (const d of wb.deps) {
        const T2 = model.types.get(d.type);
        const providedByWeb = T2 && (hasAnn(T2, 'RestController') || hasAnn(T2, 'Controller') || hasAnn(T2, 'RestControllerAdvice') || hasAnn(T2, 'ControllerAdvice'));
        if (T2 && !mockTypes.has(d.type) && !providedByWeb) {
          const where = d.where === 'constructor' ? `Parameter ${d.idx} of constructor in ${fqn(wb.t)}` : `Field ${d.name} in ${fqn(wb.t)}`;
          bad = { ex: 'NoSuchBeanDefinitionException', desc: `${where} required a bean of type '${fqn(T2)}' that could not be found.` }; break;
        }
      }
      if (bad) { failAll(`java.lang.IllegalStateException: Failed to load ApplicationContext\nCaused by: org.springframework.beans.factory.${bad.ex}: ${bad.desc}\n\n💡 @WebMvcTest 는 웹 계층만 로드하므로 Service 는 @MockitoBean 으로 가짜 빈을 등록해야 합니다.`); continue; }
      const web = IDE.buildWeb(model, rb);
      if (ctrl) web.mappings = web.mappings.filter(m => m.bean.t === ctrl);
      const E = rb.entities && rb.entities[0] || null;
      sliceCtx = { model, rb, web, cfg: { ...cfg, showSql: false }, db: { rows: [], seq: 1, entity: E }, port: cfg.port, first: false, files,
        mock: { has: t => mocks.has(t), invoke: (t, name, args) => mockCall(mocks.get(t), name, args) } };
    }
    if (kind === 'jpa') {
      const bad = rb.failures.find(f => f.kind === 'jpa');
      if (bad) { failAll(`jakarta.persistence.PersistenceException: Failed to load ApplicationContext\nCaused by: ${bad.cause || bad.ex}`); continue; }
    }

    for (const m of methods) {
      // 테스트 인스턴스 + 필드 주입
      const self = { __t: T.name, f: {}, T };
      const inst = [];
      try {
        for (const f of T.fields) {
          const ty = simple(f.type);
          if (hasAnn(f, 'Mock') || hasAnn(f, 'MockitoBean') || hasAnn(f, 'MockitoSpyBean')) { const mk = newMock(ty, model); self.f[f.name] = mk; mocks.set(ty, mk); }
          else if (hasAnn(f, 'InjectMocks')) inst.push(f);
          else if (hasAnn(f, 'Autowired')) {
            if (ty === 'MockMvc') self.f[f.name] = { __mvc: true };
            else if (kind === 'jpa' && model.types.get(ty) && model.types.get(ty).kind === 'interface') { const ent = model.types.get(ty).typeArgs[0]; self.f[f.name] = newRepo(model, ent); }
            else throw new Unsupported(`@Autowired ${ty} 는 이 시뮬레이터에서 지원하지 않습니다`);
          }
        }
        for (const f of inst) {
          const S = model.types.get(simple(f.type)); if (!S) throw new Unsupported('@InjectMocks 대상');
          const ctor = S.ctors[0], args = ctor ? ctor.params.map(p => mocks.get(simple(p.type)) || null) : [];
          const I0 = new Interp(model, makeHooks(env));
          const obj = I0.instantiate(S, args); if (!ctor) S.fields.forEach(sf => { const mk = mocks.get(simple(sf.type)); if (mk) obj.f[sf.name] = mk; });
          self.f[f.name] = obj;
        }
        env.mvcCall = rq => {
          const ctx = sliceCtx || bootCtx; if (!ctx) throw new Unsupported('MockMvc 를 만들 수 없는 테스트 종류입니다');
          return IDE.handle(ctx, { method: rq.method, url: 'http://localhost:' + ctx.port + rq.url, headers: rq.headers, body: rq.body });
        };
        if (kind === 'boot' && !self.f.mockMvc && T.fields.some(f => simple(f.type) === 'MockMvc') && !hasAnn(T, 'AutoConfigureMockMvc')) throw new JavaThrow('NoSuchBeanDefinitionException', "No qualifying bean of type 'MockMvc' — @AutoConfigureMockMvc 가 필요합니다");
        const I = new Interp(model, makeHooks(env));
        for (const b of T.methods.filter(x => hasAnn(x, 'BeforeEach'))) I.run(b.body || '', { vars: new Map(), self, T });
        I.run(m.body || '', { vars: new Map(), self, T });
        report(m, 'pass');
      } catch (e) {
        if (e instanceof AssertionFail) report(m, 'fail', 'java.lang.AssertionError: ' + e.message);
        else if (e instanceof JavaThrow) report(m, 'fail', `${e.javaName}${e.javaMsg ? ': ' + e.javaMsg : ''}`);
        else if (e instanceof Unsupported) report(m, 'skip', '시뮬레이터가 실행하지 못하는 구문입니다 — ' + e.message);
        else throw e;
      }
    }
  }
  const sum = { pass: 0, fail: 0, skip: 0 }; results.forEach(r => { sum[r.status]++; });
  return { build: false, results, summary: sum, ms: Date.now() - t0 };
}

Object.assign(IDE, { runTests, testTargets, isTestPath });
})();
