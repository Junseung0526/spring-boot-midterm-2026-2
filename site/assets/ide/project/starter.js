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
[J + 'domain/Post.java']: `package com.example.blog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "posts")
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String content;

    protected Post() {
    }

    public Post(String title, String content) {
        this.title = title;
        this.content = content;
    }

    public Post change(String title, String content) {
        this.title = title;
        this.content = content;
        return this;
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getContent() { return content; }
}
`,
[J + 'repository/PostRepository.java']: `package com.example.blog.repository;

import com.example.blog.domain.Post;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostRepository extends JpaRepository<Post, Long> {
}
`,
[J + 'dto/PostRequest.java']: `package com.example.blog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PostRequest(
        @NotBlank @Size(max = 100) String title,
        @NotBlank String content) {
}
`,
[J + 'dto/PostResponse.java']: `package com.example.blog.dto;

import com.example.blog.domain.Post;

public record PostResponse(Long id, String title, String content) {

    public static PostResponse from(Post post) {
        return new PostResponse(post.getId(), post.getTitle(), post.getContent());
    }
}
`,
[J + 'service/PostService.java']: `package com.example.blog.service;

import com.example.blog.domain.Post;
import com.example.blog.dto.PostRequest;
import com.example.blog.dto.PostResponse;
import com.example.blog.repository.PostRepository;

import java.util.List;

// TODO 미션 1: 이 클래스를 스프링 빈(비즈니스 계층)으로 등록하세요
public class PostService {

    private final PostRepository postRepository;

    public PostService(PostRepository postRepository) {
        this.postRepository = postRepository;
    }

    // TODO 미션 9: 클래스에 @Transactional(readOnly = true), 쓰기 메서드(create/update/delete)에는 @Transactional 을 붙이세요
    public List<PostResponse> findAll() {
        return postRepository.findAll().stream()
                .map(PostResponse::from)
                .toList();
    }

    public PostResponse find(Long id) {
        return postRepository.findById(id)
                .map(PostResponse::from)
                .orElse(null);
    }

    public PostResponse create(PostRequest request) {
        Post saved = postRepository.save(new Post(request.title(), request.content()));
        return PostResponse.from(saved);
    }

    public PostResponse update(Long id, PostRequest request) {
        return postRepository.findById(id)
                .map(post -> post.change(request.title(), request.content()))
                .map(PostResponse::from)
                .orElse(null);
    }

    // TODO 미션 8: 컨트롤러의 DELETE 가 호출할 delete(Long id) 메서드를 여기에 추가하세요
}
`,
[J + 'controller/PostController.java']: `package com.example.blog.controller;

import com.example.blog.service.PostService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/posts")
public class PostController {

    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    // TODO 미션 2: 전체 목록을 돌려주는 GET /api/posts 를 만드세요
    //   메서드 list() · 반환 List<PostResponse> · 서비스의 findAll() 을 호출

    // TODO 미션 3: 한 건을 돌려주는 GET /api/posts/{id} 를 만드세요
    //   메서드 get(id) · 반환 PostResponse · 서비스의 find(id) 를 호출

    // TODO 미션 4: 새 글을 만드는 POST /api/posts 를 만드세요 (이어서 5: 201 응답, 6: 입력 검증)
    //   메서드 create(request) · 요청 본문은 PostRequest · 서비스의 create(request) 를 호출

    // TODO 미션 7: 글을 고치는 PUT /api/posts/{id} 를 만드세요 (입력 검증 포함)
    //   메서드 update(id, request) · 서비스의 update(id, request) 를 호출

    // TODO 미션 8: 글을 지우는 DELETE /api/posts/{id} 를 만들어 204 No Content 로 응답하세요
    //   서비스에 delete(id) 를 먼저 만들어야 합니다
}
`,
[J + 'aop/LogAspect.java']: `package com.example.blog.aop;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;

// TODO 미션 10: 이 Aspect 가 실제로 동작하게 만드세요 (스프링 빈으로 등록)
@Slf4j
@Aspect
public class LogAspect {

    @Around("execution(* com.example.blog.service..*(..))")
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
[R + 'application.yml']: `server:
  port: 8080

spring:
  datasource:
    url: jdbc:h2:mem:blog
  jpa:
    show-sql: true
    hibernate:
      ddl-auto: create-drop
