# 실습 가이드 — 블로그 API 를 처음부터 (Spring Boot 4, 1~6장)

사이트 오른쪽 **Tasks** 의 12개 미션을 순서대로 풀면 6장의 블로그 API(`/api/articles`)가 완성됩니다.
시작 상태는 컨트롤러 · 서비스 · DTO · 리포지토리가 **빈 클래스**이고, `Article` 은 어노테이션이 없는 평범한 클래스입니다.

## 진행 방법

1. 미션 카드의 **위치로 이동** → TODO 를 찾아 코드를 작성
2. ▶ Run(이미 실행 중이면 ⟳ Rerun) → `requests.http` 로 직접 요청을 보내 확인
3. **정답 확인** — 앱을 새로 띄우고(빈 DB) 정해진 요청 · 테스트를 자동으로 돌려 채점
4. 막히면 **힌트** — 처음엔 1개, 정답 확인을 틀릴 때마다 1개씩 더, 2번 틀리면 정답 예시가 열림

정답은 하나가 아닙니다. 채점은 "동작" 과 "검증하는 내용" 을 보며, 다음은 모두 허용됩니다.

| 선택지 | 허용 |
|---|---|
| DTO | Lombok 클래스(`@Getter @NoArgsConstructor @AllArgsConstructor`) · `record` 둘 다 |
| 생성자 주입 | 직접 쓴 생성자 · `@RequiredArgsConstructor` 둘 다 |
| 삭제 응답 | `200 OK`(`ok().build()`) · `204 No Content`(`noContent().build()`) 둘 다 |
| readOnly | 조회 메서드마다 · 클래스에 걸고 `update()` 만 덮어쓰기 둘 다 |

고정된 것은 세 가지입니다 — 경로 `/api/articles`, 생성은 `201 Created`, 없는 글은 `IllegalArgumentException("not found: " + id)`.

## 미션 지도

| # | 단계 | 미션 | 채점 | 핵심 개념 · 함정 |
|---|---|---|---|---|
| 1 | JPA 엔티티 (5장) | Article 엔티티 + `BlogRepository` | 앱 기동 + 엔티티 · 리포지토리 구조 | `@Entity @Id @GeneratedValue(IDENTITY)`, **기본 생성자 없으면 기동 실패**, `JpaRepository<Article, Long>` |
| 2 | 블로그 API (6장) | 글 추가 `POST` | 제공 테스트 `addArticle` + 201 | `@RequestBody`, `toEntity()`, `ResponseEntity.status(CREATED)`, 생성자 주입 |
| 3 | | 글 목록 `GET` | 제공 테스트 `findAllArticles` + 응답에 `id` | 엔티티 대신 **응답 DTO**, `stream().map(ArticleResponse::new).toList()`, `@Sql` |
| 4 | | 글 하나 `GET /{id}` | 제공 테스트 `findArticle` + `/999` 예외 | `@PathVariable`, `Optional.orElseThrow`, 처리 안 된 예외 = 500 |
| 5 | | 글 삭제 `DELETE /{id}` | 삭제 후 목록에서 사라짐 | `deleteById`, `ResponseEntity<Void>` |
| 6 | 수정과 트랜잭션 (5·6장) | 글 수정 `PUT /{id}` | 다시 GET 했을 때 반영 + `save()` 금지 | **변경 감지(dirty checking)**, 트랜잭션 없으면 응답만 바뀌고 DB 는 그대로 |
| 7 | | 조회는 `readOnly` | 조회 readOnly + 수정은 여전히 반영 | 클래스 readOnly 를 `update()` 가 덮어쓰지 않으면 수정이 사라짐 |
| 8 | 테스트 직접 작성 (4·6장) | `deleteArticle()` 테스트 | 전체 통과 + **변이 검사** | 상태 코드만 보면 "삭제 안 하는 컨트롤러" 에서도 통과 → 리포지토리로 확인 |
| 9 | | `updateArticle()` 테스트 | 전체 통과 + **변이 검사** | 응답 JSON 만 보면 "변경 감지 꺼진" 환경에서도 통과 → `findById` 로 다시 확인 |
| 10 | | `@DataJpaTest` `BlogRepositoryTest` | 통과 + **변이 검사** | 슬라이스 테스트, "저장한 척만 하는" 리포지토리에서 실패해야 함 |
| 11 | 5장 실습 | Book API `GET /books` | 책 2권 JSON | data.sql 은 테이블 생성 **전**에 실행 → `spring.jpa.defer-datasource-initialization: true` |
| 12 | 보너스 AOP (2장) | LogAspect 고치기 | 서비스 호출 시 ▶ ◀ 로그 | `@Aspect` 는 빈 등록이 아님(`@Component`), 포인트컷 패키지 오타 |

## 변이 검사란

미션 8~10 은 "테스트가 통과하는가" 만 보지 않습니다. 코드를 일부러 망가뜨린 환경에서 **내 테스트가 실패하는지**도 확인합니다.

| 변이 | 망가뜨린 것 | 잡으려면 |
|---|---|---|
| `delete-call` | DELETE 가 서비스를 부르지 않음 (응답은 정상) | 삭제 후 `blogRepository.findAll()` 이 비었는지 |
| `no-flush` | 트랜잭션 커밋 때 변경 감지가 일어나지 않음 | 수정 후 `blogRepository.findById(id)` 로 다시 꺼내 비교 |
| `repo` | `save()` 가 저장한 척만 함 | 저장 후 `findById` / `findAll` 결과 검증 |

## 시험 전에 설명할 수 있어야 하는 것

- 엔티티에 인자 없는 생성자가 필요한 이유와, `protected` 로 충분한 이유
- 응답에 엔티티 대신 DTO 를 쓰는 이유 두 가지 (API 스펙 노출 · 지연 로딩/순환 참조)
- `save()` 없이 수정이 반영되는 원리 — 영속성 컨텍스트, 스냅샷, 커밋 시 flush
- `readOnly = true` 가 하는 일과, 쓰기 메서드에 걸면 생기는 문제
- 200 과 204 의 차이, 201 을 돌려주는 두 가지 방법
- `@SpringBootTest + @AutoConfigureMockMvc` · `@WebMvcTest` · `@DataJpaTest` 가 띄우는 범위
- 처리되지 않은 예외가 MockMvc 테스트에서 `ServletException` 의 cause 로 나오는 이유
- data.sql 이 "Table not found" 를 내는 이유와 해결 설정

## 더 해 보기 (채점 없음)

- 없는 글 조회 테스트: `assertThatThrownBy(() -> mockMvc.perform(get("/api/articles/{id}", 999L))).hasCauseInstanceOf(IllegalArgumentException.class)`
- 숫자가 아닌 id(`/api/articles/abc`)가 400 이 되는 이유 설명하기
- `@RestControllerAdvice` 로 not found 를 404 로 바꾼 뒤, 위 테스트가 어떻게 바뀌어야 하는지 생각해 보기
