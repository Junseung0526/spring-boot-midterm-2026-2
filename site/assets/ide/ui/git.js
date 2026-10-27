/* ui/git.js — Git 시뮬레이션: 변경 파일 색상 · Commit 도구창 · Diff 보기 · 로그 · Push (실제 git 이 아니라 화면 재현) */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { state, store, bus, highlight } = IDE;
const esc = highlight.esc;

/* ── 상태 ── */
function status(path) {
  const base = state.git.base;
  if (!(path in state.files)) return '';
  if (!(path in base)) return 'A';
  return state.files[path] !== base[path] ? 'M' : '';
}
const changes = () => Object.keys(state.files).map(p => ({ path: p, st: status(p) })).filter(x => x.st).sort((a, b) => a.path.localeCompare(b.path));
const rand7 = () => Array.from({ length: 7 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
function commit(paths, msg) {
  paths.forEach(p => { state.git.base[p] = state.files[p]; });
  state.git.commits.unshift({ id: rand7(), msg, time: Date.now(), files: paths.length });
  store.save(); bus.emit('git');
}
const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? '방금' : m < 60 ? m + '분 전' : Math.round(m / 60) + '시간 전'; };

/* ── Diff (줄 단위 LCS) ── */
function diff(a, b) {
  const A = a.split('\n'), B = b.split('\n'), n = A.length, m = B.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < n && j < m) { if (A[i] === B[j]) { out.push([' ', A[i]]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) out.push(['-', A[i++]]); else out.push(['+', B[j++]]); }
  while (i < n) out.push(['-', A[i++]]); while (j < m) out.push(['+', B[j++]]);
  return out;
}
function showDiff(path) {
  let el = document.getElementById('diffview');
  if (!el) { el = document.createElement('div'); el.id = 'diffview'; document.body.appendChild(el); }
  const old = state.git.base[path] ?? '', now = state.files[path] ?? '';
  const d = diff(old, now), keep = new Set();
  d.forEach((x, i) => { if (x[0] !== ' ') for (let k = Math.max(0, i - 3); k <= Math.min(d.length - 1, i + 3); k++) keep.add(k); });
  let ln = 0, rows = '', prev = -2;
  d.forEach((x, i) => { if (x[0] !== '+') ln++; if (!keep.has(i)) return; if (i !== prev + 1) rows += '<div class="dh">⋯</div>'; prev = i; rows += `<div class="dl ${x[0] === '+' ? 'add' : x[0] === '-' ? 'del' : ''}"><i>${x[0] === '+' ? '' : ln}</i><b>${x[0] === ' ' ? '' : x[0]}</b><span>${esc(x[1]) || ' '}</span></div>`; });
  const adds = d.filter(x => x[0] === '+').length, dels = d.filter(x => x[0] === '-').length;
  el.hidden = false;
  el.innerHTML = `<div class="dbox"><div class="dt"><b>${esc(path.split('/').pop())}</b> <small>${esc(path)}</small><span class="dstat"><em class="a">+${adds}</em> <em class="d">−${dels}</em></span><button data-x>✕</button></div><div class="dbody">${rows || '<div class="dh">변경 없음</div>'}</div></div>`;
  el.onclick = e => { if (e.target === el || e.target.closest('[data-x]')) el.hidden = true; };
}

/* ── Commit 도구창 ── */
function create(host, toast) {
  const off = new Set(); let msg = '';          // 사용자가 직접 체크 해제한 파일 (나머지 변경은 항상 선택됨 — IntelliJ 와 동일)
  const selected = ch => ch.filter(c => !off.has(c.path)).map(c => c.path);
  const suggest = () => { const done = IDE.MISSIONS.filter(m => state.done.has(m.id)); const last = done[done.length - 1]; return last ? `feat: ${last.title}` : 'chore: 코드 수정'; };
  function draw() {
    const ch = changes(); [...off].forEach(p => { if (!ch.some(c => c.path === p)) off.delete(p); });
    const sel = new Set(selected(ch));
    if (!msg && ch.length) msg = suggest();
    const unpushed = Math.max(0, state.git.commits.length - state.git.pushed);
    host.innerHTML = `<div class="gh"><b>Changes</b> <span class="gcount">${ch.length}</span><span class="gsp"></span><button data-sel-all>${sel.size === ch.length && ch.length ? '전체 해제' : '전체 선택'}</button></div>
      <div class="gfiles">${ch.length ? ch.map(c => `<label class="gf" data-diff="${c.path}"><input type="checkbox" data-path="${c.path}" ${sel.has(c.path) ? 'checked' : ''}><i class="gst ${c.st}">${c.st}</i><span class="gn">${esc(c.path.split('/').pop())}</span><small>${esc(c.path.replace(/^src\/(main|test)\/java\/com\/example\/blog\//, '').replace(/[^/]*$/, ''))}</small></label>`).join('') : '<div class="gempty">변경된 파일이 없습니다 ✔ (working tree clean)</div>'}</div>
      <textarea id="gmsg" rows="3" placeholder="커밋 메시지">${esc(msg)}</textarea>
      <div class="gbtns"><button class="gc" data-commit ${ch.length ? '' : 'disabled'}>Commit${sel.size ? ' (' + sel.size + ')' : ''}</button><button data-push ${unpushed ? '' : 'disabled'}>Push${unpushed ? ' ↑' + unpushed : ''}</button></div>
      <div class="gh"><b>Log</b> <small>⎇ ${esc(state.git.branch)}</small></div>
      <div class="glog">${state.git.commits.map((c, i) => `<div class="gl1"><i class="gdot ${i < unpushed ? 'up' : ''}"></i><div><b>${esc(c.msg)}</b><small>${c.id} · ${c.files}개 파일 · ${ago(c.time)}${i < unpushed ? ' · push 안 됨' : ''}</small></div></div>`).join('')}</div>`;
    const b = document.getElementById('btn-branch'); if (b) b.querySelector('.bn').innerHTML = `${esc(state.git.branch)}${ch.length ? ' <i class="gdirty" title="커밋하지 않은 변경 ' + ch.length + '개"></i>' : ''}`;
    const sb = document.getElementById('st-git'); if (sb) sb.innerHTML = `⎇ ${esc(state.git.branch)}${ch.length ? ' · ' + ch.length + '개 변경' : ''}`;
  }
  host.addEventListener('click', e => {
    const cb = e.target.closest('input[data-path]');
    if (cb) { cb.checked ? off.delete(cb.dataset.path) : off.add(cb.dataset.path); msg = host.querySelector('#gmsg').value; draw(); return; }
    if (e.target.closest('[data-sel-all]')) { const ch = changes(); msg = host.querySelector('#gmsg').value; if (selected(ch).length === ch.length) ch.forEach(c => off.add(c.path)); else off.clear(); draw(); return; }
    const f = e.target.closest('[data-diff]'); if (f && !e.target.closest('input')) { e.preventDefault(); showDiff(f.dataset.diff); return; }
    if (e.target.closest('[data-commit]')) {
      const m = host.querySelector('#gmsg').value.trim();
      if (!m) { toast('커밋 메시지를 입력하세요'); return; }
      const picked = selected(changes());
      if (!picked.length) { toast('커밋할 파일을 선택하세요'); return; }
      const n = picked.length; commit(picked, m); off.clear(); msg = ''; toast(`✔ Commit 완료 — ${n}개 파일 (${state.git.commits[0].id})`); return;
    }
    if (e.target.closest('[data-push]')) { state.git.pushed = state.git.commits.length; store.save(); bus.emit('git'); toast('origin/main 으로 push 했습니다 (시뮬레이션)'); }
  });
  host.addEventListener('input', e => { if (e.target.id === 'gmsg') msg = e.target.value; });
  ['edit', 'reset', 'git', 'session'].forEach(ev => bus.on(ev, () => { if (!host.contains(document.activeElement) || document.activeElement.tagName !== 'TEXTAREA') draw(); }));
  draw();
  return { draw };
}
Object.assign(IDE, { git: { status, changes, commit, showDiff } , Git: { create } });
})();
