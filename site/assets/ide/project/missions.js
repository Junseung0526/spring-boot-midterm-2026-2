/* project/missions.js — 6장 블로그 API 를 처음부터 만드는 12개 미션(6단계) + 자동 채점 + 현재 코드 진단.
   컨트롤러 · 서비스 · DTO · 리포지토리가 빈 클래스인 상태에서 시작하고, 제공된 테스트(BlogApiControllerTest)와
   학생 코드를 실제로 실행한 HTTP 응답으로 채점한다.
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

const DIAG = {
  m1: c => { const a = typeOf(c, ART), r = typeOf(c, REPO);
    if (!a || !r) return ['Article.java / BlogRepository.java 를 찾을 수 없어요.'];
    if (!annOf(a, 'Entity')) return ['Article 이 아직 평범한 클래스예요. JPA 가 "테이블과 연결된 객체" 로 알아보게 하는 어노테이션이 필요해요.'];
    const idf = a.fields.find(f => annOf(f, 'Id'));
    if (!idf) return ['엔티티에는 기본 키(PK)로 쓸 필드 표시가 꼭 있어야 해요 (No identifier specified for entity).'];
    if (!annOf(idf, 'GeneratedValue') || !/IDENTITY/.test(annOf(idf, 'GeneratedValue').args)) return ['id 를 DB 가 자동 증가(AUTO_INCREMENT)로 만들게 하세요 — 생성 전략을 IDENTITY 로.'];
    if (!IDE.REPO_BASES.test(r.header)) return ['BlogRepository 가 아무것도 상속하지 않아요. Spring Data JPA 가 구현체를 자동으로 만들어 주는 인터페이스를 상속하세요.'];
    if (!/<\s*Article\s*,\s*Long\s*>/.test(r.header)) return ['리포지토리 제네릭이 맞지 않아요 — <엔티티 타입, @Id 필드의 타입> 순서예요.'];
    if (!hasGetter(a, 'title')) return ['제공된 테스트가 articles.get(0).getTitle() 을 불러요. Article 에 getter 가 필요해요 (직접 쓰거나 Lombok @Getter).'];
    return pick(javaErr(c), needRun(c) && '엔티티 · 리포지토리는 맞아 보여요. ▶ Run 으로 앱을 시작하세요 (기본 생성자가 없으면 여기서 실패해요).', c.server.dirty && RERUN, c.server.running && !c.server.dirty && '앱이 정상 기동 중이에요 — 정답 확인을 누르세요.'); },
  m2: c => { const t = typeOf(c, SVC), ctl = typeOf(c, CTL), req = typeOf(c, REQ);
    const has = n => req && (req.fields.some(f => f.name === n) || (req.comps || []).some(x => x.name === n));
    if (!has('title') || !has('content')) return ['AddArticleRequest 에 요청 본문을 담을 title · content 필드가 없어요.'];
    if (req.kind !== 'record' && !annOf(req, 'AllArgsConstructor') && !req.ctors.some(k => k.params.length === 2)) return ['제공된 테스트가 new AddArticleRequest(title, content) 를 불러요 — 필드 두 개를 받는 생성자가 필요해요.'];
    if (!methodOf(req, 'toEntity')) return ['요청 DTO → 엔티티 변환 메서드(toEntity)가 없어요. 서비스가 이걸로 Article 을 만들어 저장해요.'];
    if (!t || (!annOf(t, 'Service') && !annOf(t, 'Component'))) return ['BlogService 가 아직 빈이 아니에요. 컨트롤러에 주입되려면 컨테이너가 알아봐야 해요.'];
    if (!t.fields.some(f => f.type === 'BlogRepository')) return ['BlogService 에 BlogRepository 필드가 없어요. final 필드 + 생성자 주입 (생성자를 직접 쓰거나 Lombok @RequiredArgsConstructor).'];
    if (!ctl || !annOf(ctl, 'RestController')) return ['BlogApiController 가 아직 JSON 을 돌려주는 컨트롤러 빈이 아니에요.'];
    const m = mapped(c, 'PostMapping', () => true);
    if (!m) return ['POST /api/articles 를 처리하는 메서드가 없어요. 공통 경로는 클래스에 한 번만 (@RequestMapping).'];
    if (!m.params.some(p => annOf(p, 'RequestBody'))) return ['JSON 본문이 DTO 로 들어오지 않아요 — 파라미터에 어노테이션 하나가 빠졌어요.'];
    if (!created(m)) return ['생성 성공은 200 이 아니라 201 Created 예요. ResponseEntity 로 상태 코드를 직접 정하세요.'];
    return pick(javaErr(c), testDiag(c, 'addArticle')); },
  m3: c => { const m = mapped(c, 'GetMapping', isRoot), ty = allTypes(c), res = ty.get('ArticleResponse');
    if (!res) return ['dto/ArticleResponse.java 를 찾을 수 없어요 (지웠다면 ＋ New 로 다시 만드세요).'];
    if (!['id', 'title', 'content'].every(n => res.fields.some(f => f.name === n) || (res.comps || []).some(x => x.name === n))) return ['ArticleResponse 가 아직 비어 있어요. 응답으로 내보낼 id · title · content 를 담고, Article 하나를 받아 옮겨 담는 생성자를 만드세요 — 엔티티를 그대로 내보내지 않기 위해서예요.'];
    if (!hasGetter(res, 'title')) return ['ArticleResponse 에 getter 가 없으면 Jackson 이 JSON 으로 못 바꿔요 (빈 객체 / 직렬화 오류).'];
    if (!m) return ['GET /api/articles (목록)을 처리하는 메서드가 없어요.'];
    if (!calls(m, 'findAll')) return ['컨트롤러가 서비스의 목록 메서드를 호출하지 않아요.'];
    if (!/ArticleResponse/.test(m.body || '') && !/ArticleResponse/.test(m.retType || '')) return ['엔티티 목록을 그대로 돌려주고 있어요. stream → map(엔티티 → ArticleResponse) → toList() 로 바꾸세요.'];
    const g = lastResp(c, r => r.method === 'GET' && r.path === '/api/articles' && r.status === 200);
    if (g && Array.isArray(jsonOf(g)) && jsonOf(g).some(x => x.id == null)) return ['응답 JSON 에 id 가 없어요. ArticleResponse 생성자에서 id 도 옮겨 담았나요?'];
    return pick(javaErr(c), testDiag(c, 'findAllArticles')); },
  m4: c => { const m = mapped(c, 'GetMapping', isId), svc = typeOf(c, SVC);
    if (!m) return ['GET /api/articles/{id} 를 처리하는 메서드가 없어요.'];
    if (!m.params.some(p => annOf(p, 'PathVariable'))) return ['URL 의 {id} 값이 메서드 파라미터로 들어오지 않아요.'];
    if (svc && !/orElseThrow/.test(c.files[SVC] || '')) return ['findById 는 Optional 을 돌려줘요. 값이 없을 때 예외를 던지게 하세요 — 메시지는 "not found: " + id 로 (채점 기준).'];
    const nf = lastResp(c, r => r.method === 'GET' && r.path === '/api/articles/999');
    if (nf && nf.status === 200) return ['없는 글(999)을 조회했는데 200 이에요 — null 을 돌려주지 말고 예외를 던지세요.'];
    if (nf && nf.exception && !/^IllegalArgumentException: not found: 999$/.test(nf.exception)) return [`없는 글 조회 결과: ${nf.exception} — IllegalArgumentException + 메시지 "not found: 999" 여야 해요.`];
    return pick(javaErr(c), testDiag(c, 'findArticle')); },
  m5: c => { const m = mapped(c, 'DeleteMapping', isId);
    if (!m) return ['DELETE /api/articles/{id} 를 처리하는 메서드가 없어요.'];
    if (!m.params.some(p => annOf(p, 'PathVariable'))) return ['지울 글의 id 가 URL 에서 파라미터로 들어오지 않아요.'];
    if (!calls(m, 'delete') && !calls(m, 'deleteById')) return ['컨트롤러가 서비스의 삭제 메서드를 호출하지 않아요.'];
    const d = lastResp(c, r => r.method === 'DELETE');
    return sendTail(c, d && (d.status === 200 || d.status === 204), '코드는 맞아 보여요! requests.http 1번(추가) → 5번(삭제) → 2번(목록)으로 정말 사라졌는지 확인하세요.'); },
  m6: c => { const a = typeOf(c, ART), m = mapped(c, 'PutMapping', isId), svc = typeOf(c, SVC);
    if (!methodOf(a, 'update')) return ['Article 에 제목 · 내용을 바꾸는 update() 메서드가 없어요 (setter 를 열지 말고 의미 있는 메서드로).'];
    const ur = allTypes(c).get('UpdateArticleRequest');
    if (!ur || !['title', 'content'].every(n => ur.fields.some(f => f.name === n) || (ur.comps || []).some(x => x.name === n))) return ['UpdateArticleRequest 가 아직 비어 있어요. 수정할 title · content 를 받는 필드(와 JSON 을 넣을 방법)가 필요해요.'];
    if (!m) return ['PUT /api/articles/{id} 를 처리하는 메서드가 없어요.'];
    if (updateUsesSave(c.files)) return ['서비스 update() 에서 save() 를 부르고 있어요. 이 미션은 save() 없이 변경 감지(dirty checking)로 반영하는 것이 핵심이에요.'];
    const um = methodOf(svc, 'update');
    if (um && !annOf(um, 'Transactional') && !annOf(svc, 'Transactional')) return ['update() 가 트랜잭션 밖에서 실행돼요. 값을 바꿔도 커밋(flush)이 없으니 DB 는 그대로예요 — 응답만 바뀌어 보이는 함정!'];
    const put = lastResp(c, r => r.method === 'PUT' && r.path === '/api/articles/1'), get = lastResp(c, r => r.method === 'GET' && r.path === '/api/articles/1');
    if (put && put.status === 200 && get && !titleIs(get, '수정한 제목')) return ['PUT 응답은 바뀌었는데 다시 GET 하면 예전 제목이에요 — 변경 감지가 일어나려면 무엇이 필요할까요?'];
    return sendTail(c, put && put.status === 200 && titleIs(get, '수정한 제목'), '코드는 맞아 보여요! requests.http 1번 → 4번(PUT) → 3번(GET)으로 정말 바뀌었는지 확인하세요.'); },
  m7: c => { const t = typeOf(c, SVC); if (!t) return ['BlogService.java 를 찾을 수 없어요.'];
    const bad = ['findAll', 'findById'].filter(n => methodOf(t, n) && !isReadOnly(t, n));
    if (bad.length) return [`조회 메서드에 읽기 전용 트랜잭션이 없어요 → ${bad.join(', ')}  (flush · 변경 감지 생략으로 성능 이득)`];
    if (!importsOf(t).some(i => /transaction\.annotation\.(Transactional|\*)$/.test(i))) return ['@Transactional 의 import 가 없어요 (jakarta 것보다 readOnly 속성이 있는 스프링 패키지의 것).'];
    if (isReadOnly(t, 'update')) return ['update() 까지 읽기 전용이 되었어요 — 읽기 전용 트랜잭션에서는 flush 가 없어 수정이 반영되지 않아요. 메서드 설정이 클래스 설정을 덮어써요.'];
    return sendTail(c, false, '코드는 맞아 보여요! 정답 확인을 누르세요 (수정이 여전히 반영되는지도 확인해요).'); },
  m8: c => { const t = typeOf(c, CT); if (!t) return ['BlogApiControllerTest.java 를 찾을 수 없어요.'];
    if (!t.methods.some(m => annOf(m, 'Test') && /\bdelete\s*\(/.test(m.body || ''))) return ['DELETE 요청을 보내는 @Test 메서드가 아직 없어요. given: 리포지토리로 글 저장 → when: delete(url, id) → then: 검증.'];
    if (!c.tests) return ['정답 확인을 누르면 전체 테스트 + 망가뜨린 컨트롤러로 채점해요.'];
    if (c.tests.build) return [testDiag(c, 'deleteArticle')];
    const bad = failed(c, 'BlogApiControllerTest'); if (bad.length) return [`실패: ${bad[0].method} — ${(bad[0].msg || '').split('\n').filter(Boolean).slice(0, 2).join(' / ')}`];
    if (c.session.mutants && !killed(c.session, 'delete-call', r => r.cls === 'BlogApiControllerTest' && r.status === 'fail')) return ['테스트는 통과하지만, 컨트롤러가 삭제를 안 해도(서비스를 안 불러도) 통과해요. 상태 코드만 보지 말고 리포지토리에서 정말 사라졌는지 확인하세요.'];
    return ['정답 확인을 눌러 채점하세요.']; },
  m9: c => { const t = typeOf(c, CT); if (!t) return ['BlogApiControllerTest.java 를 찾을 수 없어요.'];
    if (!t.methods.some(m => annOf(m, 'Test') && /\bput\s*\(/.test(m.body || ''))) return ['PUT 요청을 보내는 @Test 메서드가 아직 없어요. 요청 본문은 objectMapper.writeValueAsString(new UpdateArticleRequest(...)).'];
    if (!c.tests) return ['정답 확인을 누르면 전체 테스트 + 변경 감지를 꺼 버린 환경으로 채점해요.'];
    if (c.tests.build) return [testDiag(c, 'updateArticle')];
    const bad = failed(c, 'BlogApiControllerTest'); if (bad.length) return [`실패: ${bad[0].method} — ${(bad[0].msg || '').split('\n').filter(Boolean).slice(0, 2).join(' / ')}`];
    if (c.session.mutants && !killed(c.session, 'no-flush', r => r.cls === 'BlogApiControllerTest' && r.status === 'fail')) return ['테스트는 통과하지만, 변경 감지가 안 돼서 DB 가 그대로여도 통과해요. 응답 JSON 은 메모리의 엔티티라 바뀌어 보여요 — 리포지토리에서 다시 꺼내 검증하세요.'];
    return ['정답 확인을 눌러 채점하세요.']; },
  m10: c => { const ty = [...allTypes(c).values()], test = ty.find(x => IDE.isTestPath(x.path) && annOf(x, 'DataJpaTest'));
    if (!test) return ['@DataJpaTest 테스트 클래스가 없어요. ＋ New → 테스트 클래스로 repository 패키지에 BlogRepositoryTest 를 만드세요.'];
    if (!test.fields.some(f => f.type === 'BlogRepository' && annOf(f, 'Autowired'))) return ['테스트에 BlogRepository 를 주입받는 필드가 없어요 (@DataJpaTest 는 리포지토리 빈을 띄워 줘요).'];
    if (!test.methods.some(m => annOf(m, 'Test'))) return ['@Test 메서드가 하나도 없어요.'];
    if (!c.tests) return ['테스트를 실행하거나 정답 확인을 누르세요.'];
    if (c.tests.build) return ['테스트 컴파일 실패 — Problems 탭의 오류를 먼저 고치세요.'];
    const bad = failed(c, test.name);
    if (bad.length) return [`아직 실패: ${bad[0].method} — ${(bad[0].msg || '').split('\n').filter(Boolean).slice(0, 2).join(' / ')}`];
    if (c.session.mutants && !killed(c.session, 'repo', r => r.kind === 'jpa' && r.status === 'fail')) return ['테스트는 통과하지만, 저장한 척만 하는 가짜 리포지토리에서도 통과해요. 저장(when)한 뒤 다시 조회해서 결과를 검증(then)하세요.'];
    return ['정답 확인을 눌러 채점하세요 (일부러 망가뜨린 리포지토리에서 내 테스트가 실패하는지도 확인합니다).']; },
  m11: c => { const ty = allTypes(c), book = ty.get('Book');
    if (!book || !annOf(book, 'Entity')) return ['Book 엔티티가 없어요. ＋ New → Entity 로 domain 패키지에 만들어 보세요 (5장 실습: GET /books).'];
    if (!['title', 'author'].every(n => book.fields.some(f => f.name === n))) return ['Book 에 title · author 필드가 필요해요 (data.sql 의 컬럼 이름과 같아야 해요).'];
    if (![...ty.values()].some(x => x.kind === 'interface' && IDE.REPO_BASES.test(x.header) && x.typeArgs[0] === 'Book')) return ['Book 을 다루는 리포지토리가 없어요.'];
    const ctl = [...ty.values()].find(x => x.methods.some(m => annOf(m, 'GetMapping') && /books/.test(annOf(m, 'GetMapping').args)));
    if (!ctl && ![...ty.values()].some(x => /books/.test((annOf(x, 'RequestMapping') || {}).args || ''))) return ['GET /books 를 처리하는 컨트롤러가 없어요. 컨트롤러 → 서비스 → 리포지토리로 나눠 보세요.'];
    if (!/^\s*insert\s+into\s+book\b/im.test(c.files[DATA] || '')) return ['data.sql 의 book insert 두 줄이 아직 주석(--)이에요. 주석을 풀어야 데이터가 들어가요.'];
    if (!/defer-datasource-initialization\s*:\s*true/.test(c.files[YAML] || '')) return ['data.sql 은 기본적으로 JPA 가 테이블을 만들기 "전에" 실행돼서 Table "BOOK" not found 로 앱이 안 떠요. application.yaml 에서 실행 순서를 미루는 설정을 찾아보세요.'];
    const g = lastResp(c, r => r.method === 'GET' && r.path === '/books');
    if (g && g.status === 200 && Array.isArray(jsonOf(g)) && jsonOf(g).some(b => b.title == null || b.author == null)) return ['응답 JSON 에 title/author 가 비어 있어요. Jackson 은 getter 로 필드를 찾습니다.'];
    if (g && g.status === 500) return ['500 이에요 — 콘솔 로그를 읽어 보세요 (getter 가 하나도 없으면 직렬화 실패).'];
    return sendTail(c, g && g.status === 200, '코드는 맞아 보여요! requests.http 6번(GET /books)을 보내 보세요.'); },
  m12: c => { const t = typeOf(c, ASP); if (!t) return ['LogAspect.java 를 찾을 수 없어요.'];
    if (!annOf(t, 'Aspect')) return ['LogAspect 에 @Aspect 가 없어요.'];
    if (!['Component', 'Configuration', 'Service'].some(n => annOf(t, n))) return ['@Aspect 는 "이건 Aspect 다" 라는 표시일 뿐 빈 등록이 아니에요. 스프링이 관리하는 빈이어야 프록시가 만들어집니다. (콘솔 WARN 도 확인)'];
    const expr = ((/execution\([^)]*?\s([\w.]+?)\.\./.exec(c.files[ASP] || '') || [])[1]);
    if (expr && ![...allTypes(c).values()].some(x => x.pkg === expr || x.pkg.startsWith(expr + '.'))) return [`포인트컷이 가리키는 패키지(${expr})에 클래스가 하나도 없어요. 실제 서비스 클래스의 package 선언과 한 글자씩 비교해 보세요.`];
    return sendTail(c, false, '코드는 맞아 보여요! 서비스를 호출하는 요청(2번 목록)을 보내 콘솔의 ▶ ◀ 로그를 확인하세요.'); },
};

/* ───────────── 정답 예시(스니펫): 정답 확인을 2번 틀리면 힌트 패널에 열린다 ───────────── */
const SNIP = {
  m1: '@Entity\n@Getter\n@NoArgsConstructor(access = AccessLevel.PROTECTED)   // JPA 용 기본 생성자\npublic class Article {\n\n    @Id\n    @GeneratedValue(strategy = GenerationType.IDENTITY)\n    private Long id;\n    ...\n}\n\n// BlogRepository.java\npublic interface BlogRepository extends JpaRepository<Article, Long> {\n}',
  m2: '// AddArticleRequest\n@NoArgsConstructor\n@AllArgsConstructor\n@Getter\npublic class AddArticleRequest {\n    private String title;\n    private String content;\n\n    public Article toEntity() {\n        return Article.builder().title(title).content(content).build();\n    }\n}\n\n// BlogService (@RequiredArgsConstructor @Service, private final BlogRepository blogRepository;)\npublic Article save(AddArticleRequest request) {\n    return blogRepository.save(request.toEntity());\n}\n\n// BlogApiController (@RequiredArgsConstructor @RestController @RequestMapping("/api/articles"))\n@PostMapping\npublic ResponseEntity<ArticleResponse> addArticle(@RequestBody AddArticleRequest request) {\n    Article savedArticle = blogService.save(request);\n    return ResponseEntity.status(HttpStatus.CREATED).body(new ArticleResponse(savedArticle));\n}',
  m3: '// ArticleResponse\n@Getter\npublic class ArticleResponse {\n    private final Long id;\n    private final String title;\n    private final String content;\n\n    public ArticleResponse(Article article) {\n        this.id = article.getId();\n        this.title = article.getTitle();\n        this.content = article.getContent();\n    }\n}\n\n// BlogApiController\n@GetMapping\npublic ResponseEntity<List<ArticleResponse>> findAllArticles() {\n    List<ArticleResponse> articles = blogService.findAll()\n            .stream()\n            .map(ArticleResponse::new)\n            .toList();\n    return ResponseEntity.ok().body(articles);\n}',
  m4: '// BlogService\npublic Article findById(long id) {\n    return blogRepository.findById(id)\n            .orElseThrow(() -> new IllegalArgumentException("not found: " + id));\n}\n\n// BlogApiController\n@GetMapping("/{id}")\npublic ResponseEntity<ArticleResponse> findArticle(@PathVariable("id") long id) {\n    Article article = blogService.findById(id);\n    return ResponseEntity.ok().body(new ArticleResponse(article));\n}',
  m5: '// BlogService\npublic void delete(long id) {\n    blogRepository.deleteById(id);\n}\n\n// BlogApiController\n@DeleteMapping("/{id}")\npublic ResponseEntity<Void> deleteArticle(@PathVariable("id") long id) {\n    blogService.delete(id);\n    return ResponseEntity.ok().build();\n}',
  m6: '// Article\npublic void update(String title, String content) {\n    this.title = title;\n    this.content = content;\n}\n\n// BlogService — save() 없음: 커밋 때 변경 감지로 UPDATE\n@Transactional\npublic Article update(long id, UpdateArticleRequest request) {\n    Article article = blogRepository.findById(id)\n            .orElseThrow(() -> new IllegalArgumentException("not found: " + id));\n    article.update(request.getTitle(), request.getContent());\n    return article;\n}\n\n// BlogApiController\n@PutMapping("/{id}")\npublic ResponseEntity<ArticleResponse> updateArticle(@PathVariable("id") long id,\n                                                     @RequestBody UpdateArticleRequest request) {\n    return ResponseEntity.ok().body(new ArticleResponse(blogService.update(id, request)));\n}',
  m7: '@Transactional(readOnly = true)\npublic List<Article> findAll() { ... }\n\n@Transactional(readOnly = true)\npublic Article findById(long id) { ... }\n\n@Transactional          // 쓰기는 읽기 전용이면 안 됨\npublic Article update(...) { ... }\n\n// 또는: 클래스에 @Transactional(readOnly = true) + update() 에만 @Transactional',
  m8: '@Test\npublic void deleteArticle() throws Exception {\n    // given\n    Article savedArticle = blogRepository.save(new Article("삭제할 제목", "삭제할 내용"));\n\n    // when\n    mockMvc.perform(delete("/api/articles/{id}", savedArticle.getId()))\n            .andExpect(status().isOk());   // 204 로 만들었다면 isNoContent()\n\n    // then\n    assertThat(blogRepository.findAll()).isEmpty();\n}',
  m9: '@Test\npublic void updateArticle() throws Exception {\n    // given\n    Article savedArticle = blogRepository.save(new Article("원래 제목", "원래 내용"));\n    UpdateArticleRequest request = new UpdateArticleRequest("새 제목", "새 내용");\n\n    // when\n    ResultActions result = mockMvc.perform(put("/api/articles/{id}", savedArticle.getId())\n            .contentType(MediaType.APPLICATION_JSON_VALUE)\n            .content(objectMapper.writeValueAsString(request)));\n\n    // then\n    result.andExpect(status().isOk());\n    Article updated = blogRepository.findById(savedArticle.getId()).orElseThrow();\n    assertThat(updated.getTitle()).isEqualTo("새 제목");\n}',
  m10: '@DataJpaTest\nclass BlogRepositoryTest {\n\n    @Autowired\n    BlogRepository blogRepository;\n\n    @Test\n    void saveAndFind() {\n        // given\n        Article article = new Article("제목", "내용");\n        // when\n        Article saved = blogRepository.save(article);\n        // then\n        assertThat(blogRepository.findById(saved.getId())).isPresent();\n    }\n}',
  m11: '@Entity\n@Getter\n@NoArgsConstructor(access = AccessLevel.PROTECTED)\npublic class Book {\n    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)\n    private Long id;\n    private String title;\n    private String author;\n}\n\npublic interface BookRepository extends JpaRepository<Book, Long> { }\n\n// BookService: bookRepository.findAll()\n// BookController: @GetMapping("/books")\n// data.sql: book insert 두 줄의 -- 를 지움\n// application.yaml\nspring:\n  jpa:\n    defer-datasource-initialization: true',
  m12: '@Slf4j\n@Component          // ← 스프링 빈이어야 프록시가 만들어짐\n@Aspect\npublic class LogAspect {\n\n    @Around("execution(* com.example.blog.service..*(..))")   // services → service\n    ...',
};

