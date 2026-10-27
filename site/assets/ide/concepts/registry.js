/* ide/concepts/registry.js — 개념 탭 목록. kind: 'scene'(코드+SVG 애니메이션) | 'doc'(정적 문서) */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});

const LIST = [
  { id: 'welcome', kind: 'doc', doc: 'welcome', title: '시작하기', icon: '🏠', group: null },
  { id: 'mvcpattern', kind: 'scene', svg: 'mvcpattern', steps: 'mvcpattern', title: 'MVC 패턴', icon: '◧', group: '핵심 개념' },
  { id: 'mvc', kind: 'scene', svg: 'mvc', steps: 'mvc', title: 'MVC 요청 흐름', icon: '⇄', group: '핵심 개념' },
  { id: 'ioc', kind: 'scene', svg: 'ioc', steps: 'ioc', title: 'IoC · DI', icon: '◉', group: '핵심 개념' },
  { id: 'life', kind: 'scene', svg: 'life', steps: 'life', title: '빈 생명주기', icon: '↻', group: '핵심 개념' },
  { id: 'aop', kind: 'scene', svg: 'aop', steps: 'aop', title: 'AOP', icon: '◈', group: '핵심 개념' },
  { id: 'psa', kind: 'scene', svg: 'psa', steps: 'psa', title: 'PSA', icon: '⇋', group: '핵심 개념' },
  { id: 'boot', kind: 'scene', svg: 'boot', steps: 'boot', title: '부트 시작 · 자동 설정', icon: '⏻', group: '흐름' },
  { id: 'flow', kind: 'scene', svg: 'flow', steps: 'flow', title: 'POST 계층 흐름', icon: '⇉', group: '흐름' },
  { id: 'boot4', kind: 'doc', doc: 'boot4', title: 'Boot 4 변경점', icon: '4', group: '정리' },
  { id: 'cheat', kind: 'doc', doc: 'cheat', title: '시험 직전 요약표', icon: '≡', group: '정리' },
];
const get = id => LIST.find(c => c.id === id);
const PREFIX = 'concept:';
const isConcept = p => typeof p === 'string' && p.startsWith(PREFIX) && !!get(p.slice(PREFIX.length));
const fromPath = p => get(p.slice(PREFIX.length));

Object.assign(IDE, { concepts: { LIST, get, isConcept, fromPath, PREFIX } });
})();
