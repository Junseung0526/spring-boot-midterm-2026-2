/* core/boot.js — 애플리케이션 기동 시뮬레이션 (Run 콘솔 로그) */
(() => {
'use strict';
const IDE = (globalThis.IDE ??= {});
const { abbr, buildModel, buildWeb, decap, fqn, getAnn, hasAnn, javaProblems, readConfig, resolveBeans, simple, stamp, stringArg } = IDE;
const BANNER = ['', '  .   ____          _            __ _ _', ' /\\\\ / ___\'_ __ _ _(_)_ __  __ _ \\ \\ \\ \\', '( ( )\\___ | \'_ | \'_| | \'_ \\/ _` | \\ \\ \\ \\', ' \\\\/  ___)| |_)| | | | | || (_| |  ) ) ) )', "  '  |____| .__|_| |_|_| |_\\__, | / / / /", ' =========|_|==============|___/=/_/_/_/', '', ' :: Spring Boot ::                (v4.0.0)', ''];

const tableOf = E => { const a = (getAnn(E, 'Table') || {}).args || ''; return stringArg(a, 'name') || (/name\s*=\s*"([^"]*)"/.exec(a) || [])[1] || decap(E.name); };
/* 엔티티마다 테이블 하나: { tables: { posts: { rows, seq, E, tn } }, byEntity: { Post: <table> } } */
function newDb(entities) {
  const tables = {};
  for (const E of entities) { E._table = tableOf(E); tables[E._table] = { rows: [], seq: 1, E, tn: E._table }; }
  return { tables, byEntity: Object.fromEntries(Object.values(tables).map(t => [t.E.name, t])) };
}

/* insert into t (a, b) values ('x', 'y'); 만 해석한다 (-- 주석 무시). 없는 테이블이면 { missing, stmt } */
function runSql(db, text) {
  let count = 0;
  for (const m of (text || '').replace(/--[^\n]*/g, '').matchAll(/insert\s+into\s+(\w+)\s*\(([^)]*)\)\s*values\s*\(([^)]*)\)/gi)) {
    const tb = db.tables[m[1].toLowerCase()];
    if (!tb) return { missing: m[1], stmt: m[0].replace(/\s+/g, ' ') };
    const cols = m[2].split(',').map(x => x.trim()), vals = (m[3].match(/'(?:[^']|'')*'|[^,\s]+/g) || []).map(v => v.replace(/^'|'$/g, '').replace(/''/g, "'"));
    const row = { id: tb.seq++ }; cols.forEach((c, i) => { row[c] = vals[i] ?? null; }); tb.rows.push(row); count++;
  }
  return { count };
}

