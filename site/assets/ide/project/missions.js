/* project/missions.js — 순서대로 따라 하면 스프링이 익숙해지는 12개 미션(8단계) + 자동 채점 + 현재 코드 진단.
   CRUD 는 컨트롤러를 빈 뼈대에서 한 걸음씩 직접 만들며 진행한다: 조회 → 생성 → 수정 → 삭제.
   state = session: { started, responses[], aspectHit, txHit, tests }  (tests = IDE.runTests 결과) */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const J = 'src/main/java/com/example/blog/', TT = 'src/test/java/com/example/blog/';

const jsonOf = r => { try { return JSON.parse(r.body); } catch { return null; } };
const find = (s, f) => s.responses.some(f);
const passed = (s, cls, m) => !!s.tests && s.tests.results.some(r => r.cls === cls && r.method === m && r.status === 'pass');

/* ───────────── 현재 코드 진단 ─────────────
   diagnose(ctx) → 문자열 배열(가장 중요한 것이 앞). ctx = { files, session, server:{running,dirty}, problems, tests } */
const SVC = J + 'service/PostService.java', CTL = J + 'controller/PostController.java', ASP = J + 'aop/LogAspect.java', CT = TT + 'controller/PostControllerTest.java';
const typeOf = (c, path) => { const t = c.files[path]; if (t == null) return null; try { return IDE.parseJava(t, path).types[0] || null; } catch { return null; } };
const annOf = (x, n) => ((x && x.anns) || []).find(a => a.name === n);
const methodOf = (t, n) => t && t.methods.find(m => m.name === n);
const importsOf = t => (t && t.unit.imports) || [];
const lastResp = (c, f) => [...c.session.responses].reverse().find(f);
const RERUN = '코드를 고쳤다면 ⟳ Rerun 해야 반영됩니다 (실행 중인 앱은 예전 코드로 동작 중).';
const needRun = c => (c.server.running ? null : '앱이 꺼져 있어요. ▶ Run 으로 먼저 앱을 시작하세요.');
const javaErr = c => { const p = c.problems.find(x => x.kind === 'java'); return p ? `컴파일 오류가 있어요 → ${p.path.split('/').pop()}:${p.line}  ${p.msg}` : null; };
const pick = (...a) => a.filter(Boolean);
/* 컨트롤러에서 "이 HTTP 어노테이션 + 경로 조건"을 가진 메서드 찾기 */
const mapped = (c, ann, pathTest) => { const t = typeOf(c, CTL); return t && t.methods.find(m => { const a = annOf(m, ann); return a && pathTest(a.args.trim()); }); };
const isRoot = a => a === '' || /^(value|path)\s*=\s*""$/.test(a) || a === '""';
const isId = a => /\{id\}/.test(a);
const callsService = (m, name) => !!m && new RegExp('postService\\s*\\.\\s*' + name + '\\s*\\(').test(m.body || '');
/* 요청을 보냈는지 / 마지막 응답 확인 후의 공통 꼬리말 */
const sendTail = (c, ok, todo) => pick(javaErr(c), needRun(c), c.server.dirty && RERUN, ok ? null : todo);

