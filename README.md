# 스프링부트4 실습

IntelliJ 처럼 코드를 직접 작성 · 실행 · 테스트하면서 **MVC → IoC/DI → CRUD → 트랜잭션(PSA) → AOP → 테스트** 를 익히는 Spring Boot 4 중간고사 대비 실습 사이트입니다.
빌드 도구 없이 `site/` 폴더만 배포되는 정적 사이트(순수 HTML/CSS/JS)이며, 스프링은 **브라우저에서 규칙대로 재현하는 시뮬레이터**입니다.

## 무엇을 할 수 있나
| 기능 | 설명 |
|---|---|
| **개념 애니메이션** | 왼쪽 💡 Concepts — 코드가 타이핑되고 SVG 가 움직이며 자동 재생. 장면이 끝나면 이해 확인 퀴즈 · 관련 실습 · 다음 개념으로 이어짐 |
| **IntelliJ New UI** | 자동완성 · 자동 import · 빨간 밑줄 · Run 콘솔 · HTTP Client(`requests.http`) · 테스트 실행(✔/✖ 거터) |
| **12개 미션 (8단계)** | 컨트롤러를 빈 뼈대에서 시작해 **CRUD 를 한 걸음씩 직접 작성**: IoC/DI → 조회(목록·단건) → 생성(만들기·201·400) → 수정 → 삭제 → `@Transactional` → AOP → 테스트. 다음 미션은 앞 미션을 끝내야 열리고("미리 열기"로 건너뛰기 가능), 미션마다 채점 기준·정답 예시·**내 현재 코드를 읽는 힌트**가 있음. 행동으로 채점하므로 순서를 바꿔도, 미션 밖의 코드를 써도 동작 |
| **처음부터 직접 작성** | Project 의 `＋ New` 로 Controller / Service / Repository / Entity / DTO / Config / Test 파일 생성 |
| **테스트 코드** | `@SpringBootTest` · `@WebMvcTest`(+`@MockitoBean`) · `@DataJpaTest` · Mockito 단위 테스트 14개가 프로젝트에 포함 |
| **Git(시뮬레이션)** | 변경 파일 색상, Commit 도구창(Ctrl+K) · Diff · 로그 · Push |
| **암기 · 시험** | 상단 버튼: 어노테이션 카드/객관식/빈칸/목록, 모의고사(오답노트) |
| **반응형** | 1024 ~ 1920px 노트북 화면에 맞춰 도구창 폭·콘솔 높이가 조절됨 |

> 시뮬레이터의 한계: HTTP 요청은 "표준 CRUD 의미"로 처리하므로 서비스 본문의 **임의 로직은 실행하지 않습니다.** 반면 테스트는 `core/minijava.js` 인터프리터가 서비스·엔티티 코드까지 해석합니다(지원하지 않는 구문은 "실행불가"로 표시).

## 로컬 실행
```bash
cd site && python3 -m http.server 8000   # http://localhost:8000
node tests/check.js                       # 데이터 · SVG · 커리큘럼 · 테스트 러너 점검 (79개)
```

## GitHub Pages 배포
1. `main` 브랜치로 push
2. 저장소 **Settings → Pages → Source: GitHub Actions** (최초 1회)
3. `.github/workflows/deploy.yml` 이 JS 문법 검사 + `tests/check.js` 후 자동 배포

## 구조
```
site/
├─ index.html                     IDE 화면 (아이콘 스프라이트 · 스크립트 로딩 순서)
└─ assets/
   ├─ data/                       annotations.js · steps.js(애니메이션 단계) · exam.js
   ├─ memo/                       어노테이션 암기 · 모의고사 모달 (core · trainer · exam · modal)
   └─ ide/
      ├─ core/                    DOM 없는 엔진 — parser · compile · beans · web · boot · http · minijava · testrun
      ├─ project/                 starter(시작 코드) · solutions(정답) · missions(커리큘럼 · 채점)
      ├─ concepts/                registry · player · docs · svg/(다이어그램)
      ├─ ui/                      state · editor · tree · tabs · console · git · newfile · missions · main …
      ├─ runner.js                Run / Stop / HTTP / 테스트 실행
      └─ css/                     theme · layout · editor · panels · concept
tests/check.js                    의존성 없는 자동 점검 (CI 에서 실행)
```
- 미션 추가/수정 → `project/missions.js` · 시작 코드 → `project/starter.js` · 정답 → `project/solutions.js`
- 스프링 규칙 추가 → `core/beans.js`(DI) · `core/http.js`(MVC) · `core/testrun.js`(테스트)
- 개념 장면 추가 → `concepts/svg/*` + `data/steps.js` + `concepts/registry.js`
