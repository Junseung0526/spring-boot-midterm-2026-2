/* core/parser.js — 자바 소스 파서 (클래스·필드·메서드·어노테이션 추출) */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { MODS, simple, splitTop } = IDE;
function stripComments(src) {
  return src.replace(/("(?:[^"\\\n]|\\.)*")|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m, s) => s ? s : m.replace(/[^\n]/g, ' '));
}
function parseParam(p, line) {
  const anns = [];
  let rest = p.replace(/@([\w.]+)(\s*\((?:[^()]|\([^()]*\))*\))?/g, (m0, name, args) => { anns.push({ name: name.split('.').pop(), args: args ? args.trim().slice(1, -1) : '', line }); return ' '; });
  rest = rest.replace(/\bfinal\b/g, ' ').trim();
  const m = /^([\s\S]+?)\s+(\w+)$/.exec(rest);
  return { anns, type: m ? m[1].trim() : rest, name: m ? m[2] : '', line };
}

function parseJava(src, path) {
  const text = stripComments(src), n = text.length;
  const starts = [0];
  for (let i = 0; i < n; i++) if (text[i] === '\n') starts.push(i + 1);
  const lineOf = off => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= off) lo = mid; else hi = mid - 1; } return lo + 1; };
  const unit = { path, pkg: '', imports: [], types: [], errors: [], text, lineOf };
  const pm = /\bpackage\s+([\w.]+)\s*;/.exec(text); if (pm) unit.pkg = pm[1];
  for (const m of text.matchAll(/\bimport\s+(?:static\s+)?([\w.*]+)\s*;/g)) unit.imports.push(m[1]);
  const ws = i => { while (i < n && /\s/.test(text[i])) i++; return i; };
  const skipStr = i => { const q = text[i]; i++; while (i < n && text[i] !== q) { if (text[i] === '\\') i++; i++; } return i + 1; };
  const matchClose = i => {
    const open = text[i], close = { '(': ')', '{': '}', '[': ']' }[open]; let d = 0;
    for (; i < n; i++) {
      const c = text[i];
      if (c === '"' || c === "'") { i = skipStr(i) - 1; continue; }
      if (c === open) d++; else if (c === close) { d--; if (d === 0) return i; }
    }
    return -1;
  };
  const readAnns = i => {
    const anns = [];
    for (;;) {
      i = ws(i);
      if (text[i] !== '@' || text.startsWith('@interface', i)) break;
      const m = /^@([\w.]+)/.exec(text.slice(i, i + 80)); if (!m) break;
      const a = { name: m[1].split('.').pop(), args: '', line: lineOf(i) };
      i += m[0].length;
      const j = ws(i);
      if (text[j] === '(') { const e = matchClose(j); if (e < 0) return { anns, i: n }; a.args = text.slice(j + 1, e); i = e + 1; }
      anns.push(a);
    }
    return { anns, i };
  };
  const stripMods = s => { const w = s.trim().split(/\s+/).filter(Boolean); const mods = []; while (w.length && MODS.has(w[0])) mods.push(w.shift()); return { mods, rest: w.join(' ') }; };

  function parseMembers(t, start, end) {
    let i = start;
    while (i < end) {
      i = ws(i); if (i >= end) break;
      if (text[i] === ';') { i++; continue; }
      const r = readAnns(i); i = ws(r.i); if (i >= end) break;
      let j = i, pd = 0, term = '';
      for (; j < end; j++) {
        const c = text[j];
        if (c === '"' || c === "'") { j = skipStr(j) - 1; continue; }
        if (c === '(') pd++; else if (c === ')') pd--;
        else if (pd === 0 && (c === '{' || c === ';' || c === '=')) { term = c; break; }
      }
      if (!term) break;
      const sig = text.slice(i, j).trim(), sigOff = i, line = lineOf(i);
      const pushMethod = body => {
        const po = sig.indexOf('('), pc = matchClose(sigOff + po);
        const pre = sig.slice(0, po).trim();
        const name = (pre.match(/(\w+)$/) || [])[1] || '';
        const { mods, rest } = stripMods(pre.replace(/(\w+)$/, ''));
        const params = pc < 0 ? [] : splitTop(text.slice(sigOff + po + 1, pc)).map(p => parseParam(p, line));
        const mem = { name, anns: r.anns, mods, retType: rest.replace(/^<[^>]*>\s*/, '').trim(), params, body, line, bodyOff: body === null ? 0 : j + 1 };
        if (name === t.name && !rest) t.ctors.push(mem); else t.methods.push(mem);
      };
      const pushField = hasInit => {
        const { mods, rest } = stripMods(sig);
        const m = /^([\s\S]+?)\s+(\w+)\s*$/.exec(rest);
        if (m) t.fields.push({ name: m[2], type: m[1].trim(), mods, anns: r.anns, hasInit, line });
      };
      const nested = /^(?:[\w@\s]*\s)?(class|interface|enum|record)\s+\w+/.test(sig);
      if (term === '{') {
        const e = matchClose(j);
        const body = e < 0 ? '' : text.slice(j + 1, e);
        i = e < 0 ? end : e + 1;
        if (!sig || nested) continue;
        if (sig.includes('(')) pushMethod(body);
        continue;
      }
      if (term === ';') { i = j + 1; if (sig.includes('(')) pushMethod(null); else if (sig) pushField(false); continue; }
      let k = j + 1, d = 0;
      for (; k < end; k++) {
        const c = text[k];
        if (c === '"' || c === "'") { k = skipStr(k) - 1; continue; }
        if ('({['.includes(c)) d++; else if (')}]'.includes(c)) d--; else if (c === ';' && d <= 0) break;
      }
      i = k + 1; pushField(true);
    }
  }

  let i = 0;
  while (i < n) {
    i = ws(i); if (i >= n) break;
    if (/^(package|import)\b/.test(text.slice(i, i + 8))) { const e = text.indexOf(';', i); if (e < 0) break; i = e + 1; continue; }
    const r = readAnns(i); i = ws(r.i);
    const m = /^((?:(?:public|private|protected|static|final|abstract|sealed|non-sealed|strictfp)\s+)*)(class|interface|record|enum)\s+(\w+)/.exec(text.slice(i, i + 300));
    if (!m) { i++; continue; }
    const t = { kind: m[2], name: m[3], anns: r.anns, mods: m[1].trim().split(/\s+/).filter(Boolean), pkg: unit.pkg, path, line: lineOf(i), header: '', comps: [], fields: [], methods: [], ctors: [], unit };
    let j = ws(i + m[0].length);
    if (text[j] === '<') { let d = 0; for (; j < n; j++) { if (text[j] === '<') d++; else if (text[j] === '>') { d--; if (!d) { j++; break; } } } }
    j = ws(j);
    if (t.kind === 'record' && text[j] === '(') { const e = matchClose(j); if (e > 0) { t.comps = splitTop(text.slice(j + 1, e)).map(p => parseParam(p, lineOf(j))); j = e + 1; } }
    const b = text.indexOf('{', j);
    if (b < 0) { unit.errors.push({ line: t.line, msg: "'{' expected" }); break; }
    t.header = text.slice(j, b).trim();
    let e = matchClose(b);
    if (e < 0) { unit.errors.push({ line: lineOf(n - 1), msg: "Reached end of file while parsing — '}' expected" }); e = n; }
    t.bodyStart = b + 1; t.bodyEnd = e;
    const hm = /\bextends\s+([\s\S]+?)(?=\bimplements\b|$)/.exec(t.header);
    t.ext = hm ? hm[1].trim() : '';
    t.extName = simple(t.ext.split(',')[0]);
    const gm = /<\s*([\s\S]+)>/.exec(t.ext.split(',')[0] + (t.ext.includes('<') ? t.ext.slice(t.ext.indexOf('<') + t.ext.split(',')[0].length - t.ext.split(',')[0].length) : ''));
    t.typeArgs = gm ? splitTop(gm[1]).map(simple) : [];
    const im = /\bimplements\s+([\s\S]+)$/.exec(t.header);
    t.impls = im ? splitTop(im[1]).map(simple) : [];
    if (t.kind === 'interface' && t.ext) t.impls = splitTop(t.ext).map(simple);
    parseMembers(t, b + 1, Math.min(e, n));
    unit.types.push(t);
    i = e + 1;
  }
  return unit;
}

Object.assign(IDE, { stripComments, parseParam, parseJava });
})();
