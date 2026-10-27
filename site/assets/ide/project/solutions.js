/* project/solutions.js — 최종 정답. 시작 코드에서 [찾을 문자열, 바꿀 문자열] 을 순서대로 치환한다.
   (못 찾으면 즉시 오류 → 시작 코드와 정답이 어긋나는 것을 막는다) 컨트롤러는 CRUD 를 전부 담은 완성본이다. */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { STARTER, JAVA_ROOT: J, TEST_ROOT: TT } = IDE;

const patch = (path, pairs) => pairs.reduce((s, [a, b]) => { if (!s.includes(a)) throw new Error('solution patch miss: ' + a); return s.replace(a, b); }, STARTER[path]);

const SERVICE = J + 'service/PostService.java';
const CONTROLLER = J + 'controller/PostController.java';
const ASPECT = J + 'aop/LogAspect.java';
const CTRL_TEST = TT + 'controller/PostControllerTest.java';

const SOLUTIONS = {
  /* 미션 1 @Service · 8 delete · 9 @Transactional */
  [SERVICE]: patch(SERVICE, [
    ['import java.util.List;', 'import org.springframework.stereotype.Service;\nimport org.springframework.transaction.annotation.Transactional;\n\nimport java.util.List;'],
    ['// TODO 미션 1: 이 클래스를 스프링 빈(비즈니스 계층)으로 등록하세요\npublic class', '@Service\n@Transactional(readOnly = true)\npublic class'],
    ['    // TODO 미션 9: 클래스에 @Transactional(readOnly = true), 쓰기 메서드(create/update/delete)에는 @Transactional 을 붙이세요\n', ''],
    ['    public PostResponse create(', '    @Transactional\n    public PostResponse create('],
    ['    public PostResponse update(', '    @Transactional\n    public PostResponse update('],
    ['    // TODO 미션 8: 컨트롤러의 DELETE 가 호출할 delete(Long id) 메서드를 여기에 추가하세요\n}', '    @Transactional\n    public void delete(Long id) {\n        postRepository.deleteById(id);\n    }\n}'],
  ]),
  /* 미션 2~8: 컨트롤러 CRUD 전체 */
  [CONTROLLER]: `package com.example.blog.controller;

import com.example.blog.dto.PostRequest;
import com.example.blog.dto.PostResponse;
import com.example.blog.service.PostService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
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

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PostResponse create(@Valid @RequestBody PostRequest request) {
        return postService.create(request);
    }

    @PutMapping("/{id}")
    public PostResponse update(@PathVariable Long id, @Valid @RequestBody PostRequest request) {
        return postService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        postService.delete(id);
    }
}
`,
  /* 미션 10 AOP */
  [ASPECT]: patch(ASPECT, [
    ['import org.aspectj.lang.annotation.Aspect;', 'import org.aspectj.lang.annotation.Aspect;\nimport org.springframework.stereotype.Component;'],
    ['// TODO 미션 10: 이 Aspect 가 실제로 동작하게 만드세요 (스프링 빈으로 등록)\n@Slf4j', '@Slf4j\n@Component'],
  ]),
  /* 미션 11 슬라이스 테스트 */
  [CTRL_TEST]: patch(CTRL_TEST, [
    ['import org.springframework.http.MediaType;', 'import org.springframework.http.MediaType;\nimport org.springframework.test.context.bean.override.mockito.MockitoBean;'],
    ['    // TODO 미션 11: PostService 를 가짜(mock) 빈으로 등록하세요 — @WebMvcTest 는 웹 계층만 띄웁니다\n    PostService postService;', '    @MockitoBean\n    PostService postService;'],
  ]),
};

Object.assign(IDE, { SOLUTIONS });
})();
