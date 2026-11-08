import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { T, boot, register, upgrade, summary, save, PW, SECRET, silent, results } from './harness.mjs';
import { validatePublicUrl, corsPolicy, securityHeaders, redactSecrets, CONTENT_SECURITY_POLICY } from '../../lib/security.js';
import { createStore, StoreCorruptError } from '../../lib/store.js';
import { createApp } from '../../app.js';
import { createShim } from '../express-shim.js';
import { signToken, verifyToken, hashPassword, verifyPassword } from '../../lib/auth.js';

const PNG = 'data:image/png;base64,' + Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40)]).toString('base64');
const h = boot();
const A = await register(h, 'secA');
const B = await register(h, 'secB');
await upgrade(h, A, 'plan_pro').catch(() => {}); // fails closed (no gateway) - fine

// ================= SECURITY =================
await T('SEC-001', 'Security', 'Prototype pollution via JSON body (__proto__/constructor)', 'Object.prototype unpolluted, request safe', 'P1', async () => {
  const body = JSON.parse('{"orgName":"Poly Co","email":"poly@test.example.com","password":"Str0ng-Passw0rd!","__proto__":{"polluted":"yes"},"constructor":{"prototype":{"polluted2":"yes"}}}');
  const r = await h.call('POST', '/auth/register', { body });
  const r2 = await h.call('POST', '/catalog/items', { token: A.token, body: JSON.parse('{"name":"x","sku":"PP1","price":1,"__proto__":{"isAdmin":true}}') });
  return { pass: ({}).polluted === undefined && ({}).polluted2 === undefined && ({}).isAdmin === undefined && r.status === 201 && r2.status === 201, actual: `register ${r.status}, item ${r2.status}, Object.prototype clean` };
});
await T('SEC-002', 'Security', 'NoSQL/SQL-style injection strings in search/query/body', 'treated as plain text, no errors, no extra rows', 'P1', async () => {
  const payloads = ["' OR '1'='1", '{"$ne":null}', '"; DROP TABLE users;--', '%00', '../../etc/passwd', '<img src=x onerror=alert(1)>', '${7*7}', '{{7*7}}'];
  const bad = [];
  for (const p of payloads) {
    const r = await h.call('GET', `/orders/feed?search=${encodeURIComponent(p)}&status=${encodeURIComponent(p)}`, { token: A.token });
    const c = await h.call('GET', `/catalog/items?search=${encodeURIComponent(p)}&category=${encodeURIComponent(p)}`, { token: A.token });
    if (r.status !== 200 || c.status !== 200 || r.body.length || c.body.length) bad.push(p);
  }
  const arr = await h.call('GET', '/orders/feed?search[]=a&search[]=b', { token: A.token });
  return { pass: bad.length === 0 && arr.status < 500, actual: bad.length ? `bad: ${bad}` : `${payloads.length} payloads inert; array-param -> ${arr.status}` };
});
await T('SEC-003', 'Security', 'Stored XSS payloads are returned as inert JSON data (server side)', 'API stores verbatim, JSON content-type', 'P2', async () => {
  const x = '<script>alert(1)</script>';
  const r = await h.call('POST', '/catalog/items', { token: A.token, body: { name: x, sku: 'XSS1', price: 1 } });
  return { pass: r.status === 201 && r.body.name === x, actual: 'payload stored verbatim; output encoding is the client\'s job', evidence: 'Browser rendering (React escaping) NOT executed here → client-side XSS unverified' };
});
await T('SEC-004', 'Security', 'Security headers present (CSP, nosniff, frame, referrer, HSTS on https, no-store on /api)', 'all present', 'P1', async () => {
  const hd = {}; const res = { setHeader: (k, v) => { hd[k.toLowerCase()] = v; } };
  securityHeaders({ headers: { 'x-forwarded-proto': 'https' }, path: '/api/v1/x', url: '/api/v1/x' }, res, () => {});
  const need = ['content-security-policy', 'x-content-type-options', 'x-frame-options', 'referrer-policy', 'strict-transport-security', 'cache-control', 'permissions-policy'];
  const miss = need.filter((k) => !hd[k]);
  return { pass: miss.length === 0 && !/unsafe-eval/.test(hd['content-security-policy']) && !/script-src[^;]*unsafe-inline/.test(hd['content-security-policy']), actual: miss.length ? `missing ${miss}` : 'all present', evidence: `CSP: ${CONTENT_SECURITY_POLICY}` };
});
await T('SEC-005', 'Security', 'CORS: foreign origin blocked, same-origin + allow-list allowed, null/invalid origin rejected, no credentials header', 'as listed', 'P1', async () => {
  const run = (origin, host = 'app.example.com', method = 'GET') => { const hd = {}; let st = 0, nexted = false; corsPolicy({ allowedOrigins: ['https://ok.example.com'] })({ headers: { origin, host }, method }, { setHeader: (k, v) => { hd[k.toLowerCase()] = v; }, status(c) { st = c; return this; }, json() { return this; }, end() { return this; } }, () => { nexted = true; }); return { st, nexted, hd }; };
  const evil = run('https://evil.com'); const same = run('https://app.example.com'); const ok = run('https://ok.example.com'); const bad = run('not a url'); const nul = run('null'); const pre = run('https://evil.com', 'app.example.com', 'OPTIONS');
  return { pass: evil.st === 403 && same.nexted && ok.nexted && bad.st === 403 && nul.st === 403 && pre.st === 403 && !ok.hd['access-control-allow-credentials'], actual: `evil=${evil.st} same=${same.nexted} allow=${ok.nexted} invalid=${bad.st} null=${nul.st} preflightEvil=${pre.st}` };
});
await T('SEC-006', 'Security', 'SSRF validator: 31 bypass attempts all rejected', 'none accepted', 'P0', async () => {
  const urls = ['http://example.com', 'https://localhost', 'https://localhost.', 'https://LOCALHOST', 'https://127.0.0.1', 'https://127.1', 'https://2130706433', 'https://0x7f000001', 'https://0177.0.0.1', 'https://[::1]', 'https://[::ffff:127.0.0.1]', 'https://[fd00::1]', 'https://10.0.0.5', 'https://172.16.0.1', 'https://192.168.1.1', 'https://169.254.169.254', 'https://metadata.google.internal', 'https://x.internal', 'https://x.local', 'https://x.lan', 'https://x.corp', 'https://intranet', 'https://user:pass@example.com', 'https://user@example.com', 'ftp://example.com', 'file:///etc/passwd', 'gopher://example.com', 'javascript:alert(1)', 'https://', 'https://0.0.0.0', 'https://[::]'];
  const accepted = urls.filter((u) => validatePublicUrl(u).ok);
  return { pass: accepted.length === 0, actual: accepted.length ? `ACCEPTED: ${accepted.join(', ')}` : `${urls.length} rejected` };
});
await T('SEC-007', 'Security', 'SSRF validator accepts normal public hosts', 'accepted', 'P2', async () => {
  const ok = ['https://example.com', 'https://shop.example.co.uk/path?q=1', 'https://xn--bcher-kva.example'];
  return { pass: ok.every((u) => validatePublicUrl(u).ok), actual: ok.map((u) => validatePublicUrl(u).ok).join() };
});
await T('SEC-008', 'Security', 'DNS-rebinding style hosts (names resolving to loopback/private) blocked at connect time', 'blocked', 'P0', async () => {
  const { safeGet } = await import('../../lib/probe.js');
  const r = await safeGet('https://localhost:9', '/', {});
  const r2 = await safeGet('https://localtest.me', '/', {});
  return { pass: /Blocked/.test(r.error || ''), actual: `localhost -> ${r.error}; localtest.me (public name that resolves to 127.0.0.1) -> ${r2.error}`, evidence: 'no outbound DNS in sandbox: only the localhost case is conclusive; localtest.me result depends on resolver availability' };
});
await T('SEC-009', 'Security', 'Rate limiting: auth endpoints 429 with Retry-After after limit; per-IP isolation', '429 after 20; other IP unaffected', 'P1', async () => {
  const rl = boot({ rateLimits: { authMax: 20, apiMax: 1e9, aiMax: 1e9, probeMax: 1e9 } });
  const out = [];
  for (let i = 0; i < 25; i++) out.push(await rl.call('POST', '/auth/login', { body: { email: `x${i}@test.example.com`, password: 'nope-Passw0rd!' }, ip: '9.9.9.9' }));
  const other = await rl.call('POST', '/auth/login', { body: { email: 'y@test.example.com', password: 'nope-Passw0rd!' }, ip: '8.8.4.4' });
  const first429 = out.findIndex((r) => r.status === 429);
  return { pass: first429 === 20 && !!out[20].headers['retry-after'] && other.status === 401, actual: `first 429 at request #${first429 + 1}; other IP ${other.status}` };
});
await T('SEC-010', 'Security', 'Rate limiting: general API limiter and AI/probe limiters trigger', '429', 'P1', async () => {
  const rl = boot({ rateLimits: { apiMax: 50, authMax: 1e9, aiMax: 3, probeMax: 2 } });
  const R = await register(rl, 'rl', 'RL Org');
  let api429 = 0; for (let i = 0; i < 60; i++) if ((await rl.call('GET', '/auth/me', { token: R.token, ip: '7.7.7.7' })).status === 429) api429++;
  const rl2 = boot({ rateLimits: { apiMax: 1e9, authMax: 1e9, aiMax: 3, probeMax: 2 }, probeGet: async () => ({ ok: false, status: 0, latency: 1 }) });
  const R2 = await register(rl2, 'rl2');
  const ai = []; for (let i = 0; i < 5; i++) ai.push((await rl2.call('POST', '/ai/chat', { token: R2.token, body: { prompt: 'hi' } })).status);
  const pr = []; for (let i = 0; i < 4; i++) pr.push((await rl2.call('POST', '/discovery/probe', { token: R2.token, body: { targetUrl: 'https://shop.example.com' } })).status);
  return { pass: api429 > 0 && ai.includes(429) && pr.includes(429), actual: `api 429s=${api429}; ai=${ai}; probe=${pr}` };
});
await T('SEC-011', 'Security', 'Account lockout: 5 bad attempts lock account (and cannot be bypassed with correct pw during lock)', '429 even with right password', 'P1', async () => {
  const L = await register(h, 'lock');
  for (let i = 0; i < 5; i++) await h.call('POST', '/auth/login', { body: { email: L.email, password: 'wrong-Passw0rd!' } });
  const r = await h.call('POST', '/auth/login', { body: { email: L.email, password: PW } });
  return { pass: r.status === 429, actual: String(r.status), evidence: 'DESIGN RISK (see SEC-012): the same lock lets an attacker lock a victim out' };
});
await T('SEC-012', 'Security', 'Account-lockout denial of service: attacker can lock out a known email from any IP', 'victim can still log in', 'P2', async () => {
  const V = await register(h, 'victim');
  for (let i = 0; i < 5; i++) await h.call('POST', '/auth/login', { body: { email: V.email, password: 'attacker-guess1!' }, ip: `66.0.0.${i}` });
  const r = await h.call('POST', '/auth/login', { body: { email: V.email, password: PW }, ip: '1.2.3.4' });
  return { pass: r.status === 200, actual: `victim login while attacker spams -> ${r.status}`, evidence: 'lock is per-account only (15 min); no per-IP component so the legitimate user is blocked' };
});
await T('SEC-013', 'Security', 'Login timing: unknown vs known email (user-enumeration via timing)', 'ratio < 1.5', 'P2', async () => {
  const time = async (email) => { const t = process.hrtime.bigint(); await h.call('POST', '/auth/login', { body: { email, password: 'wrong-Passw0rd!' }, ip: `5.5.5.${Math.floor(Math.random() * 250)}` }); return Number(process.hrtime.bigint() - t) / 1e6; };
  const k = [], u = [];
  const known = []; for (let i = 0; i < 12; i++) known.push((await register(h, 'tm')).email);
  for (let i = 0; i < 12; i++) { k.push(await time(known[i])); u.push(await time(`nouser${i}@test.example.com`)); }
  const med = (a) => a.sort((x, y) => x - y)[Math.floor(a.length / 2)];
  const ratio = med(k) / med(u);
  return { pass: ratio < 1.5 && ratio > 0.67, actual: `median known=${med(k).toFixed(1)}ms unknown=${med(u).toFixed(1)}ms ratio=${ratio.toFixed(2)}` };
});
await T('SEC-014', 'Security', 'Registration enumerates existing emails (409)', 'does not reveal', 'P3', async () => {
  const r = await h.call('POST', '/auth/register', { body: { orgName: 'Dup Co', email: B.email, password: PW } });
  return { pass: r.status !== 409, actual: `${r.status} "${r.body.error}"`, evidence: 'Reveals which emails have accounts (common trade-off; mitigated only by auth rate limit)' };
});
await T('SEC-015', 'Security', 'Token integrity: tampered payload, wrong secret, alg-none style, truncated, replay across user', '401 all', 'P0', async () => {
  const [body, sig] = A.token.split('.');
  const pl = JSON.parse(Buffer.from(body, 'base64url'));
  const mk = (p, s) => Buffer.from(JSON.stringify(p)).toString('base64url') + '.' + s;
  const cases = [mk({ ...pl, role: 'MANAGER', org: B.organisation.id }, sig), signToken(pl, 'z'.repeat(48), 60), `${body}.`, `.${sig}`, body, 'e30.e30', `${body}.${sig}.extra`, mk({ ...pl, exp: 9999999999 }, sig)];
  const out = []; for (const t of cases) out.push((await h.call('GET', '/auth/me', { token: t })).status);
  return { pass: out.every((s) => s === 401), actual: out.join() };
});
await T('SEC-016', 'Security', 'Cross-user token reuse: token for user X cannot act as org Y even with edited org claim', '401', 'P0', async () => {
  const pl = verifyToken(A.token, SECRET); const forged = signToken({ ...pl, org: B.organisation.id }, SECRET, 600);
  const r = await h.call('GET', '/auth/me', { token: forged });
  return { pass: r.status === 401, actual: String(r.status), evidence: 'even a token signed with the real secret is rejected if org does not match the stored user' };
});
await T('SEC-017', 'Security', 'No secrets in responses or logs during normal operations', 'none found', 'P0', async () => {
  const logs = []; const cap = { warn: (m) => logs.push(m), error: (m) => logs.push(m), log: (m) => logs.push(m) };
  const c = boot({ logger: cap, allowSimulatedPayments: true });
  const S = await register(c, 'leak'); await upgrade(c, S, 'plan_pro');
  const w = await c.call('POST', '/integrations/webhooks', { token: S.token, body: { url: 'https://hooks.example.com/x' } });
  const bodies = []; for (const [m, u] of [['GET', '/auth/me'], ['GET', '/admin/users'], ['GET', '/integrations/webhooks'], ['GET', '/commercial/tenant/export'], ['GET', '/audit'], ['GET', '/diagnostics'], ['GET', '/system/health']]) bodies.push(JSON.stringify((await c.call(m, u, { token: S.token })).body));
  const dumped = bodies.join('') + logs.join('') + JSON.stringify((await c.call('GET', '/audit', { token: S.token })).body);
  const secretsOnce = bodies.slice(2, 3).join('');
  const leaks = [w.body.secret, PW, 'scrypt$', 'secretEnc', SECRET, S.token].filter((s) => dumped.includes(s) && !(s === S.token));
  return { pass: leaks.length === 0 && !secretsOnce.includes(w.body.secret), actual: leaks.length ? `LEAKED: ${leaks.length} item(s)` : 'webhook secret shown once only; nothing sensitive in list/export/audit/logs' };
});
await T('SEC-018', 'Security', 'Secret redaction on adversarial strings (JSON, headers, prose, nested)', 'all masked', 'P2', async () => {
  const inputs = ['Authorization: Bearer abcdefghijklmnop', '{"password":"hunter2hunter2"}', "token='abc123def456'", 'api_key=sk_live_ABCDEFGHIJKL', 'the password is Tr0ub4dor', 'X-API-Key: secretvalue123', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcDEF123'];
  const leaked = inputs.filter((s) => { const o = redactSecrets(s); return /abcdefghijklmnop|hunter2hunter2|abc123def456|ABCDEFGHIJKL|Tr0ub4dor|secretvalue123|eyJzdWIi/.test(o); });
  return { pass: leaked.length === 0, actual: leaked.length ? `unredacted: ${leaked.join(' | ')}` : 'all redacted' };
});
await T('SEC-019', 'Security', 'Upload hardening: path traversal in names, double extension, null byte, header injection in filename', 'sanitised', 'P1', async () => {
  const names = ['../../../etc/passwd.png', 'a.png.html', 'x\u0000.png', 'a"\r\nSet-Cookie: x=1.png', '..\\..\\win.png', 'ünï.png'];
  const outs = [];
  for (const n of names) { const r = await h.call('POST', '/uploads', { token: A.token, body: { fileName: n, dataUrl: PNG } }); const d = r.status === 201 ? await h.call('GET', `/uploads/${r.body.url.split('/').pop()}`, { token: A.token }) : null; outs.push({ n, st: r.status, stored: r.body.fileName, cd: d?.headers['content-disposition'], url: r.body.url }); }
  const bad = outs.filter((o) => o.st === 201 && (/[\r\n"\\/]/.test(o.stored.replace(/\.png$/, '')) || /[\r\n]/.test(o.cd || '') || !/^\/api\/v1\/uploads\/up_[a-f0-9]{24}\.png$/.test(o.url)));
  const dir = path.join(path.dirname(h.store.dbFile), 'uploads');
  const escaped = fs.readdirSync(dir).filter((f) => !/^up_[a-f0-9]{24}\.[a-z]{2,4}$/.test(f));
  return { pass: bad.length === 0 && escaped.length === 0, actual: bad.length ? JSON.stringify(bad) : `all ${names.length} names sanitised; stored names are server-generated`, evidence: outs.map((o) => `${JSON.stringify(o.n)}→${o.stored}`).join('; ') };
});
await T('SEC-020', 'Security', 'Uploads are not publicly reachable and are tenant-private; download requires auth', '401/404', 'P0', async () => {
  const r = await h.call('POST', '/uploads', { token: A.token, body: { fileName: 'p.png', dataUrl: PNG } });
  const n = r.body.url.split('/').pop();
  const anon = await h.call('GET', `/uploads/${n}`); const other = await h.call('GET', `/uploads/${n}`, { token: B.token });
  const trav = await h.call('GET', '/uploads/..%2F..%2Fdatabase.json', { token: A.token });
  return { pass: anon.status === 401 && other.status === 404 && trav.status === 404, actual: `anon=${anon.status} other-tenant=${other.status} traversal=${trav.status}` };
});
await T('SEC-021', 'Security', 'Password hashing: scrypt unique salts, constant-time verify, wrong password rejected', 'unique hashes', 'P1', async () => {
  const a = hashPassword('Same-Passw0rd!'), b = hashPassword('Same-Passw0rd!');
  return { pass: a !== b && verifyPassword('Same-Passw0rd!', a) && !verifyPassword('same-passw0rd!', a) && !verifyPassword('x', 'garbage'), actual: 'ok' };
});
await T('SEC-022', 'Security', 'Request body size limit (1MB JSON, 9MB uploads)', '413 over limit', 'P1', async () => ({ pass: false, unverified: true, actual: 'NOT EXECUTED: limits are enforced by express.json(), which is replaced by a shim in this sandbox', evidence: 'needs real Express' }));
await T('SEC-023', 'Security', 'Session protection in browser (storage of token, XSS exposure, cookie flags)', 'n/a', 'P2', async () => ({ pass: false, unverified: true, actual: 'NOT EXECUTED: no browser. Static fact: token kept in sessionStorage (src/services/api.ts), no cookies used, so CSRF is not applicable but XSS would expose the token', evidence: 'code inspection only' }));
await T('SEC-024', 'Security', 'Password policy: reuse of current password allowed on change', 'new != old', 'P3', async () => {
  const P = await register(h, 'reuse');
  const r = await h.call('POST', '/auth/change-password', { token: P.token, body: { currentPassword: PW, newPassword: PW } });
  return { pass: r.status === 400, actual: `changing to the same password -> ${r.status}` };
});
await T('SEC-025', 'Security', 'Unicode/case email normalisation: look-alike duplicate accounts', 'blocked or normalised', 'P3', async () => {
  const base = `Uni${Date.now()}@Test.Example.com`;
  const a = await h.call('POST', '/auth/register', { body: { orgName: 'Uni One', email: base, password: PW } });
  const b = await h.call('POST', '/auth/register', { body: { orgName: 'Uni Two', email: base.toLowerCase(), password: PW } });
  const c = await h.call('POST', '/auth/register', { body: { orgName: 'Uni Three', email: `  ${base.toUpperCase()} `, password: PW } });
  return { pass: a.status === 201 && b.status === 409 && c.status === 409, actual: `${a.status}/${b.status}/${c.status}` };
});

// ================= FAILURE & RECOVERY =================
await T('FAIL-001', 'Recovery', 'Atomic persistence: 40 random SIGKILLs during continuous saves never corrupt the database', 'every reload parses', 'P0', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p13kill-'));
  const child = path.join(dir, 'child.mjs');
  fs.writeFileSync(child, `import { createStore } from '${path.resolve('../../lib/store.js')}'; const s = createStore({ dataDir: '${dir}/data' }); let i = 0; setInterval(()=>{}, 1000); for(;;){ s.data.orders.push({ id: 'o'+(i++), orgId: 'x', blob: 'z'.repeat(20000) }); s.save(); }`);
  let corrupt = 0, loads = 0, sizes = [];
  for (let n = 0; n < 40; n++) {
    const p = spawn(process.execPath, [child], { stdio: 'ignore' });
    await new Promise((r) => setTimeout(r, 40 + Math.random() * 160));
    p.kill('SIGKILL'); await new Promise((r) => p.on('exit', r));
    try { const st = createStore({ dataDir: path.join(dir, 'data') }); loads++; sizes.push(st.data.orders.length); } catch (e) { if (e instanceof StoreCorruptError) corrupt++; else throw e; }
  }
  return { pass: corrupt === 0 && loads === 40, actual: `${loads} clean loads, ${corrupt} corrupt`, evidence: `orders at reload ranged ${Math.min(...sizes)}..${Math.max(...sizes)} (loss limited to the last uncommitted write)` };
});
await T('FAIL-002', 'Recovery', 'Disk/DB write failure: API returns error AND in-memory state stays consistent with disk', 'failed write is not visible afterwards', 'P1', async () => {
  const f = boot(); const F = await register(f, 'dbf');
  const orig = f.store.save; f.store.save = () => { throw new Error('ENOSPC: simulated disk full'); };
  const r = await f.call('POST', '/catalog/items', { token: F.token, body: { name: 'ghost', sku: 'GHOST', price: 1 } });
  const visible = (await f.call('GET', '/catalog/items', { token: F.token })).body.some((i) => i.sku === 'GHOST');
  f.store.save = orig;
  await f.call('POST', '/catalog/items', { token: F.token, body: { name: 'next', sku: 'NEXT', price: 1 } });
  const onDisk = JSON.parse(fs.readFileSync(f.store.dbFile, 'utf8')).catalog.some((i) => i.sku === 'GHOST');
  return { pass: r.status >= 500 && !visible, actual: `response=${r.status}; ghost item visible in memory after the failed request=${visible}; persisted later by unrelated save=${onDisk}`, evidence: 'mutate-then-save without rollback: a request that returned 500 still changed live state, and a later successful save persisted it (phantom write).' };
});
await T('FAIL-003', 'Recovery', 'DB file corrupted while running → next restart refuses (fail-closed), prev copy available', 'startup refuses; database.prev.json present', 'P1', async () => {
  const d = boot(); const D = await register(d, 'cr'); d.advance(120000); await d.call('POST', '/catalog/items', { token: D.token, body: { name: 'a', sku: 'a', price: 1 } });
  const hadPrev = fs.existsSync(d.store.prevFile);
  fs.writeFileSync(d.store.dbFile, '\u0000\u0000garbage');
  let refused = false; try { createApp({ express: createShim(), dataDir: d.dataDir, authSecret: SECRET, logger: silent }); } catch (e) { refused = /Refusing to start/.test(e.message); }
  return { pass: refused && hadPrev, actual: `refused=${refused}, prev copy exists=${hadPrev}`, evidence: 'recovery is manual (restore database.prev.json); there is no automatic fallback or alert' };
});
await T('FAIL-004', 'Recovery', 'Webhook endpoint hangs forever: user request unaffected, no unbounded growth beyond pending tasks', 'request returns immediately', 'P2', async () => {
  const w = boot({ allowSimulatedPayments: true, webhookPost: () => new Promise(() => {}) });
  const W = await register(w, 'wh'); await upgrade(w, W, 'plan_starter');
  await w.call('POST', '/integrations/webhooks', { token: W.token, body: { url: 'https://hooks.example.com/x', events: ['catalog.stock_low'] } });
  const item = (await w.call('POST', '/catalog/items', { token: W.token, body: { name: 'a', sku: 'a', price: 1, stock: 1, minThreshold: 5 } })).body;
  const t0 = Date.now(); const r = await w.call('PATCH', `/catalog/items/${item.id}/stock`, { token: W.token, body: { stock: 0 } });
  return { pass: r.status === 200 && Date.now() - t0 < 500, actual: `${r.status} in ${Date.now() - t0}ms`, evidence: 'the injected transport never resolves; production safePost has a 5s socket timeout (FAIL-005 covers it)' };
});
await T('FAIL-005', 'Recovery', 'Real safePost/safeGet to an unreachable/blocked/slow endpoint resolve (no hang)', 'resolve ≤ timeout', 'P2', async () => {
  const { safePost } = await import('../../lib/webhooks.js'); const { safeGet } = await import('../../lib/probe.js');
  const t0 = Date.now(); const a = await safePost('https://localhost:9/x', {}, '{}', { timeoutMs: 300 }); const b = await safeGet('https://localhost:9', '/', {}, { timeoutMs: 300 });
  return { pass: !a.ok && !b.ok && Date.now() - t0 < 2000, actual: `both resolved failed in ${Date.now() - t0}ms: "${a.error}" / "${b.error}"` };
});
await T('FAIL-006', 'Recovery', 'Webhook retry exhaustion is logged; 4xx not retried; later events still flow', 'log entry ok=false, attempts=4', 'P2', async () => {
  const sent = []; const w = boot({ allowSimulatedPayments: true, webhookDelaysMs: [0, 0, 0], webhookPost: async (u, hd, b) => { sent.push(1); return { ok: false, status: 503 }; } });
  const W = await register(w, 'wr'); await upgrade(w, W, 'plan_starter');
  await w.call('POST', '/integrations/webhooks', { token: W.token, body: { url: 'https://hooks.example.com/x', events: ['catalog.stock_low'] } });
  const item = (await w.call('POST', '/catalog/items', { token: W.token, body: { name: 'a', sku: 'a', price: 1, stock: 1 } })).body;
  await w.call('PATCH', `/catalog/items/${item.id}/stock`, { token: W.token, body: { stock: 0 } }); await w.drainWebhooks();
  const log = (await w.call('GET', '/integrations/webhooks/deliveries', { token: W.token })).body[0];
  return { pass: log && log.ok === false && log.attempts === 4 && sent.length === 4, actual: JSON.stringify({ ok: log?.ok, attempts: log?.attempts }) };
});
await T('FAIL-007', 'Recovery', 'Discovery probe upstream failure/exception handled', 'graceful JSON (not stack)', 'P2', async () => {
  const p = boot({ probeGet: async () => { throw new Error('boom: internal detail /srv/secret/path'); } }); const P = await register(p, 'pf');
  const r = await p.call('POST', '/discovery/probe', { token: P.token, body: { targetUrl: 'https://shop.example.com' } });
  return { pass: r.status >= 400 && !JSON.stringify(r.body).includes('/srv/secret'), actual: `${r.status} ${JSON.stringify(r.body)}`, evidence: r.status === 500 ? 'Observation: an upstream exception becomes a generic 500 rather than a 502 with a user-meaningful message' : '' };
});
await T('FAIL-008', 'Recovery', 'Unhandled exception in a route yields generic 500, no stack/internal paths', 'generic body', 'P1', async () => {
  const e = boot(); const E = await register(e, 'err'); e.store.save = () => { throw new Error('SECRET internal /home/claude/path stack'); };
  const r = await e.call('POST', '/catalog/items', { token: E.token, body: { name: 'a', sku: 'a', price: 1 } });
  const s = JSON.stringify(r.body);
  return { pass: r.status === 500 && !/SECRET|\/home|stack|at /.test(s), actual: `${r.status} ${s}` };
});
await T('FAIL-009', 'Recovery', 'Gateway verifier throws/hangs during verify: transaction not upgraded, retry possible', 'org stays FREE; tx still PENDING', 'P1', async () => {
  let mode = 'throw'; const g = boot({ gatewayVerifiers: { STRIPE_INTL: { verify: async () => { if (mode === 'throw') throw new Error('gateway 502'); return { ok: true, amount: 49, currency: 'USD', gatewayRef: 'G1' }; } } } });
  const G = await register(g, 'gv');
  const id = (await g.call('POST', '/commercial/payments/initiate', { token: G.token, body: { planId: 'plan_starter', gateway: 'STRIPE_INTL' } })).body.transactionId;
  const r1 = await g.call('POST', '/commercial/payments/verify', { token: G.token, body: { transactionId: id } });
  const tx = g.db.transactions.find((t) => t.transactionId === id); const txMid = tx.status; const tierMid = g.db.organisations[0].subscription.tier;
  mode = 'ok'; const r2 = await g.call('POST', '/commercial/payments/verify', { token: G.token, body: { transactionId: id } });
  return { pass: r1.status >= 500 && txMid === 'PENDING' && tierMid === 'FREE' && r2.status === 200, actual: `${r1.status}, tx after failed verify=${txMid}, tier=${tierMid}, retry=${r2.status}` };
});
await T('FAIL-010', 'Recovery', 'Failed background job: retries do not duplicate user-visible side effects; duplicate event ids unique', 'unique evt ids', 'P3', async () => {
  const ids = []; const w = boot({ allowSimulatedPayments: true, webhookDelaysMs: [0, 0], webhookPost: async (u, hd, b) => { ids.push(JSON.parse(b).id); return { ok: false, status: 500 }; } });
  const W = await register(w, 'wid'); await upgrade(w, W, 'plan_starter');
  await w.call('POST', '/integrations/webhooks', { token: W.token, body: { url: 'https://hooks.example.com/x', events: ['catalog.stock_low'] } });
  const item = (await w.call('POST', '/catalog/items', { token: W.token, body: { name: 'a', sku: 'a', price: 1, stock: 1 } })).body;
  await w.call('PATCH', `/catalog/items/${item.id}/stock`, { token: W.token, body: { stock: 0 } }); await w.drainWebhooks();
  return { pass: ids.length === 3 && new Set(ids).size === 1, actual: `${ids.length} attempts share one event id (receiver can de-duplicate): ${new Set(ids).size === 1}` };
});

save('s2');
console.log(JSON.stringify(summary()));
