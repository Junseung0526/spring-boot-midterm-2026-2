/* project/missions.js — 시험 형식(빈칸 채우기 · 코드 해석)에 맞춘 19개 미션(7단계).
   시작 코드는 완성된 블로그 API 에서 단어만 ___ 로 비운 것이고(코드를 고치는 문항은 없음), [미션 N] 주석이 빈칸 위치다.
   빈칸 미션: 빈칸 검사(blanks) + 실제 실행(요청 · 테스트)으로 채점.  해석 미션(quiz): 답을 입력하면 핵심어 포함 여부로 채점.
   진단은 "무엇이 왜 안 되는지" 만 말하고 코드는 알려 주지 않는다 (코드는 정답 확인 2번 실패 후 정답 예시에서).
   state = session: { started, responses[], aspectHit, txHit, tests, mutants? }  check(session, files) */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const J = 'src/main/java/com/example/blog/', TT = 'src/test/java/com/example/blog/';

const jsonOf = r => { try { return JSON.parse(r.body); } catch { return null; } };
const lastResp = (c, f) => [...c.session.responses].reverse().find(f);

/* ───────────── 현재 코드 진단 ─────────────
   diagnose(ctx) → 문자열 배열(가장 중요한 것이 앞). ctx = { files, session, server:{running,dirty}, problems, tests } */
