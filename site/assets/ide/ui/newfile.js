/* ui/newfile.js — "새 Java 파일" 대화상자(템플릿) + 직접 만든 파일 삭제. 처음부터 코드를 짜 볼 수 있게 한다. */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { state, store } = IDE;
const B = 'com.example.blog';
const imp = (...names) => names.map(n => `import ${IDE.ANN_PKG[n] || IDE.TYPE_PKG[n]}.${n};`).sort().join('\n');
const low = n => n.charAt(0).toLowerCase() + n.slice(1);

const KINDS = [
  { id: 'controller', label: 'Controller (@RestController)', pkg: 'controller', suffix: 'Controller', gen: (n, pkg) => `package ${B}.${pkg};\n\n${imp('GetMapping', 'RequestMapping', 'RestController')}\n\n@RestController\n@RequestMapping("/api/${low(n.replace(/Controller$/, '')) || 'items'}s")\npublic class ${n} {\n\n    @GetMapping\n    public String hello() {\n        return "hello";\n    }\n}\n` },
  { id: 'service', label: 'Service (@Service)', pkg: 'service', suffix: 'Service', gen: (n, pkg) => `package ${B}.${pkg};\n\n${imp('Service')}\n\n@Service\npublic class ${n} {\n\n}\n` },
  { id: 'repository', label: 'Repository (JpaRepository)', pkg: 'repository', suffix: 'Repository', gen: (n, pkg) => `package ${B}.${pkg};\n\nimport ${B}.domain.Post;\nimport org.springframework.data.jpa.repository.JpaRepository;\n\npublic interface ${n} extends JpaRepository<Post, Long> {\n}\n` },
  { id: 'entity', label: 'Entity (@Entity)', pkg: 'domain', suffix: '', gen: (n, pkg) => `package ${B}.${pkg};\n\n${imp('Entity', 'GeneratedValue', 'Id')}\nimport jakarta.persistence.GenerationType;\n\n@Entity\npublic class ${n} {\n\n    @Id\n    @GeneratedValue(strategy = GenerationType.IDENTITY)\n    private Long id;\n\n    protected ${n}() {\n    }\n\n    public Long getId() { return id; }\n}\n` },
  { id: 'dto', label: 'DTO (record + 검증)', pkg: 'dto', suffix: '', gen: (n, pkg) => `package ${B}.${pkg};\n\n${imp('NotBlank')}\n\npublic record ${n}(\n        @NotBlank String name) {\n}\n` },
  { id: 'config', label: 'Configuration (@Bean)', pkg: 'config', suffix: 'Config', gen: (n, pkg) => `package ${B}.${pkg};\n\n${imp('Bean', 'Configuration')}\n\n@Configuration\npublic class ${n} {\n\n    @Bean\n    public String appName() {\n        return "blog";\n    }\n}\n` },
  { id: 'test', label: '테스트 클래스 (JUnit5)', pkg: 'service', suffix: 'Test', test: true, gen: (n, pkg) => `package ${B}.${pkg};\n\nimport org.junit.jupiter.api.Test;\n\nimport static org.assertj.core.api.Assertions.assertThat;\n\nclass ${n} {\n\n    @Test\n    void works() {\n        assertThat(1 + 1).isEqualTo(2);\n    }\n}\n` },
  { id: 'plain', label: '빈 클래스', pkg: '', suffix: '', gen: (n, pkg) => `package ${B}${pkg ? '.' + pkg : ''};\n\npublic class ${n} {\n\n}\n` },
];
const PKGS = ['controller', 'service', 'repository', 'domain', 'dto', 'config', 'aop', ''];

function open(toast) {
  let el = document.getElementById('newfile');
  if (!el) { el = document.createElement('div'); el.id = 'newfile'; document.body.appendChild(el); }
  el.hidden = false;
  el.innerHTML = `<div class="nfbox" role="dialog" aria-label="새 Java 파일"><div class="nft">New Java Class</div>
    <label>종류<select id="nf-kind">${KINDS.map(k => `<option value="${k.id}">${k.label}</option>`).join('')}</select></label>
    <label>패키지<select id="nf-pkg">${PKGS.map(p => `<option value="${p}">${B}${p ? '.' + p : ''}</option>`).join('')}</select></label>
    <label>이름<input id="nf-name" placeholder="예: CommentController" autocomplete="off" spellcheck="false"></label>
    <div class="nfmsg" id="nf-msg"></div>
    <div class="nfact"><button id="nf-ok" class="ok">만들기</button><button id="nf-cancel">취소</button></div></div>`;
  const $ = s => el.querySelector(s), kind = () => KINDS.find(k => k.id === $('#nf-kind').value);
  const sync = () => { $('#nf-pkg').value = kind().pkg; $('#nf-name').placeholder = '예: Comment' + kind().suffix; };
  $('#nf-kind').addEventListener('change', sync); sync();
  const close = () => { el.hidden = true; };
  const make = () => {
    const k = kind(), name = $('#nf-name').value.trim(), pkg = $('#nf-pkg').value;
    if (!/^[A-Z][A-Za-z0-9_]*$/.test(name)) { $('#nf-msg').textContent = '이름은 대문자로 시작하는 영문/숫자여야 합니다 (예: CommentService)'; return; }
    const path = `${k.test ? 'src/test/java' : 'src/main/java'}/${B.replace(/\./g, '/')}${pkg ? '/' + pkg : ''}/${name}.java`;
    if (path in state.files) { $('#nf-msg').textContent = '같은 이름의 파일이 이미 있습니다'; return; }
    state.files[path] = k.gen(name, pkg); store.setContent(path, state.files[path]); store.openFile(path); IDE.bus.emit('reset-tree');
    close(); toast(`${name}.java 를 만들었습니다`);
  };
  $('#nf-ok').addEventListener('click', make); $('#nf-cancel').addEventListener('click', close);
  el.addEventListener('click', e => { if (e.target === el) close(); });
  el.addEventListener('keydown', e => { if (e.key === 'Enter') make(); if (e.key === 'Escape') close(); });
  $('#nf-name').focus();
}
function remove(path, toast) {
  if (path in IDE.STARTER) { toast('기본 프로젝트 파일은 삭제할 수 없습니다 (직접 만든 파일만 삭제 가능)'); return; }
  if (!confirm(`${path.split('/').pop()} 을(를) 삭제할까요?`)) return;
  store.closeFile(path); delete state.files[path]; store.setContent('__noop__', ''); delete state.files['__noop__']; IDE.bus.emit('reset-tree'); toast('삭제했습니다');
}
Object.assign(IDE, { NewFile: { open, remove } });
})();
