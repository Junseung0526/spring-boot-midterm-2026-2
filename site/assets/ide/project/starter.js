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

// [미션 1] ① 이 클래스를 JPA 엔티티로  ② 모든 필드의 getter 자동 생성  ③ JPA 용 기본 생성자(접근 수준 PROTECTED) — 어노테이션 3개
public class Article {

    // [미션 1] ④ 기본 키(PK) 표시  ⑤ DB 가 자동 증가(AUTO_INCREMENT)로 값을 만드는 생성 전략 — 어노테이션 2개
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

// [미션 3] Spring Data JPA 가 구현체를 만들어 주는 인터페이스를 상속하세요 — 제네릭은 <엔티티 타입, @Id 필드의 타입>
public interface BlogRepository {
}
`,
[J + 'dto/AddArticleRequest.java']: `package com.example.blog.dto;

import com.example.blog.domain.Article;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

// [미션 4] ① 기본 생성자  ② 모든 필드를 받는 생성자  ③ getter — Lombok 어노테이션 3개
public class AddArticleRequest {

    private String title;
    private String content;

    public Article toEntity() {
        return null;   // [미션 4] ④ Article 의 빌더로 title · content 를 넣어 엔티티를 만들어 돌려주세요
    }
}
`,
[J + 'dto/ArticleResponse.java']: `package com.example.blog.dto;

import com.example.blog.domain.Article;
import lombok.Getter;

// [미션 4] ⑤ Jackson 이 이 객체를 JSON 으로 바꾸려면 getter 가 필요해요 — Lombok 어노테이션 1개
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

// [미션 5] ① final 필드를 받는 생성자 자동 생성(Lombok)  ② 비즈니스 계층 빈으로 등록 — 어노테이션 2개
public class BlogService {

    // [미션 5] ③ 생성자 주입을 받으려면 이 필드에 키워드 하나가 필요해요
    private BlogRepository blogRepository;

    public Article save(AddArticleRequest request) {
        return null;   // [미션 5] ④ 요청 DTO 를 엔티티로 바꿔(toEntity) 리포지토리로 저장하고, 저장된 엔티티를 돌려주세요
    }

    // [미션 11] ⑥ 읽기 전용 트랜잭션
    public List<Article> findAll() {
        return blogRepository.findAll();
    }

    // [미션 11] ⑦ 읽기 전용 트랜잭션
    public Article findById(long id) {
        return blogRepository.findById(id).orElse(null);   // [미션 5] ⑤ 없으면 null 대신 예외 — IllegalArgumentException, 메시지 "not found: " + id
    }

    public void delete(long id) {
        blogRepository.deleteById(id);
    }