function boot(files) {
  const items = [], log = (lvl, logger, msg, extra) => items.push({ k: 'log', ts: stamp(), lvl, pid: 14721, thread: 'main', logger, msg, ...extra });
  const raw = (text, cls) => items.push({ k: 'raw', text, cls });
  const model = buildModel(files);
  const probs = javaProblems(model).filter(p => !/(^|\/)src\/test\//.test(p.path));   // bootRun 은 테스트 소스를 컴파일하지 않는다
  if (probs.length) return { ok: false, build: true, problems: probs, items, model };
  const rb = resolveBeans(model);
  const cfg = readConfig(files);
  if (rb.fatal) { raw('java.lang.IllegalStateException: ' + rb.fatal, 'err'); return { ok: false, items, problems: [] }; }
  const appF = fqn(rb.app);
  BANNER.forEach(l => raw(l, 'banner'));
  log('INFO', abbr(appF), `Starting ${rb.app.name} using Java 21.0.5 with PID 14721 (/home/dev/blog/build/classes/java/main started by dev in /home/dev/blog)`);
  log('INFO', abbr(appF), 'No active profile set, falling back to 1 default profile: "default"');
  const repos = rb.beans.filter(b => b.repo);
  if (repos.length || rb.entities.length) {
    log('INFO', 'o.s.d.r.c.RepositoryConfigurationDelegate', 'Bootstrapping Spring Data JPA repositories in DEFAULT mode.');
    log('INFO', 'o.s.d.r.c.RepositoryConfigurationDelegate', `Finished Spring Data repository scanning in 21 ms. Found ${repos.length} JPA repository interface${repos.length === 1 ? '' : 's'}.`);
  }
  log('INFO', 'o.s.boot.tomcat.TomcatWebServer', `Tomcat initialized with port ${cfg.port} (http)`);
  log('INFO', 'o.apache.catalina.core.StandardService', 'Starting service [Tomcat]');
  log('INFO', 'o.apache.catalina.core.StandardEngine', 'Starting Servlet engine: [Apache Tomcat/11.0.x]');
  log('INFO', 'b.w.c.s.WebApplicationContextInitializer', 'Root WebApplicationContext: initialization completed in 812 ms');
  const fail = rb.failures[0];
  if (rb.entities.length || repos.length) {
    log('INFO', 'org.hibernate.orm.jpa', 'HHH000204: Processing PersistenceUnitInfo [name: default]');
    log('INFO', 'com.zaxxer.hikari.HikariDataSource', 'HikariPool-1 - Starting...');
    log('INFO', 'com.zaxxer.hikari.pool.HikariPool', 'HikariPool-1 - Added connection conn0: url=jdbc:h2:mem:blog user=SA');
  }
  if (fail) {
    if (fail.kind === 'jpa') {
      log('WARN', 'ConfigServletWebServerApplicationContext', `Exception encountered during context initialization - cancelling refresh attempt: ${fail.ex}`);
      log('ERROR', abbr(appF), 'Application run failed', {});
      raw(fail.ex, 'err'); raw('\t... 52 common frames omitted', 'dim'); raw('Caused by: ' + fail.cause, 'err');
    } else {
      log('WARN', 'ConfigServletWebServerApplicationContext', `Exception encountered during context initialization - cancelling refresh attempt: ${fail.ex}`);
      log('INFO', 'o.apache.catalina.core.StandardService', 'Stopping service [Tomcat]');
      raw(''); raw('***************************', 'err'); raw('APPLICATION FAILED TO START', 'err'); raw('***************************', 'err'); raw('');
      raw('Description:', 'err'); raw(''); raw(fail.desc); raw(''); raw('Action:', 'err'); raw(''); raw(fail.action); raw('');
    }
    return { ok: false, items, failure: fail, problems: [], model };
  }
  const web = buildWeb(model, rb);
  const db = newDb(rb.entities);
  if (rb.entities.length) {
    if (cfg.showSql) for (const { E, tn } of Object.values(db.tables)) {
      const cols = E.fields.filter(f => !f.mods.includes('static')).map(f => `${f.name}`);
      raw(`Hibernate: drop table if exists ${tn} cascade`, 'sql');
      raw(`Hibernate: create table ${tn} (${cols.map(c => c === 'id' ? 'id bigint generated by default as identity' : c + ' varchar(255)').join(', ')}, primary key (id))`, 'sql');
    }
    log('INFO', 'o.h.e.t.j.p.i.JtaPlatformInitiator', "HHH000489: No JTA platform available (set 'hibernate.transaction.jta.platform' to enable JTA platform integration)");
    log('INFO', 'j.LocalContainerEntityManagerFactoryBean', "Initialized JPA EntityManagerFactory for persistence unit 'default'");
    log('WARN', 'JpaBaseConfiguration$JpaWebConfiguration', 'spring.jpa.open-in-view is enabled by default. Therefore, database queries may be performed during view rendering. Explicitly configure spring.jpa.open-in-view to disable this warning');
  }
  for (const m of web.mappings) log('DEBUG', 'o.s.w.s.m.m.a.RequestMappingHandlerMapping', `${abbr(fqn(m.bean.t))}: { ${m.verb} [${m.pattern}] } → ${m.method.name}(${m.method.params.map(p => simple(p.type)).join(', ')})`, { dim: true });
  for (const a of web.aspects) log('DEBUG', 'o.s.aop.framework.CglibAopProxy', `AOP aspect registered: ${fqn(a.bean.t)} (${a.advices.map(x => '@' + x.kind).join(', ') || 'no advice'})`, { dim: true });
  if (rb.beans.some(b => hasAnn(b.t, 'Aspect') === false) && rb.app) {
    for (const t of model.types.values()) if (hasAnn(t, 'Aspect') && !rb.beans.some(b => b.t === t)) log('WARN', 'o.s.aop.framework.CglibAopProxy', `${fqn(t)} has @Aspect but is not a Spring bean — it will be ignored (add @Component)`);
  }
  // data.sql 시드. JPA 가 만드는 테이블에 넣으려면 defer-datasource-initialization 이 필요하다 (없으면 테이블보다 먼저 실행됨)
  const dataSql = files['src/main/resources/data.sql'] || '';
  const sr = runSql(rb.entities.length && !cfg.defer ? { tables: {} } : db, dataSql);
  if (sr.missing) {
    log('WARN', 'ConfigServletWebServerApplicationContext', `Exception encountered during context initialization - cancelling refresh attempt: org.springframework.jdbc.datasource.init.ScriptStatementFailedException: Failed to execute SQL script statement #1 of class path resource [data.sql]: ${sr.stmt}`);
    log('ERROR', abbr(appF), 'Application run failed', {});
    raw(`Caused by: org.h2.jdbc.JdbcSQLSyntaxErrorException: Table "${sr.missing.toUpperCase()}" not found (this database is empty); SQL statement:`, 'err'); raw(sr.stmt, 'err');
    raw(db.tables[sr.missing.toLowerCase()] ? 'data.sql 이 JPA 가 테이블을 만들기 전에 실행됐습니다 — application.yaml 에 spring.jpa.defer-datasource-initialization: true 가 필요합니다' : `data.sql 이 ${sr.missing} 테이블에 넣으려 하지만 그 테이블과 매핑된 @Entity 가 없습니다`, 'hint');
    return { ok: false, items, failure: { kind: 'sql', ex: 'ScriptStatementFailedException', desc: `Table "${sr.missing.toUpperCase()}" not found` }, problems: [], model };
  }
  if (sr.count) log('INFO', 'o.s.j.d.init.ScriptUtils', `Executed SQL script from file [data.sql] — ${sr.count} row(s)`, { dim: true });
  log('INFO', 'o.s.boot.tomcat.TomcatWebServer', `Tomcat started on port ${cfg.port} (http) with context path '/'`);
  log('INFO', abbr(appF), `Started ${rb.app.name} in 2.317 seconds (process running for 2.81)`);
  return { ok: true, items, ctx: { model, rb, web, cfg, db, port: cfg.port, first: true, files } };
}

Object.assign(IDE, { BANNER, boot, newDb, runSql });
})();
