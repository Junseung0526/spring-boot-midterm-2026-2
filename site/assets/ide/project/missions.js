/* project/missions.js — 순서대로 따라 하면 스프링이 익숙해지는 10개 미션 + 자동 채점.
   state = session: { started, responses[], aspectHit, txHit, tests }  (tests = IDE.runTests 결과) */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const J = 'src/main/java/com/example/blog/', TT = 'src/test/java/com/example/blog/';

const jsonOf = r => { try { return JSON.parse(r.body); } catch { return null; } };
const find = (s, f) => s.responses.some(f);
const passed = (s, cls, m) => !!s.tests && s.tests.results.some(r => r.cls === cls && r.method === m && r.status === 'pass');


/* ───────────── 현재 코드 진단 ─────────────
   diagnose(ctx) → 문자열 배열(가장 중요한 것이 앞). ctx = { files, session, server:{running,dirty}, problems, tests }
   "지금 내 코드에서 무엇이 빠졌는지"를 파서(IDE.parseJava)로 읽어 구체적으로 알려 준다. */
const SVC = J + 'service/PostService.java', CTL = J + 'controller/PostController.java', ASP = J + 'aop/LogAspect.java', CT = TT + 'controller/PostControllerTest.java';
const typeOf = (c, path) => { const t = c.files[path]; if (t == null) return null; try { return IDE.parseJava(t, path).types[0] || null; } catch { return null; } };
const annOf = (x, n) => ((x && x.anns) || []).find(a => a.name === n);
const methodOf = (t, n) => t && t.methods.find(m => m.name === n);
const importsOf = t => (t && t.unit.imports) || [];
const lastResp = (c, f) => [...c.session.responses].reverse().find(f);
const RERUN = '코드를 고쳤다면 ⟳ Rerun 해야 반영됩니다 (실행 중인 앱은 예전 코드로 동작 중).';
const needRun = c => (c.server.running ? null : '앱이 꺼져 있어요. ▶ Run 으로 먼저 앱을 시작하세요.');
const javaErr = c => { const p = c.problems.find(x => x.kind === 'java'); return p ? `컴파일 오류가 있어요 → ${p.path.split('/').pop()}:${p.line}  ${p.msg}` : null; };
const tail = (c, doneMsg, todo) => javaErr(c) || needRun(c) || (c.server.dirty ? RERUN : todo || doneMsg);
const pick = (...a) => a.filter(Boolean);