    // [미션 11] ⑧ 쓰기 트랜잭션 — save() 없이 변경 감지로 DB 에 반영되려면 꼭 필요해요
    public Article update(long id, UpdateArticleRequest request) {
        Article article = blogRepository.findById(id).orElse(null);   // [미션 5] ⑥ 위 ⑤ 와 똑같이 예외로
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

// [미션 7] ① JSON 을 돌려주는 컨트롤러로 등록  ② 이 클래스 메서드들의 공통 경로 "/api/articles" — 어노테이션 2개
@RequiredArgsConstructor
public class BlogApiController {

    private final BlogService blogService;

    // [미션 7] ③ POST 요청 매핑  ④ 파라미터: 요청 본문(JSON)을 DTO 로 받기
    public ResponseEntity<ArticleResponse> addArticle(AddArticleRequest request) {
        Article savedArticle = blogService.save(request);
        return ResponseEntity.status(HttpStatus.OK).body(new ArticleResponse(savedArticle));   // [미션 8] ① 생성 성공에 맞는 상태 코드로
    }

    // [미션 7] ⑤ GET 요청 매핑 (목록)
    public ResponseEntity<List<ArticleResponse>> findAllArticles() {
        List<ArticleResponse> articles = List.of();   // [미션 8] ② blogService.findAll() 결과를 stream 으로 ArticleResponse 로 바꿔 리스트로
        return ResponseEntity.ok().body(articles);
    }

    // [미션 7] ⑥ GET 요청 매핑 (경로 "/{id}")  ⑦ 파라미터: URL 의 {id} 받기
    public ResponseEntity<ArticleResponse> findArticle(long id) {
        Article article = blogService.findById(id);
        return ResponseEntity.ok().body(new ArticleResponse(article));
    }

    // [미션 7] ⑧ DELETE 요청 매핑 (경로 "/{id}")  ⑨ 파라미터: URL 의 {id}
    public ResponseEntity<Void> deleteArticle(long id) {
        blogService.delete(id);
        return ResponseEntity.ok().build();
    }

    // [미션 7] ⑩ PUT 요청 매핑 (경로 "/{id}")  ⑪ 파라미터 두 개: URL 의 {id}, 요청 본문
    public ResponseEntity<ArticleResponse> updateArticle(long id, UpdateArticleRequest request) {
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

// 5장 실습 — 완성된 코드예요 (미션 17 에서 데이터만 넣어요)
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

// [미션 19] ① "이 클래스는 Aspect" 표시  ② 스프링 빈으로 등록 — 어노테이션 2개
@Slf4j
public class LogAspect {

    // [미션 19] ③ 포인트컷의 패키지 이름에 오타가 하나 있어요 (실제 서비스 패키지와 비교)
    @Around("execution(* com.example.blog.services..*(..))")
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
  # [미션 17] ② data.sql 을 JPA 가 테이블을 만든 "뒤에" 실행하게 하는 설정 (spring.jpa 아래 한 줄)
`,
[R + 'test-db.sql']: `INSERT INTO article (title, content) VALUES ('제목 1', '내용 1');
INSERT INTO article (title, content) VALUES ('제목 2', '내용 2');
INSERT INTO article (title, content) VALUES ('제목 3', '내용 3');
`,
[R + 'data.sql']: `-- [미션 17] ① Book 엔티티는 이미 있어요. 아래 두 줄의 주석(--)을 푸세요 → 앱이 안 뜨면 콘솔을 읽고 application.yaml 을 고치세요
-- insert into book (title, author) values ('스프링 부트 4 개발자 되기', '신선영');
-- insert into book (title, author) values ('자바 ORM 표준 JPA 프로그래밍', '김영한');
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

// [미션 14] ① 애플리케이션 전체(모든 빈)를 띄우는 통합 테스트  ② MockMvc 를 자동으로 만들어 주입 — 어노테이션 2개
class BlogApiControllerTest {

    // [미션 14] ③ 아래 네 필드는 스프링이 넣어 줘요 — 필드마다 같은 어노테이션 하나
    protected MockMvc mockMvc;

    private WebApplicationContext context;

    private BlogRepository blogRepository;

    private ObjectMapper objectMapper;

    // [미션 14] ④ 각 테스트 메서드 "전에" 매번 실행
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
        result.andExpect(status().isOk());   // [미션 14] ⑤ 생성 성공에 맞는 상태 코드를 기대하도록

        List<Article> articles = blogRepository.findAll();

        assertThat(articles.size()).isEqualTo(1);
        assertThat(articles.get(0).getTitle()).isEqualTo("제목");
        assertThat(articles.get(0).getContent()).isEqualTo(content);
    }

    // [미션 14] ⑥ 테스트 전에 "/test-db.sql" 을 실행해 글 3개를 넣는 어노테이션
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

    // [미션 14] ⑦ 위 ⑥ 과 같은 어노테이션
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

// [미션 15] ① JPA 관련 빈(리포지토리 · 엔티티)만 띄우는 슬라이스 테스트
class BlogRepositoryTest {

    // [미션 15] ② 리포지토리 주입
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
        assertThat(blogRepository.findById(saved.getId())).isPresent();   // [미션 15] ③ Optional 에 값이 "있는지" 검증하는 메서드인지 확인만 하세요
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

### 6. 책 목록 — 200 + JSON 배열 (5장 실습)  (미션 17)
GET http://localhost:8080/books
`,
};

// 시작 코드가 바뀌면 값이 달라지는 간단한 해시 — 저장된 예전 코드와 새 시작 코드가 어긋나는 것을 감지한다
const STARTER_VER = (() => { let h = 5381; for (const k of Object.keys(STARTER).sort()) { const t = k + STARTER[k]; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; } return (h >>> 0).toString(36); })();

Object.assign(IDE, { STARTER, STARTER_VER, JAVA_ROOT: J, TEST_ROOT: T });
})();
