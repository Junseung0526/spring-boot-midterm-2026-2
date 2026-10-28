/* ui/highlight.js — 파일 종류별 구문 강조 (줄 단위 HTML 배열을 반환) */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const escAttr = s => esc(s).replace(/"/g, '&quot;');
const KW = new Set('public private protected class interface record enum extends implements return new final static void import package throws throw if else for while try catch finally this super null true false var int long double boolean char byte short instanceof switch case default break continue'.split(' '));
const GRADLE_KW = new Set('plugins id version implementation runtimeOnly compileOnly annotationProcessor testImplementation group java'.split(' '));
const JAVA = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(@[A-Za-z_]\w*)|\b([A-Za-z_]\w*)\b|\b(\d[\d_]*L?)\b/g;

function emitter() {
  let out = '';
  return { add(cls, t) { out += t.split('\n').map(p => cls ? `<span class="${cls}">${esc(p)}</span>` : esc(p)).join('\n'); }, get: () => out };
}
function java(text, extra) {
  const e = emitter(); let last = 0, m; JAVA.lastIndex = 0;
  while ((m = JAVA.exec(text))) {
    e.add('', text.slice(last, m.index));
    const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'a' : m[4] ? (KW.has(m[4]) || (extra && extra.has(m[4])) ? 'k' : '') : 'n';
    e.add(cls, m[0]); last = JAVA.lastIndex;
  }
  e.add('', text.slice(last));
  return e.get().split('\n');
}
const jsonish = l => esc(l).replace(/(&quot;|")((?:[^"\\]|\\.)*?)\1(\s*:)?/g, (m, q, s, colon) => colon ? `<span class="a">"${s}"</span>${colon}` : `<span class="s">"${s}"</span>`).replace(/\b(\d+)\b/g, '<span class="n">$1</span>');
function yaml(text) {
  return text.split('\n').map(l => {
    if (/^\s*#/.test(l)) return `<span class="c">${esc(l)}</span>`;
    const m = /^(\s*)([\w.-]+)(:)(.*)$/.exec(l);
    return m ? `${m[1]}<span class="k">${m[2]}</span>${m[3]}${esc(m[4]).replace(/\b(\d+|true|false)\b/g, '<span class="n">$1</span>')}` : esc(l);
  });
}
function sql(text) {
  return text.split('\n').map(l => esc(l).replace(/'(?:[^']|'')*'/g, '<span class="s">$&</span>').replace(/\b(insert|into|values|select|from|where|create|table)\b/gi, '<span class="k">$1</span>'));
}
function http(text) {
  let body = false;
  return text.split('\n').map(l => {
    if (/^###/.test(l)) { body = false; return `<span class="c">${esc(l)}</span>`; }
    const r = /^(GET|POST|PUT|PATCH|DELETE)(\s+)(\S+)(.*)$/.exec(l);
    if (r) { body = false; return `<span class="k">${r[1]}</span>${r[2]}<span class="s">${esc(r[3])}</span>${esc(r[4])}`; }
    if (!body && l.trim() === '') { body = true; return ''; }
    if (!body) { const h = /^([\w-]+)(:)(.*)$/.exec(l); if (h) return `<span class="a">${h[1]}</span>${h[2]}${esc(h[3])}`; }
    return jsonish(l);
  });
}
const byName = n => /\.gradle$/.test(n) ? (t => java(t, GRADLE_KW)) : /\.java$/.test(n) || n === 'x.java' ? java : /\.ya?ml$/.test(n) ? yaml : /\.sql$/.test(n) ? sql : /\.http$/.test(n) ? http : l => l.split('\n').map(esc);

/** 줄별 HTML. errs: Map(line → message) 이면 빨간 물결 밑줄을 겹친다 */
function lines(text, name, errs) {
  const out = byName(name)(text);
  if (errs) for (const [ln, msg] of errs) {
    if (out[ln - 1] === undefined) continue;
    out[ln - 1] = out[ln - 1].replace(/^(\s*)([\s\S]*)$/, (m, ws, rest) => `${ws}<span class="${/^빈칸/.test(msg) ? 'err blank' : 'err'}" title="${escAttr(msg)}">${rest || ' '}</span>`);
  }
  return out;
}
Object.assign(IDE, { highlight: { lines, esc, escAttr, jsonish } });
})();
