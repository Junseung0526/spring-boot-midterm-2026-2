/* ide/concepts/svg/ioc-psa.js — IoC·DI 와 PSA 애니메이션용 SVG (신규 작성) */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
IDE.svg = Object.assign(IDE.svg || {}, {

ioc: `<svg class="dia" viewBox="0 0 940 340" role="img" aria-label="IoC 컨테이너와 의존성 주입">
  <g class="sn" id="i-old">
    <rect class="box dash" x="10" y="20" width="300" height="300" rx="14"/>
    <text class="t" x="160" y="48">전통 방식 : 직접 new</text>
    <rect class="box rd" x="60" y="70" width="200" height="48" rx="10"/><text class="t2" x="160" y="100">PostController</text>
    <path class="edge bad" d="M160,118 L160,160"/><text class="m red" x="172" y="144" style="text-anchor:start">new</text>
    <rect class="box rd" x="60" y="160" width="200" height="48" rx="10"/><text class="t2" x="160" y="190">PostService</text>
    <path class="edge bad" d="M160,208 L160,250"/><text class="m red" x="172" y="234" style="text-anchor:start">new</text>
    <rect class="box rd" x="60" y="250" width="200" height="48" rx="10"/><text class="t2" x="160" y="280">PostRepository</text>
  </g>
  <g class="sn" id="i-files">
    <rect class="box dash" x="330" y="50" width="170" height="240" rx="12"/>
    <text class="s" x="415" y="72">클래스 파일</text>
    <rect class="box bl" x="345" y="90" width="140" height="44" rx="8"/><text class="m" x="415" y="108">@RestController</text><text class="s" x="415" y="125">PostController</text>
    <rect class="box bl" x="345" y="150" width="140" height="44" rx="8"/><text class="m" x="415" y="168">@Service</text><text class="s" x="415" y="185">PostService</text>
    <rect class="box bl" x="345" y="210" width="140" height="44" rx="8"/><text class="m" x="415" y="228">@Repository</text><text class="s" x="415" y="245">PostRepository</text>
  </g>
  <g class="sn" id="i-scan"><path class="edge" d="M500,170 L545,170"/><text class="s" x="522" y="158">스캔</text></g>
  <g class="sn" id="i-ctn">
    <rect class="box sp" x="545" y="20" width="385" height="300" rx="16"/>
    <text class="t" x="737" y="48">ApplicationContext (IoC 컨테이너)</text>
    <text class="s" x="737" y="68">객체의 생성 · 연결 · 소멸을 대신 관리</text>
  </g>
  <g class="sn" id="i-b-ctl"><rect class="box bl" x="560" y="120" width="90" height="56" rx="10"/><text class="t2" x="605" y="146">Controller</text><text class="s" x="605" y="164">bean</text></g>
  <g class="sn" id="i-b-svc"><rect class="box bl" x="700" y="120" width="90" height="56" rx="10"/><text class="t2" x="745" y="146">Service</text><text class="s" x="745" y="164">bean</text></g>
  <g class="sn" id="i-b-repo"><rect class="box bl" x="840" y="120" width="80" height="56" rx="10"/><text class="t2" x="880" y="146">Repo</text><text class="s" x="880" y="164">bean</text></g>
  <g class="sn" id="i-inj1"><path class="edge" d="M700,148 L650,148"/><text class="s" x="675" y="138">주입</text></g>
  <g class="sn" id="i-inj2"><path class="edge" d="M840,148 L790,148"/><text class="s" x="815" y="138">주입</text></g>
  <g class="sn" id="i-pool"><rect class="box or" x="560" y="215" width="360" height="62" rx="10"/><text class="t2" x="740" y="240">싱글톤 저장소</text><text class="s" x="740" y="260">Map&lt;빈 이름, 객체&gt; — 한 번 만들어 계속 재사용</text></g>
</svg>`,

psa: `<svg class="dia" viewBox="0 0 940 340" role="img" aria-label="PSA 추상화와 구현체 교체">
  <g class="sn" id="p-code">
    <rect class="box bl" x="10" y="95" width="210" height="150" rx="12"/>
    <text class="t" x="115" y="124">PostService</text>
    <text class="m" x="115" y="158">@Transactional</text>
    <text class="m" x="115" y="182">@Cacheable</text>
    <text class="s" x="115" y="216">기술을 전혀 모르는 코드</text>
  </g>
  <g class="sn" id="p-e1"><path class="edge" d="M220,140 L330,70"/></g>
  <g class="sn" id="p-e2"><path class="edge" d="M220,205 L330,270"/></g>
  <g class="sn" id="p-abs-tx"><rect class="box sp" x="330" y="30" width="260" height="70" rx="12"/><text class="t2" x="460" y="60">PlatformTransactionManager</text><text class="s" x="460" y="82">트랜잭션 추상화 (인터페이스)</text></g>
  <g class="sn" id="p-abs-cache"><rect class="box sp" x="330" y="240" width="260" height="70" rx="12"/><text class="t2" x="460" y="270">CacheManager</text><text class="s" x="460" y="292">캐시 추상화 (인터페이스)</text></g>
  <g class="sn" id="p-e3a"><path class="edge" d="M590,55 L680,38"/></g>
  <g class="sn" id="p-e3b"><path class="edge" d="M590,78 L680,98"/></g>
  <g class="sn" id="p-tx1"><rect class="box or" x="680" y="14" width="250" height="46" rx="10"/><text class="t2" x="805" y="42">JpaTransactionManager</text></g>
  <g class="sn" id="p-tx2"><rect class="box or" x="680" y="74" width="250" height="46" rx="10"/><text class="t2" x="805" y="102">DataSourceTransactionManager</text></g>
  <g class="sn" id="p-e4a"><path class="edge" d="M590,262 L680,246"/></g>
  <g class="sn" id="p-e4b"><path class="edge" d="M590,288 L680,302"/></g>
  <g class="sn" id="p-c1"><rect class="box or" x="680" y="222" width="250" height="46" rx="10"/><text class="t2" x="805" y="250">ConcurrentMapCacheManager</text></g>
  <g class="sn" id="p-c2"><rect class="box or" x="680" y="282" width="250" height="46" rx="10"/><text class="t2" x="805" y="310">RedisCacheManager</text></g>
</svg>`,
});
})();
