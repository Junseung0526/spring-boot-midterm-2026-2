/* core/web.js — 웹 매핑(@RequestMapping) · @ExceptionHandler · @Aspect 구성 */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { EX_PARENT, VERB_ANN, getAnn, hasAnn, simple, stringArg } = IDE;
function buildWeb(model, rb) {
  const mappings = [], advices = [], aspects = [];
  for (const b of rb.beans) {
    const t = b.t; if (b.fromBean || b.repo) continue;
    if (hasAnn(t, 'RestController') || hasAnn(t, 'Controller')) {
      const cm = getAnn(t, 'RequestMapping'), prefix = cm ? (stringArg(cm.args) ?? '') : '';
      for (const m of t.methods) for (const a of m.anns) {
        let verb = VERB_ANN[a.name];
        if (a.name === 'RequestMapping') verb = ((/RequestMethod\.(\w+)/.exec(a.args) || [])[1]) || 'ANY';
        if (!verb) continue;
        const path = stringArg(a.args) ?? '';
        const full = ('/' + prefix + '/' + path).replace(/\/+/g, '/').replace(/(.)\/$/, '$1');
        const names = []; const re = new RegExp('^' + full.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{(\w+)\}/g, (_, v) => { names.push(v); return '([^/]+)'; }) + '/?$');
        mappings.push({ verb, pattern: full, re, names, bean: b, method: m, literal: (full.match(/\{/g) || []).length });
      }
    }
    if (hasAnn(t, 'RestControllerAdvice') || hasAnn(t, 'ControllerAdvice'))
      for (const m of t.methods) { const eh = getAnn(m, 'ExceptionHandler'); if (eh) {
        let list = [...eh.args.matchAll(/(\w+)\.class/g)].map(x => x[1]);
        if (!list.length) list = m.params.map(p => simple(p.type));
        advices.push({ bean: b, method: m, handles: list, advice: t });
      } }
    if (hasAnn(t, 'Aspect')) {
      const pcs = {};
      for (const m of t.methods) { const p = getAnn(m, 'Pointcut'); if (p) pcs[m.name] = stringArg(p.args) || ''; }
      const list = [];
      for (const m of t.methods) for (const a of m.anns) if (['Around', 'Before', 'After', 'AfterReturning', 'AfterThrowing'].includes(a.name)) {
        let expr = stringArg(a.args, 'value|pointcut') || '';
        const ref = /^(\w+)\(\)$/.exec(expr); if (ref) expr = pcs[ref[1]] || '';
        const pm = /(?:execution\([^)]*?\s|within\()\s*([\w.]+?)(?:\.\.|\.\*|\*)/.exec(expr);
        list.push({ kind: a.name, method: m, expr, prefix: pm ? pm[1] : null });
      }
      aspects.push({ bean: b, advices: list });
    }
  }
  return { mappings, advices, aspects };
}
const isSub = (model, ex, target, depth = 0) => {
  if (ex === target) return true; if (depth > 10) return false;
  const T = model.types.get(ex);
  const p = T ? (T.extName || 'Throwable') : EX_PARENT[ex];
  return p ? isSub(model, p, target, depth + 1) : false;
};

Object.assign(IDE, { buildWeb, isSub });
})();
