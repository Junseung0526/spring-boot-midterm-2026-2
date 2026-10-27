/* ui/tree.js — 프로젝트 트리 (IntelliJ 의 Project 도구창) */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { state, store, bus } = IDE;
const collapsed = new Set();

function build(paths) {
  const root = { dirs: {}, files: [] };
  for (const p of paths) {
    const parts = p.split('/'); let n = root;
    parts.slice(0, -1).forEach(d => { n = (n.dirs[d] ||= { dirs: {}, files: [] }); });
    n.files.push(p);
  }
  return root;
}
const compact = (name, node) => { // 파일 없이 폴더 하나뿐인 체인은 com.example.blog 처럼 합친다
  while (name === 'com' || name.startsWith('com.')) {
    if (node.files.length || Object.keys(node.dirs).length !== 1) break;
    const k = Object.keys(node.dirs)[0]; name += '.' + k; node = node.dirs[k];
  }
  return [name, node];
};
function fileIcon(p) {
  const src = state.files[p] || '';
  if (/\.java$/.test(p)) {
    const k = /\b(interface|record|enum|class)\s+\w+/.exec(src.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, ''));
    const t = k ? k[1] : 'class';
    return `<i class="fi j-${t}">${{ interface: 'I', record: 'R', enum: 'E', class: 'C' }[t]}</i>`;
  }
  if (/\.ya?ml$/.test(p)) return '<i class="fi f-yml">⚙</i>';
  if (/\.sql$/.test(p)) return '<i class="fi f-sql">⛁</i>';
  if (/\.http$/.test(p)) return '<i class="fi f-http">≋</i>';
  if (/\.gradle$/.test(p)) return '<i class="fi f-grd">G</i>';
  return '<i class="fi">·</i>';
}
function renderNode(node, depth, path) {
  let out = '';
  const dirs = Object.entries(node.dirs).sort(([a], [b]) => a.localeCompare(b));
  for (const [dn, dnode] of dirs) {
    const [name, n] = compact(dn, dnode), key = path + '/' + name, closed = collapsed.has(key);
    out += `<div class="tr dir" style="--d:${depth}" data-dir="${key}"><span class="arrow">${closed ? '▸' : '▾'}</span><i class="fi folder">${/^src|resources$/.test(name) ? '▤' : '▣'}</i>${name}</div>`;
    if (!closed) out += renderNode(n, depth + 1, key);
  }
  for (const f of node.files.sort()) {
    const name = f.split('/').pop(), err = state.problems.some(p => p.path === f && p.sev === 'error');
    out += `<div class="tr file ${state.active === f ? 'on' : ''} ${err ? 'haserr' : ''} ${IDE.git ? ({ M: 'gm', A: 'ga' }[IDE.git.status(f)] || '') : ''}" style="--d:${depth}" data-file="${f}"><span class="arrow"></span>${fileIcon(f)}<span class="nm">${name}</span>${f in IDE.STARTER ? '' : '<small class="new">NEW</small>'}</div>`;
  }
  return out;
}
function create(host) {
  const draw = () => {
    host.innerHTML = `<div class="tr proj" style="--d:0"><span class="arrow">▾</span><i class="fi folder">▣</i><b>blog</b> <small>~/IdeaProjects/blog</small></div>` + renderNode(build(Object.keys(state.files)), 1, '');
  };
  host.addEventListener('click', e => {
    const f = e.target.closest('[data-file]'), d = e.target.closest('[data-dir]');
    if (f) store.openFile(f.dataset.file);
    else if (d) { const k = d.dataset.dir; collapsed.has(k) ? collapsed.delete(k) : collapsed.add(k); draw(); }
  });
  ['tabs', 'problems', 'reset', 'reset-tree'].forEach(ev => bus.on(ev, draw));
  host.addEventListener('contextmenu', e => { const f = e.target.closest('[data-file]'); if (f) { e.preventDefault(); IDE.NewFile.remove(f.dataset.file, m => IDE.toast?.(m)); } });
  bus.on('edit', draw);
  draw();
  return { draw };
}
Object.assign(IDE, { Tree: { create } });
})();
