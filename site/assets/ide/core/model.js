/* core/model.js — 파싱 결과 모델 + 메서드 존재 검사 */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { OBJ_METHODS, REPO_BASES, REPO_METHODS, parseJava } = IDE;
function buildModel(files) {
  const units = Object.entries(files).filter(([p]) => p.endsWith('.java')).map(([p, c]) => parseJava(c, p));
  const types = new Map();
  units.forEach(u => u.types.forEach(t => types.set(t.name, t)));
  return { units, types, files };
}
const allMembersCalled = (t, name) => t.methods.some(m => m.name === name);
function hasMethod(model, T, name, depth = 0) {
  if (OBJ_METHODS.has(name)) return true;
  if (T.kind === 'record' && T.comps.some(c => c.name === name)) return true;
  if (allMembersCalled(T, name)) return true;
  if (T.anns.some(a => ['Getter', 'Setter', 'Data'].includes(a.name))) return true;
  const sups = [T.extName, ...T.impls].filter(Boolean);
  for (const s of sups) {
    if (REPO_BASES.test(s) || s === 'Repository') { if (REPO_METHODS.has(name) || /^(findBy|existsBy|countBy|deleteBy|readBy|getBy|queryBy|findAllBy|findFirstBy|findTopBy)/.test(name)) return true; continue; }
    const S = model.types.get(s);
    if (S && depth < 8) { if (hasMethod(model, S, name, depth + 1)) return true; } else return true; // 외부 상위 타입은 판단 불가 → 허용
  }
  return false;
}

Object.assign(IDE, { buildModel, allMembersCalled, hasMethod });
})();
