/* project/solutions.js — 미션별 정답 (바뀐 파일만 정의, 나머지는 시작 코드와 동일) */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { STARTER, JAVA_ROOT: J } = IDE;

const patch = (path, pairs) => pairs.reduce((s, [a, b]) => { if (!s.includes(a)) throw new Error('solution patch miss: ' + a); return s.replace(a, b); }, STARTER[path]);

const SOLUTIONS = {
  [J + 'service/PostService.java']: patch(J + 'service/PostService.java', [
    ['import java.util.List;', 'import org.springframework.stereotype.Service;\n\nimport java.util.List;'],
    ['// TODO 미션 1: 이 클래스를 스프링 빈(비즈니스 계층)으로 등록하세요\npublic class', '@Service\npublic class'],
  ]),
  [J + 'controller/PostController.java']: patch(J + 'controller/PostController.java', [
    ['import org.springframework.web.bind.annotation.GetMapping;', 'import jakarta.validation.Valid;\nimport org.springframework.http.HttpStatus;\nimport org.springframework.web.bind.annotation.GetMapping;'],
    ['import org.springframework.web.bind.annotation.RequestMapping;', 'import org.springframework.web.bind.annotation.RequestMapping;\nimport org.springframework.web.bind.annotation.ResponseStatus;'],
    ['    // TODO 미션 3, 4: 생성 성공은 201 Created, 잘못된 입력은 400 Bad Request 가 되게 하세요\n    @PostMapping\n    public PostResponse create(@RequestBody PostRequest request) {',
     '    @PostMapping\n    @ResponseStatus(HttpStatus.CREATED)\n    public PostResponse create(@Valid @RequestBody PostRequest request) {'],
  ]),
  [J + 'exception/GlobalExceptionHandler.java']: patch(J + 'exception/GlobalExceptionHandler.java', [
    ['import com.example.blog.dto.ErrorResponse;', 'import com.example.blog.dto.ErrorResponse;\nimport org.springframework.http.HttpStatus;\nimport org.springframework.web.bind.annotation.ExceptionHandler;\nimport org.springframework.web.bind.annotation.ResponseStatus;\nimport org.springframework.web.bind.annotation.RestControllerAdvice;'],
    ['// TODO 미션 5: 전역 예외 처리기로 만들어 PostNotFoundException 을 404 JSON 으로 응답하세요\npublic class GlobalExceptionHandler {\n\n    public ErrorResponse',
     '@RestControllerAdvice\npublic class GlobalExceptionHandler {\n\n    @ExceptionHandler(PostNotFoundException.class)\n    @ResponseStatus(HttpStatus.NOT_FOUND)\n    public ErrorResponse'],
  ]),
  [J + 'aop/LogAspect.java']: patch(J + 'aop/LogAspect.java', [
    ['import org.aspectj.lang.annotation.Aspect;', 'import org.aspectj.lang.annotation.Aspect;\nimport org.springframework.stereotype.Component;'],
    ['// TODO 미션 6: 이 Aspect 가 실제로 동작하게 만드세요 (빈으로 등록)\n@Slf4j', '@Slf4j\n@Component'],
  ]),
};

Object.assign(IDE, { SOLUTIONS });
})();
