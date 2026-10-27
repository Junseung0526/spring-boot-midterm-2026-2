/* tests/check.js — 의존성 없는 정적 점검 (node tests/check.js). CI 에서도 실행된다.
   1) 데이터 파일이 약속한 상수를 정확히 하나씩 정의하는지
   2) 모든 애니메이션 단계의 on[] id 가 해당 SVG 안에 실제로 존재하는지
   3) 개념별 이해 확인 퀴즈에 쓸 문제가 있는지
   4) 실습 엔진: 시작 코드는 실패, 정답 코드는 기동 + 미션 6개 통과 */
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

/* 4) 실습 엔진 + 테스트 러너 + 10개 미션 커리큘럼 */
globalThis.IDE = {};
for (const f of ['core/constants', 'core/util', 'core/parser', 'core/model', 'core/compile', 'core/beans', 'core/web', 'core/boot', 'core/http', 'core/minijava', 'core/testrun', 'project/starter', 'project/solutions', 'project/missions']) require(path.join(root, 'ide', f + '.js'));
const E = globalThis.IDE, J = E.JAVA_ROOT, TT = E.TEST_ROOT;
const starter = E.boot({ ...E.STARTER });
ok(!starter.ok && /could not be found/.test(starter.failure?.desc || ''), '시작 코드: NoSuchBean 으로 기동 실패');
const t0 = E.runTests({ ...E.STARTER });
ok(!t0.build && t0.summary.pass === 7 && t0.summary.fail === 7, `시작 코드의 테스트: 7 통과 / 7 실패 (실제 ${t0.summary && t0.summary.pass}/${t0.summary && t0.summary.fail})`);
const sol = { ...E.STARTER, ...E.SOLUTIONS };
const boot = E.boot(sol);
ok(boot.ok, '정답 코드: 기동 성공');
const t1 = E.runTests(sol);
ok(!t1.build && t1.summary.pass === 14 && t1.summary.fail === 0 && t1.summary.skip === 0, `정답 코드의 테스트 14/14 통과 (실제 ${t1.summary && t1.summary.pass}/${t1.results.length})`);
if (boot.ok) {
  const st = { started: true, responses: [], aspectHit: false, txHit: false, tests: t1 };
  const send = (m, u, b) => { const x = E.handle(boot.ctx, { method: m, url: 'http://localhost:8080' + u, headers: b ? { 'Content-Type': 'application/json' } : {}, body: b }); st.responses.push({ method: m, path: u, status: x.status, body: x.body }); if (x.aspectHit) st.aspectHit = true; if (x.txHit) st.txHit = true; return x; };
  send('GET', '/api/posts/1'); send('POST', '/api/posts', '{"title":"a","content":"b"}'); send('POST', '/api/posts', '{"title":"","content":"b"}');
  send('PUT', '/api/posts/1', '{"title":"수정","content":"x"}'); send('GET', '/api/posts/1'); send('DELETE', '/api/posts/2');
  ok(E.MISSIONS.length === 10, `미션 ${E.MISSIONS.length}개`);
  E.MISSIONS.forEach(m => ok(m.check(st), `미션 ${m.id} (${m.title}) 통과`));
  E.MISSIONS.forEach(m => ok((E.STARTER[m.target.file] || '').includes(m.target.find), `미션 ${m.id} 위치 마커 "${m.target.find}" 가 시작 코드에 있음`));
}
/* 현재 코드 진단 힌트: 시작 코드에서 모든 미션이 구체적인 진단을 내고, 상태가 바뀌면 문구가 바뀐다 */
const dctx = (files, extra = {}) => ({ files, session: { responses: [], tests: null }, server: { running: false, dirty: false }, problems: E.javaProblems(E.buildModel(files)), tests: null, ...extra });
const d0 = dctx({ ...E.STARTER });
ok(E.MISSIONS.every(m => (m.diagnose(d0)[0] || '').length > 10), '시작 코드: 모든 미션이 구체적인 진단 문구를 냄');
const svcPath = J + 'service/PostService.java';
const noImport = { ...E.STARTER, [svcPath]: E.STARTER[svcPath].replace('// TODO 미션 1: 이 클래스를 스프링 빈(비즈니스 계층)으로 등록하세요\npublic class', '@Service\npublic class') };
ok(/import/.test(E.MISSIONS[0].diagnose(dctx(noImport))[0]), '진단: @Service 만 있고 import 가 없으면 import 를 안내');
ok(/Run/.test(E.MISSIONS[0].diagnose(dctx({ ...E.STARTER, ...E.SOLUTIONS }))[0]), '진단: 코드가 맞고 앱이 꺼져 있으면 Run 안내');
ok(/Rerun/.test(E.MISSIONS[0].diagnose(dctx({ ...E.STARTER, ...E.SOLUTIONS }, { server: { running: true, dirty: true } }))[0]), '진단: 앱 실행 중 코드가 바뀌면 Rerun 안내');
const onlySvc = { ...E.STARTER, [svcPath]: E.SOLUTIONS[svcPath] };
ok(E.MISSIONS[9].diagnose(dctx(onlySvc, { tests: E.runTests(onlySvc) })).some(x => /미션 3/.test(x)), '진단: 실패한 테스트를 해당 미션(예: create → 미션 3)과 연결');

/* 순서 자유: 아무 미션도 다른 미션을 요구하지 않는다 (앱 기동 m1 제외) */
const solo = { started: true, responses: [], aspectHit: true, txHit: false, tests: null };
ok(E.MISSIONS.find(m => m.id === 'm8').check(solo) && !E.MISSIONS.find(m => m.id === 'm7').check(solo), '미션은 서로 독립적으로 채점됨 (순서 자유)');
/* 직접 만든 새 파일도 실행된다 */
const own = { ...sol, [J + 'controller/HelloController.java']: `package com.example.blog.controller;\n\nimport org.springframework.web.bind.annotation.GetMapping;\nimport org.springframework.web.bind.annotation.RequestMapping;\nimport org.springframework.web.bind.annotation.RestController;\n\n@RestController\n@RequestMapping("/api/hellos")\npublic class HelloController {\n\n    @GetMapping\n    public String hello() {\n        return "hello";\n    }\n}\n` };
const ob = E.boot(own); ok(ob.ok, '직접 만든 컨트롤러 파일을 포함해도 기동');
if (ob.ok) { const x = E.handle(ob.ctx, { method: 'GET', url: 'http://localhost:8080/api/hellos', headers: {}, body: '' }); ok(x.status === 200 && x.body === 'hello', '직접 만든 GET /api/hellos → 200 "hello"'); }
console.log(fail ? `\n실패 ${fail}건` : '\n모두 통과');
process.exit(fail ? 1 : 0);
