/* core/constants.js — 상수: 어노테이션 패키지 · HTTP 상태 · 예외 계층 */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const ANN_PKG = {
  SpringBootApplication: 'org.springframework.boot.autoconfigure',
  Component: 'org.springframework.stereotype', Service: 'org.springframework.stereotype',
  Repository: 'org.springframework.stereotype', Controller: 'org.springframework.stereotype',
  RestController: 'org.springframework.web.bind.annotation', RequestMapping: 'org.springframework.web.bind.annotation',
  GetMapping: 'org.springframework.web.bind.annotation', PostMapping: 'org.springframework.web.bind.annotation',
  PutMapping: 'org.springframework.web.bind.annotation', DeleteMapping: 'org.springframework.web.bind.annotation',
  PatchMapping: 'org.springframework.web.bind.annotation', PathVariable: 'org.springframework.web.bind.annotation',
  RequestParam: 'org.springframework.web.bind.annotation', RequestBody: 'org.springframework.web.bind.annotation',
  ResponseBody: 'org.springframework.web.bind.annotation', ResponseStatus: 'org.springframework.web.bind.annotation',
  ExceptionHandler: 'org.springframework.web.bind.annotation', RestControllerAdvice: 'org.springframework.web.bind.annotation',
  ControllerAdvice: 'org.springframework.web.bind.annotation', CrossOrigin: 'org.springframework.web.bind.annotation',
  Autowired: 'org.springframework.beans.factory.annotation', Value: 'org.springframework.beans.factory.annotation',
  Qualifier: 'org.springframework.beans.factory.annotation',
  Configuration: 'org.springframework.context.annotation', Bean: 'org.springframework.context.annotation',
  Primary: 'org.springframework.context.annotation', Lazy: 'org.springframework.context.annotation',
  Scope: 'org.springframework.context.annotation', Profile: 'org.springframework.context.annotation',
  Transactional: 'org.springframework.transaction.annotation',
  Valid: 'jakarta.validation', NotBlank: 'jakarta.validation.constraints', NotNull: 'jakarta.validation.constraints',
  NotEmpty: 'jakarta.validation.constraints', Size: 'jakarta.validation.constraints', Email: 'jakarta.validation.constraints',
  Min: 'jakarta.validation.constraints', Max: 'jakarta.validation.constraints',
  Entity: 'jakarta.persistence', Table: 'jakarta.persistence', Id: 'jakarta.persistence',
  GeneratedValue: 'jakarta.persistence', Column: 'jakarta.persistence',
  Aspect: 'org.aspectj.lang.annotation', Pointcut: 'org.aspectj.lang.annotation', Before: 'org.aspectj.lang.annotation',
  After: 'org.aspectj.lang.annotation', AfterReturning: 'org.aspectj.lang.annotation',
  AfterThrowing: 'org.aspectj.lang.annotation', Around: 'org.aspectj.lang.annotation',
  RequiredArgsConstructor: 'lombok', Getter: 'lombok', Setter: 'lombok', Data: 'lombok', AllArgsConstructor: 'lombok',
  NoArgsConstructor: 'lombok', Slf4j: 'lombok.extern.slf4j',
  PostConstruct: 'jakarta.annotation', PreDestroy: 'jakarta.annotation',
};
const TYPE_PKG = { HttpStatus: 'org.springframework.http', ResponseEntity: 'org.springframework.http', List: 'java.util',
  Optional: 'java.util', Map: 'java.util', GenerationType: 'jakarta.persistence', ProceedingJoinPoint: 'org.aspectj.lang',
  JoinPoint: 'org.aspectj.lang' };
const JAVA_LANG_ANN = new Set(['Override', 'FunctionalInterface', 'SuppressWarnings', 'Deprecated', 'SafeVarargs']);
const MODS = new Set(['public', 'private', 'protected', 'static', 'final', 'abstract', 'synchronized', 'native', 'default', 'sealed', 'non-sealed', 'transient', 'volatile', 'strictfp']);
const STEREO = new Set(['Component', 'Service', 'Repository', 'Controller', 'RestController', 'Configuration', 'ControllerAdvice', 'RestControllerAdvice']);
const REPO_BASES = /\b(JpaRepository|CrudRepository|ListCrudRepository|PagingAndSortingRepository)\b/;
const REPO_METHODS = new Set(['save', 'saveAll', 'saveAndFlush', 'findById', 'findAll', 'findAllById', 'deleteById', 'delete', 'deleteAll', 'deleteAllById', 'count', 'existsById', 'flush', 'getReferenceById', 'getById', 'deleteAllInBatch']);
const OBJ_METHODS = new Set(['toString', 'equals', 'hashCode', 'getClass']);
const VERB_ANN = { GetMapping: 'GET', PostMapping: 'POST', PutMapping: 'PUT', DeleteMapping: 'DELETE', PatchMapping: 'PATCH' };
const STATUS = { OK: 200, CREATED: 201, ACCEPTED: 202, NO_CONTENT: 204, BAD_REQUEST: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, UNPROCESSABLE_ENTITY: 422, INTERNAL_SERVER_ERROR: 500 };
const REASON = { 200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed', 409: 'Conflict', 415: 'Unsupported Media Type', 422: 'Unprocessable Entity', 500: 'Internal Server Error' };
const EX_PARENT = { MethodArgumentNotValidException: 'Exception', HttpMessageNotReadableException: 'RuntimeException', MethodArgumentTypeMismatchException: 'RuntimeException',
  NullPointerException: 'RuntimeException', NoSuchElementException: 'RuntimeException', DataIntegrityViolationException: 'RuntimeException',
  MissingServletRequestParameterException: 'Exception', MissingPathVariableException: 'Exception', IllegalArgumentException: 'RuntimeException',
  RuntimeException: 'Exception', Exception: 'Throwable' };

Object.assign(IDE, { ANN_PKG, TYPE_PKG, JAVA_LANG_ANN, MODS, STEREO, REPO_BASES, REPO_METHODS, OBJ_METHODS, VERB_ANN, STATUS, REASON, EX_PARENT });
})();