const SVC = J + 'service/BlogService.java', CTL = J + 'controller/BlogApiController.java', ASP = J + 'aop/LogAspect.java', CT = TT + 'controller/BlogApiControllerTest.java';
const REPO = J + 'repository/BlogRepository.java', REQ = J + 'dto/AddArticleRequest.java', ART = J + 'domain/Article.java', DATA = 'src/main/resources/data.sql', YAML = 'src/main/resources/application.yaml';
const typeOf = (c, path) => { const t = c.files[path]; if (t == null) return null; try { return IDE.parseJava(t, path).types[0] || null; } catch { return null; } };
const allTypes = c => { try { return IDE.buildModel(c.files).types; } catch { return new Map(); } };
const annOf = (x, n) => ((x && x.anns) || []).find(a => a.name === n);
const methodOf = (t, n) => t && t.methods.find(m => m.name === n);
const bodyOf = (t, n) => (methodOf(t, n) || {}).body || '';
const importsOf = t => (t && t.unit.imports) || [];
const RERUN = '코드를 고쳤다면 ⟳ Rerun 해야 반영됩니다 (실행 중인 앱은 예전 코드로 동작 중).';
const needRun = c => (c.server.running ? null : '앱이 꺼져 있어요. ▶ Run 으로 먼저 앱을 시작하세요.');
const javaErr = c => { const p = c.problems.find(x => x.kind === 'java'); return p ? `컴파일 오류가 있어요 → ${p.path.split('/').pop()}:${p.line}  ${p.msg}` : null; };
const pick = (...a) => a.filter(Boolean);
/* 컨트롤러에서 "이 HTTP 어노테이션 + 경로 조건"을 가진 메서드 찾기 */
const mapped = (c, ann, pathTest, path = CTL) => { const t = typeOf(c, path); return t && t.methods.find(m => { const a = annOf(m, ann); return a && pathTest(a.args.trim()); }); };
const isRoot = a => a === '' || /^(value|path)\s*=\s*""$/.test(a) || a === '""';
const isId = a => /\{id\}/.test(a);
const calls = (m, name) => !!m && new RegExp('\\.\\s*' + name + '\\s*\\(').test(m.body || '');
const created = m => !!m && ((annOf(m, 'ResponseStatus') && /CREATED/.test(annOf(m, 'ResponseStatus').args)) || /HttpStatus\.CREATED|\.created\s*\(/.test(m.body || ''));
const sendTail = (c, ok, todo) => pick(javaErr(c), needRun(c), c.server.dirty && RERUN, ok ? null : todo);
const failed = (c, cls) => (c.tests && !c.tests.build ? c.tests.results.filter(r => (!cls || r.cls === cls) && r.status !== 'pass') : []);
const killed = (s, mutant, test) => !!(s.mutants && s.mutants[mutant] && !s.mutants[mutant].build && s.mutants[mutant].results.some(test));
const hasGetter = (t, f) => !!t && (t.kind === 'record' || annOf(t, 'Getter') || annOf(t, 'Data') || t.methods.some(m => m.name === 'get' + f[0].toUpperCase() + f.slice(1)) || ((t.fields.find(x => x.name === f) || {}).anns || []).some(a => a.name === 'Getter'));
/* 제공된 테스트 한 개의 상태를 진단 문구로 */
const testDiag = (c, method) => {
  if (!c.tests) return `정답 확인을 누르면 제공된 테스트 ${method}() 를 실행해 채점해요.`;
  if (c.tests.build) { const p = c.tests.problems[0]; return `테스트 컴파일 실패 → ${p.path.split('/').pop()}:${p.line}  ${p.msg}  (테스트가 쓰는 클래스 · 생성자 · getter 가 아직 없다는 뜻이에요)`; }
  const r = c.tests.results.find(x => x.method === method);
  if (!r) return `${method}() 테스트를 찾을 수 없어요 — BlogApiControllerTest 를 지우거나 이름을 바꾸지 마세요.`;
  if (r.status === 'pass') return null;
  return `${method}() 실패 — ${(r.msg || '').split('\n').filter(Boolean).slice(0, 2).join(' / ')}`;
};
const testPass = (s, method) => !!s.tests && !s.tests.build && s.tests.results.some(r => r.method === method && r.status === 'pass');


/* ── 빈칸 검사 도우미 ── 같은 파일 내용이면 모델을 다시 만들지 않는다 */
let memoKey = null, memoModel = null;
const modelOf = files => { const k = Object.keys(files).map(p => p + '\u0001' + files[p]).join('\u0000'); if (k !== memoKey) { memoKey = k; try { memoModel = IDE.buildModel(files); } catch { memoModel = null; } } return memoModel; };
const ty = (f, n) => { const m = modelOf(f); return (m && m.types.get(n)) || null; };
const meth = (f, cls, n) => methodOf(ty(f, cls), n);
const fieldOf = (f, cls, n) => { const t = ty(f, cls); return t && t.fields.find(x => x.name === n); };
const annArgs = (x, n) => (annOf(x, n) || {}).args || '';
const mapsTo = (m, ann, path) => !!annOf(m, ann) && (path === '' ? !/\/\{?\w/.test(annArgs(m, ann)) : new RegExp('"' + path.replace(/[{}]/g, '\\$&') + '"').test(annArgs(m, ann)));
const paramAnn = (m, n, i) => !!m && (i == null ? m.params.some(p => annOf(p, n)) : !!m.params[i] && !!annOf(m.params[i], n));
const throwsNotFound = b => /orElseThrow\s*\(\s*\(\s*\)\s*->\s*new\s+IllegalArgumentException\s*\(\s*"not found: "\s*\+\s*id\s*\)\s*\)/.test(b || '');
const okFile = (f, name) => { const m = modelOf(f); return !!m && !IDE.javaProblems(m).some(p => p.kind === 'java' && p.path.endsWith('/' + name)); };
const blanksLeft = (m, files) => m.blanks.filter(([, fn]) => { try { return !fn(files); } catch { return true; } }).map(([l]) => l);
function isReadOnly(t, n) { const m = methodOf(t, n); if (!t || !m) return false; const a = annOf(m, 'Transactional') || annOf(t, 'Transactional'); return !!a && /readOnly\s*=\s*true/.test(a.args); }
const isTx = (t, n) => !!methodOf(t, n) && !!(annOf(methodOf(t, n), 'Transactional') || annOf(t, 'Transactional'));
const titleIs = (r, t) => !!r && r.status === 200 && jsonOf(r)?.title === t;
const lastGet1 = s => [...s.responses].reverse().find(r => r.method === 'GET' && r.path === '/api/articles/1');
const clsPass = (s, cls, min) => { const t = s.tests; if (!t || t.build) return false; const mine = t.results.filter(r => r.cls === cls); return mine.length >= min && mine.every(r => r.status === 'pass'); };

/* ── 빈칸 목록: [표시, 검사(files)] — 코드 주석의 ①②… 번호와 같다 ── */
const BLANKS = {
  m1: [
    ['① 엔티티 표시', f => !!annOf(ty(f, 'Article'), 'Entity')],
    ['② getter', f => hasGetter(ty(f, 'Article'), 'title')],
    ['③ 기본 생성자(PROTECTED)', f => { const a = ty(f, 'Article'); return /PROTECTED/.test(annArgs(a, 'NoArgsConstructor')) || a.ctors.some(k => !k.params.length && k.mods.includes('protected')); }],
    ['④ 기본 키 표시', f => !!annOf(fieldOf(f, 'Article', 'id'), 'Id')],
    ['⑤ 생성 전략 IDENTITY', f => /IDENTITY/.test(annArgs(fieldOf(f, 'Article', 'id'), 'GeneratedValue'))],
  ],
  m3: [['extends JpaRepository<Article, Long>', f => /extends\s+JpaRepository\s*<\s*Article\s*,\s*Long\s*>/.test(f[REPO] || '')]],
  m4: [
    ['① 기본 생성자', f => !!annOf(ty(f, 'AddArticleRequest'), 'NoArgsConstructor') || ty(f, 'AddArticleRequest').kind === 'record'],
    ['② 모든 필드 생성자', f => { const t = ty(f, 'AddArticleRequest'); return t.kind === 'record' || !!annOf(t, 'AllArgsConstructor') || t.ctors.some(k => k.params.length === 2); }],
    ['③ getter', f => hasGetter(ty(f, 'AddArticleRequest'), 'title')],
    ['④ ⑤ toEntity() 의 빌더', f => { const b = bodyOf(ty(f, 'AddArticleRequest'), 'toEntity'); return /Article\s*\.\s*builder\s*\(\s*\)/.test(b) && /\.title\s*\(\s*title\s*\)/.test(b) && /\.content\s*\(\s*content\s*\)/.test(b) && /\.build\s*\(\s*\)/.test(b); }],
    ['⑥ ArticleResponse 의 getter', f => hasGetter(ty(f, 'ArticleResponse'), 'title')],
  ],
  m5: [
    ['① 생성자 자동 생성', f => !!annOf(ty(f, 'BlogService'), 'RequiredArgsConstructor') || ty(f, 'BlogService').ctors.some(k => k.params.length === 1)],
    ['② 서비스 빈 등록', f => !!annOf(ty(f, 'BlogService'), 'Service')],
    ['③ final', f => (fieldOf(f, 'BlogService', 'blogRepository') || { mods: [] }).mods.includes('final')],
    ['④ ⑤ save(toEntity())', f => /return\s+blogRepository\s*\.\s*save\s*\(\s*request\s*\.\s*toEntity\s*\(\s*\)\s*\)\s*;/.test(bodyOf(ty(f, 'BlogService'), 'save'))],
    ['⑥ ⑦ findById 의 예외', f => throwsNotFound(bodyOf(ty(f, 'BlogService'), 'findById'))],
    ['⑧ ⑨ update 의 예외', f => throwsNotFound(bodyOf(ty(f, 'BlogService'), 'update'))],
  ],
  m7: [
    ['① 컨트롤러 등록', f => !!annOf(ty(f, 'BlogApiController'), 'RestController')],
    ['② 공통 경로', f => /"\/api\/articles"/.test(annArgs(ty(f, 'BlogApiController'), 'RequestMapping'))],
    ['③ POST 매핑', f => mapsTo(meth(f, 'BlogApiController', 'addArticle'), 'PostMapping', '')],
    ['④ 요청 본문', f => paramAnn(meth(f, 'BlogApiController', 'addArticle'), 'RequestBody', 0)],
    ['⑤ GET 매핑 (목록)', f => mapsTo(meth(f, 'BlogApiController', 'findAllArticles'), 'GetMapping', '')],
    ['⑥ GET 매핑 "/{id}"', f => mapsTo(meth(f, 'BlogApiController', 'findArticle'), 'GetMapping', '/{id}')],
    ['⑦ 경로 변수', f => paramAnn(meth(f, 'BlogApiController', 'findArticle'), 'PathVariable', 0)],
    ['⑧ DELETE 매핑', f => mapsTo(meth(f, 'BlogApiController', 'deleteArticle'), 'DeleteMapping', '/{id}')],
    ['⑨ 경로 변수', f => paramAnn(meth(f, 'BlogApiController', 'deleteArticle'), 'PathVariable', 0)],
    ['⑩ PUT 매핑', f => mapsTo(meth(f, 'BlogApiController', 'updateArticle'), 'PutMapping', '/{id}')],
    ['⑪ 경로 변수', f => paramAnn(meth(f, 'BlogApiController', 'updateArticle'), 'PathVariable', 0)],
    ['⑫ 요청 본문', f => paramAnn(meth(f, 'BlogApiController', 'updateArticle'), 'RequestBody', 1)],
  ],
  m8: [
    ['① 201 상태 코드', f => /HttpStatus\s*\.\s*CREATED/.test(bodyOf(ty(f, 'BlogApiController'), 'addArticle'))],
    ['② stream()', f => /\.\s*stream\s*\(\s*\)/.test(bodyOf(ty(f, 'BlogApiController'), 'findAllArticles'))],
    ['③ 생성자 참조', f => /ArticleResponse\s*::\s*new/.test(bodyOf(ty(f, 'BlogApiController'), 'findAllArticles'))],
  ],
  m11: [
    ['① findAll 읽기 전용', f => isReadOnly(ty(f, 'BlogService'), 'findAll')],
    ['② findById 읽기 전용', f => isReadOnly(ty(f, 'BlogService'), 'findById')],
    ['③ update 쓰기 트랜잭션', f => isTx(ty(f, 'BlogService'), 'update') && !isReadOnly(ty(f, 'BlogService'), 'update')],
  ],
  m14: [
    ['① 통합 테스트', f => !!annOf(ty(f, 'BlogApiControllerTest'), 'SpringBootTest')],
    ['② MockMvc 자동 구성', f => !!annOf(ty(f, 'BlogApiControllerTest'), 'AutoConfigureMockMvc')],
    ['③ 필드 주입 (네 필드 모두)', f => ['mockMvc', 'context', 'blogRepository', 'objectMapper'].every(n => !!annOf(fieldOf(f, 'BlogApiControllerTest', n), 'Autowired'))],
    ['④ 매 테스트 전 실행', f => !!annOf(meth(f, 'BlogApiControllerTest', 'mockMvcSetup'), 'BeforeEach')],
    ['⑤ 201 을 기대', f => /status\s*\(\s*\)\s*\.\s*isCreated\s*\(\s*\)/.test(bodyOf(ty(f, 'BlogApiControllerTest'), 'addArticle'))],
    ['⑥ ⑦ 테스트 데이터 SQL', f => ['findAllArticles', 'findArticle'].every(n => /test-db\.sql/.test(annArgs(meth(f, 'BlogApiControllerTest', n), 'Sql')))],
  ],
  m15: [
    ['① JPA 슬라이스 테스트', f => !!annOf(ty(f, 'BlogRepositoryTest'), 'DataJpaTest')],
    ['② 리포지토리 주입', f => !!annOf(fieldOf(f, 'BlogRepositoryTest', 'blogRepository'), 'Autowired')],
    ['③ 값이 있는지 검증', f => /\)\s*\)\s*\.\s*isPresent\s*\(\s*\)/.test(bodyOf(ty(f, 'BlogRepositoryTest'), 'saveAndFind'))],
  ],
  m18: [
    ['① Aspect 표시', f => !!annOf(ty(f, 'LogAspect'), 'Aspect')],
    ['② 빈 등록', f => ['Component', 'Service', 'Configuration'].some(n => annOf(ty(f, 'LogAspect'), n))],
    ['③ 포인트컷 패키지', f => /execution\(\s*\*\s+com\.example\.blog\.service\.\./.test(f[ASP] || '')],
  ],
};

/* ── 빈칸을 다 채운 뒤의 진단 (실제 실행 결과 기준) ── */
const AFTER = {
  m1: c => [okFile(c.files, 'Article.java') ? '빈칸은 다 채웠어요 — 정답 확인을 누르세요. (ArticleResponse 의 빨간 줄도 getter 가 생기면 사라져요)' : javaErr(c)],
  m3: c => sendTail(c, false, '빈칸은 다 채웠어요 — ▶ Run 으로 앱이 뜨는지 보고 정답 확인을 누르세요.'),
  m4: c => [javaErr(c) || '빈칸은 다 채웠어요 — 정답 확인을 누르세요.'],
  m5: c => sendTail(c, false, '빈칸은 다 채웠어요 — 정답 확인을 누르세요. (요청은 미션 7 에서 컨트롤러를 연결해야 보낼 수 있어요)'),
  m7: c => { const p = lastResp(c, r => r.method === 'POST' && r.path === '/api/articles');
    if (p && p.status === 404) return ['POST 가 404 예요 — 클래스 공통 경로와 메서드 매핑을 다시 보세요.'];
    if (p && p.status === 400) return ['POST 가 400 이에요 — 요청 본문(JSON)이 DTO 로 바인딩되지 않았어요.'];
    if (p && p.status === 500) return ['POST 가 500 이에요 — 콘솔을 읽어 보세요 (서비스 · DTO 빈칸이 덜 채워졌을 수 있어요).'];
    return sendTail(c, p && p.status < 300, '빈칸은 다 채웠어요 — requests.http 1 → 3 → 4 → 5번을 보내 보거나 정답 확인을 누르세요.'); },
  m8: c => sendTail(c, false, '빈칸은 다 채웠어요 — requests.http 1번(201?) → 2번(목록에 id?)을 보내 보거나 정답 확인을 누르세요.'),
  m11: c => { const put = lastResp(c, r => r.method === 'PUT' && r.path === '/api/articles/1'), get = lastGet1(c.session);
    if (put && put.status === 200 && get && !titleIs(get, '수정한 제목')) return ['PUT 응답은 바뀌었는데 다시 GET 하면 예전 제목이에요 — update() 의 트랜잭션을 확인하세요.'];
    return sendTail(c, false, '빈칸은 다 채웠어요 — 1 → 4(PUT) → 3(GET)번으로 수정이 정말 반영되는지 보거나 정답 확인을 누르세요.'); },
  m14: c => pick(testDiag(c, 'addArticle'), testDiag(c, 'findAllArticles'), testDiag(c, 'findArticle'), '테스트가 모두 통과해요 — 정답 확인을 누르세요.').slice(0, 1),
  m15: c => pick(testDiag(c, 'saveAndFind'), '테스트가 통과해요 — 정답 확인을 누르세요.').slice(0, 1),
  m18: c => sendTail(c, false, '빈칸은 다 채웠어요 — 서비스를 부르는 요청(2번 목록)을 보내 콘솔의 ▶ ◀ 로그를 확인하세요.'),
};
const blankDiag = id => c => { const m = MISSIONS.find(x => x.id === id), miss = blanksLeft(m, c.files);
  return miss.length ? [`아직 비어 있거나 틀린 빈칸: ${miss.join(' · ')}  — 코드에서 [미션 ${id.slice(1)}] 주석이 달린 ___ 자리를 채우세요.`] : AFTER[id](c); };

/* ── 정답 예시(스니펫): 정답 확인을 2번 틀리면 힌트 패널에 열린다 ── */
const SNIP = {
  m1: '@Entity\n@Getter\n@NoArgsConstructor(access = AccessLevel.PROTECTED)\npublic class Article {\n\n    @Id\n    @GeneratedValue(strategy = GenerationType.IDENTITY)\n    private Long id;',
  m3: 'public interface BlogRepository extends JpaRepository<Article, Long> {\n}',
  m4: '@NoArgsConstructor\n@AllArgsConstructor\n@Getter\npublic class AddArticleRequest {\n    ...\n        return Article.builder()\n                .title(title)\n                .content(content)\n                .build();\n}\n\n@Getter\npublic class ArticleResponse { ... }',
  m5: '@RequiredArgsConstructor\n@Service\npublic class BlogService {\n\n    private final BlogRepository blogRepository;\n\n        return blogRepository.save(request.toEntity());\n\n        return blogRepository.findById(id)\n                .orElseThrow(() -> new IllegalArgumentException("not found: " + id));',
  m7: '@RequiredArgsConstructor\n@RestController\n@RequestMapping("/api/articles")\npublic class BlogApiController {\n\n    @PostMapping\n    public ResponseEntity<ArticleResponse> addArticle(@RequestBody AddArticleRequest request)\n\n    @GetMapping\n    public ResponseEntity<List<ArticleResponse>> findAllArticles()\n\n    @GetMapping("/{id}")\n    public ResponseEntity<ArticleResponse> findArticle(@PathVariable("id") long id)\n\n    @DeleteMapping("/{id}")\n    public ResponseEntity<Void> deleteArticle(@PathVariable("id") long id)\n\n    @PutMapping("/{id}")\n    public ResponseEntity<ArticleResponse> updateArticle(@PathVariable("id") long id,\n                                                         @RequestBody UpdateArticleRequest request)',
  m8: 'ResponseEntity.status(HttpStatus.CREATED)\n\nblogService.findAll()\n        .stream()\n        .map(ArticleResponse::new)\n        .toList();',
  m11: '@Transactional(readOnly = true)\npublic List<Article> findAll() { ... }\n\n@Transactional(readOnly = true)\npublic Article findById(long id) { ... }\n\n@Transactional\npublic Article update(long id, UpdateArticleRequest request) { ... }',
  m14: '@SpringBootTest\n@AutoConfigureMockMvc\nclass BlogApiControllerTest {\n\n    @Autowired\n    protected MockMvc mockMvc;\n    @Autowired\n    private WebApplicationContext context;\n    ... (나머지 두 필드도 @Autowired)\n\n    @BeforeEach\n    public void mockMvcSetup() { ... }\n\n    result.andExpect(status().isCreated());\n\n    @Sql("/test-db.sql")\n    @Test\n    public void findAllArticles() ...',
  m15: '@DataJpaTest\nclass BlogRepositoryTest {\n\n    @Autowired\n    BlogRepository blogRepository;\n\n    ... assertThat(blogRepository.findById(saved.getId())).isPresent();',
  m18: '@Slf4j\n@Aspect\n@Component\npublic class LogAspect {\n\n    @Around("execution(* com.example.blog.service..*(..))")',
};

/* ── 자동 채점 시나리오 (정답 확인 버튼). static: 실행 없이 코드만 검사 ── */
const VALID = '{"title":"제목","content":"내용입니다"}', PUTBODY = '{"title":"수정한 제목","content":"수정한 내용"}';
const rq = (method, path, body) => ({ method, path, body: body || '' });
const ADD = rq('POST', '/api/articles', VALID);
const AUTO = {
  m1: { static: true }, m3: { requests: [] }, m4: { static: true }, m5: { requests: [] },
  m7: { requests: [ADD, rq('GET', '/api/articles'), rq('GET', '/api/articles/1'), rq('PUT', '/api/articles/1', PUTBODY), rq('DELETE', '/api/articles/1')] },
  m8: { requests: [ADD, rq('GET', '/api/articles')] },
  m11: { requests: [ADD, rq('GET', '/api/articles'), rq('PUT', '/api/articles/1', PUTBODY), rq('GET', '/api/articles/1')] },
  m14: { tests: true }, m15: { tests: true },
  m18: { requests: [rq('GET', '/api/articles')] },
};
const RUN = {
  m1: (s, f) => okFile(f, 'Article.java') && okFile(f, 'ArticleResponse.java'),
  m3: s => s.started,
  m4: (s, f) => ['AddArticleRequest.java', 'ArticleResponse.java'].every(n => okFile(f, n)),
  m5: s => s.started,
  m7: s => { const p = s.responses.find(r => r.method === 'POST'), put = s.responses.find(r => r.method === 'PUT'), del = s.responses.find(r => r.method === 'DELETE');
    return !!p && p.status < 300 && jsonOf(p)?.title === '제목' && s.responses.some(r => r.method === 'GET' && r.path === '/api/articles' && r.status === 200) && titleIs(s.responses.find(r => r.method === 'GET' && r.path === '/api/articles/1'), '제목') && titleIs(put, '수정한 제목') && !!del && del.status === 200; },
  m8: s => s.responses.some(r => r.method === 'POST' && r.status === 201) && s.responses.some(r => r.method === 'GET' && r.status === 200 && Array.isArray(jsonOf(r)) && jsonOf(r).length > 0 && jsonOf(r).every(x => x.id != null && x.title != null)),
  m11: s => s.responses.some(r => r.method === 'GET' && r.path === '/api/articles' && r.status === 200) && titleIs(lastGet1(s), '수정한 제목'),
  m14: s => clsPass(s, 'BlogApiControllerTest', 3),
  m15: s => clsPass(s, 'BlogRepositoryTest', 1),
  m18: s => s.aspectHit,
};

/* ── 해석 미션: 핵심어 그룹마다 하나라도 들어 있으면 그 내용을 쓴 것으로 본다 (띄어쓰기 · 대소문자 무시) ── */
const norm = x => String(x || '').toLowerCase().replace(/[\s.,·()"'`\-_/:;!?~]/g, '');
function gradeAnswer(m, text) {
  const t = norm(text);
  if (!t) return { ok: false, msg: '답을 입력하세요.' };
  const pos = m.quiz.keys.map(g => Math.min(...g.map(k => { const i = t.indexOf(norm(k)); return i < 0 ? Infinity : i; })));
  const miss = pos.filter(p => p === Infinity).length;
  if (miss) return { ok: false, msg: `핵심 내용 ${pos.length}가지 중 ${miss}가지가 빠졌어요. 힌트를 열어 보세요.` };
  if (m.quiz.ordered && pos.some((p, i) => i && p < pos[i - 1])) return { ok: false, msg: '들어갈 것은 다 썼는데 순서가 달라요.' };
  return { ok: true, msg: '정답입니다!' };
}
const quiz = (id, stage, title, q, keys, answer, hints, target, study, ordered) => ({ id, kind: 'quiz', stage, title, goal: q, quiz: { keys, answer, ordered }, hints, target, study,
  criteria: '답을 입력하고 제출 — 핵심 단어가 들어 있으면 정답 (띄어쓰기 · 대소문자 무시)', check: () => false });

const blank = (id, stage, title, goal, hints, target, study) => ({ id, kind: 'blank', stage, title, goal, hints, target, study, auto: AUTO[id], snippet: SNIP[id], blanks: BLANKS[id], diagnose: blankDiag(id),
  criteria: `빈칸 ${BLANKS[id].length}개를 모두 채우고 ` + ({ static: '코드에 오류가 없으면', requests: '앱을 실행했을 때 동작하면', tests: '테스트가 통과하면' })[AUTO[id].static ? 'static' : AUTO[id].tests ? 'tests' : 'requests'] + ' 완료',
  check: (s, files) => !blanksLeft({ blanks: BLANKS[id] }, files).length && RUN[id](s, files) });

const S1 = '1단계 · 엔티티와 리포지토리 (5장)', S2 = '2단계 · DTO 와 서비스 (6장)', S3 = '3단계 · 컨트롤러 (6장)', S4 = '4단계 · 트랜잭션 (5·6장)', S5 = '5단계 · 테스트 (4·6장)', S6 = '6단계 · 설정 (5장)', S7 = '7단계 · AOP (2장)';
const MISSIONS = [
  blank('m1', S1, '[빈칸] Article 엔티티', 'Article 을 JPA 엔티티로 만드는 어노테이션 5개를 채우세요. (위 빈칸 3개는 클래스, 아래 2개는 id 필드)',
    ['클래스 위: 엔티티 표시 · Lombok getter · Lombok 기본 생성자(access 속성).', 'id 필드 위: 기본 키 + 값 생성 전략. 전략은 GenerationType 의 상수 중 하나.', 'import 는 이미 다 들어 있어요 — 이름만 맞으면 빨간 줄이 사라져요.'],
    { file: ART, find: '[미션 1]' }, 'concept:ioc'),
  quiz('m2', S1, '[해석] 기본 생성자가 필요한 이유', 'Article 의 @NoArgsConstructor(access = AccessLevel.PROTECTED) 를 지우면 앱이 뜨지 않아요. JPA 가 엔티티에 "인자 없는 생성자" 를 요구하는 이유는?',
    [['리플렉션', 'reflection', '객체를생성', '객체를만들', '인스턴스', '프록시', 'proxy', '먼저만들', '생성한뒤', '생성한후']],
    'JPA(Hibernate)는 DB 에서 읽은 행을 엔티티로 바꿀 때 리플렉션으로 인자 없는 생성자를 불러 객체를 먼저 만들고 필드를 채운다. 지연 로딩용 프록시도 엔티티를 상속해 만들기 때문에 private 이면 안 되고 protected 면 충분하다.',
    ['JPA 가 DB 행 → 객체로 바꾸는 과정을 떠올려 보세요. 생성자 인자에 뭘 넣어야 할지 JPA 는 모릅니다.', '"리플렉션" 또는 "프록시" 라는 단어가 핵심이에요.'], { file: ART, find: 'public class Article' }, 'concept:ioc'),
  blank('m3', S1, '[빈칸] BlogRepository', 'BlogRepository 가 상속할 인터페이스와 제네릭을 채우세요. 이것만 하면 save · findAll · findById · deleteById 를 공짜로 얻어요.',
    ['Spring Data JPA 의 인터페이스 이름은 Jpa 로 시작해요.', '제네릭은 <엔티티 타입, @Id 필드의 타입> 순서.', '채우고 나면 BlogService 의 빨간 줄(findAll)도 사라지고 앱이 떠요.'],
    { file: REPO, find: '[미션 3]' }, 'concept:ioc'),
  blank('m4', S2, '[빈칸] 요청 · 응답 DTO', 'AddArticleRequest 의 Lombok 어노테이션 3개와 toEntity() 의 빌더, ArticleResponse 의 getter 를 채우세요.',
    ['기본 생성자는 Jackson 이 JSON → 객체로 바꿀 때, 모든 필드 생성자는 테스트의 new AddArticleRequest(title, content) 에 쓰여요.', 'Article 의 생성자에 @Builder 가 있으니 Article.builder() 로 시작해서 .build() 로 끝나요.', 'Jackson 은 getter 로 JSON 필드를 찾아요 — getter 가 없으면 응답이 직렬화되지 않아요.'],
    { file: REQ, find: '[미션 4]' }, 'concept:flow'),
  blank('m5', S2, '[빈칸] BlogService (DI + 예외)', 'BlogService 를 빈으로 등록하고 생성자 주입이 되게 만든 뒤, save() 와 "없으면 예외" 두 곳을 채우세요.',
    ['Lombok 이 만들어 주는 생성자는 final 필드만 받아요 — final 이 없으면 주입되지 않아 null 이에요.', 'Optional 에서 값이 없을 때 예외를 던지는 메서드 + 람다: () -> new 예외("메시지" + id).', '예외 종류와 메시지는 IllegalArgumentException, "not found: " + id 그대로.'],
    { file: SVC, find: '[미션 5]' }, 'concept:ioc'),
  quiz('m6', S2, '[해석] 없는 글을 조회하면?', '서비스를 완성한 상태에서 GET /api/articles/999 (없는 글)를 보내면 응답 상태 코드는 몇이고, 왜 그런가요?',
    [['500'], ['예외', 'exception', 'illegalargument', 'orelsethrow', '처리하지않', '처리되지않', '핸들러']],
    'findById 의 orElseThrow 가 IllegalArgumentException("not found: 999") 를 던지고, 이 예외를 처리하는 @ExceptionHandler / @RestControllerAdvice 가 없으므로 스프링이 500 Internal Server Error 로 응답한다. (404 로 바꾸려면 예외 핸들러가 필요하다)',
    ['예외를 잡아 주는 코드가 하나도 없으면 스프링은 어떤 상태 코드를 쓸까요? 4xx 일까요 5xx 일까요?', '숫자 하나 + 이유(예외가 처리되지 않음)를 같이 쓰세요.'], { file: SVC, find: 'public Article findById' }, 'concept:mvc'),
  blank('m7', S3, '[빈칸] 컨트롤러 매핑', 'BlogApiController 의 클래스 어노테이션 2개, 메서드 매핑 5개, 파라미터 어노테이션을 채우세요. 시험에 가장 많이 나오는 부분이에요.',
    ['클래스: JSON 을 돌려주는 컨트롤러 + 공통 경로. 메서드에는 HTTP 메서드별 매핑과 "/{id}" 만.', '파라미터: URL 의 {id} 는 경로 변수 어노테이션, JSON 본문은 요청 본문 어노테이션.', 'PUT 은 파라미터가 두 개라 두 개 다 붙여야 해요.'],
    { file: CTL, find: '[미션 7]' }, 'concept:mvc'),
  blank('m8', S3, '[빈칸] 응답 만들기 (201 · stream)', 'POST 응답의 상태 코드(201)와, 목록 조회에서 엔티티 리스트를 ArticleResponse 리스트로 변환하는 스트림 코드의 빈칸을 채우세요.',
    ['HttpStatus 의 상수 중 201 에 해당하는 것.', 'blogService.findAll() → .stream() → .map(엔티티 → DTO) → .toList()', 'ArticleResponse 에 Article 하나를 받는 생성자가 있으니 메서드 참조 ArticleResponse::new 를 쓸 수 있어요.'],
    { file: CTL, find: '[미션 8]' }, 'concept:mvc'),
  quiz('m9', S3, '[해석] 요청이 지나가는 계층', 'POST /api/articles 요청이 들어와서 DB 에 저장되기까지 거치는 계층(클래스)을 순서대로 쓰세요.',
    [['controller', '컨트롤러'], ['service', '서비스'], ['repository', '리포지토리', '레포지토리', '레포', 'jparepository']],
    'DispatcherServlet → BlogApiController(컨트롤러: 요청 바인딩 · 응답 코드) → BlogService(서비스: 비즈니스 로직 · 트랜잭션) → BlogRepository(리포지토리: JPA 로 DB 접근) → DB. 응답은 역순으로 돌아온다.',
    ['각 계층은 바로 아래 계층만 불러요. 컨트롤러가 리포지토리를 직접 부르지 않아요.', '세 계층 이름을 화살표(→)로 이어 써 보세요.'], { file: CTL, find: 'public class BlogApiController' }, 'concept:flow', true),
  quiz('m10', S3, '[해석] 엔티티 대신 DTO 로 응답하는 이유', '컨트롤러가 Article 엔티티를 그대로 돌려주지 않고 ArticleResponse 로 바꿔서 응답하는 이유를 한 가지 이상 쓰세요.',
    [['노출', '스펙', '결합', '순환', '지연', 'lazy', '바뀌', '변경', '필요한', '분리', '보안', '숨기']],
    '엔티티를 그대로 내보내면 DB 구조가 API 스펙에 그대로 노출되고, 엔티티를 고칠 때마다 API 도 바뀐다(강한 결합). 연관관계가 있으면 지연 로딩 예외나 JSON 순환 참조가 생길 수 있다. DTO 로 필요한 필드만 골라 내보내면 이 문제가 없다.',
    ['엔티티를 고치면 API 응답은 어떻게 될까요?', '"노출", "결합", "순환 참조" 중 하나를 써 보세요.'], { file: J + 'dto/ArticleResponse.java', find: 'public class ArticleResponse' }, 'concept:flow'),
  blank('m11', S4, '[빈칸] 트랜잭션', '조회 메서드 두 개는 읽기 전용 트랜잭션으로, update() 는 쓰기 트랜잭션으로 만드세요. update() 는 save() 를 부르지 않는다는 점에 주목!',
    ['같은 어노테이션 하나로 세 곳 모두 — 읽기 전용은 속성 하나를 true 로.', 'update() 에 트랜잭션이 없으면 응답은 바뀌어 보여도 다시 GET 하면 그대로예요 (채점은 다시 GET 해서 확인).', 'import 는 jakarta 것이 아니라 org.springframework.transaction.annotation 의 것 (이미 들어 있어요).'],
    { file: SVC, find: '[미션 11]' }, 'concept:psa'),
  quiz('m12', S4, '[해석] save() 없이 수정되는 이유', 'BlogService.update() 는 save() 를 부르지 않는데도 DB 에 수정이 반영돼요. 어떤 기능 때문이고, UPDATE 쿼리는 언제 실행되나요?',
    [['변경감지', '더티체킹', 'dirtychecking', 'dirty'], ['커밋', 'commit', 'flush', '플러시', '트랜잭션이끝', '트랜잭션종료', '끝날때', '종료될때']],
    '영속성 컨텍스트의 변경 감지(dirty checking). findById 로 꺼낸 엔티티는 영속 상태라 처음 상태(스냅샷)가 저장되고, 트랜잭션이 커밋될 때 flush 하면서 스냅샷과 달라진 필드를 찾아 UPDATE 쿼리를 보낸다.',
    ['영속성 컨텍스트가 엔티티의 "처음 모습" 을 기억해 둬요.', '기능 이름(○○ 감지) + 시점(트랜잭션 ○○ 때) 두 가지를 쓰세요.'], { file: SVC, find: 'public Article update' }, 'concept:psa'),
  quiz('m13', S4, '[해석] update() 를 readOnly 로 하면?', 'update() 의 @Transactional 을 @Transactional(readOnly = true) 로 바꾸고 PUT 을 보낸 뒤 다시 GET 하면 제목은 바뀌어 있을까요? 이유도 쓰세요.',
    [['안바뀌', '안바뀐', '바뀌지않', '반영되지않', '반영안', '그대로', '유지', '원래', '이전'], ['flush', '플러시', '변경감지', '읽기전용', 'readonly', '스냅샷']],
    '바뀌지 않는다. 읽기 전용 트랜잭션은 flush 를 하지 않고 변경 감지(스냅샷 비교)도 생략하므로, 엔티티 값을 바꿔도 UPDATE 쿼리가 나가지 않는다. (응답 JSON 은 메모리의 엔티티라 바뀌어 보일 수 있다)',
    ['readOnly = true 는 "읽기만 하니까 ○○ 를 생략" 한다는 뜻이에요.', '결과(바뀐다/안 바뀐다) + 이유(flush 또는 변경 감지)를 쓰세요.'], { file: SVC, find: 'public Article update' }, 'concept:psa'),
  blank('m14', S5, '[빈칸] 컨트롤러 테스트', 'BlogApiControllerTest 의 클래스 어노테이션 2개, 필드 주입, @BeforeEach 자리, 기대 상태 코드, @Sql 두 곳을 채우세요.',
    ['클래스: 애플리케이션 전체를 띄우는 테스트 + MockMvc 자동 구성.', '필드 네 개 모두 같은 주입 어노테이션. 매 테스트 전에 실행할 메서드에는 Before 로 시작하는 JUnit 어노테이션.', '@Sql 의 값은 "/test-db.sql". POST 는 201 이니 status().is○○○().'],
    { file: CT, find: '[미션 14]' }, 'concept:testing'),
  blank('m15', S5, '[빈칸] @DataJpaTest', 'BlogRepositoryTest 를 리포지토리만 띄우는 슬라이스 테스트로 만들고, 리포지토리를 주입받으세요.',
    ['JPA 관련 빈(엔티티 · 리포지토리)만 띄우는 테스트 어노테이션은 Data 로 시작해요.', '필드 주입은 컨트롤러 테스트와 같은 어노테이션.', '이 테스트는 테스트마다 롤백돼서 서로 영향을 주지 않아요.'],
    { file: TT + 'repository/BlogRepositoryTest.java', find: '[미션 15]' }, 'concept:testing'),
  quiz('m16', S5, '[해석] @SpringBootTest vs @DataJpaTest', '@SpringBootTest 와 @DataJpaTest 는 각각 무엇을 띄우나요? 차이를 쓰세요.',
    [['전체', '모든빈', '전부', '애플리케이션', '통합'], ['jpa', '리포지토리', 'repository', '엔티티', '슬라이스', '일부', '데이터']],
    '@SpringBootTest 는 애플리케이션 전체(모든 빈)를 띄우는 통합 테스트라 느리지만 컨트롤러 → 서비스 → 리포지토리를 함께 검증한다. @DataJpaTest 는 JPA 관련 빈(엔티티 · 리포지토리 · DataSource)만 띄우는 슬라이스 테스트이고, 테스트마다 트랜잭션을 롤백한다.',
    ['하나는 "전부", 하나는 "일부(슬라이스)" 를 띄워요.', '@DataJpaTest 가 띄우는 "일부" 가 무엇인지까지 쓰세요.'], { file: TT + 'repository/BlogRepositoryTest.java', find: 'class BlogRepositoryTest' }, 'concept:testing'),
  quiz('m17', S6, '[해석] defer 설정이 없으면?', 'application.yaml 의 defer-datasource-initialization: true 줄을 지우면 앱이 Table "BOOK" not found 로 뜨지 않아요. 왜 그런가요?',
    [['먼저', '전에', '이전', '순서', '앞서', 'before'], ['테이블', 'table', 'ddl', 'hibernate', 'jpa', '생성']],
    'data.sql 은 기본적으로 Hibernate(JPA)가 엔티티를 보고 테이블을 만드는 것보다 "먼저" 실행된다. 그래서 book 테이블이 아직 없어 insert 가 실패한다. spring.jpa.defer-datasource-initialization: true 로 data.sql 실행을 테이블 생성 뒤로 미룬다.',
    ['두 가지 일이 일어나는 순서를 생각해 보세요: ① 테이블 생성 ② data.sql 실행.', '"무엇보다 먼저 실행되는지" 를 쓰세요.'], { file: YAML, find: 'spring:' }, 'concept:boot'),
  blank('m18', S7, '[빈칸] LogAspect', 'LogAspect 의 어노테이션 빈칸 2개와 포인트컷의 패키지 이름 빈칸을 채우세요.',
    ['Aspect 표시와 빈 등록은 별개예요 — 둘 다 필요해요.', '포인트컷 execution(* 패키지..*(..)) 에는 BlogService 의 package 선언 마지막 이름이 들어가요.', '고친 뒤 목록 요청을 보내면 콘솔에 ▶ ◀ 로그가 찍혀요.'],
    { file: ASP, find: '[미션 18]' }, 'concept:aop'),
  quiz('m19', S7, '[해석] @Aspect 만으로는 안 되는 이유', 'LogAspect 에 @Aspect 만 붙이고 @Component 를 안 붙이면 로그가 찍히지 않아요. 이유는?',
    [['빈', 'bean', '등록', '컨테이너', '스캔', '관리']],
    '@Aspect 는 "이 클래스는 Aspect 다" 라는 표시일 뿐 빈 등록이 아니다. 스프링 컨테이너가 관리하는 빈이어야 AOP 가 이 Aspect 를 보고 대상 빈의 프록시를 만든다. 그래서 @Component(또는 @Bean 등록)가 필요하다.',
    ['스프링 AOP 는 컨테이너가 "알고 있는" Aspect 만 적용해요.', '"빈" 이라는 단어가 들어가야 해요.'], { file: ASP, find: 'public class LogAspect' }, 'concept:aop'),
];

Object.assign(IDE, { MISSIONS, gradeAnswer });
})();
