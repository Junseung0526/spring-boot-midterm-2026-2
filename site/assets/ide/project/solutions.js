/* project/solutions.js — 미션별 정답. 시작 코드에서 [찾을 문자열, 바꿀 문자열] 을 순서대로 치환한다.
   (못 찾으면 즉시 오류 → 시작 코드와 정답이 어긋나는 것을 막는다) */
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
  /* 미션 1 @Service · 6 delete · 7 @Transactional */
  [SERVICE]: patch(SERVICE, [
    ['import java.util.List;', 'import org.springframework.stereotype.Service;\nimport org.springframework.transaction.annotation.Transactional;\n\nimport java.util.List;'],
    ['// TODO 미션 1: 이 클래스를 스프링 빈(비즈니스 계층)으로 등록하세요\npublic class', '@Service\n@Transactional(readOnly = true)\npublic class'],
    ['    // TODO 미션 7: 클래스에 @Transactional(readOnly = true), 쓰기 메서드(create/update/delete)에는 @Transactional 을 붙이세요\n', ''],
    ['    public PostResponse create(', '    @Transactional\n    public PostResponse create('],
    ['    public PostResponse update(', '    @Transactional\n    public PostResponse update('],
    ['    // TODO 미션 6: 컨트롤러의 DELETE 가 호출할 delete(Long id) 메서드를 여기에 추가하세요\n}', '    @Transactional\n    public void delete(Long id) {\n        postRepository.deleteById(id);\n    }\n}'],
  ]),
  /* 미션 3 @ResponseStatus · 4 @Valid · 6 @DeleteMapping */
  [CONTROLLER]: patch(CONTROLLER, [
    ['import org.springframework.web.bind.annotation.GetMapping;', 'import org.springframework.http.HttpStatus;\nimport org.springframework.web.bind.annotation.DeleteMapping;\nimport org.springframework.web.bind.annotation.GetMapping;'],
    ['import org.springframework.web.bind.annotation.RequestMapping;', 'import org.springframework.web.bind.annotation.RequestMapping;\nimport org.springframework.web.bind.annotation.ResponseStatus;'],
    ['    // TODO 미션 3: 생성에 성공하면 200 이 아니라 201 Created 로 응답하세요\n    // TODO 미션 4: 잘못된 입력(빈 제목)은 400 Bad Request 가 되도록 검증을 요청하세요\n    @PostMapping\n    public PostResponse create(@RequestBody PostRequest request) {',
     '    @PostMapping\n    @ResponseStatus(HttpStatus.CREATED)\n    public PostResponse create(@Valid @RequestBody PostRequest request) {'],
    ['    // TODO 미션 6: DELETE /api/posts/{id} 를 만들어 204 No Content 로 응답하세요 (서비스에 delete 메서드도 필요)\n',
     '    @DeleteMapping("/{id}")\n    @ResponseStatus(HttpStatus.NO_CONTENT)\n    public void delete(@PathVariable Long id) {\n        postService.delete(id);\n    }\n'],
  ]),
  /* 미션 8 AOP */
  [ASPECT]: patch(ASPECT, [
    ['import org.aspectj.lang.annotation.Aspect;', 'import org.aspectj.lang.annotation.Aspect;\nimport org.springframework.stereotype.Component;'],
    ['// TODO 미션 8: 이 Aspect 가 실제로 동작하게 만드세요 (스프링 빈으로 등록)\n@Slf4j', '@Slf4j\n@Component'],
  ]),
  /* 미션 9 슬라이스 테스트 */
  [CTRL_TEST]: patch(CTRL_TEST, [
    ['import org.springframework.http.MediaType;', 'import org.springframework.http.MediaType;\nimport org.springframework.test.context.bean.override.mockito.MockitoBean;'],
    ['    // TODO 미션 9: PostService 를 가짜(mock) 빈으로 등록하세요 — @WebMvcTest 는 웹 계층만 띄웁니다\n    PostService postService;', '    @MockitoBean\n    PostService postService;'],
  ]),
};

Object.assign(IDE, { SOLUTIONS });
})();
