/* ui/editor.js — IntelliJ 스타일 코드 에디터 (textarea + 구문강조 오버레이, 자동완성, 자동 import, 자동 괄호/들여쓰기) */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { highlight } = IDE;
const LH = 20, INDENT = '    ';

function create(host, hooks) {
  host.innerHTML = `<div class="scr"><div class="gut"></div><div class="code"><pre class="hl" aria-hidden="true"></pre><textarea class="ta" spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off" aria-label="코드 에디터"></textarea><div class="ac" hidden></div></div></div>`;
  const $ = s => host.querySelector(s);
  const scr = $('.scr'), gut = $('.gut'), hl = $('.hl'), ta = $('.ta'), ac = $('.ac');
  let file = '', errs = new Map(), runLines = [], items = [], sel = 0, charW = 7.8;
  const measure = () => { const s = document.createElement('span'); s.className = 'hl'; s.style.cssText = 'position:absolute;visibility:hidden;white-space:pre'; s.textContent = 'M'.repeat(50); host.appendChild(s); charW = s.getBoundingClientRect().width / 50 || charW; s.remove(); };

  function render() {
    const lines = highlight.lines(ta.value, file, errs);
    hl.innerHTML = lines.map(l => l || ' ').join('\n') + '\n ';
    gut.innerHTML = lines.map((_, i) => {
      const n = i + 1, e = errs.has(n) ? '<i class="gerr" title="' + highlight.escAttr(errs.get(n)) + '"></i>' : '';
      return `<div class="gl">${(() => { const rl = runLines.find(x => x.line === n); return rl ? `<b class="grun ${rl.state || ''}" data-line="${n}" title="${highlight.escAttr(rl.title || '실행')}">${{ pass: '✔', fail: '✖', skip: '⚠' }[rl.state] || '▶'}</b>` : ''; })()}${e}<span>${n}</span></div>`;
    }).join('');
    ta.style.height = hl.offsetHeight + 'px';
  }

  /* ── 텍스트 편집 도우미 (undo 스택 유지를 위해 execCommand 사용) ── */
  function ins(text, a = ta.selectionStart, b = ta.selectionEnd) {
    ta.focus(); ta.setSelectionRange(a, b);
    if (!document.execCommand('insertText', false, text)) { ta.setRangeText(text, a, b, 'end'); ta.dispatchEvent(new Event('input', { bubbles: true })); }
  }
  const lineBounds = (pos = ta.selectionStart) => { const v = ta.value; const s = v.lastIndexOf('\n', pos - 1) + 1; let e = v.indexOf('\n', pos); if (e < 0) e = v.length; return [s, e]; };
  const caretLC = () => { const b = ta.value.slice(0, ta.selectionStart).split('\n'); return [b.length, b[b.length - 1].length + 1]; };

  /* ── 자동완성 ── */
  const hasImport = (pkg, name) => new RegExp('^import\\s+' + pkg.replace(/\./g, '\\.') + '\\.(\\*|' + name + ')\\s*;', 'm').test(ta.value);
  function candidates() {
    if (!/\.java$/.test(file)) return [];
    const before = ta.value.slice(0, ta.selectionStart);
    const am = /@([A-Za-z]*)$/.exec(before);
    const ann = typeof ANN !== 'undefined' ? Object.fromEntries(ANN.map(a => [a[0], a[2]])) : {};
    if (am) {
      const p = am[1].toLowerCase();
      return Object.keys(IDE.ANN_PKG).filter(n => n.toLowerCase().startsWith(p)).concat(Object.keys(IDE.ANN_PKG).filter(n => !n.toLowerCase().startsWith(p) && n.toLowerCase().includes(p) && p.length > 1))
        .slice(0, 8).map(n => ({ label: n, ins: '@' + n, tokenLen: am[1].length + 1, pkg: IDE.ANN_PKG[n], name: n, doc: (ann[n] || '').slice(0, 60), icon: '@' }));
    }
    const tm = /\b([A-Z][A-Za-z]+)$/.exec(before);
    if (tm && tm[1].length >= 2) return Object.keys(IDE.TYPE_PKG).filter(n => n.startsWith(tm[1]) && n !== tm[1]).slice(0, 6).map(n => ({ label: n, ins: n, tokenLen: tm[1].length, pkg: IDE.TYPE_PKG[n], name: n, doc: '', icon: 'C' }));
    return [];
  }
  function showAc(force) {
    items = candidates();
    if (force && !items.length) items = [];
    if (!items.length) { ac.hidden = true; return; }
    sel = 0;
    const [ln, col] = caretLC();
    ac.style.top = (ln * LH + 2) + 'px'; ac.style.left = (8 + (col - 1 - (items[0].tokenLen || 0)) * charW) + 'px';
    drawAc(); ac.hidden = false;
  }
  const drawAc = () => { ac.innerHTML = items.map((it, i) => `<div class="aci ${i === sel ? 'on' : ''}" data-i="${i}"><span class="ico ${it.icon === '@' ? 'ia' : 'ic'}">${it.icon}</span><b>${it.label}</b><small>${it.pkg}</small>${it.doc ? `<em>${highlight.esc(it.doc)}</em>` : ''}</div>`).join(''); };
  function acceptAc(i = sel) {
    const it = items[i]; if (!it) return; ac.hidden = true;
    const pos = ta.selectionStart;
    ins(it.ins, pos - it.tokenLen, pos);
    if (!hasImport(it.pkg, it.name) && !it.pkg.startsWith('java.lang')) {
      const v = ta.value, im = [...v.matchAll(/^import\s[^\n]*\n/gm)], line = `import ${it.pkg}.${it.name};\n`;
      const caret = ta.selectionStart; let at;
      if (im.length) { const last = im[im.length - 1]; at = last.index + last[0].length; ins(line, at, at); }
      else { const pm = /^package\s[^\n]*\n/m.exec(v); at = pm ? pm.index + pm[0].length : 0; const t = (pm ? '\n' : '') + line; ins(t, at, at); ta.setSelectionRange(caret + t.length, caret + t.length); return; }
      ta.setSelectionRange(caret + line.length, caret + line.length);
    }
  }

  /* ── 키 입력 ── */
  const PAIRS = { '(': ')', '{': '}', '[': ']', '"': '"' };
  ta.addEventListener('keydown', e => {
    const k = e.key, mod = e.ctrlKey || e.metaKey;
    if (!ac.hidden) {
      if (k === 'ArrowDown') { sel = (sel + 1) % items.length; drawAc(); e.preventDefault(); return; }
      if (k === 'ArrowUp') { sel = (sel - 1 + items.length) % items.length; drawAc(); e.preventDefault(); return; }
      if (k === 'Enter' || k === 'Tab') { acceptAc(); e.preventDefault(); return; }
      if (k === 'Escape') { ac.hidden = true; e.preventDefault(); return; }
    }
    if (k === ' ' && e.ctrlKey) { e.preventDefault(); showAc(true); return; }
    if (k === 'F10' && e.shiftKey) { e.preventDefault(); hooks.onRun?.(); return; }
    if (k === 'Enter' && mod) { if (/\.http$/.test(file)) { e.preventDefault(); hooks.onSend?.(caretLC()[0]); } return; }
    if (mod && k.toLowerCase() === 's') { e.preventDefault(); hooks.onSave?.(); return; }
    if (mod && k === '/') { e.preventDefault(); toggleComment(); return; }
    if (mod && k.toLowerCase() === 'd') { e.preventDefault(); const [s, en] = lineBounds(); const t = ta.value.slice(s, en); ins('\n' + t, en, en); return; }
    if (mod && k.toLowerCase() === 'y') { e.preventDefault(); const [s, en] = lineBounds(); ins('', s, Math.min(en + 1, ta.value.length)); return; }
    if (k === 'Tab') {
      e.preventDefault();
      const a = ta.selectionStart, b = ta.selectionEnd;
      if (e.shiftKey || a !== b) return reindent(e.shiftKey);
      ins(INDENT); return;
    }
    if (k === 'Enter') {
      e.preventDefault();
      const v = ta.value, s = ta.selectionStart, [ls] = lineBounds(s);
      const ind = /^[ \t]*/.exec(v.slice(ls, s))[0], prev = v[s - 1], next = v[s];
      if (prev === '{' && next === '}') { const t = `\n${ind}${INDENT}\n${ind}`; ins(t); const p = s + 1 + ind.length + INDENT.length; ta.setSelectionRange(p, p); }
      else ins('\n' + ind + (prev === '{' ? INDENT : ''));
      return;
    }
    if (k === 'Backspace' && ta.selectionStart === ta.selectionEnd) {
      const s = ta.selectionStart, p = ta.value[s - 1], n = ta.value[s];
      if (p && PAIRS[p] === n) { e.preventDefault(); ins('', s - 1, s + 1); return; }
    }
    if (e.altKey || mod || k.length !== 1) return;
    const s = ta.selectionStart, n = ta.value[s], p = ta.value[s - 1];
    if (')}]"'.includes(k) && n === k && ta.selectionStart === ta.selectionEnd) { e.preventDefault(); ta.setSelectionRange(s + 1, s + 1); return; }
    if (PAIRS[k] && ta.selectionStart === ta.selectionEnd) {
      if (k === '"' && /\w/.test(p || '')) return;
      e.preventDefault(); ins(k + PAIRS[k]); ta.setSelectionRange(s + 1, s + 1);
    }
  });
  function reindent(out) {
    const v = ta.value; let [a, b] = [ta.selectionStart, ta.selectionEnd];
    const s = v.lastIndexOf('\n', a - 1) + 1; let e = v.indexOf('\n', b); if (e < 0) e = v.length;
    const block = v.slice(s, e).split('\n').map(l => out ? l.replace(/^( {1,4}|\t)/, '') : INDENT + l).join('\n');
    ins(block, s, e); ta.setSelectionRange(s, s + block.length);
  }
  function toggleComment() {
    const mark = /\.(ya?ml|http)$/.test(file) ? '# ' : '// ';
    const v = ta.value, a = ta.selectionStart, b = ta.selectionEnd;
    const s = v.lastIndexOf('\n', a - 1) + 1; let e = v.indexOf('\n', b > a ? b - 1 : b); if (e < 0) e = v.length;
    const ls = v.slice(s, e).split('\n'), all = ls.every(l => !l.trim() || l.trim().startsWith(mark.trim()));
    const out = ls.map(l => !l.trim() ? l : all ? l.replace(mark.trim() + ' ', '').replace(mark.trim(), '') : l.replace(/^(\s*)/, '$1' + mark)).join('\n');
    ins(out, s, e); ta.setSelectionRange(s, s + out.length);
  }

  ta.addEventListener('input', () => { render(); hooks.onChange?.(ta.value); showAc(false); });
  const caretEvt = () => { hooks.onCaret?.(...caretLC()); if (!ac.hidden && ['ArrowLeft', 'ArrowRight'].length) { /* 이동 시 닫기는 keyup 에서 */ } };
  ta.addEventListener('click', () => { ac.hidden = true; caretEvt(); });
  ta.addEventListener('keyup', e => { if (e.key.startsWith('Arrow') && ac.hidden) caretEvt(); else if (e.key.startsWith('Arrow')) { /* 목록 이동 */ } else caretEvt(); });
  ta.addEventListener('blur', () => setTimeout(() => { ac.hidden = true; }, 150));
  ac.addEventListener('mousedown', e => { const r = e.target.closest('.aci'); if (r) { e.preventDefault(); acceptAc(+r.dataset.i); } });
  gut.addEventListener('click', e => { const r = e.target.closest('.grun'); if (r) hooks.onSend?.(+r.dataset.line); });

  measure();
  return {
    setFile(name, text) { file = name; ta.value = text; errs = new Map(); render(); ac.hidden = true; scr.scrollTop = 0; scr.scrollLeft = 0; },
    setProblems(map) { errs = map; render(); },
    setRunLines(l) { runLines = l.map(x => (typeof x === 'number' ? { line: x } : x)); render(); },
    focus() { ta.focus(); },
    /** 해당 줄을 잠시 노랗게 번쩍여 "여기를 보세요" 를 알려 준다 */
    flash(line) { host.querySelectorAll('.flashline').forEach(n => n.remove()); const d = document.createElement('div'); d.className = 'flashline'; d.style.top = (line - 1) * LH + 'px'; $('.code').appendChild(d); setTimeout(() => d.remove(), 3200); },
    goto(line) { const v = ta.value.split('\n'); let off = 0; for (let i = 0; i < line - 1; i++) off += v[i].length + 1; ta.focus(); ta.setSelectionRange(off, off); scr.scrollTop = Math.max(0, (line - 6) * LH); caretEvt(); },
    value: () => ta.value,
  };
}
Object.assign(IDE, { Editor: { create } });
})();
