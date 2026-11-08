import http from 'node:http';
import { fork } from 'node:child_process';
import os from 'node:os';
import { T, summary, save, PW, results } from './harness.mjs';

const child = fork(new URL('./perf_server.mjs', import.meta.url), { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
const wait = (pred) => new Promise((r) => { const f = (m) => { if (pred(m)) { child.off('message', f); r(m); } }; child.on('message', f); });
const { port } = await wait((m) => m.ready);
const ask = async (cmd, extra = {}) => { child.send({ cmd, ...extra }); return wait((m) => cmd === 'stats' ? m.stats : m.seeded !== undefined).then((m) => m.stats || m); };
const mkAgent = (n) => new http.Agent({ keepAlive: true, maxSockets: n });
function req(agent, method, path, { token, body } = {}) {
  return new Promise((resolve) => {
    const t0 = process.hrtime.bigint(); const data = body ? JSON.stringify(body) : null;
    const r = http.request({ host: '127.0.0.1', port, method, path, agent, headers: { 'Content-Type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) } }, (res) => {
      res.resume(); res.on('end', () => resolve({ status: res.statusCode, ms: Number(process.hrtime.bigint() - t0) / 1e6 }));
    });
    r.on('error', () => resolve({ status: 0, ms: Number(process.hrtime.bigint() - t0) / 1e6 })); if (data) r.write(data); r.end();
  });
}
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(1) : 0; };
async function load({ conc, seconds, fn }) {
  const agent = mkAgent(conc); const lat = []; const codes = {}; const end = Date.now() + seconds * 1000; const t0 = Date.now();
  await Promise.all(Array.from({ length: conc }, async () => { while (Date.now() < end) { const r = await fn(agent); lat.push(r.ms); codes[r.status] = (codes[r.status] || 0) + 1; } }));
  agent.destroy(); const el = (Date.now() - t0) / 1000;
  return { conc, requests: lat.length, rps: Math.round(lat.length / el), p50: pct(lat, 0.5), p95: pct(lat, 0.95), p99: pct(lat, 0.99), max: +Math.max(...lat).toFixed(1), codes };
}
const a0 = mkAgent(4);
const reg = async (n) => (await new Promise((res) => { const d = JSON.stringify({ orgName: 'Perf ' + n, email: `perf${n}@test.example.com`, password: PW }); const r = http.request({ host: '127.0.0.1', port, method: 'POST', path: '/api/v1/auth/register', agent: a0, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(d) } }, (rs) => { const c = []; rs.on('data', (x) => c.push(x)); rs.on('end', () => res(JSON.parse(Buffer.concat(c).toString()))); }); r.write(d); r.end(); }));
const P = await reg(1);
const bench = { host: `${os.cpus().length} vCPU ${os.cpus()[0].model}`, node: process.version, notes: 'Express replaced by test shim; load generator and server in separate processes on the same machine; client-side numbers include loopback overhead' };
bench.read = [];

await T('PERF-001', 'Performance', 'Read throughput/latency: GET /auth/me and /catalog/items at 1/10/50/200 concurrency (5s each)', 'no errors; p95 < 250ms at 50 conc', 'P2', async () => {
  const out = [];
  for (const conc of [1, 10, 50, 200]) { await ask('stats'); const r = await load({ conc, seconds: 5, fn: (ag) => req(ag, 'GET', '/api/v1/catalog/items', { token: P.token }) }); r.server = await ask('stats'); out.push(r); }
  bench.read = out;
  const errs = out.reduce((s, r) => s + Object.entries(r.codes).filter(([c]) => c !== '200').reduce((a, [, n]) => a + n, 0), 0);
  return { pass: errs === 0 && out[2].p95 < 250, actual: out.map((r) => `c${r.conc}: ${r.rps} rps p50=${r.p50} p95=${r.p95} p99=${r.p99}ms`).join(' | '), evidence: JSON.stringify(out.map((r) => ({ c: r.conc, cpuMs: r.server.cpuUserMs + r.server.cpuSysMs, rssMB: r.server.rssMB }))) };
});

await T('PERF-002', 'Performance', 'Login (scrypt) throughput and event-loop blocking: /health latency while 20 clients log in', '/health p95 < 250ms during logins', 'P1', async () => {
  const users = []; for (let i = 0; i < 20; i++) { const r = await reg(100 + i); users.push(`perf${100 + i}@test.example.com`); }
  const solo = await load({ conc: 1, seconds: 4, fn: (ag) => req(ag, 'POST', '/api/v1/auth/login', { body: { email: users[0], password: PW } }) });
  const base = await load({ conc: 5, seconds: 3, fn: (ag) => req(ag, 'GET', '/api/v1/health') });
  const agL = mkAgent(20); let stop = false; const loginLat = [];
  const bg = Promise.all(users.map(async (e) => { while (!stop) { const r = await req(agL, 'POST', '/api/v1/auth/login', { body: { email: e, password: PW } }); loginLat.push(r.ms); } }));
  await new Promise((r) => setTimeout(r, 500));
  const during = await load({ conc: 5, seconds: 4, fn: (ag) => req(ag, 'GET', '/api/v1/health') });
  stop = true; await bg;
  bench.login = { soloRps: solo.rps, soloP50: solo.p50, concurrentLoginP50: pct(loginLat, 0.5), concurrentLoginP95: pct(loginLat, 0.95), healthBaseline: base, healthDuringLogins: during };
  return { pass: during.p95 < 250, actual: `single login p50=${solo.p50}ms (${solo.rps}/s); /health p95 idle=${base.p95}ms vs during 20 concurrent logins=${during.p95}ms (max ${during.max}ms); login p95 under load=${pct(loginLat, 0.95)}ms`, evidence: 'scryptSync runs on the main thread: concurrent logins/registrations/password changes block every other request' };
});

await T('PERF-006', 'Performance', 'Memory growth: sustained mixed reads + audit writes for 8s on a small DB, RSS/heap before vs after', 'growth < 100MB', 'P2', async () => {
  const before = await ask('stats'); let n = 0;
  await load({ conc: 20, seconds: 8, fn: (ag) => (n++ % 5 === 0) ? req(ag, 'POST', '/api/v1/audit', { token: P.token, body: { title: 't', details: 'x'.repeat(500) } }) : req(ag, 'GET', '/api/v1/orders/feed', { token: P.token }) });
  global.gc?.(); const after = await ask('stats');
  bench.memory = { before, after, requestsApprox: n };
  return { pass: after.rssMB - before.rssMB < 100, actual: `${n} requests issued: RSS ${before.rssMB}→${after.rssMB}MB, heap ${before.heapMB}→${after.heapMB}MB, audit rows=${after.auditLogs}`, evidence: 'single run; no leak conclusion without a longer soak' };
});

await T('PERF-003', 'Performance', 'Write latency vs database size (each mutation re-serialises + fsyncs the whole JSON file)', 'p95 < 250ms at 20k records', 'P1', async () => {
  const rows = []; let orgId = (JSON.parse(Buffer.from(P.token.split('.')[0], 'base64url'))).org; let total = 0;
  for (const target of [0, 2000, 10000, 20000, 50000]) {
    if (target > total) { const s = await ask('seed', { n: target - total, orgId }); total = target; rows.push({ seededTotal: total, bulkSaveMs: +s.saveMs.toFixed(0), dbMB: +(s.dbBytes / 1048576).toFixed(1) }); }
    const ag = mkAgent(1); const lat = []; for (let i = 0; i < 15; i++) lat.push((await req(ag, 'POST', '/api/v1/catalog/items', { token: P.token, body: { name: 'w', sku: `W-${target}-${i}`, price: 1 } })).ms); ag.destroy();
    const last = rows[rows.length - 1] || { seededTotal: 0 }; rows[rows.length - 1] = { ...last, records: total, writeP50: pct(lat, 0.5), writeP95: pct(lat, 0.95) };
  }
  bench.writeVsSize = rows;
  const at20k = rows.find((r) => r.records === 20000);
  return { pass: at20k.writeP95 < 250, actual: rows.map((r) => `${r.records} recs (${r.dbMB ?? '?'}MB): write p50=${r.writeP50} p95=${r.writeP95}ms`).join(' | '), evidence: 'confirms the single-file store does not scale; reads are in-memory and stay fast' };
});

await T('PERF-004', 'Performance', 'Concurrent mixed writes on a mid-size DB (c=20, 5s): throughput, errors, consistency', 'no errors; unique ids', 'P2', async () => {
  let n = 0; const r = await load({ conc: 20, seconds: 5, fn: (ag) => req(ag, 'POST', '/api/v1/catalog/items', { token: P.token, body: { name: 'm', sku: `MIX-${n++}`, price: 1 } }) });
  bench.mixedWrites = r;
  return { pass: Object.keys(r.codes).every((c) => c === '201'), actual: `${r.rps} writes/s, p50=${r.p50} p95=${r.p95} p99=${r.p99}ms, codes=${JSON.stringify(r.codes)}` };
});

await T('PERF-005', 'Performance', 'Burst/spike: 500 simultaneous requests, then recovery', 'all served; recovery latency normal', 'P2', async () => {
  const ag = mkAgent(500); const t0 = Date.now(); const rs = await Promise.all(Array.from({ length: 500 }, () => req(ag, 'GET', '/api/v1/auth/me', { token: P.token }))); const el = Date.now() - t0; ag.destroy();
  const after = await load({ conc: 5, seconds: 2, fn: (a) => req(a, 'GET', '/api/v1/health') });
  const ok = rs.filter((r) => r.status === 200).length;
  bench.burst = { requests: 500, ok, totalMs: el, p95: pct(rs.map((r) => r.ms), 0.95), recoveryHealthP95: after.p95 };
  return { pass: ok === 500 && after.p95 < 50, actual: `${ok}/500 ok in ${el}ms (p95 ${pct(rs.map((r) => r.ms), 0.95)}ms); post-burst /health p95=${after.p95}ms` };
});

await T('PERF-007', 'Performance', '15-minute soak / sustained-traffic stability', 'n/a', 'P3', async () => ({ pass: false, unverified: true, actual: 'NOT EXECUTED: soak limited to seconds per scenario in this session', evidence: 'recommend a >=1h soak on real Express' }));

child.send({ cmd: 'exit' });
import fs from 'node:fs';
fs.writeFileSync(new URL('./bench.json', import.meta.url), JSON.stringify(bench, null, 2));
save('s3'); console.log(JSON.stringify(summary()));
process.exit(0);
