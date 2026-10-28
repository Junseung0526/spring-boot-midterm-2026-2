/* ide/concepts/registry.js — 개념 탭 목록. kind: 'scene'(코드+SVG 애니메이션) | 'doc'(정적 문서) */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});

const LIST = [
  { id: 'welcome', kind: 'doc', doc: 'welcome', title: '시작하기', icon: '⌂', group: null },
  { id: 'mvcpattern', kind: 'scene', svg: 'mvcpattern', steps: 'mvcpattern', title: 'MVC 패턴', icon: '◧', group: '핵심 개념', tag: 'MVC', practice: { file: 'src/main/java/com/example/blog/controller/BlogApiController.java', label: '미션 7 — 컨트롤러 매핑 빈칸 채우기' } },
  { id: 'mvc', kind: 'scene', svg: 'mvc', steps: 'mvc', title: 'MVC 요청 흐름', icon: '⇄', group: '핵심 개념', tag: 'MVC', practice: { file: 'requests.http', label: 'requests.http 로 요청을 직접 보내 보기 (먼저 ▶ Run)' } },
  { id: 'ioc', kind: 'scene', svg: 'ioc', steps: 'ioc', title: 'IoC · DI', icon: '◉', group: '핵심 개념', tag: 'IoC/DI', practice: { file: 'src/main/java/com/example/blog/service/BlogService.java', label: '미션 5 — BlogService 빈 등록 · 생성자 주입 빈칸' } },
  { id: 'life', kind: 'scene', svg: 'life', steps: 'life', title: '빈 생명주기', icon: '↻', group: '핵심 개념', tag: 'IoC/DI', practice: { file: 'src/main/java/com/example/blog/aop/LogAspect.java', label: 'LogAspect 를 보며 프록시가 만들어지는 시점 떠올리기' } },
  { id: 'aop', kind: 'scene', svg: 'aop', steps: 'aop', title: 'AOP', icon: '◈', group: '핵심 개념', tag: 'AOP', practice: { file: 'src/main/java/com/example/blog/aop/LogAspect.java', label: '미션 18 — LogAspect 빈칸 채우고 콘솔 로그 확인' } },
  { id: 'psa', kind: 'scene', svg: 'psa', steps: 'psa', title: 'PSA', icon: '⇋', group: '핵심 개념', tag: 'PSA', practice: { file: 'src/main/java/com/example/blog/service/BlogService.java', label: '미션 11~13 — 트랜잭션 빈칸과 변경 감지 해석' } },
  { id: 'testing', kind: 'scene', svg: 'testing', steps: 'testing', title: '테스트 (슬라이스)', icon: '✓', group: '핵심 개념', tag: 'Boot 4', practice: { file: 'src/test/java/com/example/blog/controller/BlogApiControllerTest.java', label: '미션 14~16 — 테스트 어노테이션 빈칸' } },
  { id: 'boot', kind: 'scene', svg: 'boot', steps: 'boot', title: '부트 시작 · 자동 설정', icon: '⏻', group: '흐름', tag: 'IoC/DI', practice: { file: 'src/main/java/com/example/blog/BlogApplication.java', label: 'BlogApplication 의 @SpringBootApplication 확인' } },
  { id: 'flow', kind: 'scene', svg: 'flow', steps: 'flow', title: 'POST 계층 흐름', icon: '⇉', group: '흐름', tag: 'MVC', practice: { file: 'src/main/java/com/example/blog/controller/BlogApiController.java', label: '미션 8 — POST 를 201 Created 로 만들기' } },
  { id: 'boot4', kind: 'doc', doc: 'boot4', title: 'Boot 4 변경점', icon: '4', group: '정리' },
  { id: 'cheat', kind: 'doc', doc: 'cheat', title: '시험 직전 요약표', icon: '≡', group: '정리' },
];
const get = id => LIST.find(c => c.id === id);
const nextScene = id => { const sc = LIST.filter(c => c.kind === 'scene'); const i = sc.findIndex(c => c.id === id); return i >= 0 ? sc[i + 1] || null : null; };

/* 끝까지 본 개념 (localStorage) — 목록과 시작 화면에 ✓ 로 표시 */
const SEEN_KEY = 'sb4.seen';
const seen = new Set((() => { try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || []; } catch { return []; } })());
const markSeen = id => { if (seen.has(id)) return; seen.add(id); try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen])); } catch { /* 무시 */ } IDE.bus?.emit('seen'); };
const PREFIX = 'concept:';
const isConcept = p => typeof p === 'string' && p.startsWith(PREFIX) && !!get(p.slice(PREFIX.length));
const fromPath = p => get(p.slice(PREFIX.length));

/* 애니메이션을 한 번이라도 열어 봤는지 — 열기 전까지 버튼이 반짝여 존재를 알린다 */
const OPEN_KEY = 'sb4.opened';
let openedFlag = false; try { openedFlag = localStorage.getItem(OPEN_KEY) === '1'; } catch { /* 무시 */ }
const isOpened = () => openedFlag;
const markOpened = () => { if (openedFlag) return; openedFlag = true; try { localStorage.setItem(OPEN_KEY, '1'); } catch { /* 무시 */ } IDE.bus?.emit('opened'); };

Object.assign(IDE, { concepts: { LIST, get, isConcept, fromPath, PREFIX, nextScene, seen, markSeen, isOpened, markOpened } });
})();
