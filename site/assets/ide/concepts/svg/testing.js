/* ide/concepts/svg/testing.js — 테스트 종류별 로드 범위(슬라이스) 애니메이션용 SVG */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
IDE.svg = Object.assign(IDE.svg || {}, {
testing: `<svg class="dia" viewBox="0 0 940 340" role="img" aria-label="스프링 테스트 슬라이스">
  <g class="sn" id="t-client"><rect class="box bl" x="10" y="125" width="110" height="80" rx="12"/><text class="t" x="65" y="160">MockMvc</text><text class="s" x="65" y="180">가짜 요청</text></g>
  <g class="sn" id="t-e1"><path class="edge" d="M120,165 L190,165"/></g>
  <g class="sn" id="t-ctl"><rect class="box sp" x="190" y="115" width="170" height="100" rx="12"/><text class="t" x="275" y="158">Controller</text><text class="s" x="275" y="180">@RestController</text></g>
  <g class="sn" id="t-e2"><path class="edge" d="M360,165 L440,165"/></g>
  <g class="sn" id="t-svc"><rect class="box sp" x="440" y="115" width="170" height="100" rx="12"/><text class="t" x="525" y="158">Service</text><text class="s" x="525" y="180">비즈니스 로직</text></g>
  <g class="sn" id="t-mock"><rect class="box rd" x="440" y="115" width="170" height="100" rx="12"/><text class="t" x="525" y="150">가짜 Service</text><text class="m" x="525" y="173">@MockitoBean</text><text class="s" x="525" y="193">given(...).willReturn(...)</text></g>
  <g class="sn" id="t-e3"><path class="edge" d="M610,165 L690,165"/></g>
  <g class="sn" id="t-repo"><rect class="box sp" x="690" y="115" width="110" height="100" rx="12"/><text class="t" x="745" y="158">Repository</text><text class="s" x="745" y="180">JPA</text></g>
  <g class="sn" id="t-e4"><path class="edge" d="M800,165 L840,165"/></g>
  <g class="sn" id="t-db"><rect class="box or" x="840" y="125" width="90" height="80" rx="12"/><text class="t" x="885" y="160">H2 DB</text><text class="s" x="885" y="180">임베디드</text></g>
  <g class="sn" id="t-all"><rect class="box dash" x="180" y="55" width="760" height="170" rx="16"/><text class="t2" x="560" y="80">@SpringBootTest — 전체 컨텍스트 (느림 · 통합 테스트)</text></g>
  <g class="sn" id="t-web"><rect class="box dash" x="180" y="95" width="440" height="140" rx="14"/><text class="t2" x="400" y="260">@WebMvcTest — 웹 계층만 (빠름)</text></g>
  <g class="sn" id="t-jpa"><rect class="box dash" x="680" y="95" width="260" height="140" rx="14"/><text class="t2" x="810" y="260">@DataJpaTest — 데이터 계층 + H2</text></g>
  <g class="sn" id="t-unit"><rect class="box pu" x="430" y="285" width="200" height="40" rx="10"/><text class="t2" x="530" y="310">Mockito 단위 테스트 — 스프링 없이</text></g>
</svg>`,
});
})();
