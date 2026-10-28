/* project/solutions.js — 최종 정답. 시작 코드에서 [찾을 문자열, 바꿀 문자열] 을 순서대로 치환한다.
   (못 찾으면 즉시 오류 → 시작 코드와 정답이 어긋나는 것을 막는다) 새로 만드는 파일(ArticleResponse, Book …, BlogRepositoryTest)과 뼈대뿐인 파일은 통째로 적는다. */
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
  /* 미션 1 엔티티 · 미션 6 update() */
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
  /* 미션 1 리포지토리 */
  [REPO]: `package com.example.blog.repository;

import com.example.blog.domain.Article;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BlogRepository extends JpaRepository<Article, Long> {
}
`,
  /* 미션 2 요청 DTO */
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
  /* 미션 3 응답 DTO (새 파일) */
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
  /* 미션 6 수정 요청 DTO (새 파일) */
  [J + 'dto/UpdateArticleRequest.java']: `package com.example.blog.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Getter
public class UpdateArticleRequest {

    private String title;
    private String content;
}
`,
  /* 미션 2~6 서비스 · 미션 7 readOnly */
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
  /* 미션 2~6 컨트롤러 */
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
  /* 미션 8 · 9: 삭제 · 수정 테스트를 직접 작성 */
  [CTRL_TEST]: patch(CTRL_TEST, [
    ['import com.example.blog.dto.AddArticleRequest;', 'import com.example.blog.dto.AddArticleRequest;\nimport com.example.blog.dto.UpdateArticleRequest;'],
    ['import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;', 'import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;\nimport static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;'],
    ['import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;', 'import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;\nimport static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;'],
    ['    // TODO 미션 8: deleteArticle 테스트를 given-when-then 으로 직접 작성하세요\n    //   then: 응답 상태 코드 + 리포지토리에서 정말 사라졌는지 둘 다 검증\n\n    // TODO 미션 9: updateArticle 테스트를 직접 작성하세요\n    //   then: 응답 상태 코드 + 리포지토리에서 다시 꺼낸 글이 바뀌었는지 검증\n', `    @Test
    public void deleteArticle() throws Exception {
        // given
        final String url = "/api/articles/{id}";
        Article savedArticle = blogRepository.save(Article.builder()
                .title("삭제할 제목")
                .content("삭제할 내용")
                .build());

        // when
        mockMvc.perform(delete(url, savedArticle.getId()))
                .andExpect(status().isOk());

        // then
        List<Article> articles = blogRepository.findAll();
        assertThat(articles).isEmpty();
    }

    @Test
    public void updateArticle() throws Exception {
        // given
        final String url = "/api/articles/{id}";
        Article savedArticle = blogRepository.save(Article.builder()
                .title("원래 제목")
                .content("원래 내용")
                .build());

        final String newTitle = "수정된 새 제목";
        final String newContent = "수정된 새 내용";
        UpdateArticleRequest request = new UpdateArticleRequest(newTitle, newContent);

        // when
        ResultActions result = mockMvc.perform(put(url, savedArticle.getId())
                .contentType(MediaType.APPLICATION_JSON_VALUE)
                .content(objectMapper.writeValueAsString(request)));

        // then
        result.andExpect(status().isOk());

        Article updatedArticle = blogRepository.findById(savedArticle.getId()).orElseThrow();
        assertThat(updatedArticle.getTitle()).isEqualTo(newTitle);
        assertThat(updatedArticle.getContent()).isEqualTo(newContent);
    }
`],
  ]),
  /* 미션 10: 리포지토리 테스트를 직접 작성 */
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

    @Test
    @DisplayName("전체 조회")
    void findAll() {
        // given
        blogRepository.save(new Article("a", "b"));
        blogRepository.save(new Article("c", "d"));

        // when · then
        assertThat(blogRepository.findAll()).hasSize(2);
    }
}
`,
  /* 미션 11: 5장 실습 — Book API 를 처음부터 */
  [J + 'domain/Book.java']: `package com.example.blog.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Book {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    private String author;

    protected Book() {
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getAuthor() { return author; }
}
`,
  [J + 'repository/BookRepository.java']: `package com.example.blog.repository;

import com.example.blog.domain.Book;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookRepository extends JpaRepository<Book, Long> {
}
`,
  [J + 'service/BookService.java']: `package com.example.blog.service;

import com.example.blog.domain.Book;
import com.example.blog.repository.BookRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BookService {

    private final BookRepository bookRepository;

    public BookService(BookRepository bookRepository) {
        this.bookRepository = bookRepository;
    }

    public List<Book> getAllBooks() {
        return bookRepository.findAll();
    }
}
`,
  [J + 'controller/BookController.java']: `package com.example.blog.controller;

import com.example.blog.domain.Book;
import com.example.blog.service.BookService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class BookController {

    private final BookService bookService;

    public BookController(BookService bookService) {
        this.bookService = bookService;
    }

    @GetMapping("/books")
    public List<Book> getAllBooks() {
        return bookService.getAllBooks();
    }
}
`,
  [DATA]: patch(DATA, [
    ['-- TODO 미션 11: Book 엔티티(book 테이블)를 만든 뒤 아래 두 줄의 주석(--)을 푸세요\n', ''],
    ["-- insert into book (title, author) values ('스프링 부트 4 개발자 되기', '신선영');", "insert into book (title, author) values ('스프링 부트 4 개발자 되기', '신선영');"],
    ["-- insert into book (title, author) values ('자바 ORM 표준 JPA 프로그래밍', '김영한');", "insert into book (title, author) values ('자바 ORM 표준 JPA 프로그래밍', '김영한');"],
  ]),
  [YAML]: patch(YAML, [
    ['    name: blog\n', '    name: blog\n  jpa:\n    defer-datasource-initialization: true   # data.sql 을 JPA 가 테이블을 만든 "뒤에" 실행\n'],
  ]),
  /* 미션 12: AOP */
  [ASPECT]: patch(ASPECT, [
    ['import org.aspectj.lang.annotation.Aspect;', 'import org.aspectj.lang.annotation.Aspect;\nimport org.springframework.stereotype.Component;'],
    ['// TODO 미션 12: 서비스 메서드가 호출될 때마다 이 Aspect 가 동작하게 만드세요\n@Slf4j', '@Slf4j\n@Component'],
    ['com.example.blog.services..*', 'com.example.blog.service..*'],
  ]),
};

Object.assign(IDE, { SOLUTIONS });
})();
