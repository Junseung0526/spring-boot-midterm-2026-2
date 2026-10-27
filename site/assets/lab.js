/* 실습실: 빈칸 코드 완성 · MVC 요청 시뮬레이터 · 디버깅 · AOP 샌드박스 */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ═════════ 1. 빈칸 코드 완성 ═════════ */
const LABS = [
  { title: 'REST 컨트롤러', goal: '게시글 조회/생성 API 컨트롤러를 완성하세요.',
    code: `@{{1}}
@RequestMapping("/api/posts")
public class PostController {
  private final PostService postService;

  public PostController(PostService postService) {
    this.postService = postService;
  }

  @{{2}}("/{id}")
  public PostResponse get(@{{3}} Long id) {
    return postService.find(id);
  }

  @{{4}}
  @ResponseStatus(HttpStatus.CREATED)
  public PostResponse create(@Valid @{{5}} PostRequest req) {
    return postService.create(req);
  }
}`,
    b: [
      { a: 'RestController', o: ['RestController', 'Controller', 'Service', 'Component'], e: 'JSON 을 바로 응답하는 API 컨트롤러는 @RestController (= @Controller + @ResponseBody).' },
      { a: 'GetMapping', o: ['GetMapping', 'PostMapping', 'RequestMapping', 'PutMapping'], e: '조회는 GET → @GetMapping.' },
      { a: 'PathVariable', o: ['PathVariable', 'RequestParam', 'RequestBody', 'ModelAttribute'], e: '"/{id}" 경로 변수는 @PathVariable.' },
      { a: 'PostMapping', o: ['PostMapping', 'GetMapping', 'DeleteMapping', 'PatchMapping'], e: '생성은 POST → @PostMapping.' },
      { a: 'RequestBody', o: ['RequestBody', 'PathVariable', 'RequestParam', 'ResponseBody'], e: 'JSON 본문 → 객체 변환은 @RequestBody (HttpMessageConverter).' },
    ] },
  { title: '서비스 + 트랜잭션', goal: '서비스 계층을 생성자 주입과 트랜잭션으로 완성하세요.',
    code: `@{{1}}
@Transactional({{2}} = true)
@RequiredArgsConstructor
public class PostService {
  private {{3}} PostRepository repo;

  @Transactional
  public PostResponse create(PostRequest req) {
    Post saved = repo.{{4}}(new Post(req.title(), req.content()));
    return PostResponse.from(saved);
  }

  public PostResponse find(Long id) {
    return repo.findById(id)
        .map(PostResponse::from)
        .{{5}}(() -> new PostNotFoundException(id));
  }
}`,
    b: [
      { a: 'Service', o: ['Service', 'Repository', 'Controller', 'Configuration'], e: '비즈니스 로직 계층 → @Service.' },
      { a: 'readOnly', o: ['readOnly', 'rollbackFor', 'propagation', 'timeout'], e: '클래스 기본은 조회 전용(readOnly = true), 쓰기 메서드에서 @Transactional 로 덮어씁니다.' },
      { a: 'final', o: ['final', 'static', 'volatile', 'abstract'], e: '@RequiredArgsConstructor 는 final 필드로 생성자를 만들기 때문에 final 이 필요합니다.' },
      { a: 'save', o: ['save', 'persist', 'insert', 'create'], e: 'JpaRepository 의 저장 메서드는 save().' },
      { a: 'orElseThrow', o: ['orElseThrow', 'orElse', 'get', 'ifPresent'], e: 'Optional 이 비었을 때 예외를 던지는 메서드는 orElseThrow.' },
    ] },
  { title: '설정 클래스 / 빈 등록', goal: '외부 객체를 빈으로 등록하고 설정값을 주입하세요.',
    code: `@{{1}}
public class AppConfig {

  @{{2}}("\${blog.title:내 블로그}")
  private String title;

  @{{3}}
  public Clock clock() {
    return Clock.systemUTC();
  }

  @Bean
  @{{4}}("dev")
  public DataLoader devDataLoader() {
    return new DataLoader();
  }
}

@{{5}}(prefix = "blog")
public record BlogProps(String title, int pageSize) { }`,
    b: [
      { a: 'Configuration', o: ['Configuration', 'Component', 'Service', 'Import'], e: '@Bean 메서드를 담는 설정 클래스는 @Configuration.' },
      { a: 'Value', o: ['Value', 'Autowired', 'Qualifier', 'Resource'], e: '${...} 프로퍼티 주입은 @Value.' },
      { a: 'Bean', o: ['Bean', 'Component', 'Primary', 'Scope'], e: '메서드 반환 객체를 빈으로 등록 → @Bean.' },
      { a: 'Profile', o: ['Profile', 'Conditional', 'Lazy', 'Order'], e: '특정 프로파일에서만 등록 → @Profile("dev").' },
      { a: 'ConfigurationProperties', o: ['ConfigurationProperties', 'Value', 'PropertySource', 'EnableAutoConfiguration'], e: 'prefix 로 설정을 객체에 묶어 바인딩 → @ConfigurationProperties.' },
    ] },
  { title: 'AOP 실행시간 측정', goal: '서비스 계층 전체의 실행 시간을 측정하는 Aspect 를 완성하세요.',
    code: `@{{1}}
@Component
public class TimingAspect {

  @{{2}}("execution(* com.example.blog.service..*(..))")
  void serviceLayer() { }

  @{{3}}("serviceLayer()")
  public Object measure({{4}} pjp) throws Throwable {
    long start = System.nanoTime();
    Object result = pjp.{{5}}();
    long ms = (System.nanoTime() - start) / 1_000_000;
    log.info("{} took {} ms", pjp.getSignature(), ms);
    return result;
  }
}`,
    b: [
      { a: 'Aspect', o: ['Aspect', 'Advice', 'Component', 'Configuration'], e: '횡단 관심사 모음 클래스 → @Aspect (빈 등록용 @Component 도 필요).' },
      { a: 'Pointcut', o: ['Pointcut', 'Before', 'Around', 'Target'], e: '적용 대상을 표현식으로 지정 → @Pointcut.' },
      { a: 'Around', o: ['Around', 'Before', 'After', 'AfterReturning'], e: '실행 전후를 모두 제어하려면 @Around.' },
      { a: 'ProceedingJoinPoint', o: ['ProceedingJoinPoint', 'JoinPoint', 'MethodInvocation', 'Signature'], e: '@Around 는 proceed() 가 있는 ProceedingJoinPoint 를 받습니다. (JoinPoint 에는 proceed 없음)' },
      { a: 'proceed', o: ['proceed', 'invoke', 'execute', 'run'], e: 'pjp.proceed() 가 실제 대상 메서드를 호출합니다.' },
    ] },
  { title: '전역 예외 처리', goal: '존재하지 않는 게시글 예외를 404 JSON 으로 응답하세요.',
    code: `@{{1}}
public class GlobalExceptionHandler {

  @{{2}}(PostNotFoundException.class)
  @ResponseStatus(HttpStatus.{{3}})
  public ErrorResponse notFound(PostNotFoundException e) {
    return new ErrorResponse(e.getMessage());
  }

  @ExceptionHandler({{4}}.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ErrorResponse invalid(MethodArgumentNotValidException e) {
    return new ErrorResponse("{{5}} 실패");
  }
}`,
    b: [
      { a: 'RestControllerAdvice', o: ['RestControllerAdvice', 'RestController', 'ControllerAspect', 'Configuration'], e: '모든 컨트롤러에 적용되는 전역 예외 처리 + JSON 응답 → @RestControllerAdvice.' },
      { a: 'ExceptionHandler', o: ['ExceptionHandler', 'ResponseStatus', 'Catch', 'AfterThrowing'], e: '특정 예외를 잡는 메서드 → @ExceptionHandler.' },
      { a: 'NOT_FOUND', o: ['NOT_FOUND', 'BAD_REQUEST', 'NO_CONTENT', 'INTERNAL_SERVER_ERROR'], e: '존재하지 않는 리소스 → 404 NOT_FOUND.' },
      { a: 'MethodArgumentNotValidException', o: ['MethodArgumentNotValidException', 'NullPointerException', 'IllegalStateException', 'ConstraintViolation'], e: '@Valid @RequestBody 검증 실패 시 던져지는 예외.' },
      { a: '검증', o: ['검증', '인증', '권한', '연결'], e: '입력 검증(Validation) 실패 메시지.' },
    ] },
  { title: '컨트롤러 슬라이스 테스트', goal: 'Boot 4 기준의 @WebMvcTest 를 완성하세요.',
    code: `@{{1}}(PostController.class)
class PostControllerTest {

  @Autowired MockMvc mockMvc;

  @{{2}}
  PostService postService;

  @Test
  void getPost() throws Exception {
    given(postService.find(1L)).willReturn(new PostResponse(1L, "제목", "내용"));

    mockMvc.perform({{3}}("/api/posts/1"))
        .andExpect(status().{{4}}())
        .andExpect(jsonPath("$.title").value("{{5}}"));
  }
}`,
    b: [
      { a: 'WebMvcTest', o: ['WebMvcTest', 'SpringBootTest', 'DataJpaTest', 'JsonTest'], e: '웹 계층만 로드하는 슬라이스 테스트 → @WebMvcTest.' },
      { a: 'MockitoBean', o: ['MockitoBean', 'MockBean', 'Mock', 'InjectMocks'], e: 'Boot 4 에서는 @MockBean 이 제거되어 @MockitoBean 을 씁니다.' },
      { a: 'get', o: ['get', 'post', 'fetch', 'request'], e: 'MockMvcRequestBuilders.get(url) 로 GET 요청을 만듭니다.' },
      { a: 'isOk', o: ['isOk', 'isCreated', 'isNotFound', 'is2xx'], e: '200 OK 검증 → status().isOk().' },
      { a: '제목', o: ['제목', '내용', '1', 'title'], e: 'willReturn 에서 title 은 "제목" 으로 설정했으므로 JSON 값도 "제목".' },
    ] },
];

