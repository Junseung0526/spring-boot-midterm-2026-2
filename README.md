# 스프링부트4 실습

MVC · IoC/DI · AOP · PSA 를 SVG, 단계별 시뮬레이터, 실습실, 어노테이션 암기 카드, 모의고사로 학습하는 정적 사이트.
빌드 도구 없이 `site/` 폴더만 배포됩니다 (순수 HTML/CSS/JS).

## 로컬 실행
```bash
cd site && python3 -m http.server 8000   # http://localhost:8000
```

## GitHub Pages 배포
1. GitHub 에 저장소를 만들고 이 폴더를 `main` 브랜치로 push
2. 저장소 **Settings → Pages → Build and deployment → Source: GitHub Actions** 선택 (최초 1회)
3. push 할 때마다 `.github/workflows/deploy.yml` 이 자동 배포 → `https://<계정>.github.io/<저장소>/`

## 구조
- `site/index.html` 본문 + 인라인 SVG
- `site/assets/data.js` 어노테이션 · 단계 · 모의고사 데이터 (여기만 고치면 내용 추가 가능)
- `site/assets/app.js` 스테퍼 · 코드 하이라이트 · 암기/시험
- `site/assets/lab.js` 실습실

## 모듈 구조 (IntelliJ 실습: `site/ide.html`)
모든 모듈은 전역 네임스페이스 `IDE` 하나를 공유하는 평범한 `<script>` 입니다 (빌드 도구 불필요).
```
site/assets/ide/
├─ core/      자바 파서 + 스프링 시뮬레이션 엔진 (DOM 의존 없음, Node 로 테스트 가능)
│   constants · util · parser · model · compile · beans · web · boot · http
├─ project/   실습 프로젝트: starter.js(시작 코드) · solutions.js(정답) · missions.js(미션/채점)
├─ ui/        state · highlight · editor · tree · tabs · console · analysis · missions · main
├─ runner.js  Run / Stop / HTTP 요청 실행
└─ css/       theme · layout · editor · panels
```
- 미션 추가/수정: `project/missions.js` · 시작 코드: `project/starter.js` · 정답: `project/solutions.js`
- 스프링 규칙 추가(예: 새 검증 어노테이션): `core/http.js`, 빈/DI 규칙: `core/beans.js`