const DIAG = {
  m1: c => { const t = typeOf(c, SVC); if (!t) return ['PostService.java 를 찾을 수 없어요.'];
    if (!annOf(t, 'Service') && !annOf(t, 'Component')) return ['PostService 클래스 위에 스프링 빈 어노테이션이 없어요 → class 선언 위에 @Service 를 입력해 보세요 (자동완성에서 Enter 하면 import 도 자동으로 추가).'];
    if (!importsOf(t).some(i => /stereotype\.(Service|Component|\*)$/.test(i))) return ['@Service 는 썼지만 import org.springframework.stereotype.Service; 가 없어요 (Cannot resolve symbol 이 보일 거예요).'];
    return pick(javaErr(c), needRun(c) && '코드는 맞아요! ▶ Run 으로 앱을 시작하세요.', c.server.dirty && RERUN, c.server.running && !c.server.dirty && '앱이 정상 기동 중이에요 ✔'); },
  m2: c => { if (!c.server.running) return ['앱이 꺼져 있어요. 먼저 미션 1 을 끝내고 ▶ Run 하세요.'];
    const g = lastResp(c, r => r.method === 'GET' && /\/api\/posts\/[^/]+$/.test(r.path));
    if (!g) return ['requests.http 의 2번 요청 왼쪽 초록 ▶ 를 누르거나, 커서를 놓고 Ctrl+Enter 를 누르세요.'];
    if (g.status === 200) return ['GET 200 응답을 받았어요 ✔ 콘솔의 Hibernate select 로그도 확인해 보세요.'];
    if (g.status === 400) return ['id 가 숫자가 아니에요 → /api/posts/1 처럼 숫자로 요청하세요.'];
    return [`응답이 ${g.status} 입니다 — 콘솔의 로그와 컨트롤러 매핑(@GetMapping("/{id}"))을 확인해 보세요.`]; },
  m3: c => { const m = methodOf(typeOf(c, CTL), 'create'); if (!m) return ['PostController 에 create 메서드가 없어요.'];
    const rs = annOf(m, 'ResponseStatus');
    if (!rs) return ['create 메서드에 응답 상태를 정하는 어노테이션이 없어요 → @ResponseStatus(HttpStatus.CREATED) 를 @PostMapping 아래에 붙이세요.'];
    if (!/CREATED/.test(rs.args)) return [`@ResponseStatus 는 있지만 값이 CREATED 가 아니에요 (현재: ${rs.args}) → HttpStatus.CREATED`];
    const p = lastResp(c, r => r.method === 'POST' && r.path === '/api/posts');
    return pick(javaErr(c), needRun(c), c.server.dirty && RERUN, !p && '코드는 맞아요! requests.http 3번 요청을 보내 201 을 확인하세요.', p && p.status !== 201 && `마지막 POST 응답이 ${p.status} 예요 — Rerun 후 다시 보내 보세요.`); },
  m4: c => { const m = methodOf(typeOf(c, CTL), 'create'); if (!m) return ['PostController 에 create 메서드가 없어요.'];
    const p0 = m.params[0];
    if (!p0 || !annOf(p0, 'RequestBody')) return ['create 의 파라미터에 @RequestBody 가 필요해요.'];
    if (!annOf(p0, 'Valid') && !annOf(p0, 'Validated')) return ['DTO(PostRequest)에는 @NotBlank 가 이미 있지만, 컨트롤러가 검증을 "요청"하지 않아요 → @RequestBody 앞에 @Valid 를 붙이세요. (수정 메서드 update 와 비교해 보세요)'];
    const p = lastResp(c, r => r.method === 'POST' && r.status === 400);
    return pick(javaErr(c), needRun(c), c.server.dirty && RERUN, !p && '코드는 맞아요! requests.http 4번(빈 제목) 요청을 보내 400 을 확인하세요.'); },
  m5: c => { if (!c.server.running) return ['앱이 꺼져 있어요. ▶ Run 하세요.'];
    const put = lastResp(c, r => r.method === 'PUT');
    if (!put) return ['requests.http 5번(PUT) 요청을 보내세요.'];
    if (put.status !== 200) return [`PUT 응답이 ${put.status} 예요 — ${put.status === 400 ? '제목/내용이 비어 있지 않은지(@Valid)' : '콘솔 로그'}를 확인하세요.`];
    return ['PUT 은 성공했어요! 이제 requests.http 2번(GET)을 다시 보내 제목이 바뀌었는지 확인하세요 (변경 감지로 DB 에 반영됩니다).']; },
  m6: c => { const svc = typeOf(c, SVC), ctl = typeOf(c, CTL), dm = methodOf(ctl, 'delete');
    if (!methodOf(svc, 'delete')) return ['PostService 에 delete(Long id) 메서드가 없어요 → postRepository.deleteById(id); 를 호출하는 메서드를 추가하세요 (TODO 미션 6 위치).'];
    const dmm = (ctl && ctl.methods.find(m => annOf(m, 'DeleteMapping')));
    if (!dmm) return ['PostController 에 @DeleteMapping("/{id}") 메서드가 없어요. 서비스의 delete 를 호출하는 메서드를 만드세요.'];
    if (!annOf(dmm, 'ResponseStatus') || !/NO_CONTENT/.test(annOf(dmm, 'ResponseStatus').args)) return ['삭제 성공은 204 No Content 예요 → @ResponseStatus(HttpStatus.NO_CONTENT) 를 붙이세요.'];
    if (!dmm.params.some(p => annOf(p, 'PathVariable'))) return ['삭제할 id 를 받으려면 파라미터에 @PathVariable 이 필요해요.'];
    return pick(javaErr(c), needRun(c), c.server.dirty && RERUN, 'requests.http 6번(DELETE) 요청을 보내 204 를 확인하세요.'); },
  m7: c => { const t = typeOf(c, SVC); if (!t) return ['PostService.java 를 찾을 수 없어요.'];
    const cls = annOf(t, 'Transactional'), writes = ['create', 'update', 'delete'].map(n => methodOf(t, n)).filter(Boolean);
    const unmarked = writes.filter(m => !annOf(m, 'Transactional')).map(m => m.name);
    if (!cls && !writes.some(m => annOf(m, 'Transactional'))) return ['PostService 에 @Transactional 이 없어요 → 클래스에 @Transactional(readOnly = true), 쓰기 메서드(create/update/delete)에는 @Transactional 을 붙이세요.'];
    if (cls && /readOnly\s*=\s*true/.test(cls.args) && unmarked.length) return [`클래스가 readOnly 라서 쓰기 메서드는 따로 @Transactional 로 덮어써야 해요 → ${unmarked.join(', ')}`];
    if (!importsOf(t).some(i => /transaction\.annotation\.(Transactional|\*)$/.test(i))) return ['import org.springframework.transaction.annotation.Transactional; 이 없어요 (자동완성으로 입력하면 자동 import).'];
    return pick(javaErr(c), needRun(c), c.server.dirty && RERUN, '코드는 맞아요! 쓰기 요청(3·5·6번)을 보내고 콘솔의 "Creating new transaction" DEBUG 로그를 확인하세요.'); },
  m8: c => { const t = typeOf(c, ASP); if (!t) return ['LogAspect.java 를 찾을 수 없어요.'];
    if (!annOf(t, 'Aspect')) return ['LogAspect 에 @Aspect 가 없어요.'];
    if (!['Component', 'Configuration', 'Service'].some(n => annOf(t, n))) return ['@Aspect 만으로는 빈이 아니에요 → 스프링이 관리하도록 @Component 를 함께 붙이세요. (콘솔 WARN: "has @Aspect but is not a Spring bean")'];
    return pick(javaErr(c), needRun(c), c.server.dirty && RERUN, '코드는 맞아요! 서비스를 호출하는 요청(GET/POST)을 보내 콘솔의 ▶ ◀ 로그를 확인하세요.'); },
  m9: c => { const t = typeOf(c, CT); if (!t) return ['PostControllerTest.java 를 찾을 수 없어요.'];
    const f = t.fields.find(x => x.type === 'PostService');
    if (f && !annOf(f, 'MockitoBean') && !annOf(f, 'MockitoSpyBean')) return ['PostService 필드가 그냥 필드라서 @WebMvcTest 컨텍스트에 빈이 없어요 → 필드 위에 @MockitoBean 을 붙이세요 (Boot 4: @MockBean 대체).'];
    if (!c.tests) return ['툴바의 🧪 테스트 버튼(또는 거터 ▶)으로 테스트를 실행하세요.'];
    if (c.tests.build) return ['테스트 컴파일 실패 — Problems 탭의 오류를 먼저 고치세요.'];
    const bad = c.tests.results.filter(r => r.cls === 'PostControllerTest' && (r.method === 'list' || r.method === 'get') && r.status !== 'pass');
    return bad.length ? [`아직 실패: ${bad.map(b => b.method).join(', ')} — ${(bad[0].msg || '').split('\n').filter(Boolean).slice(0, 2).join(' / ')}`] : ['list · get 테스트가 통과했어요 ✔']; },
  m10: c => { if (!c.tests) return ['툴바의 🧪 테스트 버튼으로 전체 테스트를 실행하세요.']; if (c.tests.build) return ['테스트 컴파일 실패 — Problems 탭을 확인하세요.'];
    const MAP = { contextLoads: '미션 1', create: '미션 3', create_invalid: '미션 4', update: '미션 5', delete: '미션 6' };
    const bad = c.tests.results.filter(r => r.status !== 'pass');
    if (!bad.length) return ['전부 초록불이에요 ✔'];
    return bad.slice(0, 4).map(b => `실패: ${b.cls}.${b.method}${MAP[b.method] ? ' ← ' + MAP[b.method] + ' 와 연결' : ''}${b.status === 'skip' ? ' (시뮬레이터가 실행 못 함)' : ''}`); },
};