/* ───────────── 자동 채점 시나리오 (정답 확인 버튼) ─────────────
   앱을 새로 실행(빈 DB)한 뒤 requests 를 차례로 보낸다. tests 면 전체 테스트, mutants 면 일부러 망가뜨린 환경에서도 테스트를 돌린다. */
const VALID = '{"title":"제목","content":"내용입니다"}', PUTBODY = '{"title":"수정한 제목","content":"수정한 내용"}';
const rq = (method, path, body) => ({ method, path, body: body || '' });
const ADD = rq('POST', '/api/articles', VALID);
const AUTO = {
  m1: { requests: [] },
  m2: { requests: [ADD], tests: true },
  m3: { requests: [ADD, rq('GET', '/api/articles')], tests: true },
  m4: { requests: [ADD, rq('GET', '/api/articles/1'), rq('GET', '/api/articles/999')], tests: true },
  m5: { requests: [ADD, rq('DELETE', '/api/articles/1'), rq('GET', '/api/articles')] },
  m6: { requests: [ADD, rq('PUT', '/api/articles/1', PUTBODY), rq('GET', '/api/articles/1'), rq('PUT', '/api/articles/999', PUTBODY)] },
  m7: { requests: [ADD, rq('GET', '/api/articles'), rq('PUT', '/api/articles/1', PUTBODY), rq('GET', '/api/articles/1')] },
  m8: { tests: true, mutants: ['delete-call'] },
  m9: { tests: true, mutants: ['no-flush'] },
  m10: { tests: true, mutants: ['repo'] },
  m11: { requests: [rq('GET', '/books')] },
  m12: { requests: [rq('GET', '/api/articles')] },
};
const parseSvc = files => { try { return IDE.parseJava((files && files[SVC]) || '', SVC).types[0]; } catch { return null; } };
const updateUsesSave = files => /\.\s*save\s*\(/.test(bodyOf(parseSvc(files), 'update'));
/* 메서드의 @Transactional 이 우선, 없으면 클래스 것 */
function isReadOnly(t, n) { const m = methodOf(t, n); if (!t || !m) return false; const a = annOf(m, 'Transactional') || annOf(t, 'Transactional'); return !!a && /readOnly\s*=\s*true/.test(a.args); }
const titleIs = (r, t) => !!r && r.status === 200 && jsonOf(r)?.title === t;
const art = (files, ok) => { try { const ty = IDE.buildModel(files).types, a = ty.get('Article'), r = ty.get('BlogRepository'); return ok(a, r); } catch { return false; } };
const killedIn = (s, mu) => killed(s, mu, r => r.cls === 'BlogApiControllerTest' && r.status === 'fail');
const allGreen = s => !!s.tests && !s.tests.build && s.tests.results.length > 0 && !s.tests.summary.fail && !s.tests.summary.skip;
const lastGet1 = s => [...s.responses].reverse().find(r => r.method === 'GET' && r.path === '/api/articles/1');

const MISSIONS = [
  { id: 'm1', auto: AUTO.m1, stage: '1단계 · JPA 엔티티 (5장)', title: 'Article 을 엔티티로, 리포지토리 만들기', diagnose: DIAG.m1, snippet: SNIP.m1,
    criteria: 'Article 이 @Entity(+ @Id, IDENTITY), BlogRepository 가 JpaRepository<Article, Long> 이고 ▶ Run 으로 앱이 정상 기동하면 완료',
    goal: 'Article 은 아직 평범한 클래스, BlogRepository 는 빈 인터페이스예요. JPA 엔티티와 Spring Data 리포지토리로 바꾸세요.',
    hints: ['엔티티에 필요한 것: 테이블과 연결 표시, 기본 키 표시, 키 생성 전략, 그리고 JPA 가 객체를 만들 때 쓰는 "인자 없는 생성자".', '인자 없는 생성자를 public 으로 열 필요는 없어요 — protected 면 충분해요 (직접 쓰거나 Lombok @NoArgsConstructor(access = PROTECTED)).', '제공된 테스트가 getTitle() · getContent() 를 부르니 getter 도 필요해요.'],
    target: { file: ART, find: 'TODO 미션 1' }, study: 'concept:ioc',
    check: (s, files) => s.started && art(files, (a, r) => !!a && annOf(a, 'Entity') && a.fields.some(f => annOf(f, 'Id')) && !!r && IDE.REPO_BASES.test(r.header) && /<\s*Article\s*,\s*Long\s*>/.test(r.header)) },
  { id: 'm2', auto: AUTO.m2, stage: '2단계 · 블로그 API (6장)', title: '글 추가: POST → 201 Created', diagnose: DIAG.m2, snippet: SNIP.m2,
    criteria: '제공된 테스트 addArticle() 이 통과하고 POST /api/articles 가 201 이면 완료 (테스트는 리포지토리에서 직접 꺼내 확인해요)',
    goal: 'AddArticleRequest(+ toEntity) · BlogService.save() · 컨트롤러 POST 를 모두 작성하세요. 서비스와 컨트롤러는 빈으로, 주입은 생성자로.',
    hints: ['흐름: 요청 JSON → AddArticleRequest → toEntity() → blogRepository.save() → 응답 DTO. 각 계층은 아래 계층에만 의존해요.', '테스트가 new AddArticleRequest(title, content) 를 써요. record 로 만들면 한 줄, 클래스라면 Jackson 용 기본 생성자 + getter 도 필요해요.', '201 은 ResponseEntity.status(HttpStatus.CREATED).body(...) 로. 응답 DTO(ArticleResponse)는 미션 3 에서 만들지만 지금 같이 만들어도 돼요.'],
    target: { file: REQ, find: 'TODO 미션 2' }, study: 'concept:flow',
    check: s => testPass(s, 'addArticle') && s.responses.some(r => r.method === 'POST' && r.path === '/api/articles' && r.status === 201) },
  { id: 'm3', auto: AUTO.m3, stage: '2단계 · 블로그 API (6장)', title: '글 목록: 엔티티 대신 응답 DTO 로', diagnose: DIAG.m3, snippet: SNIP.m3,
    criteria: '제공된 테스트 findAllArticles() 가 통과하고, 글을 추가한 뒤 GET /api/articles 가 id · title · content 를 담은 배열이면 완료',
    goal: '비어 있는 ArticleResponse 를 채우고, 서비스 findAll() 결과를 스트림으로 DTO 로 바꿔 돌려주세요.',
    hints: ['엔티티를 그대로 응답하면 DB 구조가 API 에 노출되고, 엔티티를 고치면 API 도 바뀌어요. 그래서 응답 DTO.', 'Article 하나를 받는 생성자를 만들면 .map(ArticleResponse::new) 로 쓸 수 있어요.', 'findAllArticles 는 @Sql("/test-db.sql") 로 넣은 3개 중 첫 번째를 확인해요.'],
    target: { file: J + 'dto/ArticleResponse.java', find: 'TODO 미션 3' }, study: 'concept:mvc',
    check: s => testPass(s, 'findAllArticles') && s.responses.some(r => r.method === 'GET' && r.path === '/api/articles' && r.status === 200 && Array.isArray(jsonOf(r)) && jsonOf(r).length > 0 && jsonOf(r).every(x => x.id != null && x.title != null)) },
  { id: 'm4', auto: AUTO.m4, stage: '2단계 · 블로그 API (6장)', title: '글 하나 조회 + 없으면 예외', diagnose: DIAG.m4, snippet: SNIP.m4,
    criteria: '제공된 테스트 findArticle() 가 통과하고, GET /api/articles/999 가 IllegalArgumentException("not found: 999") 로 실패하면 완료',
    goal: 'GET /api/articles/{id} 를 만들고, 없는 id 는 null 대신 예외(IllegalArgumentException)로 처리하세요.',
    hints: ['findById 는 Optional 을 돌려줘요. 값이 없을 때를 Optional 의 메서드 하나로 처리하세요.', '예외는 람다로: () -> new IllegalArgumentException("not found: " + id).', '처리하지 않은 예외는 500 + 콘솔 스택 트레이스 (정상). MockMvc 테스트에서는 ServletException 의 cause 로 튀어나와요.'],
    target: { file: SVC, find: 'TODO 미션 2' }, study: 'concept:mvc',
    check: s => testPass(s, 'findArticle') && s.responses.some(r => r.method === 'GET' && r.path === '/api/articles/999' && r.status >= 400 && /^IllegalArgumentException: not found: 999$/.test(r.exception || '')) },
  { id: 'm5', auto: AUTO.m5, stage: '2단계 · 블로그 API (6장)', title: '글 삭제 + 정말 사라졌는지', diagnose: DIAG.m5, snippet: SNIP.m5,
    criteria: '글을 추가한 뒤 DELETE /api/articles/1 이 200 또는 204, 이어서 GET /api/articles 목록에 1번 글이 없으면 완료',
    goal: '서비스 delete() 와 컨트롤러 DELETE 를 만드세요. 성공 응답은 본문 없이 — 200 OK(ok().build()) 도, 204 No Content(noContent().build()) 도 정답이에요.',
    hints: ['리포지토리는 id 로 지우는 메서드를 기본 제공해요.', '본문 없는 응답은 ResponseEntity<Void> + ok().build() 또는 noContent().build(). 둘의 차이도 설명할 수 있어야 해요.', '채점은 목록까지 다시 조회해요 — 응답만 200 이고 안 지우면 실패.'],
    target: { file: CTL, find: 'TODO 미션 2' }, study: 'concept:mvc',
    check: s => { const d = s.responses.find(r => r.method === 'DELETE' && r.path === '/api/articles/1' && (r.status === 200 || r.status === 204)); return !!d && s.responses.some(r => r.method === 'GET' && r.path === '/api/articles' && r.status === 200 && s.responses.indexOf(r) > s.responses.indexOf(d) && Array.isArray(jsonOf(r)) && !jsonOf(r).some(x => x.id === 1)); } },
  { id: 'm6', auto: AUTO.m6, stage: '3단계 · 수정과 트랜잭션 (5·6장)', title: '글 수정: save() 없이 변경 감지로', diagnose: DIAG.m6, snippet: SNIP.m6,
    criteria: 'PUT /api/articles/1 이 200, 이어서 GET 이 바뀐 제목, PUT /api/articles/999 는 "not found: 999" 예외. 서비스 update() 에 save() 호출이 없어야 완료',
    goal: '비어 있는 UpdateArticleRequest 를 채우고 Article.update() 를 만든 뒤, 서비스는 엔티티를 찾아 값만 바꾸세요. save() 를 부르지 않아도 DB 에 반영되게 하는 것이 핵심.',
    hints: ['조회한 엔티티는 영속성 컨텍스트가 관리해요. 트랜잭션이 커밋될 때 처음 상태(스냅샷)와 비교해 바뀐 것을 UPDATE 합니다.', '그러려면 update() 가 트랜잭션 안에서 실행돼야 해요. 없으면 응답은 바뀌어 보여도 DB 는 그대로 — 채점은 다시 GET 해서 확인해요.', '컨트롤러 PUT 은 경로의 id + 본문 DTO 를 받아요.'],
    target: { file: ART, find: 'TODO 미션 6' }, study: 'concept:psa',
    check: (s, files) => s.responses.some(r => r.method === 'PUT' && r.path === '/api/articles/1' && r.status === 200) && titleIs(lastGet1(s), '수정한 제목')
      && s.responses.some(r => r.method === 'PUT' && r.path === '/api/articles/999' && /not found: 999/.test(r.exception || '')) && !updateUsesSave(files) },
  { id: 'm7', auto: AUTO.m7, stage: '3단계 · 수정과 트랜잭션 (5·6장)', title: '조회는 readOnly, 수정은 그대로', diagnose: DIAG.m7, snippet: SNIP.m7,
    criteria: 'findAll · findById 가 @Transactional(readOnly = true) 로 실행되고(메서드 또는 클래스), 수정은 여전히 다시 GET 했을 때 반영되면 완료',
    goal: '조회 메서드를 읽기 전용 트랜잭션으로 바꾸세요. 클래스에 한 번에 걸면 수정이 반영되지 않는 함정이 생겨요 — 어느 쪽이든 수정까지 동작해야 합니다.',
    hints: ['@Transactional 은 AOP 프록시 + PlatformTransactionManager(PSA) 가 만드는 기능이에요.', '읽기 전용 트랜잭션은 flush 를 하지 않아서 변경 감지가 DB 에 반영되지 않아요.', '메서드에 붙인 설정이 클래스 설정을 덮어씁니다.'],
    target: { file: SVC, find: 'class BlogService' }, study: 'concept:psa',
    check: (s, files) => { const t = parseSvc(files); return isReadOnly(t, 'findAll') && isReadOnly(t, 'findById') && s.responses.some(r => r.method === 'GET' && r.path === '/api/articles' && r.status === 200) && titleIs(lastGet1(s), '수정한 제목'); } },
  { id: 'm8', auto: AUTO.m8, stage: '4단계 · 테스트 직접 작성 (4·6장)', title: '삭제 테스트 직접 작성', diagnose: DIAG.m8, snippet: SNIP.m8,
    criteria: 'BlogApiControllerTest 가 모두 통과하고, 내가 쓴 삭제 테스트가 "삭제를 안 하는" 망가진 컨트롤러에서 실패하면 완료 (정답 확인으로만 채점)',
    goal: '제공된 테스트 아래에 deleteArticle() 을 given-when-then 으로 직접 작성하세요.',
    hints: ['given: blogRepository.save(new Article(...)) 로 글을 하나 넣어 두세요 (빌더를 만들었다면 Article.builder() 도 OK).', 'when: mockMvc.perform(delete("/api/articles/{id}", id)) — delete 도 static import 해야 해요.', 'then: 상태 코드(내 컨트롤러가 돌려주는 200/204)만으로는 부족해요. 리포지토리에서 다시 조회해 비었는지 확인하세요.'],
    target: { file: CT, find: 'TODO 미션 8' }, study: 'concept:testing',
    check: s => allGreen(s) && killedIn(s, 'delete-call') },
  { id: 'm9', auto: AUTO.m9, stage: '4단계 · 테스트 직접 작성 (4·6장)', title: '수정 테스트 직접 작성 (변경 감지 검증)', diagnose: DIAG.m9, snippet: SNIP.m9,
    criteria: 'BlogApiControllerTest 가 모두 통과하고, 내가 쓴 수정 테스트가 "변경 감지가 꺼진" 환경에서 실패하면 완료 (정답 확인으로만 채점)',
    goal: 'updateArticle() 을 직접 작성하세요. 응답 JSON 만 보면 함정에 빠져요 — DB 에 정말 반영됐는지까지 검증해야 합니다.',
    hints: ['요청 본문: objectMapper.writeValueAsString(new UpdateArticleRequest(...)) + contentType(JSON).', '서비스가 돌려준 엔티티는 메모리에서 이미 바뀌어 있어서, 트랜잭션이 없어도 응답 JSON 은 바뀌어 보여요.', 'then 에서 blogRepository.findById(id).orElseThrow() 로 다시 꺼내 제목을 비교하세요.'],
    target: { file: CT, find: 'TODO 미션 9' }, study: 'concept:testing',
    check: s => allGreen(s) && killedIn(s, 'no-flush') },
  { id: 'm10', auto: AUTO.m10, stage: '4단계 · 테스트 직접 작성 (4·6장)', title: '@DataJpaTest 리포지토리 테스트', diagnose: DIAG.m10, snippet: SNIP.m10,
    criteria: '내가 만든 @DataJpaTest 테스트가 모두 통과하고, "저장한 척만 하는" 가짜 리포지토리에서는 하나 이상 실패하면 완료 (정답 확인으로만 채점)',
    goal: 'BlogRepositoryTest 를 새로 만들어 리포지토리만 테스트하세요 (5장 실습). given-when-then 으로, 저장한 것을 다시 조회해 검증하세요.',
    hints: ['＋ New → 테스트 클래스로 src/test/java/.../repository 에 만드세요. @SpringBootTest 대신 JPA 관련 빈만 띄우는 슬라이스 테스트.', '@DataJpaTest 는 테스트마다 롤백돼서 서로 영향을 주지 않아요. 리포지토리는 필드 주입(@Autowired)으로.', 'assertThat(saved).isNotNull() 만으로는 부족해요 — 저장 후 findById/findAll 결과를 검증하세요.'],
    target: { file: REPO, find: 'interface BlogRepository' }, study: 'concept:testing',
    check: s => { const t = s.tests; if (!t || t.build) return false; const mine = t.results.filter(r => r.kind === 'jpa'); return mine.length > 0 && mine.every(r => r.status === 'pass') && killed(s, 'repo', r => r.kind === 'jpa' && r.status === 'fail'); } },
  { id: 'm11', auto: AUTO.m11, stage: '5단계 · 5장 실습', title: 'Book API 를 처음부터 (GET /books)', diagnose: DIAG.m11, snippet: SNIP.m11,
    criteria: 'GET /books 가 200 + title · author 가 채워진 책 2권의 JSON 배열이면 완료',
    goal: '5장 실습을 그대로: Book 엔티티 · 리포지토리 · 서비스 · 컨트롤러를 직접 만들고, data.sql 의 책 데이터를 살리세요. 앱이 안 뜨면 콘솔을 끝까지 읽어 보세요.',
    hints: ['＋ New 로 Entity / Repository / Service / Controller 파일을 만들 수 있어요.', 'data.sql 은 기본적으로 Hibernate 가 테이블을 만들기 "전에" 실행돼요 → Table "BOOK" not found.', 'spring.jpa 아래 "datasource 초기화를 미루는" 설정을 application.yaml 에 추가하세요.'],
    target: { file: DATA, find: 'TODO 미션 11' }, study: 'concept:boot',
    check: s => s.responses.some(r => r.method === 'GET' && r.path === '/books' && r.status === 200 && Array.isArray(jsonOf(r)) && jsonOf(r).length >= 2 && jsonOf(r).every(b => b.title != null && b.author != null)) },
  { id: 'm12', auto: AUTO.m12, stage: '6단계 · 보너스: AOP (2장)', title: 'Aspect 가 동작하지 않는 이유 두 가지', diagnose: DIAG.m12, snippet: SNIP.m12,
    criteria: '서비스를 호출하는 요청을 보냈을 때 LogAspect 의 ▶ ◀ 로그가 찍히면 완료',
    goal: 'LogAspect 가 서비스 호출을 감싸도록 고치세요. 빠진 것 하나, 틀린 것 하나가 있습니다.',
    hints: ['Aspect 도 스프링 빈이어야 프록시가 만들어져요 (콘솔 WARN 확인).', '포인트컷 표현식 execution(* 패키지..*(..)) 의 패키지가 실제로 존재하는지 확인하세요.', '개념 탭 "AOP" 의 호출 순서(Around → Before → 대상 …)를 로그와 비교해 보세요.'],
    target: { file: ASP, find: 'TODO 미션 12' }, study: 'concept:aop', check: s => s.aspectHit },
];

Object.assign(IDE, { MISSIONS });
})();
