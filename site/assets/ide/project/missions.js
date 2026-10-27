/* project/missions.js — 순서대로 따라 하면 스프링이 익숙해지는 10개 미션 + 자동 채점.
   state = session: { started, responses[], aspectHit, txHit, tests }  (tests = IDE.runTests 결과) */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const J = 'src/main/java/com/example/blog/', TT = 'src/test/java/com/example/blog/';

const jsonOf = r => { try { return JSON.parse(r.body); } catch { return null; } };
const find = (s, f) => s.responses.some(f);
const passed = (s, cls, m) => !!s.tests && s.tests.results.some(r => r.cls === cls && r.method === m && r.status === 'pass');

const MISSIONS = [
  { id: 'm1', stage: '1단계 · IoC / DI', title: '스프링이 PostService 를 알게 하기',
    goal: '▶ Run 했을 때 "Started BlogApplication" 이 나오게 하세요. 컨테이너가 모르는 클래스는 주입할 수 없습니다.',
    hints: ['콘솔의 APPLICATION FAILED TO START 를 읽어 보세요.', 'PostController 의 생성자가 PostService 타입 빈을 못 찾았다는 뜻입니다.', 'PostService 에 스테레오타입 어노테이션 @Service 를 붙이세요 (입력하면 자동완성·자동 import).'],
    target: { file: J + 'service/PostService.java', find: 'TODO 미션 1' }, study: 'concept:ioc', check: s => s.started },
  { id: 'm2', stage: '2단계 · MVC 조회 (Read)', title: '조회 요청이 컨트롤러까지 가는 길',
    goal: 'requests.http 2번(▶)을 보내 200 + 게시글 JSON 을 받으세요. 콘솔의 Hibernate SQL 로그도 확인해 보세요.',
    hints: ['앱이 켜져 있어야 합니다 (먼저 Run).', '요청 왼쪽 초록 ▶ 또는 Ctrl+Enter.', '개념 탭 "MVC 요청 흐름" 의 DispatcherServlet → HandlerMapping → Controller 순서를 떠올려 보세요.'],
    target: { file: 'requests.http', find: '### 2.' }, study: 'concept:mvc', check: s => find(s, r => r.method === 'GET' && /^\/api\/posts\/\d+$/.test(r.path) && r.status === 200 && jsonOf(r)?.id != null) },
  { id: 'm3', stage: '3단계 · 생성 (Create)', title: '생성 성공은 201 Created',
    goal: '3번 요청이 200 이 아니라 201 로 응답하게 하세요.',
    hints: ['응답 상태 코드를 지정하는 어노테이션은?', '@ResponseStatus(HttpStatus.CREATED) 를 create 메서드에.', '수정 후에는 ⟳ Rerun 해야 반영됩니다.'],
    target: { file: J + 'controller/PostController.java', find: 'TODO 미션 3' }, study: 'concept:flow', check: s => find(s, r => r.method === 'POST' && r.path === '/api/posts' && r.status === 201) },
  { id: 'm4', stage: '3단계 · 생성 (Create)', title: '잘못된 입력은 400 으로 막기',
    goal: '4번(빈 제목) 요청이 400 으로 응답하게 하세요. DTO 의 @NotBlank 는 이미 있는데 왜 통과할까요?',
    hints: ['DTO 에 제약조건이 있어도 컨트롤러가 검증을 "요청"하지 않으면 무시됩니다.', '@RequestBody 앞에 @Valid.', '수정(PUT) 메서드와 비교해 보세요.'],
    target: { file: J + 'controller/PostController.java', find: 'TODO 미션 4' }, study: 'concept:flow', check: s => find(s, r => r.method === 'POST' && r.path === '/api/posts' && r.status === 400) },
  { id: 'm5', stage: '4단계 · 수정 · 삭제', title: '수정(Update) 후 다시 조회해 보기',
    goal: '5번(PUT)을 보낸 뒤 2번(GET)을 다시 보내 제목이 바뀐 것을 확인하세요. 변경 감지로 DB 에 반영됩니다.',
    hints: ['PUT 응답은 200 + 바뀐 JSON.', '같은 id 를 GET 하면 바뀐 제목이 나와야 합니다.', 'PostService.update 의 post.change(...) 가 엔티티를 바꿉니다.'],
    target: { file: 'requests.http', find: '### 5.' }, study: 'concept:flow',
    check: s => { const put = s.responses.find(r => r.method === 'PUT' && r.status === 200 && jsonOf(r)?.title); if (!put) return false; const id = put.path.split('/').pop(), t = jsonOf(put).title; return s.responses.some(r => r.method === 'GET' && r.path === '/api/posts/' + id && r.status === 200 && jsonOf(r)?.title === t); } },
  { id: 'm6', stage: '4단계 · 수정 · 삭제', title: '삭제(Delete) → 204 No Content',
    goal: 'DELETE /api/posts/{id} 를 직접 만들어 6번 요청이 204 로 응답하게 하세요. (Service → Controller 순서)',
    hints: ['서비스에 delete(Long id) 가 없으면 컨트롤러에서 호출할 때 빨간 줄이 생깁니다.', '서비스: postRepository.deleteById(id);', '컨트롤러: @DeleteMapping("/{id}") + @ResponseStatus(HttpStatus.NO_CONTENT) + @PathVariable'],
    target: { file: J + 'service/PostService.java', find: 'TODO 미션 6' }, study: 'concept:mvc', check: s => find(s, r => r.method === 'DELETE' && /^\/api\/posts\/\d+$/.test(r.path) && r.status === 204) },
  { id: 'm7', stage: '5단계 · 트랜잭션 (PSA)', title: '서비스 메서드를 트랜잭션으로 묶기',
    goal: '쓰기 요청(3·5·6번)을 보냈을 때 콘솔에 "Creating new transaction" 로그가 보이게 하세요.',
    hints: ['@Transactional 은 AOP 프록시 + PlatformTransactionManager(PSA) 가 만드는 기능입니다.', '클래스에는 @Transactional(readOnly = true), 쓰기 메서드(create/update/delete)에는 @Transactional.', '수정 후 Rerun → 3번 요청 → 콘솔의 DEBUG 로그 확인.'],
    target: { file: J + 'service/PostService.java', find: 'TODO 미션 7' }, study: 'concept:psa', check: s => s.txHit },
  { id: 'm8', stage: '6단계 · AOP', title: 'Aspect 를 동작시키기',
    goal: '서비스 호출 시 LogAspect 의 ▶ ◀ 로그가 콘솔에 보이게 하세요.',
    hints: ['@Aspect 만으로는 부족합니다. 스프링이 관리하는 빈이어야 프록시가 만들어집니다.', 'LogAspect 에 @Component. (Rerun 필요)', '개념 탭 "AOP" 의 호출 순서(Around → Before → 대상 …)를 로그와 비교해 보세요.'],
    target: { file: J + 'aop/LogAspect.java', find: 'TODO 미션 8' }, study: 'concept:aop', check: s => s.aspectHit },
  { id: 'm9', stage: '7단계 · 테스트', title: '@WebMvcTest 가 뜨게 만들기',
    goal: '🧪 테스트 실행(툴바) 후 PostControllerTest 의 list · get 테스트가 초록불이 되게 하세요.',
    hints: ['@WebMvcTest 는 웹 계층만 로드하므로 PostService 빈이 없습니다 → 컨텍스트 로딩 실패.', '필드에 @MockitoBean 을 붙여 가짜 빈을 등록하세요 (Boot 4: @MockBean 대체).', '테스트의 given(...).willReturn(...) 은 가짜 서비스가 돌려줄 값을 정합니다.'],
    target: { file: TT + 'controller/PostControllerTest.java', find: 'TODO 미션 9' }, study: 'concept:testing', check: s => passed(s, 'PostControllerTest', 'list') && passed(s, 'PostControllerTest', 'get') },
  { id: 'm10', stage: '7단계 · 테스트', title: '모든 테스트 통과 (전부 초록불)',
    goal: '14개 테스트가 모두 통과하게 하세요. 테스트는 앞에서 만든 기능의 "인수 조건" 입니다.',
    hints: ['실패한 테스트의 메시지를 읽고 어떤 미션과 연결되는지 찾아보세요.', 'create → 201(미션 3), create_invalid → 400(미션 4), delete → 204(미션 6).', 'contextLoads 실패는 미션 1.'],
    target: { file: TT + 'controller/PostControllerTest.java', find: 'class PostControllerTest' }, study: 'concept:testing', check: s => !!s.tests && s.tests.results.length >= 14 && s.tests.summary.fail === 0 && s.tests.summary.skip === 0 },
];

Object.assign(IDE, { MISSIONS });
})();