const DIAG = {
  m1: c => { const t = typeOf(c, SVC); if (!t) return ['PostService.java 를 찾을 수 없어요.'];
    if (!annOf(t, 'Service') && !annOf(t, 'Component')) return ['PostService 클래스 위에 스프링 빈 어노테이션이 없어요 → class 선언 위에 @Service 를 입력해 보세요 (자동완성에서 Enter 하면 import 도 자동으로 추가).'];
    if (!importsOf(t).some(i => /stereotype\.(Service|Component|\*)$/.test(i))) return ['@Service 는 썼지만 import org.springframework.stereotype.Service; 가 없어요 (Cannot resolve symbol 이 보일 거예요).'];
    return pick(javaErr(c), needRun(c) && '코드는 맞아요! ▶ Run 으로 앱을 시작하세요.', c.server.dirty && RERUN, c.server.running && !c.server.dirty && '앱이 정상 기동 중이에요 ✔'); },
  m2: c => { const m = mapped(c, 'GetMapping', isRoot);
    if (!m) return ['PostController 에 목록 조회 메서드가 없어요 → TODO 미션 2 자리에 @GetMapping 이 붙은 list() 메서드를 만드세요 (스니펫은 힌트에서 볼 수 있어요).'];
    if (!callsService(m, 'findAll')) return ['메서드가 서비스의 findAll() 을 호출하지 않아요 → return postService.findAll();'];
    const g = lastResp(c, r => r.method === 'GET' && r.path === '/api/posts');
    return sendTail(c, g && g.status === 200, '코드는 맞아요! requests.http 1번(목록 조회) 요청을 보내 200 을 확인하세요.').concat(g && g.status !== 200 ? [`마지막 응답이 ${g.status} 예요 — 콘솔 로그를 확인하세요.`] : []); },
  m3: c => { const m = mapped(c, 'GetMapping', isId);
    if (!m) return ['단건 조회 메서드가 없어요 → @GetMapping("/{id}") 가 붙은 get(Long id) 를 만드세요.'];
    if (!m.params.some(p => annOf(p, 'PathVariable'))) return ['URL 의 {id} 를 받으려면 파라미터에 @PathVariable 이 필요해요 → get(@PathVariable Long id)'];
    if (!callsService(m, 'find')) return ['서비스의 find(id) 를 호출해 반환하세요 → return postService.find(id);'];
    const g = lastResp(c, r => r.method === 'GET' && /\/api\/posts\/\d+$/.test(r.path));
    return sendTail(c, g && g.status === 200, '코드는 맞아요! requests.http 2번(단건 조회) 요청을 보내 200 을 확인하세요.'); },
  m4: c => { const m = mapped(c, 'PostMapping', isRoot);
    if (!m) return ['생성 메서드가 없어요 → @PostMapping 이 붙은 create(PostRequest request) 를 만드세요.'];
    if (!m.params.some(p => annOf(p, 'RequestBody'))) return ['요청 본문(JSON)을 객체로 받으려면 파라미터에 @RequestBody 가 필요해요 → create(@RequestBody PostRequest request)'];
    if (!callsService(m, 'create')) return ['서비스의 create(request) 를 호출해 반환하세요 → return postService.create(request);'];
    const p = lastResp(c, r => r.method === 'POST' && r.path === '/api/posts' && r.status < 300);
    return sendTail(c, !!p, '코드는 맞아요! requests.http 3번(생성) 요청을 보내 만들어진 글 JSON 을 확인하세요.'); },
  m5: c => { const m = mapped(c, 'PostMapping', isRoot); if (!m) return ['먼저 미션 4 의 create 메서드를 만드세요.'];
    const rs = annOf(m, 'ResponseStatus');
    if (!rs) return ['지금은 생성해도 200 이 나와요. 응답 상태를 정하는 어노테이션을 붙이세요 → @ResponseStatus(HttpStatus.CREATED)'];
    if (!/CREATED/.test(rs.args)) return [`@ResponseStatus 는 있지만 값이 CREATED 가 아니에요 (현재: ${rs.args}) → HttpStatus.CREATED`];
    const p = lastResp(c, r => r.method === 'POST' && r.path === '/api/posts');
    return sendTail(c, p && p.status === 201, '코드는 맞아요! requests.http 3번 요청을 다시 보내 201 을 확인하세요.'); },
  m6: c => { const m = mapped(c, 'PostMapping', isRoot); if (!m) return ['먼저 미션 4 의 create 메서드를 만드세요.'];
    const p0 = m.params.find(p => annOf(p, 'RequestBody'));
    if (!p0) return ['create 의 파라미터에 @RequestBody 가 필요해요.'];
    if (!annOf(p0, 'Valid') && !annOf(p0, 'Validated')) return ['DTO(PostRequest)에는 @NotBlank 가 이미 있지만, 컨트롤러가 검증을 "요청"하지 않으면 무시돼요 → @RequestBody 앞에 @Valid 를 붙이세요.'];
    const p = lastResp(c, r => r.method === 'POST' && r.status === 400);
    return sendTail(c, !!p, '코드는 맞아요! requests.http 4번(빈 제목) 요청을 보내 400 을 확인하세요.'); },
  m7: c => { const m = mapped(c, 'PutMapping', isId);
    if (!m) return ['수정 메서드가 없어요 → @PutMapping("/{id}") 가 붙은 update(Long id, PostRequest request) 를 만드세요.'];
    if (!m.params.some(p => annOf(p, 'PathVariable'))) return ['수정할 글의 id 를 받으려면 @PathVariable Long id 가 필요해요.'];
    const rb = m.params.find(p => annOf(p, 'RequestBody')); if (!rb) return ['바뀐 내용을 받으려면 @RequestBody PostRequest request 가 필요해요.'];
    if (!annOf(rb, 'Valid')) return ['생성과 똑같이 수정도 입력 검증이 필요해요 → @Valid @RequestBody PostRequest request'];
    if (!callsService(m, 'update')) return ['서비스의 update(id, request) 를 호출해 반환하세요.'];
    const put = lastResp(c, r => r.method === 'PUT');
    if (javaErr(c) || needRun(c) || c.server.dirty) return pick(javaErr(c), needRun(c), c.server.dirty && RERUN);
    if (!put) return ['코드는 맞아요! requests.http 5번(PUT) 요청을 보내세요.'];
    if (put.status !== 200) return [`PUT 응답이 ${put.status} 예요 — 콘솔 로그를 확인하세요.`];
    return ['PUT 은 성공했어요! 이제 requests.http 2번(GET)을 다시 보내 제목이 바뀌었는지 확인하세요 (변경 감지로 DB 에 반영됩니다).']; },
  m8: c => { const svc = typeOf(c, SVC), ctl = typeOf(c, CTL);
    if (!methodOf(svc, 'delete')) return ['먼저 서비스에 delete(Long id) 메서드를 만드세요 → postRepository.deleteById(id); (TODO 미션 8 위치)'];
    const dmm = ctl && ctl.methods.find(m => annOf(m, 'DeleteMapping'));
    if (!dmm) return ['컨트롤러에 @DeleteMapping("/{id}") 메서드가 없어요. 서비스의 delete 를 호출하는 메서드를 만드세요.'];
    if (!dmm.params.some(p => annOf(p, 'PathVariable'))) return ['삭제할 id 를 받으려면 파라미터에 @PathVariable 이 필요해요.'];
    if (!annOf(dmm, 'ResponseStatus') || !/NO_CONTENT/.test(annOf(dmm, 'ResponseStatus').args)) return ['삭제 성공은 204 No Content 예요 → @ResponseStatus(HttpStatus.NO_CONTENT) 를 붙이세요.'];
    const d = lastResp(c, r => r.method === 'DELETE');
    return sendTail(c, d && d.status === 204, '코드는 맞아요! requests.http 6번(DELETE) 요청을 보내 204 를 확인하세요.'); },
  m9: c => { const t = typeOf(c, SVC); if (!t) return ['PostService.java 를 찾을 수 없어요.'];
    const cls = annOf(t, 'Transactional'), writes = ['create', 'update', 'delete'].map(n => methodOf(t, n)).filter(Boolean);
    const unmarked = writes.filter(m => !annOf(m, 'Transactional')).map(m => m.name);
    if (!cls && !writes.some(m => annOf(m, 'Transactional'))) return ['PostService 에 @Transactional 이 없어요 → 클래스에 @Transactional(readOnly = true), 쓰기 메서드(create/update/delete)에는 @Transactional 을 붙이세요.'];
    if (cls && /readOnly\s*=\s*true/.test(cls.args) && unmarked.length) return [`클래스가 readOnly 라서 쓰기 메서드는 따로 @Transactional 로 덮어써야 해요 → ${unmarked.join(', ')}`];
    if (!importsOf(t).some(i => /transaction\.annotation\.(Transactional|\*)$/.test(i))) return ['import org.springframework.transaction.annotation.Transactional; 이 없어요 (자동완성으로 입력하면 자동 import).'];
    return sendTail(c, false, '코드는 맞아요! 쓰기 요청(3·5·6번)을 보내고 콘솔의 "Creating new transaction" DEBUG 로그를 확인하세요.'); },
  m10: c => { const t = typeOf(c, ASP); if (!t) return ['LogAspect.java 를 찾을 수 없어요.'];
    if (!annOf(t, 'Aspect')) return ['LogAspect 에 @Aspect 가 없어요.'];
    if (!['Component', 'Configuration', 'Service'].some(n => annOf(t, n))) return ['@Aspect 만으로는 빈이 아니에요 → 스프링이 관리하도록 @Component 를 함께 붙이세요. (콘솔 WARN: "has @Aspect but is not a Spring bean")'];
    return sendTail(c, false, '코드는 맞아요! 서비스를 호출하는 요청(GET/POST)을 보내 콘솔의 ▶ ◀ 로그를 확인하세요.'); },
  m11: c => { const t = typeOf(c, CT); if (!t) return ['PostControllerTest.java 를 찾을 수 없어요.'];
    const f = t.fields.find(x => x.type === 'PostService');
    if (f && !annOf(f, 'MockitoBean') && !annOf(f, 'MockitoSpyBean')) return ['PostService 필드가 그냥 필드라서 @WebMvcTest 컨텍스트에 빈이 없어요 → 필드 위에 @MockitoBean 을 붙이세요 (Boot 4: @MockBean 대체).'];
    if (!c.tests) return ['툴바의 테스트 버튼(또는 거터 ▶)으로 테스트를 실행하세요.'];
    if (c.tests.build) return ['테스트 컴파일 실패 — Problems 탭의 오류를 먼저 고치세요.'];
    const bad = c.tests.results.filter(r => r.cls === 'PostControllerTest' && (r.method === 'list' || r.method === 'get') && r.status !== 'pass');
    return bad.length ? [`아직 실패: ${bad.map(b => b.method).join(', ')} — ${(bad[0].msg || '').split('\n').filter(Boolean).slice(0, 2).join(' / ')} (컨트롤러에 미션 2·3 의 메서드가 있어야 통과해요)`] : ['list · get 테스트가 통과했어요 ✔']; },
  m12: c => { if (!c.tests) return ['툴바의 테스트 버튼으로 전체 테스트를 실행하세요.']; if (c.tests.build) return ['테스트 컴파일 실패 — Problems 탭을 확인하세요.'];
    const MAP = { contextLoads: '미션 1', list: '미션 2', get: '미션 3', create: '미션 5', create_invalid: '미션 6', update: '미션 7', delete: '미션 8' };
    const bad = c.tests.results.filter(r => r.status !== 'pass');
    if (!bad.length) return ['전부 초록불이에요 ✔'];
    return bad.slice(0, 4).map(b => `실패: ${b.cls}.${b.method}${MAP[b.method] ? ' ← ' + MAP[b.method] + ' 와 연결' : ''}${b.status === 'skip' ? ' (시뮬레이터가 실행 못 함)' : ''}`); },
};

