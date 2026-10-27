/* project/solutions.js — 미션별 정답 (바뀐 파일만 정의, 나머지는 시작 코드와 동일) */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { STARTER, JAVA_ROOT: J } = IDE;

/** 시작 코드에서 [찾을 문자열, 바꿀 문자열] 들을 순서대로 치환 (못 찾으면 즉시 오류 → 시작 코드와 정답이 어긋나는 것을 방지) */
const patch = (path, pairs) => pairs.reduce((s, [a, b]) => { if (!s.includes(a)) throw new Error('solution patch miss: ' + a); return s.replace(a, b); }, STARTER[path]);

const SERVICE = J + 'service/PostService.java';
const CONTROLLER = J + 'controller/PostController.java';
const ASPECT = J + 'aop/LogAspect.java';

const SOLUTIONS = {
  [SERVICE]: patch(SERVICE, [
    ['import java.util.List;', 'import org.springframework.stereotype.Service;\n\nimport java.util.List;'],
    ['// TODO 미션 1: 이 클래스를 스프링 빈(비즈니스 계층)으로 등록하세요\npublic class', '@Service\npublic class'],
    ['    // TODO 미션 5: 컨트롤러의 DELETE 가 호출할 delete(Long id) 메서드를 여기에 추가하세요\n}', '    public void delete(Long id) {\n        postRepository.deleteById(id);\n    }\n}'],
  ]),
  [CONTROLLER]: patch(CONTROLLER, [
    ['import org.springframework.web.bind.annotation.GetMapping;', 'import jakarta.validation.Valid;\nimport org.springframework.http.HttpStatus;\nimport org.springframework.web.bind.annotation.DeleteMapping;\nimport org.springframework.web.bind.annotation.GetMapping;'],
    ['import org.springframework.web.bind.annotation.RequestMapping;', 'import org.springframework.web.bind.annotation.RequestMapping;\nimport org.springframework.web.bind.annotation.ResponseStatus;'],
    ['    // TODO 미션 3, 4: 생성 성공은 201 Created, 잘못된 입력은 400 Bad Request 가 되게 하세요\n    @PostMapping\n    public PostResponse create(@RequestBody PostRequest request) {',
     '    @PostMapping\n    @ResponseStatus(HttpStatus.CREATED)\n    public PostResponse create(@Valid @RequestBody PostRequest request) {'],
    ['    // TODO 미션 5: DELETE /api/posts/{id} 를 만들어 204 No Content 로 응답하세요 (서비스에 delete 메서드도 필요)\n',
     '    @DeleteMapping("/{id}")\n    @ResponseStatus(HttpStatus.NO_CONTENT)\n    public void delete(@PathVariable Long id) {\n        postService.delete(id);\n    }\n'],
  ]),
  [ASPECT]: patch(ASPECT, [
    ['import org.aspectj.lang.annotation.Aspect;', 'import org.aspectj.lang.annotation.Aspect;\nimport org.springframework.stereotype.Component;'],
    ['// TODO 미션 6: 이 Aspect 가 실제로 동작하게 만드세요 (빈으로 등록)\n@Slf4j', '@Slf4j\n@Component'],
  ]),
};

Object.assign(IDE, { SOLUTIONS });
})();
