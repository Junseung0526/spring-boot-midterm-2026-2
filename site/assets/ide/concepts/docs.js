/* ide/concepts/docs.js — 정적 문서 패널(환영 화면 · Boot 4 변경점 · 요약표). HTML 문자열이며 data-open / data-memo 속성으로 탭·모달을 연다 */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
IDE.docs = {
welcome: `<h1>스프링부트4 실습</h1>
<p class="lead">왼쪽 <b>Concepts</b> 에서 개념을 고르면 <b>코드가 한 줄씩 타이핑되고 그림이 움직이며</b> 동작 원리를 보여 줍니다.
개념을 이해했다면 <b>Project</b> 의 코드를 직접 고쳐 보고 ▶ Run 으로 실행해 보세요.</p>
<p><a class="cta" data-open="concept:mvcpattern">▶ 애니메이션으로 배우기 시작</a> <span class="muted">열자마자 자동으로 재생됩니다 · 일시정지 / 이전 / 다음 버튼으로 단계 이동</span></p>
<h3>학습 순서</h3>
<div class="wcards">
  <a data-open="concept:mvcpattern"><i>1</i><b>MVC 패턴</b><span>Model · View · Controller 의 역할</span></a>
  <a data-open="concept:mvc"><i>2</i><b>MVC 요청 흐름</b><span>DispatcherServlet 10단계</span></a>
  <a data-open="concept:ioc"><i>3</i><b>IoC · DI</b><span>컨테이너가 만들고 주입한다</span></a>
  <a data-open="concept:life"><i>4</i><b>빈 생명주기</b><span>생성 → 주입 → 초기화 → 소멸</span></a>
  <a data-open="concept:aop"><i>5</i><b>AOP</b><span>프록시와 어드바이스 실행 순서</span></a>
  <a data-open="concept:psa"><i>6</i><b>PSA</b><span>구현체를 갈아끼우는 추상화</span></a>
  <a data-open="concept:testing"><i>7</i><b>테스트 (슬라이스)</b><span>@WebMvcTest · @MockitoBean · @DataJpaTest</span></a>
  <a data-open="concept:boot"><i>8</i><b>부트 시작 · 자동 설정</b><span>main() 부터 내장 Tomcat 까지</span></a>
  <a data-open="concept:flow"><i>9</i><b>POST 계층 흐름</b><span>Controller → Service → Repository</span></a>
</div>
<h3>직접 해 보기</h3>
<div class="wcards">
  <a data-open="src/main/java/com/example/blog/service/PostService.java" class="act"><i>▶</i><b>미션 시작</b><span>오른쪽 Tasks 의 12개 미션 — CRUD 를 한 걸음씩 직접 만들어요</span></a>
  <a data-memo="ann" class="act"><i></i><b>어노테이션 암기</b><span>카드 · 객관식 · 빈칸 입력 · 목록</span></a>
  <a data-memo="exam" class="act"><i></i><b>모의고사</b><span>오답노트 자동 저장</span></a>
</div>
<p class="muted">이 환경은 브라우저에서 동작을 재현하는 <b>시뮬레이션</b>입니다. 작성한 코드가 스프링 규칙(빈 등록, 주입, 매핑, 검증, AOP)에 맞게 해석됩니다.</p>`,
boot4: `<h2>Spring Boot 4 (Spring Framework 7) 변경점 <span class="tag">출제 가능성↑</span></h2>
    <div class="tablewrap"><table>
      <thead><tr><th>항목</th><th>Boot 3 (Framework 6)</th><th>Boot 4 (Framework 7)</th></tr></thead>
      <tbody>
        <tr><td>기반</td><td>Spring Framework 6.x</td><td><b>Spring Framework 7</b>, Jakarta EE 11 (Servlet 6.1, Tomcat 11, Hibernate 7)</td></tr>
        <tr><td>Java</td><td>17+</td><td>17+ 기준 유지 (최신 LTS 권장, Java 25 지원)</td></tr>
        <tr><td>모듈 구조</td><td>거대한 spring-boot-autoconfigure</td><td><b>모듈화</b>: 기술별로 작은 모듈·전용 스타터로 분리</td></tr>
        <tr><td>웹 스타터</td><td><code>spring-boot-starter-web</code></td><td><code>spring-boot-starter-webmvc</code> (테스트: <code>…-webmvc-test</code>)</td></tr>
        <tr><td>AOP 스타터</td><td><code>spring-boot-starter-aop</code></td><td><code>spring-boot-starter-aspectj</code></td></tr>
        <tr><td>JSON</td><td>Jackson 2</td><td><b>Jackson 3</b> 기본 (패키지 <code>tools.jackson</code>)</td></tr>
        <tr><td>테스트 목</td><td><code>@MockBean</code>, <code>@SpyBean</code></td><td>제거 → <b><code>@MockitoBean</code>, <code>@MockitoSpyBean</code></b></td></tr>
        <tr><td>널 안정성</td><td>자체 @Nullable</td><td><b>JSpecify</b> 어노테이션 채택</td></tr>
        <tr><td>API 버전 관리</td><td>직접 구현</td><td>매핑에서 <code>version</code> 속성으로 지원</td></tr>
        <tr><td>HTTP 클라이언트</td><td>RestTemplate / RestClient</td><td>RestClient + <b>HTTP Service Client</b>(<code>@HttpExchange</code>, <code>@ImportHttpServices</code>) 강화, RestTemplate 는 단계적 폐지 방향</td></tr>
        <tr><td>복원력</td><td>Spring Retry 별도</td><td><code>@Retryable</code>, <code>@ConcurrencyLimit</code> 코어 포함</td></tr>
        <tr><td>제거</td><td>Undertow 등</td><td>Servlet 6.1 비호환 Undertow 지원 제외 → Tomcat(기본)/Jetty</td></tr>
      </tbody></table></div>
    <div class="callout warn"><b>주의</b> 세부 항목(스타터 이름 등)은 릴리스 마이너 버전에 따라 달라질 수 있으니, <b>강의 자료에 나온 표현을 우선</b>하고 이 표는 흐름 파악용으로 보세요.</div>`,
cheat: `<h2>시험 직전 요약표</h2><h3>한 줄 정의</h3>
    <div class="tablewrap"><table><tbody>
      <tr><td><b>IoC</b></td><td>객체의 생성·관리·연결 제어권이 개발자 → 컨테이너로 넘어간 것</td></tr>
      <tr><td><b>DI</b></td><td>의존 객체를 외부에서 주입 (생성자 / 세터 / 필드) — IoC 의 구현 방법</td></tr>
      <tr><td><b>Bean</b></td><td>스프링 컨테이너가 생성·관리하는 객체 (기본 싱글톤)</td></tr>
      <tr><td><b>ApplicationContext</b></td><td>BeanFactory 를 확장한 IoC 컨테이너 (이벤트, 메시지, 환경 등 제공)</td></tr>
      <tr><td><b>AOP</b></td><td>횡단 관심사를 분리해 프록시로 메서드 실행 전후에 적용</td></tr>
      <tr><td><b>PSA</b></td><td>기술 종속 없이 일관된 추상화 제공 → 구현체 교체 가능 (@Transactional, @Cacheable …)</td></tr>
      <tr><td><b>MVC</b></td><td>Model(데이터·로직) · View(화면) · Controller(제어) 역할 분리</td></tr>
      <tr><td><b>DispatcherServlet</b></td><td>모든 요청의 진입점인 Front Controller</td></tr>
      <tr><td><b>AutoConfiguration</b></td><td>클래스패스·조건(@ConditionalOn…)으로 빈을 자동 등록</td></tr>
      <tr><td><b>Starter</b></td><td>관련 의존성을 한 번에 묶은 의존성 패키지</td></tr>
    </tbody></table></div>

    <h3>헷갈리는 비교</h3>
    <div class="tablewrap"><table><thead><tr><th>비교</th><th>A</th><th>B</th></tr></thead><tbody>
      <tr><td>@Controller vs @RestController</td><td>반환값 = 뷰 이름</td><td>반환값 = 응답 본문(JSON) (@ResponseBody 포함)</td></tr>
      <tr><td>@Component vs @Bean</td><td>클래스에 붙임 · 스캔으로 등록</td><td>메서드에 붙임 · 외부 라이브러리 객체 등록</td></tr>
      <tr><td>@Valid vs @Validated</td><td>jakarta 표준 · 중첩 객체 검증</td><td>Spring · 그룹 검증 · 클래스 레벨 메서드 검증</td></tr>
      <tr><td>@NotNull / @NotEmpty / @NotBlank</td><td>null 만 불가 / null·빈값 불가</td><td>null·빈문자·공백문자 모두 불가 (문자열)</td></tr>
      <tr><td>@Before / @After / @Around</td><td>실행 전 / 실행 후(항상)</td><td>전후 모두 + 반환값·예외 제어 (proceed 필수)</td></tr>
      <tr><td>@Primary vs @Qualifier</td><td>기본 후보 지정(공급자 쪽)</td><td>이름으로 지정(사용자 쪽, 우선)</td></tr>
      <tr><td>JDK Proxy vs CGLIB</td><td>인터페이스 기반</td><td>클래스 상속 기반 (부트 기본)</td></tr>
      <tr><td>@SpringBootTest vs @WebMvcTest</td><td>전체 컨텍스트(느림)</td><td>웹 계층 슬라이스(빠름) + @MockitoBean</td></tr>
      <tr><td>@MockBean vs @MockitoBean</td><td>Boot 3 까지</td><td>Boot 4 (Framework 7) — 이쪽이 정답</td></tr>
    </tbody></table></div>

    <h3>암기 문장</h3>
    <ul>
      <li>요청 흐름: <b>DispatcherServlet → HandlerMapping → HandlerAdapter → Controller → … → ViewResolver/MessageConverter</b></li>
      <li>빈 생명주기: <b>생성 → 의존성 주입 → @PostConstruct → 사용 → @PreDestroy</b>, AOP 프록시는 초기화 직후 <b>BeanPostProcessor</b> 에서 생성</li>
      <li>@Transactional: <b>프록시 기반</b> · RuntimeException 롤백 · 자기호출/private 무효</li>
      <li>어드바이스 순서: <b>Around → Before → 대상 → AfterReturning/Throwing → After → Around(후)</b></li>
      <li>컴포넌트 스캔: <b>메인 클래스 패키지 + 하위</b></li>
    </ul>`,
};
})();