/* ───────────── 정답 예시(스니펫): 힌트 패널에서 볼 수 있다 ───────────── */
const SNIP = {
  m1: '@Service\npublic class PostService {\n    ...\n}',
  m2: '@GetMapping\npublic List<PostResponse> list() {\n    return postService.findAll();\n}',
  m3: '@GetMapping("/{id}")\npublic PostResponse get(@PathVariable Long id) {\n    return postService.find(id);\n}',
  m4: '@PostMapping\npublic PostResponse create(@RequestBody PostRequest request) {\n    return postService.create(request);\n}',
  m5: '@PostMapping\n@ResponseStatus(HttpStatus.CREATED)      // ← 추가\npublic PostResponse create(@RequestBody PostRequest request) {\n    return postService.create(request);\n}',
  m6: '@PostMapping\n@ResponseStatus(HttpStatus.CREATED)\npublic PostResponse create(@Valid @RequestBody PostRequest request) {   // ← @Valid\n    return postService.create(request);\n}',
  m7: '@PutMapping("/{id}")\npublic PostResponse update(@PathVariable Long id, @Valid @RequestBody PostRequest request) {\n    return postService.update(id, request);\n}',
  m8: '// PostService\n@Transactional\npublic void delete(Long id) {\n    postRepository.deleteById(id);\n}\n\n// PostController\n@DeleteMapping("/{id}")\n@ResponseStatus(HttpStatus.NO_CONTENT)\npublic void delete(@PathVariable Long id) {\n    postService.delete(id);\n}',
  m9: '@Service\n@Transactional(readOnly = true)      // 클래스: 기본은 읽기 전용\npublic class PostService {\n\n    @Transactional                      // 쓰기 메서드만 덮어쓰기\n    public PostResponse create(PostRequest request) { ... }\n}',
  m10: '@Slf4j\n@Component          // ← 스프링 빈으로 등록해야 프록시가 만들어짐\n@Aspect\npublic class LogAspect { ... }',
  m11: '@MockitoBean              // Boot 4: @MockBean 은 제거됨\nPostService postService;',
  m12: '// 실패한 테스트의 메시지를 읽고, 연결된 미션(컨트롤러/서비스)을 고치세요',
};