const fillRoot = $('#lab-fill');
let labIdx = 0, labCache = {};
function renderFill() {
  const lab = LABS[labIdx];
  const opts = (labCache[labIdx] ??= lab.b.map(b => shuffle(b.o)));
  let n = 0;
  const html = esc(lab.code).replace(/\{\{(\d)\}\}/g, (_, k) => {
    const i = +k - 1;
    return `<select data-i="${i}"><option value="">?</option>${opts[i].map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select>`;
  });
  fillRoot.innerHTML = `<div class="tabbar">${LABS.map((l, i) => `<button type="button" class="${i === labIdx ? 'on' : ''}" data-lab="${i}">${i + 1}. ${l.title}</button>`).join('')}</div>
    <p><b>🎯 목표</b> — ${esc(lab.goal)}</p>
    <div class="codewrap"><div class="codehead"><span>빈칸(?)을 골라 코드를 완성하세요</span></div><pre class="labpre"><code>${html}</code></pre></div>
    <div class="cardctl" style="justify-content:flex-start"><button type="button" class="primary" data-lab-act="check">채점하기</button>
    <button type="button" data-lab-act="reveal">정답 보기</button><button type="button" data-lab-act="reset">다시 풀기</button></div>
    <div id="lab-res"></div>`;
}
fillRoot.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.lab !== undefined) { labIdx = +t.dataset.lab; renderFill(); return; }
  const lab = LABS[labIdx], sels = $$('select', fillRoot);
  if (t.dataset.labAct === 'reset') { delete labCache[labIdx]; renderFill(); }
  if (t.dataset.labAct === 'reveal') { sels.forEach(s => { s.value = lab.b[+s.dataset.i].a; s.className = 'ok'; }); }
  if (t.dataset.labAct === 'check' || t.dataset.labAct === 'reveal') {
    let ok = 0;
    const rows = sels.map(s => {
      const b = lab.b[+s.dataset.i], good = s.value === b.a;
      s.className = good ? 'ok' : 'no'; if (good) ok++;
      return `<li class="${good ? 'g' : 'x'}"><b>${+s.dataset.i + 1}번</b> ${good ? '✓ 정답' : s.value ? `✗ 정답은 <code>${esc(b.a)}</code>` : '… 미선택'} — ${esc(b.e)}</li>`;
    }).join('');
    $('#lab-res').innerHTML = `<div class="result ${ok === sels.length ? 'ok' : 'no'}"><b>${ok} / ${sels.length}</b> ${ok === sels.length ? '— 완벽! 🎉' : '— 해설을 보고 다시 도전!'}</div><ul class="explist">${rows}</ul>`;
  }
});
renderFill();

