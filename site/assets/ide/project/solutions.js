/* project/solutions.js — 최종 정답. 시작 코드의 빈칸(___)을 위에서부터 순서대로 채우고 [미션 N] 주석을 지운다.
   (빈칸 개수가 어긋나면 즉시 오류 → 시작 코드와 정답이 어긋나는 것을 막는다) */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { STARTER, JAVA_ROOT: J, TEST_ROOT: TT } = IDE;

const fill = (path, answers) => {
  const src = STARTER[path], n = (src.match(/\b___\b/g) || []).length;
  if (n !== answers.length) throw new Error(`solution blank count mismatch in ${path}: ${n} blanks, ${answers.length} answers`);
  let i = 0;
  return src.replace(/\b___\b/g, () => answers[i++]).replace(/ *\/\/ \[미션 \d+\][^\n]*/g, '');
};

const SOLUTIONS = {
  /* 미션 1 */
  [J + 'domain/Article.java']: fill(J + 'domain/Article.java', ['Entity', 'Getter', 'NoArgsConstructor', 'PROTECTED', 'Id', 'GeneratedValue', 'IDENTITY']),
  /* 미션 3 */
  [J + 'repository/BlogRepository.java']: fill(J + 'repository/BlogRepository.java', ['JpaRepository', 'Article', 'Long']),
  /* 미션 4 */
  [J + 'dto/AddArticleRequest.java']: fill(J + 'dto/AddArticleRequest.java', ['NoArgsConstructor', 'AllArgsConstructor', 'Getter', 'builder', 'build']),
  [J + 'dto/ArticleResponse.java']: fill(J + 'dto/ArticleResponse.java', ['Getter']),
  /* 미션 5 · 11 */
  [J + 'service/BlogService.java']: fill(J + 'service/BlogService.java', ['RequiredArgsConstructor', 'Service', 'final', 'save', 'toEntity',
    'Transactional', 'true', 'Transactional', 'true', 'orElseThrow', 'IllegalArgumentException', 'Transactional', 'orElseThrow', 'IllegalArgumentException']),
  /* 미션 7 · 8 */
  [J + 'controller/BlogApiController.java']: fill(J + 'controller/BlogApiController.java', ['RestController', 'RequestMapping', 'PostMapping', 'RequestBody', 'CREATED',
    'GetMapping', 'stream', 'new', 'GetMapping', 'PathVariable', 'DeleteMapping', 'PathVariable', 'PutMapping', 'PathVariable', 'RequestBody']),
  /* 미션 14 */
  [TT + 'controller/BlogApiControllerTest.java']: fill(TT + 'controller/BlogApiControllerTest.java', ['SpringBootTest', 'AutoConfigureMockMvc', 'Autowired', 'Autowired', 'Autowired', 'Autowired', 'BeforeEach', 'isCreated', 'Sql', 'Sql']),
  /* 미션 15 */
  [TT + 'repository/BlogRepositoryTest.java']: fill(TT + 'repository/BlogRepositoryTest.java', ['DataJpaTest', 'Autowired', 'isPresent']),
  /* 미션 18 */
  [J + 'aop/LogAspect.java']: fill(J + 'aop/LogAspect.java', ['Aspect', 'Component', 'service']),
};

Object.assign(IDE, { SOLUTIONS });
})();
