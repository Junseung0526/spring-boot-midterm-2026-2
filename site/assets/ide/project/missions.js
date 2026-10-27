/* project/missions.js — 미션 정의와 자동 채점 조건 (state: { started, responses[], aspectHit }) */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});

const jsonOf = r => { try { return JSON.parse(r.body); } catch { return null; } };
const find = (s, f) => s.responses.some(f);

const MISSIONS = [
  { id: 'm1', title: '앱 기동 성공', goal: 'Run(▶) 했을 때 "Started BlogApplication" 이 출력되게 하세요.',
    hints: ['콘솔의 APPLICATION FAILED TO START 메시지를 읽어 보세요.', 'Description: PostController 의 생성자가 PostService 타입의 빈을 못 찾았다는 뜻입니다.', 'PostService 에 스테레오타입 어노테이션(@Service)을 붙이세요. 입력하다 보면 자동완성과 자동 import 가 도와줍니다.'],
    study: '#ioc', check: s => s.started },
  { id: 'm2', title: 'GET /api/posts/1 → 200', goal: 'requests.http 의 2번 요청(▶)이 200 과 게시글 JSON 을 돌려주게 하세요.',
    hints: ['앱이 켜져 있어야 합니다 (Run). 요청 왼쪽 초록 ▶ 를 클릭하세요.', '콘솔의 Hibernate: select … 로그도 확인해 보세요.'],
    study: '#flow', check: s => find(s, r => r.method === 'GET' && /^\/api\/posts\/\d+$/.test(r.path) && r.status === 200 && jsonOf(r)?.id != null) },
  { id: 'm3', title: 'POST 성공 → 201 Created', goal: '3번 요청이 200 이 아니라 201 로 응답하게 하세요.',
    hints: ['응답 상태 코드를 지정하는 어노테이션은?', '@ResponseStatus(HttpStatus.CREATED) 를 create 메서드에.'],
    study: '#mvc', check: s => find(s, r => r.method === 'POST' && r.path === '/api/posts' && r.status === 201) },
  { id: 'm4', title: '검증 실패 → 400', goal: '4번(빈 제목) 요청이 400 으로 응답하게 하세요. 지금은 검증 없이 통과(또는 500)합니다.',
    hints: ['DTO 에는 이미 @NotBlank 가 있습니다. 컨트롤러가 검증을 "요청"해야 합니다.', '@RequestBody 앞에 @Valid.'],
    study: '#mvc', check: s => find(s, r => r.method === 'POST' && r.path === '/api/posts' && r.status === 400) },
  { id: 'm5', title: '없는 글 → 404 + message', goal: '5번 요청이 404 와 {"message": "..."} 를 돌려주게 하세요.',
    hints: ['지금은 예외가 처리되지 않아 500 입니다. 콘솔 ERROR 로그를 보세요.', '클래스: @RestControllerAdvice, 메서드: @ExceptionHandler(…) + @ResponseStatus(HttpStatus.NOT_FOUND)'],
    study: '#mvc', check: s => find(s, r => r.method === 'GET' && /^\/api\/posts\/\d+$/.test(r.path) && r.status === 404 && jsonOf(r)?.message) },
  { id: 'm6', title: 'AOP 로그 동작', goal: '서비스 호출 시 LogAspect 의 ▶ ◀ 로그가 콘솔에 보이게 하세요.',
    hints: ['@Aspect 만으로는 부족합니다. 스프링이 관리하는 빈이어야 프록시가 만들어집니다.', 'LogAspect 에 @Component. (Run 을 다시 해야 반영됩니다)'],
    study: '#aop', check: s => s.aspectHit },
];

Object.assign(IDE, { MISSIONS });
})();
