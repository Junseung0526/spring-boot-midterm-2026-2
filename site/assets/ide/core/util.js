/* core/util.js — 공용 유틸 (타입명/어노테이션 조회 · 로그 시간 등) */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const simple = t => String(t || '').replace(/<[\s\S]*$/, '').replace(/\[\]/g, '').trim().split('.').pop();
const hasAnn = (x, n) => (x.anns || []).some(a => a.name === n);
const getAnn = (x, n) => (x.anns || []).find(a => a.name === n);
const decap = s => s.charAt(0).toLowerCase() + s.slice(1);
const fqn = t => (t.pkg ? t.pkg + '.' : '') + t.name;
const abbr = f => { const p = f.split('.'); return p.slice(0, -1).map(s => s[0]).concat(p.slice(-1)).join('.'); };
const pad = (n, w = 2) => String(n).padStart(w, '0');
function stamp(d = new Date()) {
  const tz = -d.getTimezoneOffset(), a = Math.abs(tz);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}${tz >= 0 ? '+' : '-'}${pad(Math.floor(a / 60))}:${pad(a % 60)}`;
}
function splitTop(s) {
  const out = []; let d = 0, cur = '';
  for (const c of s) {
    if ('(<{['.includes(c)) d++; else if (')>}]'.includes(c)) d--;
    if (c === ',' && d === 0) { out.push(cur); cur = ''; } else cur += c;
  }
  if (cur.trim()) out.push(cur);
  return out;
}
function elemType(t) {
  const m = /^\s*(?:List|Set|Collection|Optional|ResponseEntity|Page|Iterable)\s*<\s*([\s\S]+)>\s*$/.exec(t || '');
  return m ? elemType(m[1]) : (t || '').trim();
}
const isList = t => /^\s*(List|Set|Collection|Iterable|Page)\s*</.test(t || '');
const stringArg = (args, key) => { // 첫 문자열 값 (value=/path= 또는 첫 인자)
  const m = new RegExp('^\\s*(?:(?:' + (key || 'value|path') + ')\\s*=\\s*)?\\{?\\s*"([^"]*)"').exec(args || '');
  return m ? m[1] : null;
};

Object.assign(IDE, { simple, hasAnn, getAnn, decap, fqn, abbr, pad, stamp, splitTop, elemType, isList, stringArg });
})();