const MISSIONS = [
  { id: 'm1', diagnose: DIAG.m1, stage: '1단계 · IoC / DI', title: '스프링이 PostService 를 알게 하기',
    goal: '▶ Run 했을 때 "Started BlogApplication" 이 나오게 하세요. 컨테이너가 모르는 클래스는 주입할 수 없습니다.',
    hints: ['콘솔의 APPLICATION FAILED TO START 를 읽어 보세요.', 'PostController 의 생성자가 PostService 타입 빈을 못 찾았다는 뜻입니다.', 'PostService 에 스테레오타입 어노테이션 @Service 를 붙이세요 (입력하면 자동완성·자동 import).'],
    target: { file: J + 'service/PostService.java', find: 'TODO 미션 1' }, study: 'concept:ioc', check: s => s.started },
  { id: 'm2', diagnose: DIAG.m2, stage: '2단계 · MVC 조회 (Read)', title: '조회 요청이 컨트롤러까지 가는 길',
    goal: 'requests.http 2번(▶)을 보내 200 + 게시글 JSON 을 받으세요. 콘솔의 Hibernate SQL 로그도 확인해 보세요.',
    hints: ['앱이 켜져 있어야 합니다 (먼저 Run).', '요청 왼쪽 초록 ▶ 또는 Ctrl+Enter.', '개념 탭 "MVC 요청 흐름" 의 DispatcherServlet → HandlerMapping → Controller 순서를 떠올려 보세요.'],
    target: { file: 'requests.http', find: '### 2.' }, study: 'concept:mvc', check: s => find(s, r => r.method === 'GET' && /^\/api\/posts\/\d+$/.test(r.path) && r.status === 200 && jsonOf(r)?.id != null) },
  { id: 'm3', diagnose: DIAG.m3, stage: '3단계 · 생성 (Create)', title: '생성 성공은 201 Created',
    goal: '3번 요청이 200 이 아니라 201 로 응답하게 하세요.',
    hints: ['응답 상태 코드를 지정하는 어노테이션은?', '@ResponseStatus(HttpStatus.CREATED) 를 create 메서드에.', '수정 후에는 ⟳ Rerun 해야 반영됩니다.'],
    target: { file: J + 'controller/PostController.java', find: 'TODO 미션 3' }, study: 'concept:flow', check: s => find(s, r => r.method === 'POST' && r.path === '/api/posts' && r.status === 201) },
  { id: 'm4', diagnose: DIAG.m4, stage: '3단계 · 생성 (Create)', title: '잘못된 입력은 400 으로 막기',
    goal: '4번(빈 제목) 요청이 400 으로 응답하게 하세요. DTO 의 @NotBlank 는 이미 있는데 왜 통과할까요?',
    hints: ['DTO 에 제약조건이 있어도 컨트롤러가 검증을 "요청"하지 않으면 무시됩니다.', '@RequestBody 앞에 @Valid.', '수정(PUT) 메서드와 비교해 보세요.'],
    target: { file: J + 'controller/PostController.java', find: 'TODO 미션 4' }, study: 'concept:flow', check: s => find(s, r => r.method === 'POST' && r.path === '/api/posts' && r.status === 400) },
  { id: 'm5', diagnose: DIAG.m5, stage: '4단계 · 수정 · 삭제', title: '수정(Update) 후 다시 조회해 보기',
    goal: '5번(PUT)을 보낸 뒤 2번(GET)을 다시 보내 제목이 바뀐 것을 확인하세요. 변경 감지로 DB 에 반영됩니다.',
    hints: ['PUT 응답은 200 + 바뀐 JSON.', '같은 id 를 GET 하면 바뀐 제목이 나와야 합니다.', 'PostService.update 의 post.change(...) 가 엔티티를 바꿉니다.'],
    target: { file: 'requests.http', find: '### 5.' }, study: 'concept:flow',
    check: s => { const put = s.responses.find(r => r.method === 'PUT' && r.status === 200 && jsonOf(r)?.title); if (!put) return false; const id = put.path.split('/').pop(), t = jsonOf(put).title; return s.responses.some(r => r.method === 'GET' && r.path === '/api/posts/' + id && r.status === 200 && jsonOf(r)?.title === t); } },
  { id: 'm6', diagnose: DIAG.m6, stage: '4단계 · 수정 · 삭제', title: '삭제(Delete) → 204 No Content',
    goal: 'DELETE /api/posts/{id} 를 직접 만들어 6번 요청이 204 로 응답하게 하세요. (Service → Controller 순서)',
    hints: ['서비스에 delete(Long id) 가 없으면 컨트롤러에서 호출할 때 빨간 줄이 생깁니다.', '서비스: postRepository.deleteById(id);', '컨트롤러: @DeleteMapping("/{id}") + @ResponseStatus(HttpStatus.NO_CONTENT) + @PathVariable'],
    target: { file: J + 'service/PostService.java', find: 'TODO 미션 6' }, study: 'concept:mvc', check: s => find(s, r => r.method === 'DELETE' && /^\/api\/posts\/\d+$/.test(r.path) && r.status === 204) },
  { id: 'm7', diagnose: DIAG.m7, stage: '5단계 · 트랜잭션 (PSA)', title: '서비스 메서드를 트랜잭션으로 묶기',
    goal: '쓰기 요청(3·5·6번)을 보냈을 때 콘솔에 "Creating new transaction" 로그가 보이게 하세요.',
    hints: ['@Transactional 은 AOP 프록시 + PlatformTransactionManager(PSA) 가 만드는 기능입니다.', '클래스에는 @Transactional(readOnly = true), 쓰기 메서드(create/update/delete)에는 @Transactional.', '수정 후 Rerun → 3번 요청 → 콘솔의 DEBUG 로그 확인.'],
    target: { file: J + 'service/PostService.java', find: 'TODO 미션 7' }, study: 'concept:psa', check: s => s.txHit },
  { id: 'm8', diagnose: DIAG.m8, stage: '6단계 · AOP', title: 'Aspect 를 동작시키기',
    goal: '서비스 호출 시 LogAspect 의 ▶ ◀ 로그가 콘솔에 보이게 하세요.',
    hints: ['@Aspect 만으로는 부족합니다. 스프링이 관리하는 빈이어야 프록시가 만들어집니다.', 'LogAspect 에 @Component. (Rerun 필요)', '개념 탭 "AOP" 의 호출 순서(Around → Before → 대상 …)를 로그와 비교해 보세요.'],
    target: { file: J + 'aop/LogAspect.java', find: 'TODO 미션 8' }, study: 'concept:aop', check: s => s.aspectHit },
  { id: 'm9', diagnose: DIAG.m9, stage: '7단계 · 테스트', title: '@WebMvcTest 가 뜨게 만들기',
    goal: '🧪 테스트 실행(툴바) 후 PostControllerTest 의 list · get 테스트가 초록불이 되게 하세요.',
    hints: ['@WebMvcTest 는 웹 계층만 로드하므로 PostService 빈이 없습니다 → 컨텍스트 로딩 실패.', '필드에 @MockitoBean 을 붙여 가짜 빈을 등록하세요 (Boot 4: @MockBean 대체).', '테스트의 given(...).willReturn(...) 은 가짜 서비스가 돌려줄 값을 정합니다.'],
    target: { file: TT + 'controller/PostControllerTest.java', find: 'TODO 미션 9' }, study: 'concept:testing', check: s => passed(s, 'PostControllerTest', 'list') && passed(s, 'PostControllerTest', 'get') },
  { id: 'm10', diagnose: DIAG.m10, stage: '7단계 · 테스트', title: '모든 테스트 통과 (전부 초록불)',
    goal: '14개 테스트가 모두 통과하게 하세요. 테스트는 앞에서 만든 기능의 "인수 조건" 입니다.',
    hints: ['실패한 테스트의 메시지를 읽고 어떤 미션과 연결되는지 찾아보세요.', 'create → 201(미션 3), create_invalid → 400(미션 4), delete → 204(미션 6).', 'contextLoads 실패는 미션 1.'],
    target: { file: TT + 'controller/PostControllerTest.java', find: 'class PostControllerTest' }, study: 'concept:testing', check: s => !!s.tests && s.tests.results.length >= 14 && s.tests.summary.fail === 0 && s.tests.summary.skip === 0 },
];

Object.assign(IDE, { MISSIONS });
})();
