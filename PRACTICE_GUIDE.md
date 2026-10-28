# 실습 가이드 — 시험형 빈칸 채우기 · 코드 해석 (Spring Boot 4, 1~6장)

시작 코드는 **완성된 블로그 API**(`/api/articles`)에서 시험에 나올 만한 부분만 비워 둔 것입니다.
코드를 처음부터 쓰지 않고, 오른쪽 **Tasks** 의 20개 미션을 따라 빈칸을 채우고 코드의 동작을 설명합니다.

## 두 종류의 미션

| 종류 | 하는 일 | 채점 |
|---|---|---|
| **빈칸** (11개) | 코드의 `// [미션 N] ① …` 주석 자리에 어노테이션 · 키워드 · 한 줄을 채움 | 빈칸 검사 + 실제 실행(앱 기동 · HTTP 요청 · 테스트) |
| **해석** (9개) | 미션 창의 질문에 답을 적어 제출 | 핵심 단어가 들어 있으면 정답 (띄어쓰기 · 대소문자 무시) |

- import 는 미리 다 들어 있어서 이름만 맞게 쓰면 됩니다.
- 시작하면 일부 파일에 빨간 줄이 있습니다. getter 와 리포지토리 상속이 빈칸이라서 그렇고, 미션 1 · 3 을 풀면 사라집니다.
- 힌트는 처음에 1개, 틀릴 때마다 1개씩 더 열리고, 2번 틀리면 정답 예시(해석은 모범 답안)가 열립니다.

## 미션 지도

| # | 단계 | 미션 | 빈칸 / 질문 |
|---|---|---|---|
| 1 | 엔티티 (5장) | [빈칸] Article 엔티티 | `@Entity` `@Getter` `@NoArgsConstructor(access = AccessLevel.PROTECTED)` `@Id` `@GeneratedValue(strategy = GenerationType.IDENTITY)` |
| 2 | | [해석] 기본 생성자가 필요한 이유 | 리플렉션 · 프록시 |
| 3 | | [빈칸] BlogRepository | `extends JpaRepository<Article, Long>` |
| 4 | DTO · 서비스 (6장) | [빈칸] 요청 · 응답 DTO | `@NoArgsConstructor` `@AllArgsConstructor` `@Getter`, `Article.builder().title(title).content(content).build()` |
| 5 | | [빈칸] BlogService | `@RequiredArgsConstructor` `@Service` `final`, `save(request.toEntity())`, `orElseThrow(() -> new IllegalArgumentException("not found: " + id))` |
| 6 | | [해석] 없는 글을 조회하면? | 500, 처리되지 않은 예외 |
| 7 | 컨트롤러 (6장) | [빈칸] 컨트롤러 매핑 | `@RestController` `@RequestMapping` `@PostMapping` `@GetMapping("/{id}")` `@DeleteMapping` `@PutMapping` `@RequestBody` `@PathVariable` |
| 8 | | [빈칸] 응답 만들기 | `HttpStatus.CREATED`, `stream().map(ArticleResponse::new).toList()` |
| 9 | | [해석] 요청이 지나가는 계층 | 컨트롤러 → 서비스 → 리포지토리 (순서 채점) |
| 10 | | [해석] 엔티티 대신 DTO | API 스펙 노출 · 결합 · 순환 참조 |
| 11 | 트랜잭션 (5·6장) | [빈칸] 트랜잭션 | `@Transactional(readOnly = true)` ×2, `@Transactional` |
| 12 | | [해석] save() 없이 수정되는 이유 | 변경 감지 + 커밋(flush) 시점 |
| 13 | | [해석] update() 를 readOnly 로 하면? | 안 바뀜 + flush 안 함 |
| 14 | 테스트 (4·6장) | [빈칸] 컨트롤러 테스트 | `@SpringBootTest` `@AutoConfigureMockMvc` `@Autowired` `@BeforeEach` `isCreated()` `@Sql("/test-db.sql")` |
| 15 | | [빈칸] @DataJpaTest | `@DataJpaTest` `@Autowired` |
| 16 | | [해석] @SpringBootTest vs @DataJpaTest | 전체 빈 vs JPA 슬라이스 |
| 17 | 설정 (5장) | [빈칸] Book 데이터 넣기 | data.sql 주석 풀기, `spring.jpa.defer-datasource-initialization: true` |
| 18 | | [해석] Table not found 의 이유 | data.sql 이 테이블 생성보다 먼저 실행 |
| 19 | AOP (2장) | [빈칸] LogAspect | `@Aspect` `@Component`, 포인트컷 패키지 오타 |
| 20 | | [해석] @Aspect 만으로는 안 되는 이유 | 빈으로 등록돼야 프록시가 만들어짐 |

## 일부러 넣어 둔 함정

빈칸을 틀리게 채우면 실제 스프링과 똑같이 실패합니다. 콘솔을 읽고 원인을 찾는 연습이 됩니다.

| 틀린 상태 | 결과 |
|---|---|
| 엔티티에 기본 생성자 없음 | 기동 실패 — No default constructor for entity |
| 서비스 필드에 `final` 없음 | 주입되지 않아 요청 시 NullPointerException |
| `orElse(null)` 그대로 | 없는 글이 예외 대신 엉뚱한 응답 |
| `update()` 에 트랜잭션 없음 / readOnly | PUT 응답은 바뀌어 보여도 다시 GET 하면 그대로 |
| `@Sql` 빠짐 | `findAllArticles` 테스트 실패 (데이터 없음) |
| data.sql 만 풀고 defer 설정 없음 | 기동 실패 — Table "BOOK" not found |
| `@Aspect` 에 `@Component` 없음 · 패키지 오타 | 로그가 찍히지 않음 |

## 시험 전에 설명할 수 있어야 하는 것

- 엔티티에 인자 없는 생성자가 필요한 이유와, `protected` 로 충분한 이유
- `@RequiredArgsConstructor` 가 `final` 필드만 주입하는 이유
- 응답에 엔티티 대신 DTO 를 쓰는 이유
- `save()` 없이 수정이 반영되는 원리 — 영속성 컨텍스트, 스냅샷, 커밋 시 flush
- `readOnly = true` 가 하는 일과, 쓰기 메서드에 걸면 생기는 문제
- 200 · 201 · 204 · 500 이 각각 언제 나오는지
- `@SpringBootTest` · `@WebMvcTest` · `@DataJpaTest` 가 띄우는 범위
- data.sql 이 "Table not found" 를 내는 이유와 해결 설정

## 더 해 보기 (채점 없음)

- 삭제 테스트 `deleteArticle()` 직접 작성 — 삭제 후 `blogRepository.findAll()` 이 비었는지 확인
- 수정 테스트 `updateArticle()` 직접 작성 — 응답 JSON 이 아니라 `findById` 로 다시 꺼내 확인
- 없는 글 조회 테스트: `assertThatThrownBy(() -> mockMvc.perform(get("/api/articles/{id}", 999L))).hasCauseInstanceOf(IllegalArgumentException.class)`
- `@RestControllerAdvice` 로 not found 를 404 로 바꿔 보기
