/* ide/concepts/svg/diagrams.js — 개념 애니메이션용 SVG. .sn 요소가 단계별 강조 대상이며 id 는 data/steps.js 의 on 과 연결됨 */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
IDE.svg = Object.assign(IDE.svg || {}, {
mvc: `<svg class="dia" viewBox="0 0 940 400" role="img" aria-label="Spring MVC 요청 처리 흐름">
        <rect class="lane" x="190" y="0" width="745" height="165" rx="14"/>
        <text class="lane-t" x="925" y="156" style="text-anchor:end">Spring MVC 프레임워크 (내부 컴포넌트)</text>
        <rect class="lane2" x="190" y="235" width="745" height="152" rx="14"/>
        <text class="lane-t" x="925" y="376" style="text-anchor:end">개발자가 작성하는 코드</text>

        <g class="sn" id="n-client"><rect class="box bl" x="20" y="60" width="120" height="80" rx="10"/><text class="t" x="80" y="92">Client</text><text class="s" x="80" y="112">브라우저 / 앱</text></g>
        <g class="sn" id="n-ds"><rect class="box sp" x="210" y="40" width="170" height="100" rx="12"/><text class="t" x="295" y="84">DispatcherServlet</text><text class="s" x="295" y="104">Front Controller</text></g>
        <g class="sn" id="n-hm"><rect class="box" x="470" y="30" width="150" height="45" rx="10"/><text class="t2" x="545" y="50">HandlerMapping</text><text class="s" x="545" y="66">URL → 핸들러 탐색</text></g>
        <g class="sn" id="n-ha"><rect class="box" x="470" y="105" width="150" height="45" rx="10"/><text class="t2" x="545" y="125">HandlerAdapter</text><text class="s" x="545" y="141">핸들러 실행</text></g>
        <g class="sn" id="n-vr"><rect class="box pu" x="700" y="60" width="210" height="60" rx="10"/><text class="t2" x="805" y="86">ViewResolver / Converter</text><text class="s" x="805" y="106">HTML 렌더링 or JSON 변환</text></g>
        <g class="sn" id="n-ctrl"><rect class="box sp" x="210" y="280" width="150" height="60" rx="10"/><text class="t" x="285" y="306">Controller</text><text class="s" x="285" y="326">@RestController</text></g>
        <g class="sn" id="n-svc"><rect class="box sp" x="430" y="280" width="130" height="60" rx="10"/><text class="t" x="495" y="306">Service</text><text class="s" x="495" y="326">@Service · @Tx</text></g>
        <g class="sn" id="n-repo"><rect class="box sp" x="620" y="280" width="140" height="60" rx="10"/><text class="t" x="690" y="306">Repository</text><text class="s" x="690" y="326">JpaRepository</text></g>
        <g class="sn" id="n-db"><path class="box or" d="M820,288 a50,10 0 0 1 100,0 v50 a50,10 0 0 1 -100,0 z"/><ellipse class="box or" cx="870" cy="288" rx="50" ry="10"/><text class="t" x="870" y="318">DB</text></g>

        <g class="sn" id="e1"><path class="edge" d="M140,80 L210,80"/><circle class="badge" cx="175" cy="80" r="11"/><text class="bt" x="175" y="84">1</text></g>
        <g class="sn" id="e10"><path class="edge back" d="M210,112 L140,112"/><circle class="badge" cx="175" cy="112" r="11"/><text class="bt" x="175" y="116">10</text></g>
        <g class="sn" id="e2"><path class="edge" d="M380,65 L470,52"/><circle class="badge" cx="425" cy="58" r="11"/><text class="bt" x="425" y="62">2</text></g>
        <g class="sn" id="e3"><path class="edge" d="M380,115 L470,127"/><circle class="badge" cx="425" cy="121" r="11"/><text class="bt" x="425" y="125">3</text></g>
        <g class="sn" id="e4"><path class="edge" d="M545,150 L545,210 L335,210 L335,280"/><circle class="badge" cx="440" cy="210" r="11"/><text class="bt" x="440" y="214">4</text></g>
        <g class="sn" id="e8"><path class="edge back" d="M235,280 L235,140"/><circle class="badge" cx="235" cy="210" r="11"/><text class="bt" x="235" y="214">8</text></g>
        <g class="sn" id="e9"><path class="edge" d="M295,40 L295,15 L805,15 L805,60"/><circle class="badge" cx="550" cy="15" r="11"/><text class="bt" x="550" y="19">9</text></g>
        <g class="sn" id="e5"><path class="edge" d="M360,310 L430,310"/><circle class="badge" cx="395" cy="310" r="11"/><text class="bt" x="395" y="314">5</text></g>
        <g class="sn" id="e6"><path class="edge" d="M560,310 L620,310"/><circle class="badge" cx="590" cy="310" r="11"/><text class="bt" x="590" y="314">6</text></g>
        <g class="sn" id="e7"><path class="edge" d="M760,310 L820,310"/><circle class="badge" cx="790" cy="310" r="11"/><text class="bt" x="790" y="314">7</text></g>
      </svg>`,
boot: `<svg class="dia" viewBox="0 0 940 190" role="img" aria-label="스프링 부트 시작 흐름">
        <g class="sn" id="s1"><rect class="box bl" x="10" y="45" width="130" height="80" rx="12"/><text class="t2" x="75" y="80">① main()</text><text class="s" x="75" y="102">진입점</text></g>
        <g class="sn" id="b1"><path class="edge" d="M140,85 L165,85"/></g>
        <g class="sn" id="s2"><rect class="box sp" x="165" y="45" width="130" height="80" rx="12"/><text class="t2" x="230" y="80">② run()</text><text class="s" x="230" y="102">SpringApplication</text></g>
        <g class="sn" id="b2"><path class="edge" d="M295,85 L320,85"/></g>
        <g class="sn" id="s3"><rect class="box sp" x="320" y="45" width="130" height="80" rx="12"/><text class="t2" x="385" y="80">③ Context 생성</text><text class="s" x="385" y="102">ApplicationContext</text></g>
        <g class="sn" id="b3"><path class="edge" d="M450,85 L475,85"/></g>
        <g class="sn" id="s4"><rect class="box pu" x="475" y="45" width="130" height="80" rx="12"/><text class="t2" x="540" y="80">④ 컴포넌트 스캔</text><text class="s" x="540" y="102">@Component → 빈</text></g>
        <g class="sn" id="b4"><path class="edge" d="M605,85 L630,85"/></g>
        <g class="sn" id="s5"><rect class="box or" x="630" y="45" width="130" height="80" rx="12"/><text class="t2" x="695" y="80">⑤ 자동 설정</text><text class="s" x="695" y="102">AutoConfiguration</text></g>
        <g class="sn" id="b5"><path class="edge" d="M760,85 L785,85"/></g>
        <g class="sn" id="s6"><rect class="box rd" x="785" y="45" width="130" height="80" rx="12"/><text class="t2" x="850" y="80">⑥ 내장 Tomcat</text><text class="s" x="850" y="102">8080 리스닝</text></g>
        <text class="m" x="470" y="165">Started BlogApplication in 2.1 seconds  ✔</text>
      </svg>`,
life: `<svg class="dia" viewBox="0 0 940 190" role="img" aria-label="빈 생명주기">
        <g class="sn" id="l1"><rect class="box bl" x="6" y="30" width="118" height="80" rx="10"/><text class="t2" x="65" y="64">컨테이너 시작</text><text class="s" x="65" y="86">refresh()</text></g>
        <g class="sn" id="lb1"><path class="edge" d="M124,70 L141,70"/></g>
        <g class="sn" id="l2"><rect class="box sp" x="141" y="30" width="118" height="80" rx="10"/><text class="t2" x="200" y="64">빈 정의 로딩</text><text class="s" x="200" y="86">@Component 스캔</text></g>
        <g class="sn" id="lb2"><path class="edge" d="M259,70 L276,70"/></g>
        <g class="sn" id="l3"><rect class="box sp" x="276" y="30" width="118" height="80" rx="10"/><text class="t2" x="335" y="64">인스턴스화</text><text class="s" x="335" y="86">생성자 호출</text></g>
        <g class="sn" id="lb3"><path class="edge" d="M394,70 L411,70"/></g>
        <g class="sn" id="l4"><rect class="box sp" x="411" y="30" width="118" height="80" rx="10"/><text class="t2" x="470" y="64">의존성 주입</text><text class="s" x="470" y="86">세터 / 필드</text></g>
        <g class="sn" id="lb4"><path class="edge" d="M529,70 L546,70"/></g>
        <g class="sn" id="l5"><rect class="box or" x="546" y="30" width="118" height="80" rx="10"/><text class="t2" x="605" y="64">초기화</text><text class="s" x="605" y="86">@PostConstruct</text></g>
        <g class="sn" id="lb5"><path class="edge" d="M664,70 L681,70"/></g>
        <g class="sn" id="l6"><rect class="box sp" x="681" y="30" width="118" height="80" rx="10"/><text class="t2" x="740" y="64">사용 (Ready)</text><text class="s" x="740" y="86">싱글톤 재사용</text></g>
        <g class="sn" id="lb6"><path class="edge" d="M799,70 L816,70"/></g>
        <g class="sn" id="l7"><rect class="box rd" x="816" y="30" width="118" height="80" rx="10"/><text class="t2" x="875" y="64">소멸</text><text class="s" x="875" y="86">@PreDestroy</text></g>
        <g class="sn" id="l-note"><rect class="box pu" x="440" y="130" width="330" height="44" rx="10"/><text class="t2" x="605" y="150">BeanPostProcessor</text><text class="s" x="605" y="167">여기서 원본 빈 → AOP 프록시로 교체!</text></g>
      </svg>`,
aop: `<svg class="dia" viewBox="0 0 940 420" role="img" aria-label="AOP 프록시 어드바이스 체인">
        <g class="sn" id="n-client"><rect class="box bl" x="20" y="150" width="120" height="90" rx="12"/><text class="t" x="80" y="190">Client</text><text class="s" x="80" y="210">Controller 등</text></g>
        <g class="sn" id="n-proxy"><rect class="box pu" x="230" y="20" width="300" height="385" rx="16"/><text class="t" x="380" y="48">Proxy (CGLIB)</text></g>
        <g class="sn" id="r-around1"><rect class="box" x="250" y="70" width="260" height="44" rx="8"/><text class="t2" x="380" y="97">@Around  (proceed 전)</text></g>
        <g class="sn" id="r-before"><rect class="box" x="250" y="125" width="260" height="44" rx="8"/><text class="t2" x="380" y="152">@Before</text></g>
        <g class="sn" id="r-call"><rect class="box sp" x="250" y="180" width="260" height="44" rx="8"/><text class="t2" x="380" y="207">pjp.proceed() → 대상 호출</text></g>
        <g class="sn" id="r-afterret"><rect class="box" x="250" y="235" width="260" height="44" rx="8"/><text class="t2" x="380" y="262">@AfterReturning / @AfterThrowing</text></g>
        <g class="sn" id="r-after"><rect class="box" x="250" y="290" width="260" height="44" rx="8"/><text class="t2" x="380" y="317">@After  (finally)</text></g>
        <g class="sn" id="r-around2"><rect class="box" x="250" y="345" width="260" height="44" rx="8"/><text class="t2" x="380" y="372">@Around  (proceed 후)</text></g>
        <g class="sn" id="n-target"><rect class="box sp" x="700" y="170" width="210" height="100" rx="12"/><text class="t" x="805" y="212">Target</text><text class="s" x="805" y="234">PostService (진짜 객체)</text><text class="s" x="805" y="252">핵심 로직만 존재</text></g>
        <g class="sn" id="a-in"><path class="edge" d="M140,190 L230,190"/><text class="s" x="185" y="180">호출</text></g>
        <g class="sn" id="a-out"><path class="edge back" d="M230,225 L140,225"/><text class="s" x="185" y="243">결과</text></g>
        <g class="sn" id="a-call"><path class="edge" d="M510,202 L700,202"/></g>
        <g class="sn" id="a-ret1"><path class="edge back" d="M700,257 L510,257"/></g>
      </svg>`,
flow: `<svg class="dia" viewBox="0 0 940 250" role="img" aria-label="계층형 아키텍처 요청 흐름">
        <g class="sn" id="f-dto"><rect class="box pu" x="170" y="12" width="150" height="48" rx="10"/><text class="t2" x="245" y="33">PostRequest</text><text class="s" x="245" y="50">record + @Valid</text></g>
        <g class="sn" id="f-tx"><rect class="box pu" x="370" y="12" width="150" height="48" rx="10"/><text class="t2" x="445" y="33">@Transactional</text><text class="s" x="445" y="50">AOP 프록시 + PSA</text></g>
        <g class="sn" id="f-ent"><rect class="box pu" x="570" y="12" width="150" height="48" rx="10"/><text class="t2" x="645" y="33">Post</text><text class="s" x="645" y="50">@Entity</text></g>
        <g class="sn" id="f-client"><rect class="box bl" x="10" y="90" width="110" height="90" rx="12"/><text class="t" x="65" y="130">Client</text><text class="s" x="65" y="150">JSON 요청</text></g>
        <g class="sn" id="f-ctrl"><rect class="box sp" x="170" y="90" width="150" height="90" rx="12"/><text class="t" x="245" y="128">Controller</text><text class="s" x="245" y="148">입력 검증 · 위임</text></g>
        <g class="sn" id="f-svc"><rect class="box sp" x="370" y="90" width="150" height="90" rx="12"/><text class="t" x="445" y="128">Service</text><text class="s" x="445" y="148">비즈니스 로직</text></g>
        <g class="sn" id="f-repo"><rect class="box sp" x="570" y="90" width="150" height="90" rx="12"/><text class="t" x="645" y="128">Repository</text><text class="s" x="645" y="148">JpaRepository</text></g>
        <g class="sn" id="f-db"><rect class="box or" x="780" y="90" width="140" height="90" rx="12"/><text class="t" x="850" y="128">DB</text><text class="s" x="850" y="148">H2 / MySQL</text></g>
        <g class="sn" id="f1"><path class="edge" d="M120,118 L170,118"/></g>
        <g class="sn" id="f2"><path class="edge" d="M320,118 L370,118"/></g>
        <g class="sn" id="f3"><path class="edge" d="M520,118 L570,118"/></g>
        <g class="sn" id="f4"><path class="edge" d="M720,118 L780,118"/></g>
        <g class="sn" id="g1"><path class="edge back" d="M170,152 L120,152"/></g>
        <g class="sn" id="g2"><path class="edge back" d="M370,152 L320,152"/></g>
        <g class="sn" id="g3"><path class="edge back" d="M570,152 L520,152"/></g>
        <g class="sn" id="g4"><path class="edge back" d="M780,152 L720,152"/></g>
        <text class="lane-t" x="470" y="215" style="text-anchor:middle">실선 → 요청 방향 · 점선 ← 응답 방향 · 위쪽 보라색: 그 계층에서 쓰이는 핵심 요소</text>
        <text class="s" x="470" y="236">원칙: Controller → Service → Repository 단방향 의존 (Controller 가 Repository 직접 호출 금지)</text>
      </svg>`,
mvcpattern: `<svg class="dia" viewBox="0 0 940 340" role="img" aria-label="MVC 패턴 개념도">
      <g class="sn" id="m-user"><rect class="box bl" x="20" y="130" width="130" height="80" rx="12"/><text class="t" x="85" y="165">사용자</text><text class="s" x="85" y="187">브라우저 / 앱</text></g>
      <g class="sn" id="m-ctl"><rect class="box sp" x="330" y="20" width="220" height="90" rx="12"/><text class="t" x="440" y="55">Controller</text><text class="s" x="440" y="77">요청 받기 · 검증 · 흐름 제어</text><text class="s" x="440" y="95">@Controller / @RestController</text></g>
      <g class="sn" id="m-model"><rect class="box or" x="700" y="120" width="220" height="100" rx="12"/><text class="t" x="810" y="155">Model</text><text class="s" x="810" y="177">데이터 · 비즈니스 로직</text><text class="s" x="810" y="195">Entity · DTO · Service · Repository</text></g>
      <g class="sn" id="m-view"><rect class="box pu" x="330" y="240" width="220" height="80" rx="12"/><text class="t" x="440" y="272">View</text><text class="s" x="440" y="294">화면 표현 (Thymeleaf HTML / JSON)</text></g>
      <g class="sn" id="m-e1"><path class="edge" d="M150,150 L330,75"/><circle class="badge" cx="235" cy="108" r="11"/><text class="bt" x="235" y="112">1</text><text class="s r" x="245" y="86" style="text-anchor:end">요청</text></g>
      <g class="sn" id="m-e2"><path class="edge" d="M550,50 L735,120"/><circle class="badge" cx="650" cy="82" r="11"/><text class="bt" x="650" y="86">2</text><text class="s" x="690" y="64">처리 요청</text></g>
      <g class="sn" id="m-e3"><path class="edge back" d="M700,185 L520,110"/><circle class="badge" cx="610" cy="148" r="11"/><text class="bt" x="610" y="152">3</text><text class="s" x="650" y="205">결과 데이터</text></g>
      <g class="sn" id="m-e4"><path class="edge" d="M440,110 L440,240"/><circle class="badge" cx="440" cy="175" r="11"/><text class="bt" x="440" y="179">4</text><text class="s l" x="456" y="172">뷰 선택 + 모델 전달</text></g>
      <g class="sn" id="m-e5"><path class="edge" d="M330,285 C220,285 120,270 100,212"/><circle class="badge" cx="170" cy="272" r="11"/><text class="bt" x="170" y="276">5</text><text class="s" x="230" y="318">응답 (HTML / JSON)</text></g>
    </svg>`,
});
})();
