/* core/minijava.js — 테스트 코드를 실행하기 위한 아주 작은 자바 해석기.
   지원: 지역변수/대입/return/if, new, 메서드 체이닝, 람다·메서드 참조, Optional/List/Stream 기본 연산.
   해석할 수 없는 구문은 Unsupported 로 던져 "실행 불가" 로 보고한다(통과로 가정하지 않음). */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { simple } = IDE;

class Unsupported extends Error {}
class AssertionFail extends Error {}
class JavaThrow extends Error { constructor(name, msg) { super(name + ': ' + msg); this.javaName = name; this.javaMsg = msg; } }
class ReturnSignal { constructor(v) { this.v = v; } }

/* ───────────── 토크나이저 ───────────── */
const TOK = /\s+|\/\/[^\n]*|\/\*[\s\S]*?\*\/|("(?:[^"\\\n]|\\.)*")|('(?:[^'\\\n]|\\.)')|(\d+(?:\.\d+)?[LlDdFf]?)|([A-Za-z_$][\w$]*)|(::|->|==|!=|<=|>=|&&|\|\||\+\+|--|[()\[\]{}.,;<>=+\-*\/!?:@%&|])/y;
function tokenize(src) {
  const out = []; TOK.lastIndex = 0; let m;
  while (TOK.lastIndex < src.length && (m = TOK.exec(src))) {
    if (m[1]) out.push({ t: 'str', v: JSON.parse(m[1]) });
    else if (m[2]) out.push({ t: 'str', v: m[2].slice(1, -1) });
    else if (m[3]) out.push({ t: 'num', v: parseFloat(m[3]) });
    else if (m[4]) out.push({ t: 'id', v: m[4] });
    else if (m[5]) out.push({ t: 'op', v: m[5] });
  }
  if (TOK.lastIndex < src.length) throw new Unsupported('해석할 수 없는 문자: ' + src.slice(TOK.lastIndex, TOK.lastIndex + 12));
  return out;
}