`,
[R + 'data.sql']: `insert into posts (title, content) values ('첫 글', 'Hello Spring Boot 4');
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
[T + 'controller/PostControllerTest.java']: `package com.example.blog.controller;

import com.example.blog.dto.PostResponse;
import com.example.blog.service.PostService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PostController.class)
class PostControllerTest {

    @Autowired
    MockMvc mockMvc;

    // TODO 미션 11: PostService 를 가짜(mock) 빈으로 등록하세요 — @WebMvcTest 는 웹 계층만 띄웁니다
    PostService postService;

    @Test
    @DisplayName("목록 조회")
    void list() throws Exception {
        given(postService.findAll()).willReturn(List.of(new PostResponse(1L, "첫 글", "내용")));

        mockMvc.perform(get("/api/posts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("첫 글"));
    }

    @Test
    @DisplayName("단건 조회")
    void get() throws Exception {
        given(postService.find(1L)).willReturn(new PostResponse(1L, "제목", "내용"));

        mockMvc.perform(get("/api/posts/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("제목"));
    }

    @Test
    @DisplayName("생성하면 201 Created")
    void create() throws Exception {
        given(postService.create(any())).willReturn(new PostResponse(2L, "새 글", "내용"));

        mockMvc.perform(post("/api/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\\"title\\":\\"새 글\\",\\"content\\":\\"내용\\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(2));
    }

    @Test
    @DisplayName("제목이 비어 있으면 400 Bad Request")
    void create_invalid() throws Exception {
        mockMvc.perform(post("/api/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\\"title\\":\\"\\",\\"content\\":\\"내용\\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("수정하면 바뀐 내용을 돌려준다")
    void update() throws Exception {
        given(postService.update(eq(1L), any())).willReturn(new PostResponse(1L, "수정", "내용"));

        mockMvc.perform(put("/api/posts/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\\"title\\":\\"수정\\",\\"content\\":\\"내용\\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("수정"));
    }

    @Test
    @DisplayName("삭제하면 204 No Content")
    void delete() throws Exception {
        mockMvc.perform(delete("/api/posts/1"))
                .andExpect(status().isNoContent());
    }
}
`,
[T + 'service/PostServiceTest.java']: `package com.example.blog.service;

import com.example.blog.domain.Post;
import com.example.blog.dto.PostRequest;
import com.example.blog.dto.PostResponse;
import com.example.blog.repository.PostRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class PostServiceTest {

    @Mock
    PostRepository postRepository;

    @InjectMocks
    PostService postService;

    @Test
    @DisplayName("id 로 조회하면 응답 DTO 로 바꿔 돌려준다")
    void find() {
        given(postRepository.findById(1L)).willReturn(Optional.of(new Post("제목", "내용")));

        PostResponse response = postService.find(1L);

        assertThat(response.title()).isEqualTo("제목");
    }

    @Test
    @DisplayName("없는 id 를 조회하면 null")
    void find_notFound() {
        given(postRepository.findById(99L)).willReturn(Optional.empty());

        assertThat(postService.find(99L)).isNull();
    }

    @Test
    @DisplayName("생성하면 저장하고 응답 DTO 를 돌려준다")
    void create() {
        given(postRepository.save(any())).willReturn(new Post("새 글", "내용"));

        PostResponse response = postService.create(new PostRequest("새 글", "내용"));

        assertThat(response.title()).isEqualTo("새 글");
        verify(postRepository).save(any());
    }

    @Test
    @DisplayName("수정하면 제목과 내용이 바뀐다")
    void update() {
        given(postRepository.findById(1L)).willReturn(Optional.of(new Post("옛 제목", "옛 내용")));

        PostResponse response = postService.update(1L, new PostRequest("새 제목", "새 내용"));

        assertThat(response.title()).isEqualTo("새 제목");
        assertThat(response.content()).isEqualTo("새 내용");
    }
}
`,
[T + 'repository/PostRepositoryTest.java']: `package com.example.blog.repository;

import com.example.blog.domain.Post;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class PostRepositoryTest {

    @Autowired
    PostRepository postRepository;

    @Test
    @DisplayName("저장하면 id 가 생기고 다시 조회된다")
    void saveAndFind() {
        Post saved = postRepository.save(new Post("제목", "내용"));

        assertThat(saved.getId()).isNotNull();
        assertThat(postRepository.findById(saved.getId())).isPresent();
    }

    @Test
    @DisplayName("전체 조회")
    void findAll() {
        postRepository.save(new Post("a", "b"));
        postRepository.save(new Post("c", "d"));

        assertThat(postRepository.findAll()).hasSize(2);
    }

    @Test
    @DisplayName("삭제하면 개수가 줄어든다")
    void deleteById() {
        Post saved = postRepository.save(new Post("제목", "내용"));

        postRepository.deleteById(saved.getId());

        assertThat(postRepository.count()).isZero();
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
'requests.http': `### 1. 게시글 목록 조회 — 200 + JSON 배열  (미션 2)
GET http://localhost:8080/api/posts

### 2. 게시글 단건 조회 — 200 + JSON  (미션 3)
GET http://localhost:8080/api/posts/1

### 3. 게시글 생성 — 만들어진 글 JSON, 그다음 201 Created  (미션 4 · 5)
POST http://localhost:8080/api/posts
Content-Type: application/json

{
  "title": "새 글",
  "content": "IntelliJ 처럼 실습 중"
}

### 4. 검증 실패 — 빈 제목이면 400  (미션 6)
POST http://localhost:8080/api/posts
Content-Type: application/json

{
  "title": "",
  "content": "내용"
}

### 5. 게시글 수정 — 200 OK + 바뀐 JSON, 다시 2번을 실행해 보세요  (미션 7)
PUT http://localhost:8080/api/posts/1
Content-Type: application/json

{
  "title": "수정한 제목",
  "content": "수정한 내용"
}

### 6. 게시글 삭제 — 204 No Content  (미션 8)
DELETE http://localhost:8080/api/posts/1

### 7. 보너스: 숫자가 아닌 id — 400
GET http://localhost:8080/api/posts/abc
`,
};

// 시작 코드가 바뀌면 값이 달라지는 간단한 해시 — 저장된 예전 코드와 새 시작 코드가 어긋나는 것을 감지한다
const STARTER_VER = (() => { let h = 5381; for (const k of Object.keys(STARTER).sort()) { const t = k + STARTER[k]; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; } return (h >>> 0).toString(36); })();

Object.assign(IDE, { STARTER, STARTER_VER, JAVA_ROOT: J, TEST_ROOT: T });
})();