/* ───────────── 자동 채점 시나리오 (정답 확인 버튼) ─────────────
   앱을 새로 실행(DB 초기화)한 뒤 requests 를 차례로 보내고, tests 가 true 면 전체 테스트를 실행해 그 결과만으로 채점한다. */
const VALID = '{"title":"새 글","content":"채점용 내용"}', INVALID = '{"title":"","content":"x"}', PUTBODY = '{"title":"수정한 제목","content":"수정한 내용"}';
const rq = (method, path, body) => ({ method, path, body: body || '' });
const AUTO = {
  m1: { requests: [] },
  m2: { requests: [rq('GET', '/api/posts')] },
  m3: { requests: [rq('GET', '/api/posts/1')] },
  m4: { requests: [rq('POST', '/api/posts', VALID)] },
  m5: { requests: [rq('POST', '/api/posts', VALID)] },
  m6: { requests: [rq('POST', '/api/posts', INVALID)] },
  m7: { requests: [rq('PUT', '/api/posts/1', PUTBODY), rq('GET', '/api/posts/1')] },
  m8: { requests: [rq('DELETE', '/api/posts/1')] },
  m9: { requests: [rq('POST', '/api/posts', VALID)] },
  m10: { requests: [rq('GET', '/api/posts')] },
  m11: { tests: true },
  m12: { tests: true },
};

