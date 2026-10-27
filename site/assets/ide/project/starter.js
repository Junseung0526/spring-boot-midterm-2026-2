/* project/starter.js — 실습 프로젝트의 시작 코드 (여기를 고치면 시작 상태가 바뀝니다) */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const J = 'src/main/java/com/example/blog/';
const R = 'src/main/resources/';

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
[J + 'dto/ErrorResponse.java']: `package com.example.blog.dto;

public record ErrorResponse(String message) {
}
`,
[J + 'exception/PostNotFoundException.java']: `package com.example.blog.exception;

public class PostNotFoundException extends RuntimeException {

    public PostNotFoundException(Long id) {
        super("게시글 " + id + " 를 찾을 수 없습니다");
    }
}
`,
[J + 'exception/GlobalExceptionHandler.java']: `package com.example.blog.exception;

import com.example.blog.dto.ErrorResponse;

// TODO 미션 5: 전역 예외 처리기로 만들어 PostNotFoundException 을 404 JSON 으로 응답하세요
public class GlobalExceptionHandler {

    public ErrorResponse handleNotFound(PostNotFoundException e) {
        return new ErrorResponse(e.getMessage());
    }
}
`,
[J + 'service/PostService.java']: `package com.example.blog.service;

import com.example.blog.domain.Post;
import com.example.blog.dto.PostRequest;
import com.example.blog.dto.PostResponse;
import com.example.blog.exception.PostNotFoundException;
import com.example.blog.repository.PostRepository;

import java.util.List;

// TODO 미션 1: 이 클래스를 스프링 빈(비즈니스 계층)으로 등록하세요
public class PostService {

    private final PostRepository postRepository;

    public PostService(PostRepository postRepository) {
        this.postRepository = postRepository;
    }

    public List<PostResponse> findAll() {
        return postRepository.findAll().stream()
                .map(PostResponse::from)
                .toList();
    }

    public PostResponse find(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new PostNotFoundException(id));
        return PostResponse.from(post);
    }

    public PostResponse create(PostRequest request) {
        Post saved = postRepository.save(new Post(request.title(), request.content()));
        return PostResponse.from(saved);
    }
}
`,
[J + 'controller/PostController.java']: `package com.example.blog.controller;

import com.example.blog.dto.PostRequest;
import com.example.blog.dto.PostResponse;
import com.example.blog.service.PostService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/posts")
public class PostController {

    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    @GetMapping
    public List<PostResponse> list() {
        return postService.findAll();
    }

    @GetMapping("/{id}")
    public PostResponse get(@PathVariable Long id) {
        return postService.find(id);
    }

    // TODO 미션 3, 4: 생성 성공은 201 Created, 잘못된 입력은 400 Bad Request 가 되게 하세요
    @PostMapping
    public PostResponse create(@RequestBody PostRequest request) {
        return postService.create(request);
    }
}
`,
[J + 'aop/LogAspect.java']: `package com.example.blog.aop;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;

// TODO 미션 6: 이 Aspect 가 실제로 동작하게 만드세요 (빈으로 등록)
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
'requests.http': `### 1. 게시글 목록 조회
GET http://localhost:8080/api/posts

### 2. 게시글 단건 조회  (미션 2)
GET http://localhost:8080/api/posts/1

### 3. 게시글 생성 — 성공하면 201 Created  (미션 3)
POST http://localhost:8080/api/posts
Content-Type: application/json

{
  "title": "새 글",
  "content": "IntelliJ 처럼 실습 중"
}

### 4. 검증 실패 — 빈 제목이면 400  (미션 4)
POST http://localhost:8080/api/posts
Content-Type: application/json

{
  "title": "",
  "content": "내용"
}

### 5. 없는 게시글 — 404 + 메시지 JSON  (미션 5)
GET http://localhost:8080/api/posts/999

### 6. 숫자가 아닌 id — 400
GET http://localhost:8080/api/posts/abc
`,
};

Object.assign(IDE, { STARTER, JAVA_ROOT: J });
})();