/* ═════════ 2. MVC 요청 시뮬레이터 ═════════ */
const ROUTES = [
  { m: 'GET', p: '/api/posts', sig: 'list()' },
  { m: 'GET', p: '/api/posts/search', sig: 'search(@RequestParam String keyword)' },
  { m: 'GET', p: '/api/posts/{id}', sig: 'get(@PathVariable Long id)' },
  { m: 'POST', p: '/api/posts', sig: 'create(@Valid @RequestBody PostRequest req)' },
  { m: 'PUT', p: '/api/posts/{id}', sig: 'update(@PathVariable Long id, @Valid @RequestBody PostRequest req)' },
  { m: 'DELETE', p: '/api/posts/{id}', sig: 'delete(@PathVariable Long id)' },
];
ROUTES.forEach(r => { r.re = new RegExp('^' + r.p.replace(/\{(\w+)\}/g, '(?<$1>[^/]+)') + '/?$'); r.vars = (r.p.match(/\{/g) || []).length; });
let DB = [{ id: 1, title: '스프링 시작', content: '부트 4 입문' }, { id: 2, title: 'AOP 정리', content: '프록시 기반' }], seq = 3;

function simulate(method, rawUrl, body) {
  const T = [];  // trace
  const add = (ok, text) => T.push({ ok, text });
  const fail = (status, ex, why, json) => { add(false, `예외 <b>${ex}</b> — ${why}`); return { T, status, json }; };
  let url; try { url = new URL(rawUrl, 'http://localhost:8080'); } catch { return fail(400, 'IllegalArgument', 'URL 형식 오류', { error: 'bad url' }); }
  add(true, `Tomcat → <b>DispatcherServlet</b> 이 <code>${method} ${esc(url.pathname + url.search)}</code> 수신`);
  const cands = ROUTES.filter(r => r.re.test(url.pathname));
  if (!cands.length) { add(false, 'HandlerMapping: 일치하는 핸들러 없음'); return { T, status: 404, json: { status: 404, error: 'Not Found (NoResourceFoundException)', path: url.pathname } }; }
  const byM = cands.filter(r => r.m === method);
  if (!byM.length) { add(false, `HandlerMapping: 경로는 맞지만 ${method} 를 지원하는 핸들러 없음`); return { T, status: 405, json: { status: 405, error: 'Method Not Allowed (HttpRequestMethodNotSupportedException)', allow: cands.map(r => r.m) } }; }
  byM.sort((a, b) => a.vars - b.vars);
  const r = byM[0];
  add(true, `HandlerMapping → <code>${r.m} ${r.p}</code> ⇒ <code>${esc(r.sig)}</code>${byM.length > 1 ? ' <small>(여러 후보 중 리터럴이 많은 가장 구체적인 패턴 선택)</small>' : ''}`);
  add(true, 'HandlerAdapter → ArgumentResolver 동작');
  const g = r.re.exec(url.pathname).groups || {};
  let id = null;
  if ('id' in g) {
    if (!/^\d+$/.test(g.id)) return fail(400, 'MethodArgumentTypeMismatchException', `@PathVariable Long id 에 "${esc(g.id)}" 변환 불가`, { status: 400, error: 'Bad Request' });
    id = +g.id; add(true, `@PathVariable id = ${id}`);
  }
  let kw = null;
  if (r.sig.includes('@RequestParam')) {
    kw = url.searchParams.get('keyword');
    if (kw === null) return fail(400, 'MissingServletRequestParameterException', '필수 @RequestParam "keyword" 누락', { status: 400, error: 'Required parameter keyword is not present' });
    add(true, `@RequestParam keyword = "${esc(kw)}"`);
  }
  let req = null;
  if (r.sig.includes('@RequestBody')) {
    try { req = JSON.parse(body); if (typeof req !== 'object' || !req) throw 0; } catch { return fail(400, 'HttpMessageNotReadableException', '@RequestBody JSON 파싱 실패 (HttpMessageConverter)', { status: 400, error: 'Malformed JSON request' }); }
    add(true, `@RequestBody → PostRequest(title="${esc(req.title ?? '')}", content="${esc(req.content ?? '')}") 변환 성공 (Jackson)`);
    const errs = [];
    if (typeof req.title !== 'string' || !req.title.trim()) errs.push('title: 공백일 수 없습니다 (@NotBlank)');
    else if (req.title.length > 100) errs.push('title: 100자 이하 (@Size)');
    if (typeof req.content !== 'string' || !req.content.trim()) errs.push('content: 공백일 수 없습니다 (@NotBlank)');
    if (errs.length) return fail(400, 'MethodArgumentNotValidException', '@Valid 검증 실패 → 컨트롤러 실행 전에 차단', { status: 400, errors: errs });
    add(true, '@Valid 검증 통과 ✓');
  }
  add(true, `Controller.${esc(r.sig.split('(')[0])}() 실행 → Service(@Transactional 시작) → Repository`);
  const found = id !== null ? DB.find(p => p.id === id) : null;
  const done = (status, json, extra) => { add(true, `Service 종료 → 트랜잭션 커밋 ✓ ${extra || ''}`); add(true, `${typeof json === 'undefined' ? '본문 없음' : 'HttpMessageConverter: 객체 → JSON'} → <b>${status}</b> 응답`); return { T, status, json }; };
  if (r.sig.startsWith('list')) return done(200, DB);
  if (r.sig.startsWith('search')) return done(200, DB.filter(p => (p.title + p.content).includes(kw)));
  if (r.sig.startsWith('create')) { const p = { id: seq++, title: req.title, content: req.content }; DB.push(p); return done(201, p, '(INSERT 실행)'); }
  if (id !== null && !found) {
    add(false, `Service: findById(${id}) 비어 있음 → <b>PostNotFoundException</b> 발생 (RuntimeException → 트랜잭션 롤백)`);
    add(true, '@RestControllerAdvice 의 @ExceptionHandler 가 예외를 404 JSON 으로 변환');
    return { T, status: 404, json: { message: `게시글 ${id} 를 찾을 수 없습니다` } };
  }
  if (r.sig.startsWith('get')) return done(200, found);
  if (r.sig.startsWith('update')) { found.title = req.title; found.content = req.content; return done(200, found, '(UPDATE · 변경 감지)'); }
  DB = DB.filter(p => p.id !== id); return done(204, undefined, '(DELETE 실행)');
}

const mvcRoot = $('#lab-mvc');
function renderMvc(last) {
  const sel = last?.m ?? 'GET', url = last?.u ?? '/api/posts/1', body = last?.b ?? '{\n  "title": "새 글",\n  "content": "내용"\n}';
  const presets = [['GET', '/api/posts'], ['GET', '/api/posts/1'], ['GET', '/api/posts/999'], ['GET', '/api/posts/abc'], ['GET', '/api/posts/search'], ['GET', '/api/posts/search?keyword=AOP'], ['POST', '/api/posts', '{"title":"","content":"x"}'], ['POST', '/api/posts', '{"title":"새 글","content":"안녕"}'], ['DELETE', '/api/posts/1'], ['PATCH', '/api/posts/1'], ['GET', '/api/nothing']];
  const code = ROUTES.map(r => `@${r.m[0] + r.m.slice(1).toLowerCase()}Mapping("${r.p.replace('/api/posts', '')}")  ${r.sig}`).join('\n');
  mvcRoot.innerHTML = `<div class="grid2"><div>
      <h4>① 컨트롤러 매핑 (읽기 전용)</h4><div class="codewrap"><div class="codehead"><span>@RequestMapping("/api/posts")</span></div><pre><code>${esc(code)}</code></pre></div>
      <h4>② 요청 보내기</h4>
      <form class="mvcform"><select id="m-method">${['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => `<option ${m === sel ? 'selected' : ''}>${m}</option>`).join('')}</select>
      <input id="m-url" value="${esc(url)}" spellcheck="false"><button class="primary" type="submit">전송 ▶</button></form>
      <textarea id="m-body" rows="4" spellcheck="false" aria-label="요청 본문(JSON)">${esc(body)}</textarea>
      <div class="filters">${presets.map((p, i) => `<button type="button" class="chip" data-pre="${i}">${p[0]} ${esc(p[1].replace('/api/posts', '') || '/')}${p[2] ? ' ✎' : ''}</button>`).join('')}</div>
    </div><div>
      <h4>③ 처리 과정 (DispatcherServlet 추적)</h4><div id="m-trace" class="trace muted">요청을 보내면 단계별로 표시됩니다.</div>
      <h4>④ 응답</h4><div id="m-res" class="codewrap"><pre><code>—</code></pre></div>
      <h4>🗄 현재 DB (posts 테이블)</h4><div class="tablewrap"><table><thead><tr><th>id</th><th>title</th><th>content</th></tr></thead><tbody>${DB.map(p => `<tr><td>${p.id}</td><td>${esc(p.title)}</td><td>${esc(p.content)}</td></tr>`).join('') || '<tr><td colspan=3>(비어 있음)</td></tr>'}</tbody></table></div>
      <button type="button" class="chip ghost" id="m-reset">DB 초기화</button>
    </div></div>`;
  mvcRoot._presets = presets;
}
mvcRoot.addEventListener('submit', e => {
  e.preventDefault();
  const m = $('#m-method').value, u = $('#m-url').value.trim(), b = $('#m-body').value;
  const r = simulate(m, u, b);
  renderMvc({ m, u, b });
  $('#m-trace').className = 'trace';
  $('#m-trace').innerHTML = '<ol>' + r.T.map(t => `<li class="${t.ok ? 'g' : 'x'}">${t.text}</li>`).join('') + '</ol>';
  const st = r.status, cls = st < 300 ? 's2' : st < 500 ? 's4' : 's5';
  $('#m-res').innerHTML = `<div class="codehead"><span class="status ${cls}">HTTP ${st}</span></div><pre><code>${r.json === undefined ? '(본문 없음)' : esc(JSON.stringify(r.json, null, 2))}</code></pre>`;
});
mvcRoot.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.id === 'm-reset') { DB = [{ id: 1, title: '스프링 시작', content: '부트 4 입문' }, { id: 2, title: 'AOP 정리', content: '프록시 기반' }]; seq = 3; renderMvc(); }
  if (t.dataset.pre !== undefined) {
    const p = mvcRoot._presets[+t.dataset.pre];
    $('#m-method').value = p[0]; $('#m-url').value = p[1]; if (p[2]) $('#m-body').value = p[2];
    $('.mvcform').requestSubmit();
  }
});
renderMvc();

