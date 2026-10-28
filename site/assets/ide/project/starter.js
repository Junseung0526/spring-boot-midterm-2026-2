/* project/starter.js — 실습 프로젝트의 시작 코드 (여기를 고치면 시작 상태가 바뀝니다) */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const J = 'src/main/java/com/example/blog/';
const R = 'src/main/resources/';
const T = 'src/test/java/com/example/blog/';

const STARTER = {
[J + 'BlogApplication.java']: `package com.example.blog;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BlogApplication {

    public static void main(String[] args) {
        SpringApplication.run(BlogApplication.class, args);
    }
}
`,
[J + 'domain/Article.java']: `package com.example.blog.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@___   // [미션 1] ① JPA 엔티티
@___   // [미션 1] ② 모든 필드의 getter (Lombok)
@___(access = AccessLevel.___)   // [미션 1] ③ JPA 용 인자 없는 생성자 + 접근 수준
public class Article {

    @___   // [미션 1] ④ 기본 키(PK)
    @___(strategy = GenerationType.___)   // [미션 1] ⑤ 값 생성 + DB 자동 증가 전략
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
[J + 'repository/BlogRepository.java']: `package com.example.blog.repository;

import com.example.blog.domain.Article;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BlogRepository extends ___<___, ___> {   // [미션 3] Spring Data JPA 인터페이스 <엔티티, ID 타입>
}
`,
[J + 'dto/AddArticleRequest.java']: `package com.example.blog.dto;

import com.example.blog.domain.Article;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@___   // [미션 4] ① 인자 없는 생성자 (Jackson 이 JSON → 객체로 바꿀 때)
@___   // [미션 4] ② 모든 필드를 받는 생성자
@___   // [미션 4] ③ getter
public class AddArticleRequest {

    private String title;
    private String content;

    public Article toEntity() {
        return Article.___()   // [미션 4] ④ 빌더 시작
                .title(title)
                .content(content)
                .___();   // [미션 4] ⑤ 빌더 끝 (객체 생성)
    }
}
`,
[J + 'dto/ArticleResponse.java']: `package com.example.blog.dto;

import com.example.blog.domain.Article;
import lombok.Getter;

@___   // [미션 4] ⑥ getter (Jackson 이 이 객체를 JSON 으로 바꿀 때 필요)
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
[J + 'service/BlogService.java']: `package com.example.blog.service;

import com.example.blog.domain.Article;
import com.example.blog.dto.AddArticleRequest;
import com.example.blog.dto.UpdateArticleRequest;
import com.example.blog.repository.BlogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@___   // [미션 5] ① final 필드를 받는 생성자 (Lombok)
@___   // [미션 5] ② 비즈니스 계층 빈
public class BlogService {

    private ___ BlogRepository blogRepository;   // [미션 5] ③ 생성자 주입을 받으려면 필요한 키워드

    public Article save(AddArticleRequest request) {
        return blogRepository.___(request.___());   // [미션 5] ④ 저장 메서드  ⑤ 요청 DTO → 엔티티
    }

    @___(readOnly = ___)   // [미션 11] ① 읽기 전용 트랜잭션
    public List<Article> findAll() {
        return blogRepository.findAll();
    }

    @___(readOnly = ___)   // [미션 11] ② 읽기 전용 트랜잭션
    public Article findById(long id) {
        return blogRepository.findById(id)
                .___(() -> new ___("not found: " + id));   // [미션 5] ⑥ 값이 없으면 예외를 던지는 Optional 메서드  ⑦ 잘못된 인자 예외
    }

    public void delete(long id) {
        blogRepository.deleteById(id);
    }

    @___   // [미션 11] ③ 쓰기 트랜잭션 — save() 없이 변경 감지로 반영되려면 꼭 필요
    public Article update(long id, UpdateArticleRequest request) {
        Article article = blogRepository.findById(id)
                .___(() -> new ___("not found: " + id));   // [미션 5] ⑧ ⑨ 위 ⑥ ⑦ 과 같음
        article.update(request.getTitle(), request.getContent());
        return article;
    }
}
`,
[J + 'controller/BlogApiController.java']: `package com.example.blog.controller;

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
@___   // [미션 7] ① JSON 을 돌려주는 컨트롤러
@___("/api/articles")   // [미션 7] ② 이 클래스 메서드들의 공통 경로
public class BlogApiController {

    private final BlogService blogService;

    @___   // [미션 7] ③ POST 요청 매핑
    public ResponseEntity<ArticleResponse> addArticle(@___ AddArticleRequest request) {   // [미션 7] ④ 요청 본문(JSON) → DTO
        Article savedArticle = blogService.save(request);
        return ResponseEntity.status(HttpStatus.___).body(new ArticleResponse(savedArticle));   // [미션 8] ① 생성 성공(201)
    }

    @___   // [미션 7] ⑤ GET 요청 매핑 (목록)
    public ResponseEntity<List<ArticleResponse>> findAllArticles() {
        List<ArticleResponse> articles = blogService.findAll()
                .___()   // [미션 8] ② 컬렉션 → 스트림
                .map(ArticleResponse::___)   // [미션 8] ③ 생성자 참조
                .toList();
        return ResponseEntity.ok().body(articles);
    }

    @___("/{id}")   // [미션 7] ⑥ GET 요청 매핑 (한 건)
    public ResponseEntity<ArticleResponse> findArticle(@___("id") long id) {   // [미션 7] ⑦ URL 의 {id}
        Article article = blogService.findById(id);
        return ResponseEntity.ok().body(new ArticleResponse(article));
    }

    @___("/{id}")   // [미션 7] ⑧ DELETE 요청 매핑
    public ResponseEntity<Void> deleteArticle(@___("id") long id) {   // [미션 7] ⑨ URL 의 {id}
        blogService.delete(id);
        return ResponseEntity.ok().build();
    }

    @___("/{id}")   // [미션 7] ⑩ PUT 요청 매핑
    public ResponseEntity<ArticleResponse> updateArticle(@___("id") long id,   // [미션 7] ⑪ URL 의 {id}
                                                         @___ UpdateArticleRequest request) {   // [미션 7] ⑫ 요청 본문
        Article updatedArticle = blogService.update(id, request);
        return ResponseEntity.ok().body(new ArticleResponse(updatedArticle));
    }
}
`,
[J + 'domain/Book.java']: `package com.example.blog.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

// 5장 실습 — 완성된 코드예요 (미션 17: data.sql 과 application.yaml 을 읽어 보세요)
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Book {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    private String author;
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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@RequiredArgsConstructor
@Service
public class BookService {

    private final BookRepository bookRepository;

    public List<Book> getAllBooks() {
        return bookRepository.findAll();
    }
}
`,
[J + 'controller/BookController.java']: `package com.example.blog.controller;

import com.example.blog.domain.Book;
import com.example.blog.service.BookService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RequiredArgsConstructor
@RestController
public class BookController {

    private final BookService bookService;

    @GetMapping("/books")
    public List<Book> getAllBooks() {
        return bookService.getAllBooks();
    }
}
`,
[J + 'aop/LogAspect.java']: `package com.example.blog.aop;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

@Slf4j
@___   // [미션 18] ① "이 클래스는 Aspect" 표시
@___   // [미션 18] ② 스프링 빈으로 등록
public class LogAspect {

    @Around("execution(* com.example.blog.___..*(..))")   // [미션 18] ③ 서비스 클래스들이 있는 패키지 이름
    public Object logExecutionTime(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.currentTimeMillis();
        log.info("▶ {} 시작", pjp.getSignature().toShortString());
        Object result = pjp.proceed();
        long ms = System.currentTimeMillis() - start;
        log.info("◀ {} 종료 ({}ms)", pjp.getSignature().toShortString(), ms);
        return result;
    }
}
`,
[R + 'application.yaml']: `spring:
  application:
    name: blog
  jpa:
    defer-datasource-initialization: true   # 미션 17: 이 줄이 없으면 어떻게 될까요?
`,
[R + 'test-db.sql']: `INSERT INTO article (title, content) VALUES ('제목 1', '내용 1');
INSERT INTO article (title, content) VALUES ('제목 2', '내용 2');
INSERT INTO article (title, content) VALUES ('제목 3', '내용 3');
`,
[R + 'data.sql']: `insert into book (title, author) values ('스프링 부트 4 개발자 되기', '신선영');
insert into book (title, author) values ('자바 ORM 표준 JPA 프로그래밍', '김영한');
`,
[T + 'BlogApplicationTests.java']: `package com.example.blog;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class BlogApplicationTests {

    @Test
    void contextLoads() {
    }
}
`,
[T + 'controller/BlogApiControllerTest.java']: `package com.example.blog.controller;

import com.example.blog.domain.Article;
import com.example.blog.dto.AddArticleRequest;
import com.example.blog.repository.BlogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@___   // [미션 14] ① 애플리케이션 전체(모든 빈)를 띄우는 통합 테스트
@___   // [미션 14] ② MockMvc 자동 구성
class BlogApiControllerTest {

    @___   // [미션 14] ③ 스프링이 넣어 주는 필드 (아래 세 필드도 같은 어노테이션)
    protected MockMvc mockMvc;

    @___
    private WebApplicationContext context;

    @___
    private BlogRepository blogRepository;

    @___
    private ObjectMapper objectMapper;

    @___   // [미션 14] ④ 각 테스트 메서드 "전에" 매번 실행
    public void mockMvcSetup() {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .build();
    }

    @Test
    void addArticle() throws Exception {
        // given
        final String url = "/api/articles";
        final String title = "제목";
        final String content = "내용입니다";

        final AddArticleRequest userRequest = new AddArticleRequest(title, content);

        final String requestBody = objectMapper.writeValueAsString(userRequest);

        // when
        ResultActions result = mockMvc.perform(post(url)
                .contentType(MediaType.APPLICATION_JSON_VALUE)
                .content(requestBody));

        // then
        result.andExpect(status().___());   // [미션 14] ⑤ 201 을 기대하는 메서드

        List<Article> articles = blogRepository.findAll();

        assertThat(articles.size()).isEqualTo(1);
        assertThat(articles.get(0).getTitle()).isEqualTo("제목");
        assertThat(articles.get(0).getContent()).isEqualTo(content);
    }

    @___("/test-db.sql")   // [미션 14] ⑥ 테스트 전에 SQL 파일 실행
    @Test
    public void findAllArticles() throws Exception {
        final String title = "제목 1";
        final String content = "내용 1";

        final ResultActions resultActions = mockMvc.perform(get("/api/articles")
                .accept(MediaType.APPLICATION_JSON));

        resultActions
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].content").value(content))
                .andExpect(jsonPath("$[0].title").value(title));
    }

    @___("/test-db.sql")   // [미션 14] ⑦ 위와 같음
    @Test
    public void findArticle() throws Exception {
        final String url = "/api/articles/1";

        final ResultActions resultActions = mockMvc.perform(get(url));

        resultActions
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("제목 1"));
    }
}
`,
[T + 'repository/BlogRepositoryTest.java']: `package com.example.blog.repository;

import com.example.blog.domain.Article;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import static org.assertj.core.api.Assertions.assertThat;

@___   // [미션 15] ① JPA 관련 빈(엔티티 · 리포지토리)만 띄우는 슬라이스 테스트
class BlogRepositoryTest {

    @___   // [미션 15] ② 리포지토리 주입
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
        assertThat(blogRepository.findById(saved.getId())).___();   // [미션 15] ③ Optional 에 값이 "있는지" 검증
    }
}
`,
'build.gradle': `plugins {
    id 'java'
    id 'org.springframework.boot' version '4.0.0'
    id 'io.spring.dependency-management' version '1.1.7'
}

group = 'com.example'
java { toolchain { languageVersion = JavaLanguageVersion.of(21) } }

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-webmvc'
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
    implementation 'org.springframework.boot:spring-boot-starter-aspectj'
    compileOnly 'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'
    runtimeOnly 'com.h2database:h2'
    testImplementation 'org.springframework.boot:spring-boot-starter-webmvc-test'
}
`,
'requests.http': `### 1. 글 추가 — 201 Created + 만들어진 글 JSON  (미션 7 · 8)
POST http://localhost:8080/api/articles
Content-Type: application/json

{
  "title": "제목",
  "content": "내용입니다"
}

### 2. 글 목록 — 200 + JSON 배열 (id · title · content)  (미션 8)
GET http://localhost:8080/api/articles

### 3. 글 하나 — 200 + JSON  (미션 7)
GET http://localhost:8080/api/articles/1

### 3-1. 없는 글 — 콘솔에 IllegalArgumentException: not found: 999  (미션 5 · 6)
GET http://localhost:8080/api/articles/999

### 4. 글 수정 — 200, 그다음 3번을 다시 보내 정말 바뀌었는지 확인  (미션 11)
PUT http://localhost:8080/api/articles/1
Content-Type: application/json

{
  "title": "수정한 제목",
  "content": "수정한 내용"
}

### 5. 글 삭제 — 200, 그다음 2번으로 정말 사라졌는지 확인  (미션 7)
DELETE http://localhost:8080/api/articles/1

### 6. 책 목록 — 200 + JSON 배열 (5장 실습)
GET http://localhost:8080/books
`,
};

// 시작 코드가 바뀌면 값이 달라지는 간단한 해시 — 저장된 예전 코드와 새 시작 코드가 어긋나는 것을 감지한다
const STARTER_VER = (() => { let h = 5381; for (const k of Object.keys(STARTER).sort()) { const t = k + STARTER[k]; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; } return (h >>> 0).toString(36); })();

Object.assign(IDE, { STARTER, STARTER_VER, JAVA_ROOT: J, TEST_ROOT: T });
})();
