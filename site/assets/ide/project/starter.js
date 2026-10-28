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

// TODO 미션 1: 이 클래스를 JPA 엔티티로 만드세요 (테이블 article, id 는 DB 가 자동 증가)
public class Article {

    private Long id;

    private String title;

    private String content;

    public Article(String title, String content) {
        this.title = title;
        this.content = content;
    }

    // TODO 미션 6: 제목과 내용을 바꾸는 update 메서드
}
`,
[J + 'repository/BlogRepository.java']: `package com.example.blog.repository;

// TODO 미션 1: Article 을 저장·조회하는 리포지토리
public interface BlogRepository {
}
`,
[J + 'dto/AddArticleRequest.java']: `package com.example.blog.dto;

// TODO 미션 2: 요청 본문(title, content)을 받는 DTO + 엔티티로 바꾸는 toEntity()
public class AddArticleRequest {
}
`,
[J + 'dto/ArticleResponse.java']: `package com.example.blog.dto;

// TODO 미션 3: 응답으로 내보낼 DTO — 엔티티(Article) 하나를 받아 id · title · content 를 옮겨 담으세요
public class ArticleResponse {
}
`,
[J + 'dto/UpdateArticleRequest.java']: `package com.example.blog.dto;

// TODO 미션 6: 수정 요청 본문(title, content)을 받는 DTO
public class UpdateArticleRequest {
}
`,
[J + 'service/BlogService.java']: `package com.example.blog.service;

// TODO 미션 2: 글 추가 save · 미션 3: findAll · 미션 4: findById · 미션 5: delete · 미션 6: update
public class BlogService {
}
`,
[J + 'controller/BlogApiController.java']: `package com.example.blog.controller;

// TODO 미션 2: POST /api/articles (201) · 미션 3: GET 목록 · 미션 4: GET 단건 · 미션 5: DELETE (200) · 미션 6: PUT
public class BlogApiController {
}
`,
[J + 'aop/LogAspect.java']: `package com.example.blog.aop;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;

// TODO 미션 12: 서비스 메서드가 호출될 때마다 이 Aspect 가 동작하게 만드세요
@Slf4j
@Aspect
public class LogAspect {

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
`,
[R + 'test-db.sql']: `INSERT INTO article (title, content) VALUES ('제목 1', '내용 1');
INSERT INTO article (title, content) VALUES ('제목 2', '내용 2');
INSERT INTO article (title, content) VALUES ('제목 3', '내용 3');
`,
[R + 'data.sql']: `-- TODO 미션 11: Book 엔티티(book 테이블)를 만든 뒤 아래 두 줄의 주석(--)을 푸세요
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

// 제공된 테스트 — 미션 2 · 3 · 4 를 채점합니다 (지우거나 바꾸지 마세요). 미션 8 · 9 는 아래에 직접 추가
@SpringBootTest
@AutoConfigureMockMvc
class BlogApiControllerTest {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
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
        result.andExpect(status().isCreated());

        List<Article> articles = blogRepository.findAll();

        assertThat(articles.size()).isEqualTo(1);
        assertThat(articles.get(0).getTitle()).isEqualTo("제목");
        assertThat(articles.get(0).getContent()).isEqualTo(content);
    }

    @Sql("/test-db.sql")
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

    @Sql("/test-db.sql")
    @Test
    public void findArticle() throws Exception {
        final String url = "/api/articles/1";

        final ResultActions resultActions = mockMvc.perform(get(url));

        resultActions
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("제목 1"));
    }

    // TODO 미션 8: deleteArticle 테스트를 given-when-then 으로 직접 작성하세요
    //   then: 응답 상태 코드 + 리포지토리에서 정말 사라졌는지 둘 다 검증

    // TODO 미션 9: updateArticle 테스트를 직접 작성하세요
    //   then: 응답 상태 코드 + 리포지토리에서 다시 꺼낸 글이 바뀌었는지 검증
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
'requests.http': `### 1. 글 추가 — 201 Created + 만들어진 글 JSON  (미션 2)
POST http://localhost:8080/api/articles
Content-Type: application/json

{
  "title": "제목",
  "content": "내용입니다"
}

### 2. 글 목록 — 200 + JSON 배열 (id · title · content)  (미션 3)
GET http://localhost:8080/api/articles

### 3. 글 하나 — 200 + JSON  (미션 4)
GET http://localhost:8080/api/articles/1

### 3-1. 없는 글 — 콘솔에 IllegalArgumentException: not found: 999  (미션 4)
GET http://localhost:8080/api/articles/999

### 4. 글 수정 — 200, 그다음 3번을 다시 보내 정말 바뀌었는지 확인  (미션 6)
PUT http://localhost:8080/api/articles/1
Content-Type: application/json

{
  "title": "수정한 제목",
  "content": "수정한 내용"
}

### 5. 글 삭제 — 200 또는 204, 그다음 2번으로 정말 사라졌는지 확인  (미션 5)
DELETE http://localhost:8080/api/articles/1

### 6. 책 목록 — 200 + JSON 배열 (5장 실습)  (미션 11)
GET http://localhost:8080/books
`,
};

// 시작 코드가 바뀌면 값이 달라지는 간단한 해시 — 저장된 예전 코드와 새 시작 코드가 어긋나는 것을 감지한다
const STARTER_VER = (() => { let h = 5381; for (const k of Object.keys(STARTER).sort()) { const t = k + STARTER[k]; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; } return (h >>> 0).toString(36); })();

Object.assign(IDE, { STARTER, STARTER_VER, JAVA_ROOT: J, TEST_ROOT: T });
})();
