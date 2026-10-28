/* core/compile.js — 컴파일(자바) 검사: import 누락 · return 누락 · 없는 메서드 등 */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { ANN_PKG, JAVA_LANG_ANN, hasAnn, hasMethod, simple } = IDE;
function javaProblems(model) {
  const out = [];
  const add = (u, line, msg, hint) => out.push({ path: u.path, line, msg, sev: 'error', kind: 'java', hint });
  for (const u of model.units) {
    u.errors.forEach(e => add(u, e.line, e.msg));
    const nostr = u.text.replace(/"(?:[^"\\\n]|\\.)*"/g, m => '"' + ' '.repeat(m.length - 2) + '"');
    for (const m of nostr.matchAll(/@([A-Za-z_][\w.]*)/g)) {
      const name = m[1];
      if (name.includes('.') || JAVA_LANG_ANN.has(name) || name === 'interface' || name === '___') continue;   // @___ 는 실습 빈칸: 아직 안 채운 것 = 어노테이션이 없는 것
      if (model.types.has(name)) continue;
      const pkg = ANN_PKG[name], line = u.lineOf(m.index);
      if (!pkg) { add(u, line, `Cannot resolve symbol '${name}'`); continue; }
      if (!u.imports.some(i => i === pkg + '.' + name || i === pkg + '.*')) add(u, line, `Cannot resolve symbol '${name}'`, `import ${pkg}.${name};`);
    }
    for (const t of u.types) {
      const lombokCtor = t.anns.some(a => ['RequiredArgsConstructor', 'AllArgsConstructor', 'Data'].includes(a.name));
      for (const f of t.fields) {
        if (f.mods.includes('final') && !f.hasInit && t.kind === 'class' && !lombokCtor) {
          const assigned = t.ctors.some(c => c.body && new RegExp('\\b' + f.name + '\\s*=[^=]').test(c.body));
          if (!assigned) add(u, f.line, `Variable '${f.name}' might not have been initialized`);
        }
      }
      for (const m of t.methods.concat(t.ctors)) {
        if (m.body === null) continue;
        if (t.methods.includes(m) && m.retType && m.retType !== 'void' && !/\b(return|throw)\b/.test(m.body)) add(u, m.line, 'Missing return statement');
        const lg = /\blog\.(info|warn|error|debug|trace)\(/.exec(m.body);
        if (lg && !hasAnn(t, 'Slf4j') && !t.fields.some(f => f.name === 'log')) add(u, u.lineOf(m.bodyOff + lg.index), "Cannot resolve symbol 'log'", 'Add @Slf4j (lombok.extern.slf4j.Slf4j) to the class');
        const vars = new Map();
        t.fields.forEach(f => vars.set(f.name, f.type)); m.params.forEach(p => vars.set(p.name, p.type));
        for (const lv of m.body.matchAll(/\b([A-Z]\w*)(?:<[^>;=]*>)?\s+(\w+)\s*=/g)) vars.set(lv[2], lv[1]);
        for (const c of m.body.matchAll(/\b([a-z]\w*)\.(\w+)\s*\(/g)) {
          const T = model.types.get(simple(vars.get(c[1]) || ''));
          if (!T || T === t && c[1] === 'this' || c[2] === '___') continue;   // 실습 빈칸
          if (!hasMethod(model, T, c[2])) add(u, u.lineOf(m.bodyOff + c.index), `Cannot resolve method '${c[2]}' in '${T.name}'`);
        }
      }
    }
  }
  return out;
}

Object.assign(IDE, { javaProblems });
})();