/* ───────────── 파서 ───────────── */
function parse(src) {
  const T = tokenize(src); let p = 0;
  const peek = (o = 0) => T[p + o], eof = () => p >= T.length;
  const isOp = (v, o = 0) => T[p + o] && T[p + o].t === 'op' && T[p + o].v === v;
  const isId = (v, o = 0) => T[p + o] && T[p + o].t === 'id' && (v === undefined || T[p + o].v === v);
  const next = () => T[p++];
  const expect = v => { if (!isOp(v)) throw new Unsupported(`'${v}' 가 필요한 위치: ${T[p] ? T[p].v : '끝'}`); return next(); };
  const skipGenerics = () => { if (!isOp('<')) return; let d = 0; do { if (isOp('<')) d++; else if (isOp('>')) d--; p++; } while (d > 0 && !eof()); };

  function parseArgs() { const a = []; expect('('); while (!isOp(')')) { a.push(parseExpr()); if (isOp(',')) next(); } expect(')'); return a; }
  function lambdaAhead() { // (a, b) -> / a ->
    if (isId() && isOp('->', 1)) return true;
    if (!isOp('(')) return false;
    let d = 0, i = p; for (; i < T.length; i++) { if (T[i].t === 'op' && T[i].v === '(') d++; else if (T[i].t === 'op' && T[i].v === ')') { d--; if (!d) break; } }
    return T[i + 1] && T[i + 1].t === 'op' && T[i + 1].v === '->';
  }
  function parseLambda() {
    const params = [];
    if (isId()) params.push(next().v);
    else { expect('('); while (!isOp(')')) { if (isId() && !isOp(',', 1) && !isOp(')', 1)) next(); params.push(next().v); if (isOp(',')) next(); } expect(')'); }
    expect('->');
    if (isOp('{')) { next(); const body = parseStatements('}'); expect('}'); return { k: 'lam', params, block: body }; }
    return { k: 'lam', params, e: parseExpr() };
  }
  function parsePrimary() {
    const t = peek(); if (!t) throw new Unsupported('식이 끝났습니다');
    if (lambdaAhead()) return parseLambda();
    if (t.t === 'num') { next(); return { k: 'lit', v: t.v }; }
    if (t.t === 'str') { next(); return { k: 'lit', v: t.v }; }
    if (isOp('(')) { next(); const e = parseExpr(); expect(')'); return e; }
    if (t.t === 'id') {
      next();
      if (t.v === 'true' || t.v === 'false') return { k: 'lit', v: t.v === 'true' };
      if (t.v === 'null') return { k: 'lit', v: null };
      if (t.v === 'new') { const ty = next().v; let name = ty; while (isOp('.')) { next(); name = next().v; } skipGenerics(); if (isOp('[')) throw new Unsupported('배열 생성'); return { k: 'new', t: name, args: parseArgs() }; }
      if (isOp('(')) return { k: 'call', obj: null, n: t.v, args: parseArgs() };
      return { k: 'id', n: t.v };
    }
    throw new Unsupported('지원하지 않는 식: ' + t.v);
  }
  function parsePostfix() {
    let e = parsePrimary();
    for (;;) {
      if (isOp('.')) { next(); const n = next().v; if (isOp('(')) e = { k: 'call', obj: e, n, args: parseArgs() }; else e = { k: 'get', obj: e, n }; }
      else if (isOp('::')) { next(); e = { k: 'mref', obj: e, n: next().v }; }
      else if (isOp('[')) { next(); const i = parseExpr(); expect(']'); e = { k: 'idx', obj: e, i }; }
      else return e;
    }
  }
  function parseUnary() { if (isOp('!')) { next(); return { k: 'un', op: '!', e: parseUnary() }; } if (isOp('-')) { next(); return { k: 'un', op: '-', e: parseUnary() }; } return parsePostfix(); }
  const LEVELS = [['||'], ['&&'], ['==', '!='], ['<', '>', '<=', '>='], ['+', '-'], ['*', '/', '%']];
  function parseBin(l) {
    if (l >= LEVELS.length) return parseUnary();
    let left = parseBin(l + 1);
    while (T[p] && T[p].t === 'op' && LEVELS[l].includes(T[p].v)) { const op = next().v; left = { k: 'bin', op, l: left, r: parseBin(l + 1) }; }
    return left;
  }
  function parseExpr() { return parseBin(0); }

  function tryDecl() { // [final] Type[<..>][[]] name (= expr)? ;
    const save = p; if (isId('final')) next();
    if (!isId()) { p = save; return null; }
    next(); while (isOp('.') && isId(undefined, 1)) { next(); next(); } skipGenerics(); while (isOp('[') && isOp(']', 1)) { next(); next(); }
    if (isId() && (isOp('=', 1) || isOp(';', 1))) { const name = next().v; let init = null; if (isOp('=')) { next(); init = parseExpr(); } return { k: 'decl', name, init }; }
    p = save; return null;
  }
  function parseStatement() {
    if (isOp(';')) { next(); return { k: 'nop' }; }
    if (isId('return')) { next(); const e = isOp(';') ? null : parseExpr(); if (isOp(';')) next(); return { k: 'ret', e }; }
    if (isId('if')) {
      next(); expect('('); const cond = parseExpr(); expect(')');
      const then = isOp('{') ? (next(), parseBlockRest()) : [parseStatement()];
      let els = null; if (isId('else')) { next(); els = isOp('{') ? (next(), parseBlockRest()) : [parseStatement()]; }
      return { k: 'if', cond, then, els };
    }
    if (isId('throw')) { next(); const e = parseExpr(); if (isOp(';')) next(); return { k: 'throw', e }; }
    if (isId('for') || isId('while') || isId('try') || isId('switch')) throw new Unsupported(`'${peek().v}' 문은 지원하지 않습니다`);
    const d = tryDecl(); if (d) { if (isOp(';')) next(); return d; }
    const e = parseExpr();
    if (isOp('=')) { next(); const r = parseExpr(); if (isOp(';')) next(); return { k: 'assign', target: e, e: r }; }
    if (isOp(';')) next();
    return { k: 'expr', e };
  }
  function parseBlockRest() { const s = parseStatements('}'); expect('}'); return s; }
  function parseStatements(endOp) { const s = []; while (!eof() && !(endOp && isOp(endOp))) s.push(parseStatement()); return s; }
  return { statements: () => parseStatements(null), expr: () => { const e = parseExpr(); return e; } };
}
const cache = new Map();
const parseStatements = src => { if (!cache.has(src)) cache.set(src, parse(src).statements()); return cache.get(src); };