/* ═════════ 3. 디버깅 실습 ═════════ */
const BUGS = [
  { t: '빈을 찾을 수 없다', code: `// PostService.java\npublic class PostService {          // ← 어노테이션 없음\n  public Post find(Long id) { … }\n}\n\n@RestController\nclass PostController {\n  PostController(PostService service) { … }\n}`,
    log: `Parameter 0 of constructor in PostController required a bean of type 'PostService' that could not be found.\nNoSuchBeanDefinitionException`,
    o: ['PostService 에 @Service 를 붙여 스캔 대상(빈)으로 만든다', 'PostController 에 @Autowired 를 추가한다', 'PostService 를 final 로 만든다', 'application.yml 에 port 를 바꾼다'], a: 0,
    e: '컴포넌트 스캔 대상(@Component 계열)이 아니라 컨테이너에 빈이 없습니다. @Service 를 붙이거나 @Bean 으로 등록하세요.' },
  { t: '같은 타입 빈이 둘', code: `interface Pay { void pay(); }\n\n@Component class KakaoPay implements Pay { … }\n@Component class NaverPay implements Pay { … }\n\n@Service\nclass OrderService {\n  OrderService(Pay pay) { … }\n}`,
    log: `NoUniqueBeanDefinitionException: expected single matching bean but found 2: kakaoPay,naverPay`,
    o: ['둘 중 하나를 지운다 (유일한 방법)', '@Primary 또는 @Qualifier("kakaoPay") 로 주입 대상을 지정한다', '@Lazy 를 붙인다', '@Scope("prototype") 을 붙인다'], a: 1,
    e: '타입으로 후보가 둘이라 모호합니다. @Primary(기본 선택) 또는 @Qualifier(이름 지정)로 해결합니다.' },
  { t: '순환 의존', code: `@Service\nclass AService {\n  AService(BService b) { … }\n}\n@Service\nclass BService {\n  BService(AService a) { … }\n}`,
    log: `BeanCurrentlyInCreationException: Requested bean is currently in creation: Is there an unresolvable circular reference?`,
    o: ['필드 주입으로 바꿔서 숨긴다', '책임을 분리해 의존 방향을 한쪽으로 정리한다 (공통 로직을 C 로 추출)', '@Autowired 를 둘 다 붙인다', '@Transactional 을 붙인다'], a: 1,
    e: '생성자 주입은 순환참조를 시작 시점에 드러내 줍니다(장점). 설계를 고쳐 의존을 단방향으로 만드는 것이 정답입니다. (부트는 기본적으로 순환 참조를 금지)' },
  { t: '트랜잭션이 안 먹는다', code: `@Service\nclass OrderService {\n  public void placeOrder() {\n    saveOrder();          // 같은 클래스 내부 호출\n    …\n  }\n\n  @Transactional\n  public void saveOrder() { … 예외 발생 … }\n}`,
    log: `예외가 났는데 DB 에 데이터가 롤백되지 않고 저장되어 있다.`,
    o: ['saveOrder 를 private 으로 바꾼다', '자기 호출(self-invocation)이라 프록시를 우회함 → 별도 빈으로 분리하거나 placeOrder 에 @Transactional 을 붙인다', 'DB 드라이버를 교체한다', '@EnableTransactionManagement 를 제거한다'], a: 1,
    e: '같은 객체 안의 this.메서드() 호출은 프록시를 거치지 않아 어드바이스(@Transactional)가 적용되지 않습니다.' },
  { t: '체크 예외인데 롤백 안 됨', code: `@Transactional\npublic void pay() throws IOException {\n  repo.save(...);\n  throw new IOException("결제 실패");\n}`,
    log: `IOException 이 발생했지만 repo.save 결과가 커밋되었다.`,
    o: ['@Transactional(rollbackFor = Exception.class) 로 지정한다', 'readOnly = true 를 붙인다', 'IOException 을 삼킨다', '@Async 를 붙인다'], a: 0,
    e: '기본 롤백 대상은 RuntimeException/Error 뿐입니다. 체크 예외는 rollbackFor 로 명시해야 롤백됩니다.' },
  { t: '빈이 스캔되지 않는다', code: `com.example.blog.BlogApplication   ← @SpringBootApplication\ncom.example.blog.service.PostService  ✔\ncom.example.common.Util  (@Component)  ← 다른 최상위 패키지`,
    log: `NoSuchBeanDefinitionException: No qualifying bean of type 'com.example.common.Util'`,
    o: ['@ComponentScan 범위 밖이므로 scanBasePackages 를 넓히거나 패키지를 이동한다', 'Util 에 @Service 를 추가한다', 'final 을 제거한다', '메인 메서드를 static 으로 바꾼다'], a: 0,
    e: '@SpringBootApplication 의 스캔 기준은 메인 클래스의 패키지와 그 하위입니다. 범위 밖 클래스는 스캔되지 않습니다.' },
  { t: 'JSON 대신 화면 이름이 나온다', code: `@Controller\nclass PostController {\n  @GetMapping("/api/posts/1")\n  PostResponse get() { return new PostResponse(1L, "제목"); }\n}`,
    log: `Whitelabel / TemplateInputException: Error resolving template [...] — JSON 이 아닌 뷰 이름으로 해석됨`,
    o: ['@RestController 로 바꾸거나 메서드에 @ResponseBody 를 붙인다', 'Jackson 의존성을 지운다', '@Service 로 바꾼다', 'produces 를 지운다'], a: 0,
    e: '@Controller 의 반환값은 뷰 이름으로 해석됩니다. 응답 본문으로 쓰려면 @ResponseBody(@RestController).' },
];
const bugRoot = $('#lab-bug');
let bi = 0, bpick = null, bscore = 0, bdone = new Set();
function renderBug() {
  const b = BUGS[bi];
  const o = b.o.map((t, k) => `<button type="button" class="opt ${bpick === null ? '' : k === b.a ? 'right' : k === bpick ? 'wrong' : 'dim'}" data-k="${k}" ${bpick !== null ? 'disabled' : ''}>${esc(t)}</button>`).join('');
  bugRoot.innerHTML = `<div class="tabbar">${BUGS.map((x, i) => `<button type="button" class="${i === bi ? 'on' : ''}" data-bug="${i}">${bdone.has(i) ? '✓ ' : ''}${i + 1}. ${x.t}</button>`).join('')}</div>
    <div class="grid2"><div><h4>🧩 코드</h4><div class="codewrap"><pre><code>${esc(b.code)}</code></pre></div></div>
    <div><h4>🚨 에러 로그</h4><div class="codewrap logbox"><pre><code>${esc(b.log)}</code></pre></div></div></div>
    <h4>원인과 해결책은?</h4><div class="opts col">${o}</div>
    ${bpick === null ? '' : `<div class="result ${bpick === b.a ? 'ok' : 'no'}">${bpick === b.a ? '정답! 🎯' : '오답'}<br><small>${esc(b.e)}</small></div>`}
    <div class="score">해결한 버그 ${bdone.size} / ${BUGS.length}</div>`;
}
bugRoot.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.bug !== undefined) { bi = +t.dataset.bug; bpick = null; }
  else if (t.dataset.k !== undefined && bpick === null) { bpick = +t.dataset.k; if (bpick === BUGS[bi].a) bdone.add(bi); }
  renderBug();
});
renderBug();

