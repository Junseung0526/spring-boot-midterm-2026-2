/* project/solutions.js — 최종 정답. 시작 코드에서 [찾을 문자열, 바꿀 문자열] 을 순서대로 치환한다.
   (못 찾으면 즉시 오류 → 시작 코드와 정답이 어긋나는 것을 막는다) 빈칸이 많은 파일은 통째로 적는다. */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { STARTER, JAVA_ROOT: J, TEST_ROOT: TT } = IDE;

const patch = (path, pairs) => pairs.reduce((s, [a, b]) => { if (!s.includes(a)) throw new Error('solution patch miss: ' + a); return s.replace(a, b); }, STARTER[path]);

const ARTICLE = J + 'domain/Article.java';
const REPO = J + 'repository/BlogRepository.java';
const SERVICE = J + 'service/BlogService.java';
const CONTROLLER = J + 'controller/BlogApiController.java';
const ASPECT = J + 'aop/LogAspect.java';
const DATA = 'src/main/resources/data.sql';
const YAML = 'src/main/resources/application.yaml';
const CTRL_TEST = TT + 'controller/BlogApiControllerTest.java';

const SOLUTIONS = {
  [ARTICLE]: `package com.example.blog.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Article {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    private String content;

    @Builder
    public Article(String title, String content) {
        this.title = title;
        this.content = content;
    }

    public void update(String title, String content) {
        this.title = title;
        this.content = content;
    }
}
`,
  [REPO]: `package com.example.blog.repository;

import com.example.blog.domain.Article;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BlogRepository extends JpaRepository<Article, Long> {
}
`,
  [J + 'dto/AddArticleRequest.java']: `package com.example.blog.dto;

import com.example.blog.domain.Article;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Getter
public class AddArticleRequest {

    private String title;
    private String content;

    public Article toEntity() {
        return Article.builder()
                .title(title)
                .content(content)
                .build();
    }
}
`,
  [J + 'dto/ArticleResponse.java']: `package com.example.blog.dto;

import com.example.blog.domain.Article;
import lombok.Getter;

@Getter
public class ArticleResponse {

    private final Long id;
    private final String title;
    private final String content;

    public ArticleResponse(Article article) {
        this.id = article.getId();
        this.title = article.getTitle();
        this.content = article.getContent();
    }
}
`,
  [SERVICE]: `package com.example.blog.service;

import com.example.blog.domain.Article;
import com.example.blog.dto.AddArticleRequest;
import com.example.blog.dto.UpdateArticleRequest;
import com.example.blog.repository.BlogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@RequiredArgsConstructor
@Service
public class BlogService {

    private final BlogRepository blogRepository;

    public Article save(AddArticleRequest request) {
        return blogRepository.save(request.toEntity());
    }

    @Transactional(readOnly = true)
    public List<Article> findAll() {
        return blogRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Article findById(long id) {
        return blogRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("not found: " + id));
    }

    public void delete(long id) {
        blogRepository.deleteById(id);
    }

    @Transactional   // save() 없이: 커밋 때 변경 감지(dirty checking)로 UPDATE
    public Article update(long id, UpdateArticleRequest request) {
        Article article = blogRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("not found: " + id));
        article.update(request.getTitle(), request.getContent());
        return article;
    }
}
`,
  [CONTROLLER]: `package com.example.blog.controller;

import com.example.blog.domain.Article;
import com.example.blog.dto.AddArticleRequest;
import com.example.blog.dto.ArticleResponse;
import com.example.blog.dto.UpdateArticleRequest;
import com.example.blog.service.BlogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/articles")
public class BlogApiController {

    private final BlogService blogService;

    @PostMapping
    public ResponseEntity<ArticleResponse> addArticle(@RequestBody AddArticleRequest request) {
        Article savedArticle = blogService.save(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(new ArticleResponse(savedArticle));
    }

    @GetMapping
    public ResponseEntity<List<ArticleResponse>> findAllArticles() {
        List<ArticleResponse> articles = blogService.findAll()
                .stream()
                .map(ArticleResponse::new)
                .toList();
        return ResponseEntity.ok().body(articles);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ArticleResponse> findArticle(@PathVariable("id") long id) {
        Article article = blogService.findById(id);
        return ResponseEntity.ok().body(new ArticleResponse(article));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteArticle(@PathVariable("id") long id) {
        blogService.delete(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<ArticleResponse> updateArticle(@PathVariable("id") long id,
                                                         @RequestBody UpdateArticleRequest request) {
        Article updatedArticle = blogService.update(id, request);
        return ResponseEntity.ok().body(new ArticleResponse(updatedArticle));
    }
}
`,
  [CTRL_TEST]: patch(CTRL_TEST, [
    ['// [미션 14] ① 애플리케이션 전체(모든 빈)를 띄우는 통합 테스트  ② MockMvc 를 자동으로 만들어 주입 — 어노테이션 2개\nclass', '@SpringBootTest\n@AutoConfigureMockMvc\nclass'],
    ['    // [미션 14] ③ 아래 네 필드는 스프링이 넣어 줘요 — 필드마다 같은 어노테이션 하나\n    protected MockMvc', '    @Autowired\n    protected MockMvc'],
    ['    private WebApplicationContext', '    @Autowired\n    private WebApplicationContext'],
    ['    private BlogRepository', '    @Autowired\n    private BlogRepository'],
    ['    private ObjectMapper', '    @Autowired\n    private ObjectMapper'],
    ['    // [미션 14] ④ 각 테스트 메서드 "전에" 매번 실행\n', '    @BeforeEach\n'],
    ['result.andExpect(status().isOk());   // [미션 14] ⑤ 생성 성공에 맞는 상태 코드를 기대하도록', 'result.andExpect(status().isCreated());'],
    ['    // [미션 14] ⑥ 테스트 전에 "/test-db.sql" 을 실행해 글 3개를 넣는 어노테이션\n', '    @Sql("/test-db.sql")\n'],
    ['    // [미션 14] ⑦ 위 ⑥ 과 같은 어노테이션\n', '    @Sql("/test-db.sql")\n'],
  ]),
  [TT + 'repository/BlogRepositoryTest.java']: `package com.example.blog.repository;

import com.example.blog.domain.Article;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class BlogRepositoryTest {

    @Autowired
    BlogRepository blogRepository;

    @Test
    @DisplayName("저장하면 id 가 생기고 다시 조회된다")
    void saveAndFind() {
        // given
        Article article = new Article("제목", "내용");

        // when
        Article saved = blogRepository.save(article);

        // then
        assertThat(saved.getId()).isNotNull();
        assertThat(blogRepository.findById(saved.getId())).isPresent();
    }
}
`,
  [DATA]: patch(DATA, [
    ['-- [미션 17] ① Book 엔티티는 이미 있어요. 아래 두 줄의 주석(--)을 푸세요 → 앱이 안 뜨면 콘솔을 읽고 application.yaml 을 고치세요\n', ''],
    ["-- insert into book (title, author) values ('스프링 부트 4 개발자 되기', '신선영');", "insert into book (title, author) values ('스프링 부트 4 개발자 되기', '신선영');"],
    ["-- insert into book (title, author) values ('자바 ORM 표준 JPA 프로그래밍', '김영한');", "insert into book (title, author) values ('자바 ORM 표준 JPA 프로그래밍', '김영한');"],
  ]),
  [YAML]: patch(YAML, [
    ['  # [미션 17] ② data.sql 을 JPA 가 테이블을 만든 "뒤에" 실행하게 하는 설정 (spring.jpa 아래 한 줄)\n', '  jpa:\n    defer-datasource-initialization: true   # data.sql 을 JPA 가 테이블을 만든 "뒤에" 실행\n'],
  ]),
  [ASPECT]: patch(ASPECT, [
    ['// [미션 19] ① "이 클래스는 Aspect" 표시  ② 스프링 빈으로 등록 — 어노테이션 2개\n@Slf4j', '@Slf4j\n@Aspect\n@Component'],
    ['    // [미션 19] ③ 포인트컷의 패키지 이름에 오타가 하나 있어요 (실제 서비스 패키지와 비교)\n', ''],
    ['com.example.blog.services..*', 'com.example.blog.service..*'],
  ]),
};

Object.assign(IDE, { SOLUTIONS });
})();
