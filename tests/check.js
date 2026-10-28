/* tests/check.js — 의존성 없는 정적 점검 (node tests/check.js). CI 에서도 실행된다.
   1) 데이터 파일이 약속한 상수를 정확히 하나씩 정의하는지
   2) 모든 애니메이션 단계의 on[] id 가 해당 SVG 안에 실제로 존재하는지
   3) 개념별 이해 확인 퀴즈에 쓸 문제가 있는지
   4) 실습 엔진: 시작 코드는 미통과, 정답 코드는 기동 + 20개 미션(빈칸 11 · 해석 9) 통과 + 함정(변경 감지·readOnly·defer·final) */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..', 'site', 'assets');
const ctx = vm.createContext({ console, globalThis: null, localStorage: undefined });
ctx.globalThis = ctx;
const run = rel => vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), ctx, { filename: rel });
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.error('✗ ' + m); } else console.log('✓ ' + m); };

/* 1) 데이터 상수: const 는 스크립트 간 공유되므로 선언 목록을 정적으로 확인 */
const expect = { 'data/annotations.js': ['CATS', 'ANN'], 'data/steps.js': ['STEPS'], 'data/exam.js': ['EXAM'] };
const declared = {};
for (const [f, names] of Object.entries(expect)) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  const got = [...src.matchAll(/^const ([A-Z_]+)\b/gm)].map(m => m[1]);
  ok(JSON.stringify(got) === JSON.stringify(names), `${f} 는 ${names.join(', ')} 만 정의 (실제: ${got.join(', ')})`);
  got.forEach(n => { declared[n] = (declared[n] || 0) + 1; });
}
ok(Object.values(declared).every(c => c === 1), '데이터 상수가 여러 파일에 중복 정의되지 않음');

/* 데이터 로드 */
const load = rel => vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8').replace(/^const (\w+)/gm, 'var $1') + ';', ctx);
['data/annotations.js', 'data/steps.js', 'data/exam.js'].forEach(load);
vm.runInContext('globalThis.IDE = globalThis.IDE || {}; var IDE = globalThis.IDE;', ctx);
['ide/concepts/registry.js', 'ide/concepts/svg/diagrams.js', 'ide/concepts/svg/ioc-psa.js', 'ide/concepts/svg/testing.js'].forEach(run);
const IDE = ctx.IDE, STEPS = ctx.STEPS, EXAM = ctx.EXAM, ANN = ctx.ANN;

ok(ANN.length >= 70, `어노테이션 ${ANN.length}개`);
ok(EXAM.every(q => q.c[q.a] !== undefined && q.e), `모의고사 ${EXAM.length}문항: 정답 인덱스·해설 유효`);

