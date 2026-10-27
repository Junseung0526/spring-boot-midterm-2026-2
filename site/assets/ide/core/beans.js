/* core/beans.js — 스프링 빈 해석: 컴포넌트 스캔 · DI · 순환/중복 검사 · JPA 검증 · yml 설정 */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { REPO_BASES, STEREO, decap, fqn, getAnn, hasAnn, simple, stringArg } = IDE;
function resolveBeans(model) {
  const types = model.types;
  const app = [...types.values()].find(t => hasAnn(t, 'SpringBootApplication'));
  if (!app) return { fatal: 'Unable to find a @SpringBootApplication class. Annotate your main class with @SpringBootApplication.' };
  const base = app.pkg;
  const inScan = t => t.pkg === base || t.pkg.startsWith(base + '.');
  const beans = [], failures = [];
  for (const t of types.values()) {
    if (!inScan(t)) continue;
    const stereo = t.kind === 'class' && t.anns.some(a => STEREO.has(a.name));
    const repo = t.kind === 'interface' && REPO_BASES.test(t.header);
    if (stereo || repo) beans.push({ name: decap(t.name), t, type: t.name, supers: new Set([t.extName, ...t.impls].filter(Boolean)), repo, deps: [], unin: [] });
    if (hasAnn(t, 'Configuration')) for (const m of t.methods) if (hasAnn(m, 'Bean')) beans.push({ name: m.name, t, type: simple(m.retType), supers: new Set(), deps: [], unin: [], fromBean: true });
  }
  const byName = new Map(beans.map(b => [b.name, b]));
  const failAt = (t, line, f) => failures.push({ path: t.path, line, ...f });

  // JPA 검증 (컨텍스트 초기화 초기에 발생)
  const jpa = [];
  const entities = [...types.values()].filter(t => hasAnn(t, 'Entity') && inScan(t));
  for (const e of entities) {
    if (!e.fields.some(f => hasAnn(f, 'Id') || hasAnn(f, 'EmbeddedId'))) jpa.push({ path: e.path, line: e.line, kind: 'jpa', tip: `Entity '${e.name}' has no @Id field`,
      ex: `jakarta.persistence.PersistenceException: [PersistenceUnit: default] Unable to build Hibernate SessionFactory`, cause: `org.hibernate.AnnotationException: No identifier specified for entity: ${fqn(e)}` });
    if (e.ctors.length && !e.ctors.some(c => !c.params.length && !c.mods.includes('private'))) jpa.push({ path: e.path, line: e.line, kind: 'jpa', tip: 'No default (no-arg) constructor',
      ex: `jakarta.persistence.PersistenceException: [PersistenceUnit: default] Unable to build Hibernate SessionFactory`, cause: `org.hibernate.InstantiationException: No default constructor for entity: ${fqn(e)}` });
  }
  for (const b of beans.filter(x => x.repo)) {
    const E = types.get(b.t.typeArgs[0]);
    if (E && !hasAnn(E, 'Entity')) jpa.push({ path: b.t.path, line: b.t.line, kind: 'jpa', tip: `Not a managed type: ${E.name} (missing @Entity)`,
      ex: `org.springframework.beans.factory.BeanCreationException: Error creating bean with name '${b.name}'`, cause: `java.lang.IllegalArgumentException: Not a managed type: class ${fqn(E)}` });
  }

  // 의존성
  for (const b of beans) {
    const t = b.t; if (b.repo || b.fromBean) continue;
    const lombokCtor = t.anns.some(a => ['RequiredArgsConstructor', 'AllArgsConstructor'].includes(a.name));
    const ctor = t.ctors.find(c => hasAnn(c, 'Autowired')) || (t.ctors.length === 1 ? t.ctors[0] : null);
    const addDep = (type, where, idx, name, anns, line) => b.deps.push({ type: simple(type), where, idx, name, anns, line });
    if (ctor && ctor.params.length) ctor.params.forEach((p, k) => addDep(p.type, 'constructor', k, p.name, p.anns, ctor.line));
    else if (lombokCtor) t.fields.filter(f => f.mods.includes('final') && !f.hasInit && !f.mods.includes('static')).forEach((f, k) => addDep(f.type, 'constructor', k, f.name, f.anns, f.line));
    const injectedNames = new Set(b.deps.map(d => d.name));
    for (const f of t.fields) {
      if (hasAnn(f, 'Autowired') || hasAnn(f, 'Resource') || hasAnn(f, 'Inject')) { addDep(f.type, 'field', 0, f.name, f.anns, f.line); injectedNames.add(f.name); }
      else if (!injectedNames.has(f.name) && !f.hasInit && !f.mods.includes('final') && !f.mods.includes('static') && !hasAnn(f, 'Value')) b.unin.push(f);
    }
  }
  const matches = (b, ty) => b.type === ty || b.supers.has(ty);
  for (const b of beans) {
    for (const d of b.deps) {
      if (!types.has(d.type)) continue; // 외부 타입은 존재한다고 가정
      let cands = beans.filter(x => matches(x, d.type));
      const dt = types.get(d.type);
      const where = d.where === 'constructor' ? `Parameter ${d.idx} of constructor in ${fqn(b.t)}` : `Field ${d.name} in ${fqn(b.t)}`;
      if (!cands.length) {
        failAt(b.t, d.line, { kind: 'di', analyzer: true, tip: `Could not autowire. No beans of '${d.type}' type found.`,
          desc: `${where} required a bean of type '${fqn(dt)}' that could not be found.`,
          action: `Consider defining a bean of type '${fqn(dt)}' in your configuration.`, ex: 'NoSuchBeanDefinitionException' });
        continue;
      }
      if (cands.length > 1) {
        const q = getAnn({ anns: d.anns }, 'Qualifier'), qn = q && stringArg(q.args);
        const pick = qn ? cands.filter(c => c.name === qn) : cands.filter(c => hasAnn(c.t, 'Primary'));
        if (pick.length === 1) { d.bean = pick[0]; continue; }
        failAt(b.t, d.line, { kind: 'di', analyzer: true, tip: `Could not autowire. There is more than one bean of '${d.type}' type.`,
          desc: `${where} required a single bean, but ${cands.length} were found:\n${cands.map(c => `\t- ${c.name}: defined in file [${c.t.path}]`).join('\n')}`,
          action: 'Consider marking one of the beans as @Primary, updating the consumer to accept multiple beans, or using @Qualifier to identify the bean that should be consumed', ex: 'NoUniqueBeanDefinitionException' });
        continue;
      }
      d.bean = cands[0];
    }
  }
  // 순환 의존 (생성자 주입)
  const state = new Map(); let cycle = null;
  const dfs = (b, stack) => {
    if (cycle) return;
    state.set(b, 1); stack.push(b);
    for (const d of b.deps) if (d.where === 'constructor' && d.bean) {
      if (state.get(d.bean) === 1) { cycle = stack.slice(stack.indexOf(d.bean)); return; }
      if (!state.get(d.bean)) dfs(d.bean, stack);
    }
    stack.pop(); state.set(b, 2);
  };
  beans.forEach(b => { if (!state.get(b)) dfs(b, []); });
  if (cycle) failAt(cycle[0].t, cycle[0].t.line, { kind: 'cycle', analyzer: true, tip: 'Cyclic dependency detected',
    desc: 'The dependencies of some of the beans in the application context form a cycle:\n\n┌─────┐\n' + cycle.map(c => `|  ${c.name} defined in file [${c.t.path}]`).join('\n↑     ↓\n') + '\n└─────┘',
    action: 'Relying upon circular references is discouraged and they are prohibited by default. Update your application to remove the dependency cycle between beans.', ex: 'BeanCurrentlyInCreationException' });
  return { app, base, beans, byName, failures: jpa.concat(failures), entities };
}

function readConfig(files) {
  const yml = files['src/main/resources/application.yml'] || '';
  const port = +((/^\s*port:\s*(\d+)/m.exec(yml) || [])[1] || 8080);
  const showSql = !/show-sql:\s*false/.test(yml);
  return { port, showSql };
}

Object.assign(IDE, { resolveBeans, readConfig });
})();