/* ───────────── 값 유틸 ───────────── */
const isInst = v => v && typeof v === 'object' && v.__t;
const isOpt = v => v && v.__opt;
const isMock = v => v && v.__mock;
const optOf = v => ({ __opt: true, v: v ?? null });
const unwrapNum = v => (typeof v === 'number' ? v : v);
function show(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(show).join(', ') + ']';
  if (isOpt(v)) return v.v === null ? 'Optional.empty' : `Optional[${show(v.v)}]`;
  if (isInst(v)) return `${v.__t}[${Object.entries(v.f).map(([k, x]) => `${k}=${show(x)}`).join(', ')}]`;
  return String(v);
}
function deepEq(a, b) {
  if (b && b.__any) return true;
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') return a === b;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => deepEq(x, b[i]));
  if (isOpt(a) && isOpt(b)) return deepEq(a.v, b.v);
  if (isInst(a) && isInst(b)) return a.__t === b.__t && Object.keys(a.f).every(k => deepEq(a.f[k], b.f[k]));
  return false;
}
function toPlain(v) { // JSON 응답/DB 행으로 쓰기 위한 변환
  if (Array.isArray(v)) return v.map(toPlain);
  if (isInst(v)) return { ...v.f };
  return v;
}

/* ───────────── 인터프리터 ───────────── */
class Interp {
  /** model: IDE.buildModel 결과, hooks: { builtin(name,args,node) → value | undefined } 테스트 환경 확장 */
  constructor(model, hooks = {}) { this.model = model; this.hooks = hooks; this.depth = 0; }

