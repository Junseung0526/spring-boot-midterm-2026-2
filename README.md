# Spring Boot 4 중간고사 올인원

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