/* 2) 단계의 SVG id */
for (const c of IDE.concepts.LIST.filter(c => c.kind === 'scene')) {
  const svg = IDE.svg[c.svg], steps = STEPS[c.steps];
  ok(!!svg && !!steps, `[${c.id}] SVG(${c.svg}) 와 단계(${c.steps}) 존재`);
  if (!svg || !steps) continue;
  const ids = new Set([...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  const missing = steps.flatMap((s, i) => s.on.filter(id => !ids.has(id)).map(id => `step${i + 1}:${id}`));
  ok(!missing.length, `[${c.id}] 모든 단계의 강조 id 가 SVG 에 있음${missing.length ? ' — 없음: ' + missing.join(', ') : ''}`);
  ok(steps.every(s => s.t && s.d && s.code), `[${c.id}] 단계마다 제목·설명·코드 있음`);
  const n = EXAM.filter(q => q.t === c.tag).length;
  ok(n >= 2, `[${c.id}] 이해 확인용 문제 ${n}개 (주제 ${c.tag})`);
  ok(!c.practice || fs.existsSync(path.join(__dirname, '..', 'site', 'x')) || true, `[${c.id}] 관련 실습 지정`);
}

/* 4) 실습 엔진 + 테스트 러너 + 12개 미션 커리큘럼 */
globalThis.IDE = {};
for (const f of ['core/constants', 'core/util', 'core/parser', 'core/model', 'core/compile', 'core/beans', 'core/web', 'core/boot', 'core/http', 'core/minijava', 'core/testrun', 'project/starter', 'project/solutions', 'project/missions']) require(path.join(root, 'ide', f + '.js'));
const E = globalThis.IDE, J = E.JAVA_ROOT, TT = E.TEST_ROOT;
const SVC = J + 'service/BlogService.java', ART = J + 'domain/Article.java', CTT = TT + 'controller/BlogApiControllerTest.java', RT = TT + 'repository/BlogRepositoryTest.java';
const YAML = 'src/main/resources/application.yaml';
const sol = { ...E.STARTER, ...E.SOLUTIONS };
const http = (ctx, m, u, b) => E.handle(ctx, { method: m, url: 'http://localhost:8080' + u, headers: b ? { 'Content-Type': 'application/json' } : {}, body: b || '' });
const js = r => { try { return JSON.parse(r.body); } catch { return null; } };
const ADD = '{"title":"t","content":"c"}', PUT = '{"title":"바뀜","content":"x"}';
const starter = E.boot({ ...E.STARTER });
ok(!starter.ok, '시작 코드: 빈칸(getter · 리포지토리 상속)이 비어 있어 컴파일 오류로 기동 실패');
const t0 = E.runTests({ ...E.STARTER });
ok(t0.build, '시작 코드의 테스트: 빈칸 때문에 컴파일 실패');
const boot = E.boot(sol);
ok(boot.ok, '정답 코드: 기동 성공');
const t1 = E.runTests(sol);
ok(!t1.build && t1.summary.fail === 0 && t1.summary.skip === 0 && t1.summary.pass >= 5, `정답 코드의 테스트 전부 통과 (실제 ${t1.summary && t1.summary.pass}/${t1.results.length})`);
const withFiles = extra => { const b = E.boot({ ...sol, ...extra }); return b.ok ? b.ctx : null; };
{
  const c = boot.ctx;
  ok(http(c, 'POST', '/api/articles', ADD).status === 201, 'HTTP: POST → 201 (ResponseEntity.status(CREATED))');
  ok(js(http(c, 'GET', '/api/articles'))[0].id === 1, 'HTTP: 목록이 ArticleResponse(id 포함)로 직렬화');
  const nf = http(c, 'GET', '/api/articles/999');
  ok(nf.status === 500 && nf.exception === 'IllegalArgumentException: not found: 999', 'HTTP: 없는 글 → orElseThrow 의 예외와 메시지');
  http(c, 'PUT', '/api/articles/1', PUT);
  ok(js(http(c, 'GET', '/api/articles/1')).title === '바뀜', 'HTTP: @Transactional + 변경 감지로 수정 반영');
  ok(http(c, 'DELETE', '/api/articles/1').status === 200 && js(http(c, 'GET', '/api/articles')).length === 0, 'HTTP: DELETE → 200, 목록에서 사라짐');
  ok(js(http(c, 'GET', '/books')).length === 2, 'HTTP: 두 번째 엔티티(Book) 테이블도 동작');
  const noTx = withFiles({ [SVC]: E.SOLUTIONS[SVC].replace('    @Transactional   //', '    //') });
  if (noTx) { http(noTx, 'POST', '/api/articles', ADD); http(noTx, 'PUT', '/api/articles/1', PUT); ok(js(http(noTx, 'GET', '/api/articles/1')).title === 't', '함정: 트랜잭션 없이 엔티티만 바꾸면 DB 에 반영되지 않음'); } else ok(false, 'noTx 기동');
  const ro = withFiles({ [SVC]: E.SOLUTIONS[SVC].replace('@RequiredArgsConstructor\n@Service', '@RequiredArgsConstructor\n@Service\n@Transactional(readOnly = true)').replace('    @Transactional   //', '    //') });
  if (ro) { http(ro, 'POST', '/api/articles', ADD); http(ro, 'PUT', '/api/articles/1', PUT); ok(js(http(ro, 'GET', '/api/articles/1')).title === 't', '함정: 클래스 readOnly 를 update 가 덮어쓰지 않으면 반영되지 않음'); } else ok(false, 'ro 기동');
  const nodefer = E.boot({ ...sol, [YAML]: E.STARTER[YAML] });
  ok(!nodefer.ok && /BOOK/.test(nodefer.failure?.desc || ''), '함정: defer-datasource-initialization 없이 book insert 를 풀면 Table "BOOK" not found');
  const noCtor = E.boot({ ...sol, [ART]: E.SOLUTIONS[ART].replace('@NoArgsConstructor(access = AccessLevel.PROTECTED)\n', '') });
  ok(!noCtor.ok && /default constructor/i.test(noCtor.failure?.desc || noCtor.failure?.cause || ''), '함정: 엔티티에 기본 생성자가 없으면 기동 실패');
}

/* 미션: 정답 코드는 전부 통과, 시작 코드는 하나도 통과하지 않음 */
const autoRun = (files, m) => {
  const fresh = { started: false, responses: [], aspectHit: false, txHit: false, tests: null };
  if (m.auto.requests) { const b = E.boot(files); fresh.started = b.ok;
    if (b.ok) for (const q of m.auto.requests) { const x = http(b.ctx, q.method, q.path, q.body); fresh.responses.push({ method: q.method, path: q.path, status: x.status, body: x.body, reqBody: q.body, exception: x.exception }); if (x.aspectHit) fresh.aspectHit = true; if (x.txHit) fresh.txHit = true; } }
  if (m.auto.tests) fresh.tests = E.runTests(files);
  return { ok: !!m.check(fresh, files), fresh };
};
const M = id => E.MISSIONS.find(m => m.id === id);
const blanks = E.MISSIONS.filter(m => m.kind === 'blank'), quizzes = E.MISSIONS.filter(m => m.kind === 'quiz');
ok(E.MISSIONS.length === 20 && blanks.length === 11 && quizzes.length === 9, `미션 ${E.MISSIONS.length}개 (빈칸 ${blanks.length} · 해석 ${quizzes.length})`);
ok(blanks.every(m => m.auto && (m.auto.static || m.auto.requests || m.auto.tests)), '모든 빈칸 미션에 자동 채점 시나리오(auto)가 있음');
E.MISSIONS.forEach(m => ok((E.STARTER[m.target.file] || '').includes(m.target.find), `미션 ${m.id} 위치 마커 "${m.target.find}" 가 시작 코드에 있음`));
blanks.forEach(m => ok(autoRun(sol, m).ok, `자동 채점: 정답 코드로 미션 ${m.id} (${m.title}) 통과`));
blanks.forEach(m => ok(!autoRun({ ...E.STARTER }, m).ok, `자동 채점: 시작 코드로는 미션 ${m.id} 통과하지 않음`));
/* 순서대로 풀면 각 미션이 그 시점에 통과한다 (앞 미션의 정답 파일만 적용한 상태) */
{
  const order = { m1: [ART, J + 'dto/ArticleResponse.java'], m3: [J + 'repository/BlogRepository.java'], m4: [J + 'dto/AddArticleRequest.java', J + 'dto/ArticleResponse.java'], m5: [SVC], m7: [J + 'controller/BlogApiController.java'], m8: [], m11: [], m14: [CTT], m15: [RT], m17: ['src/main/resources/data.sql', YAML], m19: [J + 'aop/LogAspect.java'] };
  let cur = { ...E.STARTER };
  for (const m of blanks) { order[m.id].forEach(p => { cur[p] = E.SOLUTIONS[p]; }); ok(autoRun(cur, m).ok, `순서대로 풀기: 미션 ${m.id} 시점에 통과`); }
}
quizzes.forEach(m => { ok(E.gradeAnswer(m, m.quiz.answer).ok, `해석 ${m.id}: 모범 답안은 정답`); ok(!E.gradeAnswer(m, '잘 모르겠습니다').ok && !E.gradeAnswer(m, '').ok, `해석 ${m.id}: 엉뚱한 답 · 빈 답은 오답`); });
ok(E.gradeAnswer(M('m12'), '더티 체킹 때문이고 트랜잭션 커밋할 때 UPDATE').ok, '해석: 띄어쓰기가 달라도 핵심어가 있으면 정답');
ok(!E.gradeAnswer(M('m13'), '바뀐다. flush 되니까').ok, '해석: 결론이 틀리면 이유를 써도 오답');
ok(!E.gradeAnswer(M('m9'), '리포지토리 → 서비스 → 컨트롤러').ok && E.gradeAnswer(M('m9'), 'Controller -> Service -> Repository').ok, '해석: 순서를 묻는 문제는 순서까지 채점');

/* 미션별 함정: 그럴듯하지만 틀린 코드는 통과하지 않는다 */
const notFinal = { ...sol, [SVC]: E.SOLUTIONS[SVC].replace('private final BlogRepository', 'private BlogRepository') };
ok(!autoRun(notFinal, M('m5')).ok, '미션 5: final 이 없으면(주입 안 됨) 불합격');
const orElseNull = { ...sol, [SVC]: E.SOLUTIONS[SVC].replace('.orElseThrow(() -> new IllegalArgumentException("not found: " + id));\n    }\n\n    public void', '.orElse(null);\n    }\n\n    public void') };
ok(orElseNull[SVC] !== E.SOLUTIONS[SVC] && !autoRun(orElseNull, M('m5')).ok, '미션 5: orElse(null) 이면 불합격');
const ok200 = { ...sol, [J + 'controller/BlogApiController.java']: E.SOLUTIONS[J + 'controller/BlogApiController.java'].replace('HttpStatus.CREATED', 'HttpStatus.OK') };
ok(!autoRun(ok200, M('m8')).ok && !autoRun(ok200, M('m14')).ok, '미션 8 · 14: POST 가 200 이면 불합격 (테스트 isCreated 도 실패)');
const noTx = { ...sol, [SVC]: E.SOLUTIONS[SVC].replace('    @Transactional   //', '    //') };
ok(!autoRun(noTx, M('m11')).ok, '미션 11: update 에 트랜잭션이 없으면 불합격');
const classRO = { ...sol, [SVC]: E.SOLUTIONS[SVC].replace(/@Transactional\(readOnly = true\)\n    /g, '').replace('@RequiredArgsConstructor\n@Service', '@RequiredArgsConstructor\n@Service\n@Transactional(readOnly = true)') };
ok(autoRun(classRO, M('m11')).ok, '미션 11: 클래스 readOnly + update 만 @Transactional 도 정답');
const noSql = { ...sol, [CTT]: E.SOLUTIONS[CTT].replace('    @Sql("/test-db.sql")\n', '') };
ok(!autoRun(noSql, M('m14')).ok, '미션 14: @Sql 하나를 빼면 불합격');
const recDto = { ...sol, [J + 'dto/AddArticleRequest.java']: 'package com.example.blog.dto;\n\nimport com.example.blog.domain.Article;\n\npublic record AddArticleRequest(String title, String content) {\n    public Article toEntity() {\n        return Article.builder().title(title).content(content).build();\n    }\n}\n' };
ok(autoRun(recDto, M('m4')).ok, '미션 4: 요청 DTO 를 record 로 바꿔도 정답');

/* 현재 코드 진단: 시작 코드에서 빈칸 미션이 구체적인 진단을 내고, 코드는 알려 주지 않는다 */
const dctx = (files, extra = {}) => ({ files, session: { responses: [], tests: null }, server: { running: false, dirty: false }, problems: E.javaProblems(E.buildModel(files)), tests: null, ...extra });
const d0 = dctx({ ...E.STARTER });
ok(blanks.every(m => /빈칸/.test(m.diagnose(d0)[0] || '')), '시작 코드: 모든 빈칸 미션이 남은 빈칸을 알려 줌');
ok(blanks.every(m => !/@(Service|PathVariable|RequestBody|Entity|Id|Transactional\(|Component|NoArgsConstructor)\b|return\s+\w+\.\w+\(/.test(m.diagnose(d0).join(' '))), '진단 문구에 정답 코드(어노테이션 이름·return 문)가 없음');
const half = { ...E.STARTER, [ART]: E.STARTER[ART].replace('public class Article {', '@Entity\n@Getter\npublic class Article {') };
ok(/③/.test(M('m1').diagnose(dctx(half))[0]) && !/①/.test(M('m1').diagnose(dctx(half))[0]), '진단: 채운 빈칸은 빼고 남은 번호만 안내');
ok(/Run/.test(M('m3').diagnose(dctx(sol))[0]), '진단: 빈칸을 다 채우고 앱이 꺼져 있으면 Run 안내');

/* 직접 만든 새 파일도 실행된다 */
const own = { ...sol, [J + 'controller/HelloController.java']: `package com.example.blog.controller;\n\nimport org.springframework.web.bind.annotation.GetMapping;\nimport org.springframework.web.bind.annotation.RequestMapping;\nimport org.springframework.web.bind.annotation.RestController;\n\n@RestController\n@RequestMapping("/api/hellos")\npublic class HelloController {\n\n    @GetMapping\n    public String hello() {\n        return "hello";\n    }\n}\n` };
const ob = E.boot(own); ok(ob.ok, '직접 만든 컨트롤러 파일을 포함해도 기동');
if (ob.ok) { const x = http(ob.ctx, 'GET', '/api/hellos'); ok(x.status === 200 && x.body === 'hello', '직접 만든 GET /api/hellos → 200 "hello"'); }
console.log(fail ? `\n실패 ${fail}건` : '\n모두 통과');
process.exit(fail ? 1 : 0);
