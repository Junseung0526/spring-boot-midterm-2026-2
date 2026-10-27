/* ide/concepts/svg/testing.js — 테스트 종류별 로드 범위(슬라이스) 애니메이션용 SVG.
   배치 원칙: ① 슬라이스 영역(점선)은 노드 뒤 배경, ② 영역 라벨은 영역 위쪽 띠에만, ③ 가짜 Service 는 진짜 Service 아래 칸 → 겹치는 요소 없음 */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
IDE.svg = Object.assign(IDE.svg || {}, {
testing: `<svg class="dia" viewBox="0 0 940 480" role="img" aria-label="스프링 테스트 슬라이스">
  <g class="sn" id="t-all"><rect class="box dash" x="4" y="14" width="932" height="372" rx="16"/><text class="t2" x="470" y="40">@SpringBootTest — 전체 컨텍스트 (느림 · 통합 테스트)</text></g>
  <g class="sn" id="t-web"><rect class="box dash" x="16" y="62" width="560" height="308" rx="14"/><text class="t2" x="296" y="86">@WebMvcTest — 웹 계층만 (빠름)</text></g>
  <g class="sn" id="t-jpa"><rect class="box dash" x="598" y="62" width="326" height="308" rx="14"/><text class="t2" x="761" y="86">@DataJpaTest — 데이터 계층 + H2</text></g>

  <g class="sn" id="t-client"><rect class="box bl" x="30" y="150" width="104" height="80" rx="12"/><text class="t" x="82" y="186">MockMvc</text><text class="s" x="82" y="206">가짜 요청</text></g>
  <g class="sn" id="t-e1"><path class="edge" d="M134,190 L196,190"/></g>
  <g class="sn" id="t-ctl"><rect class="box sp" x="196" y="150" width="140" height="80" rx="12"/><text class="t" x="266" y="186">Controller</text><text class="s" x="266" y="206">@RestController</text></g>
  <g class="sn" id="t-e2"><path class="edge" d="M336,190 L396,190"/></g>
  <g class="sn" id="t-svc"><rect class="box sp" x="396" y="150" width="160" height="80" rx="12"/><text class="t" x="476" y="186">Service</text><text class="s" x="476" y="206">진짜 비즈니스 로직</text></g>
  <g class="sn" id="t-e2m"><path class="edge" d="M266,230 L266,290 L396,290"/></g>
  <g class="sn" id="t-mock"><rect class="box rd" x="396" y="254" width="160" height="92" rx="12"/><text class="t2" x="476" y="282">가짜 Service</text><text class="m" x="476" y="304">@MockitoBean</text><text class="s" x="476" y="326">given(...).willReturn(...)</text></g>
  <g class="sn" id="t-e3"><path class="edge" d="M556,190 L620,190"/></g>
  <g class="sn" id="t-repo"><rect class="box sp" x="620" y="150" width="120" height="80" rx="12"/><text class="t" x="680" y="186">Repository</text><text class="s" x="680" y="206">JPA</text></g>
  <g class="sn" id="t-e4"><path class="edge" d="M740,190 L792,190"/></g>
  <g class="sn" id="t-db"><rect class="box or" x="792" y="150" width="116" height="80" rx="12"/><text class="t" x="850" y="186">H2 DB</text><text class="s" x="850" y="206">임베디드</text></g>

  <g class="sn" id="t-unit"><rect class="box pu" x="180" y="410" width="580" height="54" rx="12"/><text class="t2" x="470" y="434">Mockito 단위 테스트 — 스프링 컨테이너 없이</text><text class="s" x="470" y="453">@Mock · @InjectMocks 로 Service 만 검증 (가장 빠름)</text></g>
</svg>`,
});
})();