const MISSIONS = [
  { id: 'm1', auto: AUTO.m1, stage: '1단계 · IoC / DI', title: '스프링이 PostService 를 알게 하기', diagnose: DIAG.m1, snippet: SNIP.m1,
    criteria: '▶ Run 했을 때 콘솔에 "Started BlogApplication" 이 출력되면 완료 (어노테이션 자체가 아니라 앱이 실제로 기동되어야 함)',
    goal: '▶ Run 했을 때 "Started BlogApplication" 이 나오게 하세요. 컨테이너가 모르는 클래스는 주입할 수 없습니다.',
    hints: ['콘솔의 APPLICATION FAILED TO START 를 읽어 보세요.', 'PostController 의 생성자가 PostService 타입 빈을 못 찾았다는 뜻입니다.', 'PostService 에 스테레오타입 어노테이션 @Service 를 붙이세요 (입력하면 자동완성·자동 import).'],
    target: { file: J + 'service/PostService.java', find: 'TODO 미션 1' }, study: 'concept:ioc', check: s => s.started },
  { id: 'm2', auto: AUTO.m2, stage: '2단계 · 조회 (Read)', title: '목록 조회 API 만들기', diagnose: DIAG.m2, snippet: SNIP.m2,
    criteria: 'GET /api/posts 요청이 200 + JSON 배열로 응답하면 완료 (앱 실행 → 코드 수정 시 ⟳ Rerun)',
    goal: 'PostController 에 전체 목록을 돌려주는 GET /api/posts 메서드를 직접 만드세요. 서비스에는 findAll() 이 이미 있습니다.',
    hints: ['컨트롤러는 요청을 받아 서비스에 위임하는 얇은 계층이에요.', 'GET 요청을 매핑하는 어노테이션은 @GetMapping. 클래스에 @RequestMapping("/api/posts") 가 이미 있어서 경로는 비워 두면 돼요.', '반환 타입은 List<PostResponse>, 본문은 postService.findAll() 을 return.'],
    target: { file: CTL, find: 'TODO 미션 2' }, study: 'concept:mvc', check: s => find(s, r => r.method === 'GET' && r.path === '/api/posts' && r.status === 200 && Array.isArray(jsonOf(r))) },
  { id: 'm3', auto: AUTO.m3, stage: '2단계 · 조회 (Read)', title: '단건 조회 API 만들기', diagnose: DIAG.m3, snippet: SNIP.m3,
    criteria: 'GET /api/posts/{숫자} 요청이 200 + 글 JSON 으로 응답하면 완료',
    goal: 'URL 의 id 로 한 건을 찾는 GET /api/posts/{id} 메서드를 만드세요. 이번에는 경로 변수를 받아 보세요.',
    hints: ['경로 변수는 @GetMapping("/{id}") 처럼 중괄호로 적어요.', '메서드 파라미터에 @PathVariable Long id 를 붙이면 {id} 값이 들어옵니다.', 'return postService.find(id);'],
    target: { file: CTL, find: 'TODO 미션 3' }, study: 'concept:mvc', check: s => find(s, r => r.method === 'GET' && /^\/api\/posts\/\d+$/.test(r.path) && r.status === 200 && jsonOf(r)?.id != null) },
  { id: 'm4', auto: AUTO.m4, stage: '3단계 · 생성 (Create)', title: '생성 API 만들기', diagnose: DIAG.m4, snippet: SNIP.m4,
    criteria: 'POST /api/posts 요청이 성공(200/201)하고 만들어진 글 JSON 을 돌려주면 완료',
    goal: '요청 본문(JSON)으로 새 글을 만드는 POST /api/posts 메서드를 만드세요. (상태 코드 201 은 다음 미션)',
    hints: ['생성은 POST → @PostMapping.', 'JSON 본문을 자바 객체로 받으려면 파라미터에 @RequestBody PostRequest request.', 'return postService.create(request);'],
    target: { file: CTL, find: 'TODO 미션 4' }, study: 'concept:mvcpattern', check: s => find(s, r => r.method === 'POST' && r.path === '/api/posts' && r.status < 300 && jsonOf(r)?.id != null) },
  { id: 'm5', auto: AUTO.m5, stage: '3단계 · 생성 (Create)', title: '생성 성공은 201 Created', diagnose: DIAG.m5, snippet: SNIP.m5,
    criteria: 'POST /api/posts 요청이 201 로 응답하면 완료 (코드를 고친 뒤 ⟳ Rerun → 요청 다시 전송)',
    goal: '3번 요청이 200 이 아니라 201 로 응답하게 하세요. 리소스를 "만들었다"는 의미의 상태 코드입니다.',
    hints: ['응답 상태 코드를 지정하는 어노테이션은?', '@ResponseStatus(HttpStatus.CREATED) 를 create 메서드에.', '수정 후에는 ⟳ Rerun 해야 반영됩니다.'],
    target: { file: CTL, find: 'TODO 미션 4' }, study: 'concept:flow', check: s => find(s, r => r.method === 'POST' && r.path === '/api/posts' && r.status === 201) },
  { id: 'm6', auto: AUTO.m6, stage: '3단계 · 생성 (Create)', title: '잘못된 입력은 400 으로 막기', diagnose: DIAG.m6, snippet: SNIP.m6,
    criteria: 'POST /api/posts 요청(빈 제목)이 400 으로 응답하면 완료',
    goal: '4번(빈 제목) 요청이 400 으로 응답하게 하세요. DTO 의 @NotBlank 는 이미 있는데 왜 통과할까요?',
    hints: ['DTO 에 제약조건이 있어도 컨트롤러가 검증을 "요청"하지 않으면 무시됩니다.', '@RequestBody 앞에 @Valid.', '수정(PUT)을 만들 때도 똑같이 필요해요.'],
    target: { file: CTL, find: 'TODO 미션 4' }, study: 'concept:flow', check: s => find(s, r => r.method === 'POST' && r.path === '/api/posts' && r.status === 400) },
  { id: 'm7', auto: AUTO.m7, stage: '4단계 · 수정 (Update)', title: '수정 API 만들고 반영 확인', diagnose: DIAG.m7, snippet: SNIP.m7,
    criteria: 'PUT 이 200 으로 성공한 뒤, 같은 id 의 GET 이 바뀐 제목을 돌려주면 완료',
    goal: 'PUT /api/posts/{id} 를 만들고, 5번(PUT) 뒤에 2번(GET)을 다시 보내 제목이 바뀐 걸 확인하세요.',
    hints: ['수정은 PUT → @PutMapping("/{id}"). 경로 변수와 본문을 둘 다 받아요.', 'update(@PathVariable Long id, @Valid @RequestBody PostRequest request)', '서비스의 update 가 post.change(...) 로 엔티티를 바꾸면 변경 감지로 DB 에 반영돼요.'],
    target: { file: CTL, find: 'TODO 미션 7' }, study: 'concept:flow',
    check: s => { const put = s.responses.find(r => r.method === 'PUT' && r.status === 200 && jsonOf(r)?.title); if (!put) return false; const id = put.path.split('/').pop(), t = jsonOf(put).title; return s.responses.some(r => r.method === 'GET' && r.path === '/api/posts/' + id && r.status === 200 && jsonOf(r)?.title === t); } },
  { id: 'm8', auto: AUTO.m8, stage: '5단계 · 삭제 (Delete)', title: '삭제 API → 204 No Content', diagnose: DIAG.m8, snippet: SNIP.m8,
    criteria: 'DELETE /api/posts/{id} 요청이 204 로 응답하면 완료',
    goal: '서비스에 delete 를 먼저 만들고, 컨트롤러에 DELETE /api/posts/{id} 를 만들어 6번 요청이 204 로 응답하게 하세요.',
    hints: ['서비스에 delete(Long id) 가 없으면 컨트롤러에서 호출할 때 빨간 줄이 생깁니다 (Cannot resolve method).', '서비스: postRepository.deleteById(id);', '컨트롤러: @DeleteMapping("/{id}") + @ResponseStatus(HttpStatus.NO_CONTENT) + @PathVariable'],
    target: { file: SVC, find: 'TODO 미션 8' }, study: 'concept:mvc', check: s => find(s, r => r.method === 'DELETE' && /^\/api\/posts\/\d+$/.test(r.path) && r.status === 204) },
  { id: 'm9', auto: AUTO.m9, stage: '6단계 · 트랜잭션 (PSA)', title: '서비스 메서드를 트랜잭션으로 묶기', diagnose: DIAG.m9, snippet: SNIP.m9,
    criteria: '쓰기 요청을 보냈을 때 "Creating new transaction" 로그가 찍히면 완료 (Rerun 필요)',
    goal: '쓰기 요청(3·5·6번)을 보냈을 때 콘솔에 "Creating new transaction" 로그가 보이게 하세요.',
    hints: ['@Transactional 은 AOP 프록시 + PlatformTransactionManager(PSA) 가 만드는 기능입니다.', '클래스에는 @Transactional(readOnly = true), 쓰기 메서드(create/update/delete)에는 @Transactional.', '수정 후 Rerun → 요청 → 콘솔의 DEBUG 로그 확인.'],
    target: { file: SVC, find: 'TODO 미션 9' }, study: 'concept:psa', check: s => s.txHit },
  { id: 'm10', auto: AUTO.m10, stage: '7단계 · AOP', title: 'Aspect 를 동작시키기', diagnose: DIAG.m10, snippet: SNIP.m10,
    criteria: '서비스를 호출하는 요청을 보냈을 때 LogAspect 의 ▶ ◀ 로그가 찍히면 완료 (Rerun 필요)',
    goal: '서비스 호출 시 LogAspect 의 ▶ ◀ 로그가 콘솔에 보이게 하세요.',
    hints: ['@Aspect 만으로는 부족합니다. 스프링이 관리하는 빈이어야 프록시가 만들어집니다.', 'LogAspect 에 @Component. (Rerun 필요)', '개념 탭 "AOP" 의 호출 순서(Around → Before → 대상 …)를 로그와 비교해 보세요.'],
    target: { file: ASP, find: 'TODO 미션 10' }, study: 'concept:aop', check: s => s.aspectHit },
  { id: 'm11', auto: AUTO.m11, stage: '8단계 · 테스트', title: '@WebMvcTest 가 뜨게 만들기', diagnose: DIAG.m11, snippet: SNIP.m11,
    criteria: '테스트 실행 후 PostControllerTest 의 list · get 이 통과하면 완료',
    goal: '테스트 실행(툴바) 후 PostControllerTest 의 list · get 테스트가 초록불이 되게 하세요.',
    hints: ['@WebMvcTest 는 웹 계층만 로드하므로 PostService 빈이 없습니다 → 컨텍스트 로딩 실패.', '필드에 @MockitoBean 을 붙여 가짜 빈을 등록하세요 (Boot 4: @MockBean 대체).', 'list · get 이 통과하려면 컨트롤러에 미션 2·3 의 메서드가 있어야 해요.'],
    target: { file: CT, find: 'TODO 미션 11' }, study: 'concept:testing', check: s => passed(s, 'PostControllerTest', 'list') && passed(s, 'PostControllerTest', 'get') },
  { id: 'm12', auto: AUTO.m12, stage: '8단계 · 테스트', title: '모든 테스트 통과 (전부 초록불)', diagnose: DIAG.m12, snippet: SNIP.m12,
    criteria: '테스트 실행 후 14개가 모두 통과하면 완료',
    goal: '14개 테스트가 모두 통과하게 하세요. 테스트는 앞에서 만든 기능의 "인수 조건" 입니다.',
    hints: ['실패한 테스트의 메시지를 읽고 어떤 미션과 연결되는지 찾아보세요.', 'create → 201(미션 5), create_invalid → 400(미션 6), update → 미션 7, delete → 204(미션 8).', 'contextLoads 실패는 미션 1.'],
    target: { file: CT, find: 'class PostControllerTest' }, study: 'concept:testing', check: s => !!s.tests && s.tests.results.length >= 14 && s.tests.summary.fail === 0 && s.tests.summary.skip === 0 },
];

Object.assign(IDE, { MISSIONS });
})();