/* ═════════ 4. AOP 샌드박스 ═════════ */
const aopRoot = $('#lab-aop');
const AOP = { around: true, before: true, after: true, ret: true, thr: true, fail: false, tryfin: false };
function runAop() {
  const L = [], on = k => AOP[k];
  if (on('around')) L.push(['a', '@Around — proceed() 이전']);
  if (on('before')) L.push(['b', '@Before']);
  L.push(['t', '🎯 대상 메서드 실행' + (AOP.fail ? ' → <b>예외 발생!</b>' : ' → 정상 반환')]);
  if (AOP.fail) {
    if (on('thr')) L.push(['b', '@AfterThrowing']);
    if (on('after')) L.push(['b', '@After (finally)']);
    if (on('around')) L.push(AOP.tryfin ? ['a', '@Around — finally 블록 (try/finally 로 감쌌기 때문에 실행)'] : ['x', '@Around — proceed() 이후 코드 <b>실행되지 않음</b> (예외가 그대로 전파)']);
    L.push(['x', '호출자에게 예외 전파']);
  } else {
    if (on('ret')) L.push(['b', '@AfterReturning']);
    if (on('after')) L.push(['b', '@After (finally)']);
    if (on('around')) L.push(['a', '@Around — proceed() 이후']);
    L.push(['g', '호출자에게 결과 반환']);
  }
  return L;
}
function renderAop() {
  const cb = (k, l) => `<label class="chk"><input type="checkbox" data-aop="${k}" ${AOP[k] ? 'checked' : ''}> ${l}</label>`;
  aopRoot.innerHTML = `<div class="aopctl"><b>적용할 어드바이스</b> ${cb('around', '@Around')} ${cb('before', '@Before')} ${cb('after', '@After')} ${cb('ret', '@AfterReturning')} ${cb('thr', '@AfterThrowing')}</div>
    <div class="aopctl"><b>대상 메서드</b> ${cb('fail', '예외를 던진다')} ${AOP.fail && AOP.around ? cb('tryfin', '@Around 가 try/finally 사용') : ''}</div>
    <ol class="aoplog">${runAop().map(([c, t], i) => `<li class="${c}" style="animation-delay:${i * 60}ms">${t}</li>`).join('')}</ol>
    <p class="muted">같은 Aspect 안에서 호출 순서(들어갈 때): Around → Before → 대상, 나올 때는 AfterThrowing/AfterReturning → After → Around(이후). 직접 체크를 바꿔 보며 확인하세요.</p>`;
}
aopRoot.addEventListener('change', e => { const k = e.target.dataset.aop; if (k) { AOP[k] = e.target.checked; renderAop(); } });
renderAop();
})();