  typeOf(name) { return this.model.types.get(name); }
  instantiate(T, args) {
    const f = {};
    if (T.kind === 'record') { T.comps.forEach((c, i) => { f[c.name] = args[i] ?? null; }); return { __t: T.name, f, T }; }
    T.fields.filter(x => !x.mods.includes('static')).forEach(x => { f[x.name] = /^(int|long|short|byte|double|float)$/.test(x.type) ? 0 : x.type === 'boolean' ? false : null; });
    const inst = { __t: T.name, f, T };
    const ctor = T.ctors.find(c => c.params.length === args.length);
    if (ctor) this.run(ctor.body || '', { vars: new Map(ctor.params.map((pm, i) => [pm.name, args[i]])), self: inst, T });
    else if (args.length) throw new Unsupported(`${T.name} 에 인자 ${args.length}개 생성자가 없습니다`);
    return inst;
  }
  run(body, scope) {
    const stmts = typeof body === 'string' ? parseStatements(body) : body;
    try { this.exec(stmts, scope); } catch (e) { if (e instanceof ReturnSignal) return e.v; throw e; }
    return undefined;
  }
  exec(stmts, scope) {
    for (const s of stmts) {
      switch (s.k) {
        case 'decl': scope.vars.set(s.name, s.init ? this.ev(s.init, scope) : null); break;
        case 'ret': throw new ReturnSignal(s.e ? this.ev(s.e, scope) : undefined);
        case 'assign': {
          const v = this.ev(s.e, scope), t = s.target;
          if (t.k === 'get' && t.obj.k === 'id' && t.obj.n === 'this') scope.self.f[t.n] = v;
          else if (t.k === 'id' && !scope.vars.has(t.n) && scope.self && t.n in scope.self.f) scope.self.f[t.n] = v;
          else if (t.k === 'id') scope.vars.set(t.n, v);
          else if (t.k === 'get') { const o = this.ev(t.obj, scope); if (isInst(o)) o.f[t.n] = v; else throw new Unsupported('대입 대상'); }
          break;
        }
        case 'if': { const c = this.ev(s.cond, scope); this.exec(c ? s.then : (s.els || []), scope); break; }
        case 'throw': { const e = this.ev(s.e, scope); throw new JavaThrow(e && e.__t ? e.__t : 'Exception', e && e.f && e.f.message || ''); }
        case 'expr': this.ev(s.e, scope); break;
        default: break;
      }
    }
  }
  callLambda(fn, args) {
    if (typeof fn === 'function') return fn(...args);
    if (fn && fn.k === 'lam') {
      const vars = new Map(fn.scope.vars); fn.params.forEach((n, i) => vars.set(n, args[i]));
      const sc = { ...fn.scope, vars };
      if (fn.e) return this.ev(fn.e, sc);
      return this.run(fn.block, sc);
    }
    throw new Unsupported('람다 호출');
  }
  ev(n, sc) {
    if (++this.depth > 4000) throw new Unsupported('실행이 너무 깊습니다');
    try { return this.ev1(n, sc); } finally { this.depth--; }
  }
  ev1(n, sc) {
    switch (n.k) {
      case 'lit': return n.v;
      case 'id': {
        if (sc.vars.has(n.n)) return sc.vars.get(n.n);
        if (sc.self && n.n in sc.self.f) return sc.self.f[n.n];
        if (n.n === 'this') return sc.self;
        if (sc.test && n.n in sc.test.f) return sc.test.f[n.n];
        return { __class: n.n };   // 정적 호출 대상 (예: PostResponse, List, MediaType)
      }
      case 'lam': return { ...n, scope: sc };
      case 'un': { const v = this.ev(n.e, sc); return n.op === '!' ? !v : -v; }
      case 'bin': {
        if (n.op === '&&') return this.ev(n.l, sc) && this.ev(n.r, sc);
        if (n.op === '||') return this.ev(n.l, sc) || this.ev(n.r, sc);
        const a = this.ev(n.l, sc), b = this.ev(n.r, sc);
        switch (n.op) { case '+': return (typeof a === 'string' || typeof b === 'string') ? show1(a) + show1(b) : a + b; case '-': return a - b; case '*': return a * b; case '/': return a / b; case '%': return a % b;
          case '==': return deepEq(a, b) || a === b; case '!=': return !(deepEq(a, b) || a === b); case '<': return a < b; case '>': return a > b; case '<=': return a <= b; case '>=': return a >= b; default: throw new Unsupported(n.op); }
      }
      case 'idx': return this.ev(n.obj, sc)[this.ev(n.i, sc)];
      case 'get': { const o = this.ev(n.obj, sc); if (isInst(o)) return o.f[n.n]; if (o && o.__class) return { __class: n.n, outer: o.__class }; throw new Unsupported('필드 접근 .' + n.n); }
      case 'mref': {
        const target = n.obj.k === 'id' && !sc.vars.has(n.obj.n) ? { __class: n.obj.n } : this.ev(n.obj, sc);
        return (...args) => (target && target.__class ? this.callStatic(target.__class, n.n, args, n) : this.callMethod(target, n.n, args, n));
      }
      case 'new': return this.evNew(n, sc);
      case 'call': return this.evCall(n, sc);
      default: throw new Unsupported('식 종류 ' + n.k);
    }
  }
  evNew(n, sc) {
    const args = n.args.map(a => this.ev(a, sc)), T = this.typeOf(n.t);
    if (T) return this.instantiate(T, args);
    if (n.t === 'ArrayList' || n.t === 'LinkedList') return [];
    if (n.t === 'Object') return {};
    throw new Unsupported('new ' + n.t);
  }
  evCall(n, sc) {
    // 테스트 확장 훅(given/when/verify 등은 인자를 평가하지 않고 AST 를 직접 받는다)
    if (this.hooks.special) { const r = this.hooks.special(n, sc, this); if (r !== undefined) return r.v; }
    if (n.obj === null) {
      const args = n.args.map(a => this.ev(a, sc));
      const own = sc.T && sc.T.methods.find(m => m.name === n.n && m.params.length === args.length);
      if (own) return this.invoke(own, sc.self, args, sc.T);
      return this.callStatic(null, n.n, args, n);
    }
    const target = this.ev(n.obj, sc);
    const args = n.args.map(a => this.ev(a, sc));
    if (target && target.__class) return this.callStatic(target.__class, n.n, args, n);
    return this.callMethod(target, n.n, args, n);
  }
  invoke(m, self, args, T) {
    if (m.body === null) throw new Unsupported(`${m.name}() 에 본문이 없습니다`);
    return this.run(m.body, { vars: new Map(m.params.map((p, i) => [p.name, args[i]])), self, T });
  }
  callStatic(cls, name, args, node) {
    if (this.hooks.builtin) { const r = this.hooks.builtin(cls, name, args, node, this); if (r !== undefined) return r.v; }
    if (cls === 'Optional') { if (name === 'of') { if (args[0] === null) throw new JavaThrow('NullPointerException', ''); return optOf(args[0]); } if (name === 'empty') return optOf(null); if (name === 'ofNullable') return optOf(args[0]); }
    if (cls === 'List' || cls === 'Arrays') { if (name === 'of' || name === 'asList') return args.length === 1 && Array.isArray(args[0]) && name === 'asList' ? args[0] : args; if (name === 'copyOf') return [...args[0]]; }
    if (cls === 'Map' && name === 'of') { const o = {}; for (let i = 0; i < args.length; i += 2) o[args[i]] = args[i + 1]; return o; }
    if (cls === 'MediaType') return 'application/json';
    const T = cls && this.typeOf(cls);
    if (T) { const m = T.methods.find(x => x.name === name && x.mods.includes('static') && x.params.length === args.length); if (m) return this.invoke(m, null, args, T); }
    throw new Unsupported(`${cls ? cls + '.' : ''}${name}() 호출은 지원하지 않습니다`);
  }
  callMethod(t, name, args, node) {
    if (this.hooks.method) { const r = this.hooks.method(t, name, args, node, this); if (r !== undefined) return r.v; }
    if (t === null || t === undefined) throw new JavaThrow('NullPointerException', `Cannot invoke "${name}()" because value is null`);
    if (typeof t === 'string') {
      switch (name) { case 'length': return t.length; case 'isEmpty': return t.length === 0; case 'isBlank': return t.trim() === ''; case 'equals': return t === args[0]; case 'contains': return t.includes(args[0]); case 'toString': return t; case 'toUpperCase': return t.toUpperCase(); case 'toLowerCase': return t.toLowerCase(); case 'trim': return t.trim(); case 'startsWith': return t.startsWith(args[0]); default: break; }
    }
    if (typeof t === 'number' || typeof t === 'boolean') { if (name === 'equals') return t === args[0]; if (name === 'intValue' || name === 'longValue') return t; }
    if (Array.isArray(t)) {
      switch (name) { case 'size': return t.length; case 'get': return t[args[0]]; case 'isEmpty': return t.length === 0; case 'stream': return { __stream: true, a: t }; case 'contains': return t.some(x => deepEq(x, args[0])); case 'add': t.push(args[0]); return true; default: break; }
    }
    if (t && t.__stream) {
      switch (name) { case 'map': return { __stream: true, a: t.a.map(x => this.callLambda(args[0], [x])) }; case 'filter': return { __stream: true, a: t.a.filter(x => this.callLambda(args[0], [x])) }; case 'toList': case 'collect': return t.a; case 'count': return t.a.length; default: break; }
    }
    if (isOpt(t)) {
      switch (name) {
        case 'map': return t.v === null ? t : optOf(this.callLambda(args[0], [t.v]));
        case 'orElse': return t.v === null ? args[0] : t.v;
        case 'orElseThrow': if (t.v !== null) return t.v; if (args[0]) { const e = this.callLambda(args[0], []); throw new JavaThrow(e && e.__t || 'Exception', ''); } throw new JavaThrow('NoSuchElementException', 'No value present');
        case 'isPresent': return t.v !== null; case 'isEmpty': return t.v === null; case 'get': if (t.v === null) throw new JavaThrow('NoSuchElementException', 'No value present'); return t.v;
        case 'ifPresent': if (t.v !== null) this.callLambda(args[0], [t.v]); return undefined;
        default: break;
      }
    }
    if (isInst(t)) {
      const T = t.T || this.typeOf(t.__t);
      if (T) {
        if (T.kind === 'record' && T.comps.some(c => c.name === name) && !args.length) return t.f[name];
        const m = T.methods.find(x => x.name === name && x.params.length === args.length);
        if (m) return this.invoke(m, t, args, T);
        if (name === 'equals') return deepEq(t, args[0]); if (name === 'toString') return show(t);
      }
    }
    throw new Unsupported(`${t && t.__t ? t.__t : typeof t}.${name}() 호출은 지원하지 않습니다`);
  }
}
const show1 = v => (typeof v === 'string' ? v : show(v));

Object.assign(IDE, { mini: { Interp, parseStatements, Unsupported, AssertionFail, JavaThrow, ReturnSignal, show, deepEq, toPlain, optOf, isInst, isOpt, isMock } });
})();
