/* memo/core.js — 암기/시험 공통: 데이터 가공 · 진행도(localStorage) · 유틸 */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 불가 환경 */ } },
};

const ANNS = ANN.map(([name, cat, desc, code]) => ({ name, cat, desc, code }));
const ANN_MAP = Object.fromEntries(ANNS.map(a => [a.name, a]));
const known = new Set(store.get('sb4.known', []));   // 외운 어노테이션
const wrong = new Set(store.get('sb4.wrong', []));   // 오답노트(문제 인덱스)
const saveKnown = () => { store.set('sb4.known', [...known]); IDE.bus?.emit('memo'); };
const saveWrong = () => { store.set('sb4.wrong', [...wrong]); IDE.bus?.emit('memo'); };

const blank = a => a.code.replace(new RegExp('@' + a.name + '\\b'), '@_____');
const codeHtml = src => IDE.highlight.lines(src, 'x.java').join('\n');

IDE.memo = Object.assign(IDE.memo || {}, { esc, shuffle, store, ANNS, ANN_MAP, known, wrong, saveKnown, saveWrong, blank, codeHtml });
})();
