/* core/http.js — HTTP 요청 처리 시뮬레이션 (DispatcherServlet) */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { REASON, STATUS, abbr, decap, elemType, fqn, getAnn, hasAnn, isList, isSub, simple, splitTop, stamp, stringArg } = IDE;
function validate(model, dtoType, obj) {
  const errs = [];
  const comps = dtoType.kind === 'record' ? dtoType.comps : dtoType.fields;
  for (const c of comps) {
    const v = obj ? obj[c.name] : undefined, isNull = v === undefined || v === null;
    for (const a of c.anns || []) {
      const num = k => +((new RegExp(k + '\\s*=\\s*(\\d+)').exec(a.args) || [])[1] ?? NaN);
      if (a.name === 'NotNull' && isNull) errs.push(`${c.name}: must not be null`);
      else if (a.name === 'NotBlank' && (isNull || String(v).trim() === '')) errs.push(`${c.name}: must not be blank`);
      else if (a.name === 'NotEmpty' && (isNull || String(v).length === 0)) errs.push(`${c.name}: must not be empty`);
      else if (a.name === 'Size' && !isNull) { const mn = isNaN(num('min')) ? 0 : num('min'), mx = isNaN(num('max')) ? 2147483647 : num('max'); if (String(v).length < mn || String(v).length > mx) errs.push(`${c.name}: size must be between ${mn} and ${mx}`); }
      else if (a.name === 'Email' && !isNull && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) errs.push(`${c.name}: must be a well-formed email address`);
      else if (a.name === 'Min' && !isNull) { const mn = +(/(\d+)/.exec(a.args) || [])[1]; if (+v < mn) errs.push(`${c.name}: must be greater than or equal to ${mn}`); }
    }
  }
  return errs;
}
function exceptionMessage(model, exName, id) {
  const T = model.types.get(exName); if (!T) return exName;
  const c = T.ctors[0], m = c && c.body && /super\s*\(([\s\S]*)\)\s*;/.exec(c.body);
  if (!m) return null;
  return splitPlus(m[1]).map(p => { p = p.trim(); const s = /^"([\s\S]*)"$/.exec(p); if (s) return s[1]; return p === (c.params[0] || {}).name ? String(id) : p; }).join('');
}
function splitPlus(s) { const out = []; let cur = '', q = false; for (const ch of s) { if (ch === '"') q = !q; if (ch === '+' && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; }

function shapeRow(model, retType, row, entity) {
  const T = elemType(retType), S = simple(T);
  if (S === 'String') return { str: true, value: row ? String(row.title ?? '') : '' };
  const D = model.types.get(S);
  const rowOf = r => {
    if (!D) return r;
    const names = D.kind === 'record' ? D.comps.map(c => c.name) : D.fields.filter(f => D.methods.some(m => m.name === 'get' + f.name[0].toUpperCase() + f.name.slice(1)) || D.anns.some(a => ['Getter', 'Data'].includes(a.name))).map(f => f.name);
    if (D.kind !== 'record' && !names.length) throw new Error(`InvalidDefinitionException: No serializer found for class ${fqn(D)} and no properties discovered to create BeanSerializer (to avoid exception, disable SerializationFeature.FAIL_ON_EMPTY_BEANS)`);
    const o = {}; names.forEach(k => { o[k] = r[k] ?? null; }); return o;
  };
  return { value: Array.isArray(row) ? row.map(rowOf) : (row == null ? null : rowOf(row)) };
}

/* 컨트롤러 메서드를 minijava 로 실제 실행한다 (컨트롤러 → 서비스 → 리포지토리 → 인메모리 테이블).
   영속성 컨텍스트: 조회한 엔티티는 복사본이고, 쓰기 트랜잭션이 커밋될 때만 변경 감지로 테이블에 반영된다.
   해석할 수 없는 구문이면 null 을 돌려주고, 호출한 쪽이 "표준 CRUD 의미" 로 대신 처리한다. */
/* 인메모리 테이블에 대한 JpaRepository 기본 메서드. opt.sql(문자열) 로 SQL 로그, opt.track(엔티티, 테이블) 로 영속성 컨텍스트 등록 */
const fieldsOf = E => E.fields.filter(f => !f.mods.includes('static'));
const colsOf = tb => fieldsOf(tb.E).map(f => f.name);
const rowOf = (tb, e) => Object.fromEntries(colsOf(tb).map(c => [c, e.f[c] ?? null]));
function repoOp(tb, name, a, opt = {}) {
  const { isInst, optOf, JavaThrow, Unsupported } = IDE.mini, sql = opt.sql || (() => {}), track = opt.track || (() => {});
  if (!tb) throw new Unsupported('리포지토리의 엔티티 테이블을 찾을 수 없습니다');
  const cols = colsOf(tb), byId = id => tb.rows.find(r => r.id === id);
  const toInst = row => { const e = { __t: tb.E.name, f: {}, T: tb.E }; cols.forEach(c => { e.f[c] = row[c] ?? null; }); track(e, tb); return e; };
  const sel = byIdQ => sql(`select ${cols.map(c => 'x1_0.' + c).join(',')} from ${tb.tn} x1_0${byIdQ ? ' where x1_0.id=?' : ''}`);
  const del = id => { sel(1); if (byId(id)) { sql(`delete from ${tb.tn} where id=?`); tb.rows = tb.rows.filter(r => r.id !== id); } };
  switch (name) {
    case 'findAll': sel(); return tb.rows.map(toInst);
    case 'findById': { sel(1); const r = byId(a[0]); return optOf(r ? toInst(r) : null); }
    case 'existsById': sel(1); return !!byId(a[0]);
    case 'count': sql(`select count(*) from ${tb.tn} x1_0`); return tb.rows.length;
    case 'save': case 'saveAndFlush': {
      const e = a[0]; if (!isInst(e)) throw new JavaThrow('IllegalArgumentException', 'Entity must not be null');
      const bad = fieldsOf(tb.E).find(f => f.name !== 'id' && e.f[f.name] == null && /nullable\s*=\s*false/.test((getAnn(f, 'Column') || {}).args || ''));
      if (bad) throw new JavaThrow('DataIntegrityViolationException', `NULL not allowed for column "${bad.name.toUpperCase()}"`);
      if (e.f.id == null) { e.f.id = tb.seq++; tb.rows.push(rowOf(tb, e)); sql(`insert into ${tb.tn} (${cols.filter(c => c !== 'id').join(',')},id) values (${cols.filter(c => c !== 'id').map(() => '?').join(',')},default)`); }
      else { sel(1); const r = byId(e.f.id); if (r) Object.assign(r, rowOf(tb, e)); else tb.rows.push(rowOf(tb, e)); sql(`update ${tb.tn} set ${cols.filter(c => c !== 'id').map(c => c + '=?').join(',')} where id=?`); }
      track(e, tb); return e;
    }
    case 'saveAll': return a[0].map(e => repoOp(tb, 'save', [e], opt));
    case 'deleteById': del(a[0]); return undefined;
    case 'delete': del(a[0] && a[0].f ? a[0].f.id : null); return undefined;
    case 'deleteAll': sql(`delete from ${tb.tn}`); tb.rows = []; return undefined;
    default: throw new Unsupported(`${name}() 는 이 시뮬레이터의 리포지토리에서 지원하지 않습니다 (save / findById / findAll / count / existsById / deleteById / delete / deleteAll)`);
  }
}
/* 자바 값 → JSON 으로 내보낼 값 (Jackson 흉내: record 는 컴포넌트, 클래스는 getter/Lombok @Getter 가 있는 필드) */
function serialize(model, x) {
  const { isInst, isOpt } = IDE.mini, ser = v => serialize(model, v);
  if (Array.isArray(x)) return x.map(ser);
  if (isOpt(x)) return ser(x.v);
  if (isInst(x)) {
    const D = x.T || model.types.get(x.__t); if (!D) return { ...x.f };
    const lombok = D.anns.some(a => ['Getter', 'Data'].includes(a.name));
    const names = D.kind === 'record' ? D.comps.map(c => c.name) : D.fields.filter(f => !f.mods.includes('static') && (lombok || hasAnn(f, 'Getter') || D.methods.some(m => m.name === 'get' + f.name[0].toUpperCase() + f.name.slice(1)))).map(f => f.name);
    if (D.kind !== 'record' && !names.length) throw new Error(`InvalidDefinitionException: No serializer found for class ${fqn(D)} and no properties discovered to create BeanSerializer (to avoid exception, disable SerializationFeature.FAIL_ON_EMPTY_BEANS)`);
    return Object.fromEntries(names.map(k => [k, ser(x.f[k])]));
  }
  if (x && typeof x === 'object' && (x.__class || x.__reb || x.__dbrepo || x.__builder)) return null;
  return x === undefined ? null : x;
}

/* 컨트롤러 메서드를 minijava 로 실제 실행한다 (컨트롤러 → 서비스 → 리포지토리 → 인메모리 테이블).
   영속성 컨텍스트: 조회한 엔티티는 복사본이고, 쓰기 트랜잭션이 커밋될 때만 변경 감지로 테이블에 반영된다.
   해석할 수 없는 구문이면 { fallback } 을 돌려주고, 호출한 쪽이 "표준 CRUD 의미" 로 대신 처리한다. */
function realCall(ctx, mp, argv, txWrite, sql) {
  const { model, db } = ctx, M = IDE.mini, { JavaThrow } = M;
  const pc = [];
  const repo = (tb, name, a) => repoOp(tb, name, a, { sql, track: (e, t) => pc.push({ e, tb: t }) });
  const hooks = {
    method(t, name, a) {
      if (t && t.__dbrepo) return { v: repo(t.tb, name, a) };
      if (t && t.__reb) { if (name === 'body') return { v: a[0] }; if (name === 'build') return { v: null }; return { v: t }; }
      return undefined;
    },
    builtin(cls, name, a) {
      if (cls === 'log' || cls === 'out') return { v: undefined };   // log.info(...) · System.out.println(...)
      if (cls === 'ResponseEntity') return { v: name === 'ok' && a.length ? a[0] : { __reb: true } };   // 상태 코드는 아래에서 본문 정규식으로 판정
      return undefined;
    },
  };
  const I = new M.Interp(model, hooks), made = new Map();
  const inst = b => {
    if (made.has(b)) return made.get(b);
    if (b.repo) { const o = { __dbrepo: true, tb: db.byEntity[b.t.typeArgs[0]] }; made.set(b, o); return o; }
    if (b.fromBean) throw new M.Unsupported('@Bean 메서드로 만든 빈');
    const cd = b.deps.filter(d => d.where === 'constructor'), viaCtor = cd.length && b.t.ctors.some(c => c.params.length === cd.length);
    const o = I.instantiate(b.t, viaCtor ? cd.map(d => (d.bean ? inst(d.bean) : null)) : []);
    made.set(b, o);
    b.deps.forEach(d => { if (d.bean && d.name in o.f && o.f[d.name] == null) o.f[d.name] = inst(d.bean); });
    return o;
  };
  const mkDto = (T, o) => { if (!T) return o; const f = {}; (T.kind === 'record' ? T.comps : T.fields.filter(x => !x.mods.includes('static'))).forEach(c => { f[c.name] = o && o[c.name] !== undefined ? o[c.name] : null; }); return { __t: T.name, f, T }; };
  let v;
  try {
    v = I.invoke(mp.method, inst(mp.bean), argv.map(x => (x && x.__json !== undefined ? mkDto(x.T, x.__json) : x)), mp.bean.t);
    if (txWrite && ctx.mutant !== 'no-flush') { // 커밋 시점 변경 감지(dirty checking). 변이 no-flush: 변경 감지가 없는 것처럼
      const seen = new Set();
      for (const { e, tb } of pc) {
        if (seen.has(e)) continue; seen.add(e);
        const r = tb.rows.find(x => x.id === e.f.id); if (!r) continue;
        const now = rowOf(tb, e);
        if (Object.keys(now).some(k => String(now[k]) !== String(r[k] ?? null))) { Object.assign(r, now); sql(`update ${tb.tn} set ${colsOf(tb).filter(c => c !== 'id').map(c => c + '=?').join(',')} where id=?`); }
      }
    }
  } catch (e) {
    if (e instanceof JavaThrow) return { value: null, ex: [e.javaName, e.javaMsg || ''] };
    return { fallback: e.message || String(e) };
  }
  try { return { value: serialize(model, v), ex: null }; } catch (e) { return { value: null, ex: null, serErr: e.message }; }
}
const tableFor = (ctx, b) => { const dep = b && b.deps.find(d => d.bean && d.bean.repo); return (dep && ctx.db.byEntity[dep.bean.t.typeArgs[0]]) || Object.values(ctx.db.tables)[0] || null; };

function handle(ctx, req) {
  const logs = [], raw = (text, cls) => logs.push({ k: 'raw', text, cls });
  const log = (lvl, logger, msg, extra) => logs.push({ k: 'log', ts: stamp(), lvl, pid: 14721, thread: 'nio-8080-exec-1', logger, msg, ...extra });
  const model = ctx.model, web = ctx.web;
  const res = { status: 200, headers: { 'Content-Type': 'application/json' }, body: '', logs, aspectHit: false, txHit: false };
  let u; try { u = new URL(req.url); } catch { return { ...res, status: 0, error: `java.net.MalformedURLException: no protocol: ${req.url}` }; }
  if (!['localhost', '127.0.0.1'].includes(u.hostname) || +(u.port || 80) !== ctx.port) return { ...res, status: 0, error: `java.net.ConnectException: Connection refused: connect (${u.host})` };
  if (ctx.first) { ctx.first = false; log('INFO', 'o.a.c.c.C.[Tomcat].[localhost].[/]', 'Initializing Spring DispatcherServlet \'dispatcherServlet\''); log('INFO', 'o.s.web.servlet.DispatcherServlet', 'Completed initialization in 1 ms'); }
  const path = u.pathname, method = req.method.toUpperCase();
  const finish = (status, body, headers) => { res.status = status; if (headers) Object.assign(res.headers, headers); res.body = body === undefined || body === '' ? '' : (typeof body === 'string' ? body : JSON.stringify(body, null, 2)); if (!res.body) delete res.headers['Content-Type']; return res; };
  const errJson = (status, extra) => ({ timestamp: new Date().toISOString(), status, error: REASON[status] || 'Error', ...extra, path });

  const cands = web.mappings.filter(m => m.re.test(path));
  if (!cands.length) { log('WARN', 'o.s.w.s.h.HandlerExceptionResolverComposite', `No static resource ${path.slice(1)}.`, {}); return finish(404, errJson(404)); }
  const ok = cands.filter(m => m.verb === method || m.verb === 'ANY');
  if (!ok.length) { log('WARN', 'o.s.w.s.m.s.DefaultHandlerExceptionResolver', `Resolved [org.springframework.web.HttpRequestMethodNotSupportedException: Request method '${method}' is not supported]`); return finish(405, errJson(405), { Allow: cands.map(c => c.verb).join(',') }); }
  ok.sort((a, b) => a.literal - b.literal);
  const mp = ok[0], mth = mp.method, ctrl = mp.bean.t;
  const pv = {}; const mm = mp.re.exec(path); mp.names.forEach((nme, i) => { pv[nme] = decodeURIComponent(mm[i + 1]); });

  // 예외 → 응답
  const resolveEx = (exName, msg, status, detailLog) => {
    const h = web.advices.find(a => a.handles.some(x => isSub(model, exName, x)));
    if (h) {
      const rs = getAnn(h.method, 'ResponseStatus'); let st = 200;
      if (rs) { const k = /(?:HttpStatus\.)?([A-Z_]+)\s*$/.exec(rs.args.replace(/^\s*(?:value|code)\s*=\s*/, '')); st = STATUS[k && k[1]] || 200; }
      const rt = simple(h.method.retType), D = model.types.get(rt);
      if (!hasAnn(h.advice, 'RestControllerAdvice') && !hasAnn(h.method, 'ResponseBody')) return finish(500, errJson(500));
      if (rt === 'String') return finish(st, msg, { 'Content-Type': 'text/plain;charset=UTF-8' });
      if (D) { const o = {}; (D.kind === 'record' ? D.comps : D.fields).forEach(c => { o[c.name] = /message|msg|error|detail|reason/i.test(c.name) ? msg : /status|code/i.test(c.name) ? st : null; }); return finish(st, o); }
      return finish(st, { message: msg });
    }
    const T = model.types.get(exName), rs = T && getAnn(T, 'ResponseStatus');
    if (rs) { const k = /([A-Z_]+)\s*$/.exec(rs.args); const st = STATUS[k && k[1]] || 500; return finish(st, errJson(st, { message: msg })); }
    if (status < 500) { log('WARN', 'o.s.w.s.m.s.DefaultHandlerExceptionResolver', detailLog || `Resolved [${exName}: ${msg}]`); return finish(status, errJson(status)); }
    log('ERROR', 'o.a.c.c.C.[.[.[/].[dispatcherServlet]', `Servlet.service() for servlet [dispatcherServlet] in context with path [] threw exception [Request processing failed: ${T ? fqn(T) : exName}: ${msg}] with root cause`);
    raw(`${T ? fqn(T) : 'java.lang.' + exName}: ${msg}`, 'err'); raw(`\tat ${fqn(ctrl)}.${mth.name}(${ctrl.name}.java:${mth.line})`, 'dim');
    res.unhandled = { name: exName, msg };   // MockMvc 에서는 ServletException 으로 테스트까지 던져진다
    return finish(500, errJson(500));
  };

  // 뷰 컨트롤러
  if (hasAnn(ctrl, 'Controller') && !hasAnn(ctrl, 'RestController') && !hasAnn(mth, 'ResponseBody') && simple(mth.retType) !== 'ResponseEntity' && mth.retType !== 'void') {
    log('ERROR', 'o.a.c.c.C.[.[.[/].[dispatcherServlet]', `Servlet.service() for servlet [dispatcherServlet] threw exception [Error resolving template [${path.slice(1)}], template might not exist or might not be accessible by any of the configured Template Resolvers]`);
    raw('@Controller 의 반환값은 "뷰 이름"으로 해석됩니다. JSON 을 응답하려면 @RestController 또는 @ResponseBody', 'hint');
    res.headers['Content-Type'] = 'text/html'; return finish(500, `<html><body><h1>Whitelabel Error Page</h1><p>There was an unexpected error (type=Internal Server Error, status=500).</p><p>Error resolving template [${path.slice(1)}], template might not exist</p></body></html>`, { 'Content-Type': 'text/html' });
  }

  // 인자 바인딩
  let dto = null, dtoType = null, id = null, keyword = null, unboundDto = false;
  const argv = [];   // 실제 실행용 인자 (파라미터 순서)
  for (const p of mth.params) {
    const t = simple(p.type);
    argv.push(null);
    if (hasAnn(p, 'PathVariable')) {
      const a = getAnn(p, 'PathVariable'), nm = stringArg(a.args) || (/name\s*=\s*"([^"]*)"/.exec(a.args) || [])[1] || p.name;
      if (!(nm in pv)) return resolveEx('MissingPathVariableException', `Required URI template variable '${nm}' for method parameter type ${t} is not present`, 500);
      if (/^(Long|Integer|long|int)$/.test(t) && !/^-?\d+$/.test(pv[nm])) return resolveEx('MethodArgumentTypeMismatchException', `Method parameter '${nm}': Failed to convert value of type 'java.lang.String' to required type '${t}'; For input string: "${pv[nm]}"`, 400, `Resolved [org.springframework.web.method.annotation.MethodArgumentTypeMismatchException: Method parameter '${nm}': Failed to convert value of type 'java.lang.String' to required type 'java.lang.${t}'; For input string: "${pv[nm]}"]`);
      id = /^(Long|Integer|long|int)$/.test(t) ? +pv[nm] : pv[nm]; argv[argv.length - 1] = id;
    } else if (hasAnn(p, 'RequestParam')) {
      const a = getAnn(p, 'RequestParam'), nm = stringArg(a.args) || (/name\s*=\s*"([^"]*)"/.exec(a.args) || [])[1] || p.name;
      const val = u.searchParams.get(nm), def = /defaultValue\s*=\s*"([^"]*)"/.exec(a.args), reqd = !/required\s*=\s*false/.test(a.args) && !def;
      if (val === null && reqd) return resolveEx('MissingServletRequestParameterException', `Required request parameter '${nm}' for method parameter type ${t} is not present`, 400, `Resolved [org.springframework.web.bind.MissingServletRequestParameterException: Required request parameter '${nm}' for method parameter type ${t} is not present]`);
      keyword = val ?? (def ? def[1] : null); argv[argv.length - 1] = keyword !== null && /^(Long|Integer|long|int)$/.test(t) ? +keyword : keyword;
    } else if (hasAnn(p, 'RequestBody')) {
      const ct = (req.headers['content-type'] || req.headers['Content-Type'] || '').toLowerCase();
      if (!ct.includes('json')) return resolveEx('HttpMediaTypeNotSupportedException', `Content-Type '${ct || 'application/octet-stream'}' is not supported`, 415, `Resolved [org.springframework.web.HttpMediaTypeNotSupportedException: Content-Type '${ct || 'application/octet-stream'}' is not supported]`);
      if (!req.body || !req.body.trim()) return resolveEx('HttpMessageNotReadableException', 'Required request body is missing', 400, `Resolved [org.springframework.http.converter.HttpMessageNotReadableException: Required request body is missing: public ${t} ${fqn(ctrl)}.${mth.name}(...)]`);
      try { dto = JSON.parse(req.body); } catch (e) { return resolveEx('HttpMessageNotReadableException', 'JSON parse error: ' + e.message, 400, `Resolved [org.springframework.http.converter.HttpMessageNotReadableException: JSON parse error: ${e.message}]`); }
      dtoType = model.types.get(t); argv[argv.length - 1] = { __json: dto, T: dtoType };
      if (dtoType && (hasAnn(p, 'Valid') || hasAnn(p, 'Validated'))) {
        const errs = validate(model, dtoType, dto);
        if (errs.length) return resolveEx('MethodArgumentNotValidException', errs.join('; '), 400, `Resolved [org.springframework.web.bind.MethodArgumentNotValidException: Validation failed for argument [0] in public ${t} ${fqn(ctrl)}.${mth.name}(${t}): ${errs.map(e => `Field error in object '${decap(t)}' on field '${e.split(':')[0]}': ${e.split(': ')[1]}`).join('; ')}]`);
      }
    } else if (model.types.has(t)) { unboundDto = true; argv[argv.length - 1] = { __json: {}, T: model.types.get(t) }; } // @ModelAttribute 로 바인딩 → JSON 본문 무시
  }

  // 서비스 호출 탐색
  const body = mth.body || '';
  let svcBean = null;
  for (const c of body.matchAll(/\b([a-z]\w*)\.(\w+)\s*\(/g)) {
    const f = ctrl.fields.find(x => x.name === c[1]); if (!f) continue;
    const un = mp.bean.unin.includes(f);
    if (un && model.types.has(simple(f.type))) {
      log('ERROR', 'o.a.c.c.C.[.[.[/].[dispatcherServlet]', `Servlet.service() for servlet [dispatcherServlet] threw exception [Request processing failed: java.lang.NullPointerException: Cannot invoke "${fqn(model.types.get(simple(f.type)))}.${c[2]}(...)" because "this.${f.name}" is null]`);
      raw('필드가 주입되지 않았습니다 — 생성자 주입(final + 생성자) 또는 @Autowired 가 필요합니다', 'hint');
      return finish(500, errJson(500));
    }
    const dep = mp.bean.deps.find(d => d.name === f.name);
    svcBean = (dep && dep.bean) || ctx.rb.beans.find(b => b.type === simple(f.type)) || svcBean;
    if (svcBean) break;
  }
  // @WebMvcTest 슬라이스: 컨트롤러가 호출하는 서비스가 @MockitoBean 이면 stub 으로 응답한다
  let mockHit = null;
  if (ctx.mock) {
    for (const c of body.matchAll(/\b([a-z]\w*)\.(\w+)\s*\(/g)) {
      const f = ctrl.fields.find(x => x.name === c[1]); if (!f || !ctx.mock.has(simple(f.type))) continue;
      let d = 1, k = c.index + c[0].length; const st = k; for (; k < body.length && d > 0; k++) { if (body[k] === '(') d++; else if (body[k] === ')') d--; }
      const vals = new Map();
      mth.params.forEach(p => { if (hasAnn(p, 'PathVariable')) vals.set(p.name, id); else if (hasAnn(p, 'RequestParam')) vals.set(p.name, keyword); else if (hasAnn(p, 'RequestBody')) vals.set(p.name, { __t: simple(p.type), f: { ...(dto || {}) }, T: dtoType }); });
      const argVals = splitTop(body.slice(st, k - 1)).map(a => { a = a.trim(); return vals.has(a) ? vals.get(a) : /^-?\d+L?$/.test(a) ? parseInt(a, 10) : /^"[^"]*"$/.test(a) ? a.slice(1, -1) : { __any: true }; });
      mockHit = { type: simple(f.type), method: c[2], args: argVals }; break;
    }
  }
  const stub = !svcBean && !mockHit;

  // AOP + 트랜잭션
  const matchesAdv = (adv, bean) => adv.prefix && (fqn(bean.t) + '.').startsWith(adv.prefix);
  const advs = svcBean ? web.aspects.flatMap(a => a.advices.filter(x => matchesAdv(x, svcBean)).map(x => ({ ...x, aspect: a }))) : [];
  const advText = (adv, part) => { const b = adv.method.body || ''; const idx = b.indexOf('proceed('); return part === 'all' ? b : part === 'before' ? (idx < 0 ? b : b.slice(0, idx)) : (idx < 0 ? '' : b.slice(idx)); };
  const emit = (adv, text, sig) => {
    for (const m of text.matchAll(/log\.(info|warn|error|debug)\(\s*"((?:[^"\\]|\\.)*)"\s*(?:,\s*([^;]*?))?\)\s*;|System\.out\.println\(\s*"((?:[^"\\]|\\.)*)"\s*\)\s*;/g)) {
      const args = m[3] ? splitTop(m[3]) : []; let k = 0;
      const msg = (m[2] ?? m[4]).replace(/\{\}/g, () => { const a = (args[k++] || '').trim(); return /getSignature|getName/.test(a) ? sig : /ms|elapsed|time|nano/i.test(a) ? String(3 + Math.floor(Math.random() * 20)) : /result|ret/i.test(a) ? '…' : a || '?'; });
      if (m[4] !== undefined) raw(msg); else log((m[1] || 'info').toUpperCase(), abbr(fqn(adv.aspect.bean.t)), msg);
    }
  };
  let proceeded = true, svcMethod = (/\.(\w+)\s*\(/.exec(body.slice(body.search(new RegExp('\\b' + (svcBean ? '' : 'zzzz'))))) || [])[1];
  if (svcBean) { const cm = body.match(new RegExp('\\b' + (mp.bean.deps.find(d => d.bean === svcBean) || {}).name + '\\.(\\w+)\\s*\\(')); svcMethod = cm ? cm[1] : svcMethod; }
  const sigText = svcBean ? `${svcBean.t.name}.${svcMethod}(..)` : '';
  const svcM = svcBean && svcBean.t.methods.find(m => m.name === svcMethod);
  const txAnn = (svcM && getAnn(svcM, 'Transactional')) || (svcBean && getAnn(svcBean.t, 'Transactional'));   // 메서드 설정이 클래스 설정을 덮어쓴다
  const txOn = !!txAnn, txRO = txOn && /readOnly\s*=\s*true/.test(txAnn.args);
  if (advs.length) res.aspectHit = true;
  if (txOn) res.txHit = true;
  const around = advs.find(a => a.kind === 'Around');
  advs.filter(a => a.kind === 'Around').forEach(a => emit(a, advText(a, 'before'), sigText));
  advs.filter(a => a.kind === 'Before').forEach(a => emit(a, advText(a, 'all'), sigText));
  if (around && !/\bproceed\s*\(/.test(around.method.body || '')) proceeded = false;
  if (txOn) log('DEBUG', 'o.s.orm.jpa.JpaTransactionManager', `Creating new transaction with name [${fqn(svcBean.t)}.${svcMethod}]: PROPAGATION_REQUIRED,ISOLATION_DEFAULT${txRO ? ',readOnly' : ''}`, { dim: true });

  const rt0 = mth.retType;
  // 비즈니스(표준 CRUD 의미)
  const tb = tableFor(ctx, svcBean), db = tb || { rows: [], seq: 1 }, E = tb ? tb.E : null;
  const sql = s => { if (ctx.cfg.showSql) raw('Hibernate: ' + s, 'sql'); };
  const tn = tb ? tb.tn : 'posts';
  const svcText = svcBean ? (svcBean.t.unit.text || '') : '';
  let result = null, ex = null, real = null;
  if (!proceeded || (ctx.mutant === 'delete-call' && method === 'DELETE')) result = null;   // 변이: DELETE 가 서비스를 호출하지 않음
  else if (mockHit) { const rv = ctx.mock.invoke(mockHit.type, mockHit.method, mockHit.args); result = (rv && rv.__opt) ? rv.v : rv; if (result && result.f) result = { ...result.f }; else if (Array.isArray(result)) result = result.map(x => (x && x.f ? { ...x.f } : x)); }
  else if (!(real = realCall(ctx, mp, argv, txOn && !txRO, sql)).fallback) { result = real.value; ex = real.ex; }
  else if ((raw(`(시뮬레이터) 일부 구문을 해석하지 못해 표준 CRUD 동작으로 대신 처리했습니다 — ${real.fallback}`, 'dim'), real = null, stub && /^\s*String\s*$/.test(rt0) && /\breturn\s+"([^"]*)"\s*;/.test(body))) result = { title: /\breturn\s+"([^"]*)"\s*;/.exec(body)[1] };   // 직접 짠 간단한 컨트롤러: 문자열 리터럴 반환
  else if (stub) result = null;
  else if (method === 'GET' && id === null && keyword !== null) { sql(`select p1_0.id,p1_0.content,p1_0.title from ${tn} p1_0 where p1_0.title like ? escape '\\'`); result = db.rows.filter(r => String(r.title).includes(keyword)); }
  else if (method === 'GET' && id === null) { sql(`select p1_0.id,p1_0.content,p1_0.title from ${tn} p1_0`); result = db.rows.slice(); }
  else if (id !== null) {
    sql(`select p1_0.id,p1_0.content,p1_0.title from ${tn} p1_0 where p1_0.id=?`);
    const row = db.rows.find(r => r.id === id);
    if (!row && method !== 'POST') {
      const nf = /orElseThrow\s*\(\s*\(\s*\)\s*->\s*new\s+(\w+)/.exec(svcText) || /orElseThrow\s*\(\s*(\w+)::new/.exec(svcText);
      if (/orElseThrow\s*\(\s*\)/.test(svcText) || /\.get\(\)/.test(svcText)) ex = ['NoSuchElementException', 'No value present'];
      else if (nf) ex = [nf[1], exceptionMessage(model, nf[1], id)];
      else result = null;
    } else if (method === 'GET') result = row;
    else if (method === 'DELETE') { sql(`delete from ${tn} where id=?`); db.rows = db.rows.filter(r => r.id !== id); result = null; }
    else { // PUT / PATCH
      Object.keys(dto || {}).forEach(k => { if (k !== 'id') row[k] = dto[k]; }); sql(`update ${tn} set content=?,title=? where id=?`); result = row;
    }
  } else if (method === 'POST') {
    const colsNullable = c => { const f = E && E.fields.find(x => x.name === c); const col = f && getAnn(f, 'Column'); return !(col && /nullable\s*=\s*false/.test(col.args)); };
    const src = unboundDto ? {} : dto || {};
    const bad = E && E.fields.filter(f => f.name !== 'id' && !f.mods.includes('static')).find(f => (src[f.name] === undefined || src[f.name] === null) && !colsNullable(f.name));
    if (bad) ex = ['DataIntegrityViolationException', `NULL not allowed for column "${bad.name.toUpperCase()}"`];
    else {
      const row = { id: db.seq++ }; (E ? E.fields.filter(f => f.name !== 'id') : Object.keys(src).map(name => ({ name }))).forEach(f => { row[f.name] = src[f.name] ?? null; });
      db.rows.push(row); sql(`insert into ${tn} (content,title,id) values (?,?,default)`); result = row;
    }
  }
  if (ex) {
    advs.filter(a => a.kind === 'AfterThrowing').forEach(a => emit(a, advText(a, 'all'), sigText));
    advs.filter(a => a.kind === 'After').forEach(a => emit(a, advText(a, 'all'), sigText));
    if (txOn) log('DEBUG', 'o.s.orm.jpa.JpaTransactionManager', `Initiating transaction rollback`, { dim: true });
    res.exception = `${ex[0]}: ${ex[1] ?? ''}`;
    return resolveEx(ex[0], ex[1] ?? ex[0], 500);
  }
  advs.filter(a => a.kind === 'AfterReturning').forEach(a => emit(a, advText(a, 'all'), sigText));
  advs.filter(a => a.kind === 'After').forEach(a => emit(a, advText(a, 'all'), sigText));
  advs.filter(a => a.kind === 'Around').forEach(a => emit(a, advText(a, 'after'), sigText));
  if (txOn) log('DEBUG', 'o.s.orm.jpa.JpaTransactionManager', 'Committing JPA transaction on EntityManager', { dim: true });
  if (!proceeded) raw('@Around 안에서 proceed() 를 호출하지 않아 대상 메서드가 실행되지 않았습니다', 'hint');

  // 응답
  let status = 200;
  const rs = getAnn(mth, 'ResponseStatus');
  if (rs) { const k = /([A-Z_]+)\s*$/.exec(rs.args); status = STATUS[k && k[1]] || 200; }
  const rt = mth.retType;
  if (simple(rt) === 'ResponseEntity') { const b = mth.body || ''; if (/ResponseEntity\s*\.\s*created/.test(b) || /HttpStatus\.CREATED/.test(b)) status = 201; else if (/noContent/.test(b)) status = 204; else if (/notFound/.test(b)) status = 404; }
  if (ctx.mutant === 'delete-status' && method === 'DELETE' && status > 200 && status < 300) status = 200;   // 변이: DELETE 가 204 대신 200
  if (real && real.serErr) { log('ERROR', 'o.a.c.c.C.[.[.[/].[dispatcherServlet]', `Servlet.service() threw exception [Request processing failed: ${real.serErr.slice(0, 120)}…]`); return finish(500, errJson(500)); }
  if (rt === 'void' || result === null) return finish(rt === 'void' && !rs && method === 'DELETE' ? 200 : status, '');
  if (real) return typeof result === 'string' ? finish(status, result, { 'Content-Type': 'text/plain;charset=UTF-8' }) : finish(status, result);
  let shaped;
  try { shaped = shapeRow(model, rt, isList(rt) ? result : result, E); } catch (e) {
    log('ERROR', 'o.a.c.c.C.[.[.[/].[dispatcherServlet]', `Servlet.service() threw exception [Request processing failed: ${e.message.slice(0, 120)}…]`);
    return finish(500, errJson(500));
  }
  if (shaped.str) return finish(status, shaped.value, { 'Content-Type': 'text/plain;charset=UTF-8' });
  return finish(status, shaped.value);
}

Object.assign(IDE, { validate, exceptionMessage, splitPlus, shapeRow, handle, repoOp, serialize });
})();
