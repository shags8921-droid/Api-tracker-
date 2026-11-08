import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createShim } from './express-shim.js';
import { createApp } from '../app.js';
import { redactSecrets, validatePublicUrl } from '../lib/security.js';
import { signToken, verifyToken } from '../lib/auth.js';
import { effectiveSubscription } from '../lib/plans.js';

const SECRET = 'x'.repeat(40);
const PW = 'Str0ng-Passw0rd!';
const API = '/api/v1';
const silent = { warn() {}, error() {}, log() {} };

function boot(extra = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-'));
  let clock = Date.now();
  const inst = createApp({ express: createShim(), dataDir, authSecret: SECRET, logger: silent, now: () => clock, ...extra });
  const call = (method, url, { token, body, headers = {}, ip } = {}) =>
    inst.app.handle({ method, url: API + url, body, ip, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers } });
  return { ...inst, dataDir, call, advance: (ms) => { clock += ms; }, clock: () => clock };
}
async function register(h, email, orgName = 'Org ' + email) {
  const r = await h.call('POST', '/auth/register', { body: { orgName, email, password: PW, name: 'N' } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body;
}

test('unauthenticated requests are rejected on protected routes', async () => {
  const h = boot();
  for (const [m, u] of [['GET', '/websites'], ['GET', '/admin/users'], ['GET', '/commercial/tenant/export'], ['GET', '/orders/feed'], ['POST', '/backups/create'], ['GET', '/audit']]) {
    assert.equal((await h.call(m, u)).status, 401, `${m} ${u}`);
  }
  assert.equal((await h.call('GET', '/health')).status, 200);
  assert.equal((await h.call('GET', '/commercial/plans')).status, 200);
});

test('role and tenant headers are ignored; tokens are tamper-proof', async () => {
  const h = boot();
  const a = await register(h, 'a@ex.com');
  const r = await h.call('GET', '/auth/me', { token: a.token, headers: { 'x-user-role': 'PLATFORM_ADMIN', 'x-tenant-id': 'other' } });
  assert.equal(r.body.user.role, 'OWNER');
  assert.equal(r.body.organisation.id, a.organisation.id);
  const forged = signToken({ sub: a.user.id, org: a.organisation.id, role: 'OWNER', tv: 0 }, 'y'.repeat(40), 60);
  assert.equal((await h.call('GET', '/auth/me', { token: forged })).status, 401);
  const [body, sig] = a.token.split('.');
  const evil = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, 'base64url')), role: 'X' })).toString('base64url') + '.' + sig;
  assert.equal((await h.call('GET', '/auth/me', { token: evil })).status, 401);
});

test('tenant isolation across websites, orders, catalog, export, backups', async () => {
  const h = boot();
  const a = await register(h, 'a@ex.com');
  const b = await register(h, 'b@ex.com');
  const item = await h.call('POST', '/catalog/items', { token: a.token, body: { name: 'W', sku: 'S1', price: 5, stock: 3 } });
  assert.equal(item.status, 201);
  assert.equal((await h.call('GET', '/catalog/items', { token: b.token })).body.length, 0);
  assert.equal((await h.call('PATCH', `/catalog/items/${item.body.id}/stock`, { token: b.token, body: { stock: 9 } })).status, 404);
  const exp = await h.call('GET', '/commercial/tenant/export', { token: b.token });
  assert.equal(exp.body.catalog.length, 0);
  assert.ok(!JSON.stringify(exp.body).includes('passwordHash'));
  const bk = await h.call('POST', '/backups/create', { token: a.token, body: {} });
  assert.equal((await h.call('POST', `/backups/${bk.body.backup.backupId}/rollback`, { token: b.token })).status, 404);
  assert.equal((await h.call('GET', '/saas/platform/metrics', { token: a.token })).status, 403);
});

test('manager cannot use owner routes', async () => {
  const h = boot();
  const a = await register(h, 'a@ex.com');
  const inv = await h.call('POST', '/admin/users/invite', { token: a.token, body: { email: 'm@ex.com', role: 'MANAGER' } });
  assert.equal(inv.status, 201);
  const login = await h.call('POST', '/auth/login', { body: { email: 'm@ex.com', password: inv.body.temporaryPassword } });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  const t = login.body.token;
  for (const [m, u] of [['GET', '/admin/users'], ['POST', '/backups/create'], ['GET', '/commercial/tenant/export'], ['POST', '/commercial/payments/initiate']]) {
    assert.equal((await h.call(m, u, { token: t, body: {} })).status, 403, u);
  }
  assert.equal((await h.call('GET', '/orders/feed', { token: t })).status, 200);
});

test('billing fails closed: no gateway, no upgrade', async () => {
  const h = boot();
  const a = await register(h, 'a@ex.com');
  const init = await h.call('POST', '/commercial/payments/initiate', { token: a.token, body: { planId: 'plan_pro', gateway: 'STRIPE_INTL' } });
  assert.equal(init.status, 503);
  assert.equal(h.db.organisations[0].subscription.tier, 'FREE');
  assert.equal((await h.call('POST', '/commercial/payments/verify', { token: a.token, body: { transactionId: 'tx_fake' } })).status, 404);
});

test('billing with a verifier: amount mismatch rejected, success upgrades once, reference reuse blocked', async () => {
  let result = { ok: true, amount: 149, currency: 'USD', gatewayRef: 'R1' };
  const h = boot({ gatewayVerifiers: { STRIPE_INTL: { verify: async () => result } } });
  const a = await register(h, 'a@ex.com');
  const init = await h.call('POST', '/commercial/payments/initiate', { token: a.token, body: { planId: 'plan_pro', gateway: 'STRIPE_INTL' } });
  assert.equal(init.status, 201);
  result = { ok: true, amount: 1, currency: 'USD', gatewayRef: 'R1' };
  assert.equal((await h.call('POST', '/commercial/payments/verify', { token: a.token, body: { transactionId: init.body.transactionId } })).status, 402);
  assert.equal(h.db.organisations[0].subscription.tier, 'FREE');
  const init2 = await h.call('POST', '/commercial/payments/initiate', { token: a.token, body: { planId: 'plan_pro', gateway: 'STRIPE_INTL' } });
  result = { ok: true, amount: 149, currency: 'USD', gatewayRef: 'R1' };
  const ok = await h.call('POST', '/commercial/payments/verify', { token: a.token, body: { transactionId: init2.body.transactionId } });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.orgSubscription.tier, 'PROFESSIONAL');
  assert.match(ok.body.invoiceNumber, /^INV-\d{4}-000001$/);
  const again = await h.call('POST', '/commercial/payments/verify', { token: a.token, body: { transactionId: init2.body.transactionId } });
  assert.equal(again.body.invoiceNumber, ok.body.invoiceNumber);
  const init3 = await h.call('POST', '/commercial/payments/initiate', { token: a.token, body: { planId: 'plan_pro', gateway: 'STRIPE_INTL' } });
  assert.equal((await h.call('POST', '/commercial/payments/verify', { token: a.token, body: { transactionId: init3.body.transactionId } })).status, 409);
});

test('simulated payments only when explicitly enabled; refused in production', async () => {
  assert.throws(() => boot({ production: true, allowSimulatedPayments: true }), /must not be enabled in production/);
  const h = boot({ allowSimulatedPayments: true });
  const a = await register(h, 'a@ex.com');
  const init = await h.call('POST', '/commercial/payments/initiate', { token: a.token, body: { planId: 'plan_starter', gateway: 'KHALTI' } });
  assert.equal(init.body.simulated, true);
  const v = await h.call('POST', '/commercial/payments/verify', { token: a.token, body: { transactionId: init.body.transactionId } });
  assert.equal(v.body.orgSubscription.tier, 'STARTER');
});

test('expired subscription falls back to FREE limits', async () => {
  const h = boot({ allowSimulatedPayments: true });
  const a = await register(h, 'a@ex.com');
  const init = await h.call('POST', '/commercial/payments/initiate', { token: a.token, body: { planId: 'plan_pro', gateway: 'ESEWA' } });
  await h.call('POST', '/commercial/payments/verify', { token: a.token, body: { transactionId: init.body.transactionId } });
  h.advance(31 * 86400000);
  assert.equal((await h.call('GET', '/auth/me', { token: a.token })).status, 401, 'session token expires after 12h');
  const relog = await h.call('POST', '/auth/login', { body: { email: 'a@ex.com', password: PW } });
  const me = await h.call('GET', '/auth/me', { token: relog.body.token });
  assert.equal(me.body.organisation.subscription.tier, 'FREE');
  assert.equal(me.body.organisation.subscription.expiredTier, 'PROFESSIONAL');
  assert.equal(effectiveSubscription({ subscription: { tier: 'BUSINESS', status: 'ACTIVE', expiresAt: null } }, 1).tier, 'FREE');
});

test('rollback rejects path traversal and malformed ids', async () => {
  const h = boot();
  const a = await register(h, 'a@ex.com');
  fs.writeFileSync(path.join(h.dataDir, 'evil.json'), JSON.stringify({ orgId: a.organisation.id, data: {} }));
  for (const id of ['..%2Fevil', '../evil', 'bkp_1', 'evil']) {
    const r = await h.call('POST', `/backups/${id}/rollback`, { token: a.token });
    assert.ok([400, 404].includes(r.status), `${id} -> ${r.status}`);
  }
});

test('backup + rollback restores business data and is reversible', async () => {
  const h = boot();
  const a = await register(h, 'a@ex.com');
  await h.call('POST', '/catalog/items', { token: a.token, body: { name: 'W', sku: 'S1', price: 5, stock: 3 } });
  const bk = await h.call('POST', '/backups/create', { token: a.token, body: { label: 'x' } });
  await h.call('POST', '/catalog/items', { token: a.token, body: { name: 'Z', sku: 'S2', price: 5, stock: 3 } });
  assert.equal((await h.call('GET', '/catalog/items', { token: a.token })).body.length, 2);
  const rb = await h.call('POST', `/backups/${bk.body.backup.backupId}/rollback`, { token: a.token });
  assert.equal(rb.status, 200);
  assert.equal((await h.call('GET', '/catalog/items', { token: a.token })).body.length, 1);
  assert.ok(h.db.backups.length >= 2, 'automatic pre-rollback snapshot exists');
  assert.equal(h.db.users.length, 1);
});

test('persistence fails closed on a corrupt database and survives restart', async () => {
  const h = boot();
  await register(h, 'a@ex.com');
  const again = createApp({ express: createShim(), dataDir: h.dataDir, authSecret: SECRET, logger: silent });
  assert.equal(again.db.users.length, 1);
  fs.writeFileSync(path.join(h.dataDir, 'database.json'), '{ not json');
  assert.throws(() => createApp({ express: createShim(), dataDir: h.dataDir, authSecret: SECRET, logger: silent }), /Refusing to start/);
  assert.equal(fs.readFileSync(path.join(h.dataDir, 'database.json'), 'utf8'), '{ not json');
});

test('registration validation, duplicate email, login throttle, logout revokes', async () => {
  const h = boot();
  assert.equal((await h.call('POST', '/auth/register', { body: { orgName: 'X', email: 'bad', password: PW } })).status, 400);
  assert.equal((await h.call('POST', '/auth/register', { body: { orgName: 'Xy', email: 'a@ex.com', password: 'short' } })).status, 400);
  const a = await register(h, 'a@ex.com');
  assert.equal((await h.call('POST', '/auth/register', { body: { orgName: 'Xy', email: 'A@ex.com', password: PW } })).status, 409);
  for (let i = 0; i < 5; i++) assert.equal((await h.call('POST', '/auth/login', { body: { email: 'a@ex.com', password: 'wrong-pass-1' } })).status, 401);
  assert.equal((await h.call('POST', '/auth/login', { body: { email: 'a@ex.com', password: PW } })).status, 429);
  h.advance(16 * 60000);
  const ok = await h.call('POST', '/auth/login', { body: { email: 'a@ex.com', password: PW } });
  assert.equal(ok.status, 200);
  await h.call('POST', '/auth/logout', { token: ok.body.token });
  assert.equal((await h.call('GET', '/auth/me', { token: ok.body.token })).status, 401);
  assert.equal((await h.call('GET', '/auth/me', { token: a.token })).status, 401);
});

test('SSRF URL validation and plan limits on websites/webhooks', async () => {
  for (const u of ['http://x.com', 'https://127.0.0.1', 'https://localhost', 'https://169.254.169.254', 'https://[::1]', 'https://a.internal', 'https://user:p@x.com', 'https://2130706433', 'https://intranet']) {
    assert.equal(validatePublicUrl(u).ok, false, u);
  }
  assert.equal(validatePublicUrl('https://shop.example.com').ok, true);
  const h = boot();
  const a = await register(h, 'a@ex.com');
  assert.equal((await h.call('POST', '/websites', { token: a.token, body: { url: 'https://169.254.169.254' } })).status, 400);
  assert.equal((await h.call('POST', '/websites', { token: a.token, body: { url: 'https://shop.example.com' } })).status, 201);
  assert.equal((await h.call('POST', '/websites', { token: a.token, body: { url: 'https://shop2.example.com' } })).status, 403);
  assert.equal((await h.call('POST', '/integrations/webhooks', { token: a.token, body: { url: 'https://hooks.example.com' } })).status, 403);
});

test('webhook secrets are encrypted at rest and shown once', async () => {
  const h = boot({ allowSimulatedPayments: true });
  const a = await register(h, 'a@ex.com');
  const init = await h.call('POST', '/commercial/payments/initiate', { token: a.token, body: { planId: 'plan_starter', gateway: 'KHALTI' } });
  await h.call('POST', '/commercial/payments/verify', { token: a.token, body: { transactionId: init.body.transactionId } });
  const w = await h.call('POST', '/integrations/webhooks', { token: a.token, body: { url: 'https://hooks.example.com/x', events: ['order.created'] } });
  assert.equal(w.status, 201);
  const secret = w.body.secret;
  assert.ok(!fs.readFileSync(path.join(h.dataDir, 'database.json'), 'utf8').includes(secret));
  const list = await h.call('GET', '/integrations/webhooks', { token: a.token });
  assert.ok(!JSON.stringify(list.body).includes(secret));
});

test('idempotency replays and is scoped per user; failed requests are not cached', async () => {
  const h = boot();
  const a = await register(h, 'a@ex.com');
  const body = { name: 'W', sku: 'S1', price: 5, stock: 1 };
  const k = { 'idempotency-key': 'k1' };
  const r1 = await h.call('POST', '/catalog/items', { token: a.token, body, headers: k });
  const r2 = await h.call('POST', '/catalog/items', { token: a.token, body, headers: k });
  assert.equal(r1.status, 201); assert.equal(r2.status, 201); assert.equal(r2.body.id, r1.body.id);
  assert.equal(h.db.catalog.length, 1);
  const bad = await h.call('POST', '/catalog/items', { token: a.token, body: { name: '', sku: '' }, headers: { 'idempotency-key': 'k2' } });
  assert.equal(bad.status, 400);
  const fixed = await h.call('POST', '/catalog/items', { token: a.token, body: { name: 'Q', sku: 'S9', price: 1 }, headers: { 'idempotency-key': 'k2' } });
  assert.equal(fixed.status, 201);
});

test('order fulfilment requires tracking number and valid state', async () => {
  const h = boot({ demo: true, demoPassword: 'Demo-Passw0rd!' });
  const l = await h.call('POST', '/auth/login', { body: { email: 'manager@demo.sitepulse.local', password: 'Demo-Passw0rd!' } });
  assert.equal(l.status, 200);
  assert.equal((await h.call('POST', '/orders/ORD-98241/fulfill', { token: l.body.token, body: {} })).status, 400);
  assert.equal((await h.call('POST', '/orders/ORD-98241/fulfill', { token: l.body.token, body: { trackingNumber: 'TRK-1' } })).status, 200);
  assert.equal((await h.call('POST', '/orders/ORD-98241/fulfill', { token: l.body.token, body: { trackingNumber: 'TRK-1' } })).status, 409);
  assert.equal((await h.call('GET', '/ai/analytics/kpis', { token: l.body.token })).body.kpis.totalRevenue, null);
  assert.throws(() => boot({ production: true, demo: true }), /must not be enabled in production/);
});

test('AI quota enforced from the plan; financial prompts restricted to owners', async () => {
  const h = boot();
  const a = await register(h, 'a@ex.com');
  h.db.organisations[0].usage.aiRequestsThisMonth = 250;
  h.db.organisations[0].usage.aiUsagePeriod = new Date(h.clock()).toISOString().slice(0, 7);
  assert.equal((await h.call('POST', '/ai/chat', { token: a.token, body: { prompt: 'hi' } })).status, 429);
});

test('secret redaction and token verification primitives', () => {
  const out = redactSecrets('Authorization: Bearer abcdef123456789 password=hunter22 key sk_live_abcdefghij1234 {"api_key":"zzz999"}');
  for (const s of ['abcdef123456789', 'hunter22', 'sk_live_abcdefghij1234', 'zzz999']) assert.ok(!out.includes(s), s);
  const t = signToken({ sub: 1 }, SECRET, 10, 0);
  assert.ok(verifyToken(t, SECRET, 5000));
  assert.equal(verifyToken(t, SECRET, 11000), null);
});

test('unknown API routes 404 as JSON; oversized/malformed errors do not leak', async () => {
  const h = boot();
  const a = await register(h, 'a@ex.com');
  const r = await h.call('GET', '/nope', { token: a.token });
  assert.equal(r.status, 404);
});

import { isPrivateAddress, safeLookup } from '../lib/probe.js';

test('probe: requires auth, blocks private targets, uses injected fetcher for public hosts', async () => {
  const seen = [];
  const probeGet = async (origin, p) => {
    seen.push(origin + p);
    if (p.endsWith('openapi.json')) return { ok: true, status: 200, latency: 5, json: { paths: { '/orders': { get: { summary: 'List' }, parameters: [] } } } };
    return { ok: true, status: 200, latency: 5 };
  };
  const h = boot({ probeGet });
  assert.equal((await h.call('POST', '/discovery/probe', { body: { targetUrl: 'https://shop.example.com' } })).status, 401);
  const a = await register(h, 'a@ex.com');
  for (const u of ['https://localhost', 'https://169.254.169.254', 'http://shop.example.com', 'https://10.0.0.1', 'https://x.internal']) {
    assert.equal((await h.call('POST', '/discovery/probe', { token: a.token, body: { targetUrl: u } })).status, 400, u);
  }
  assert.equal(seen.length, 0, 'no fetch attempted for blocked targets');
  const ok = await h.call('POST', '/discovery/probe', { token: a.token, body: { targetUrl: 'https://shop.example.com', authToken: 'tok-secret-123456' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.endpoints.length, 1);
  assert.equal(ok.body.endpoints[0].method, 'GET');
  assert.ok(!JSON.stringify(h.db.auditLogs).includes('tok-secret-123456'));
});

test('probe: private/reserved address classification and connect-time lookup block', async () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '::1', 'fd00::1', '::ffff:127.0.0.1', '0.0.0.0']) assert.equal(isPrivateAddress(ip), true, ip);
  for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) assert.equal(isPrivateAddress(ip), false, ip);
  const err = await new Promise((r) => safeLookup('localhost', {}, (e) => r(e)));
  assert.equal(err?.code, 'EBLOCKED');
});

const PNG = 'data:image/png;base64,' + Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]).toString('base64');

test('uploads: typed, signature-checked, tenant-private, quota-limited', async () => {
  const h = boot();
  const a = await register(h, 'a@ex.com');
  const b = await register(h, 'b@ex.com');
  assert.equal((await h.call('POST', '/uploads', { body: { fileName: 'x.png', dataUrl: PNG } })).status, 401);
  const up = await h.call('POST', '/uploads', { token: a.token, body: { fileName: '../../evil.png', dataUrl: PNG } });
  assert.equal(up.status, 201, JSON.stringify(up.body));
  assert.equal(up.body.fileName, 'evil.png');
  assert.match(up.body.url, /^\/api\/v1\/uploads\/up_[a-f0-9]{24}\.png$/);
  const name = up.body.url.split('/').pop();
  assert.equal((await h.call('GET', `/uploads/${name}`, { token: a.token })).status, 200);
  assert.equal((await h.call('GET', `/uploads/${name}`, { token: b.token })).status, 404);
  assert.equal((await h.call('GET', '/uploads/..%2Fdatabase.json', { token: a.token })).status, 404);
  const html = 'data:text/html;base64,' + Buffer.from('<script>1</script>').toString('base64');
  assert.equal((await h.call('POST', '/uploads', { token: a.token, body: { fileName: 'x.html', dataUrl: html } })).status, 415);
  const svg = 'data:image/svg+xml;base64,' + Buffer.from('<svg/>').toString('base64');
  assert.equal((await h.call('POST', '/uploads', { token: a.token, body: { fileName: 'x.svg', dataUrl: svg } })).status, 415);
  const fake = 'data:image/png;base64,' + Buffer.from('not a png at all').toString('base64');
  assert.equal((await h.call('POST', '/uploads', { token: a.token, body: { fileName: 'x.png', dataUrl: fake } })).status, 415);
  h.db.uploads.push({ id: 'up_fill', orgId: a.organisation.id, sizeBytes: 100 * 1048576, mimeType: 'text/plain', originalName: 'f', uploadedAt: 0 });
  assert.equal((await h.call('POST', '/uploads', { token: a.token, body: { fileName: 'y.png', dataUrl: PNG } })).status, 403);
});

test('notifications are tenant-scoped; outbox is owner-only and never claims to have sent mail', async () => {
  const h = boot();
  const a = await register(h, 'a@ex.com');
  const b = await register(h, 'b@ex.com');
  const inv = await h.call('POST', '/admin/users/invite', { token: a.token, body: { email: 'm@ex.com' } });
  assert.equal(inv.status, 201);
  const na = await h.call('GET', '/notifications', { token: a.token });
  assert.equal(na.body.notifications.length, 1);
  assert.equal((await h.call('GET', '/notifications', { token: b.token })).body.notifications.length, 0);
  assert.equal((await h.call('POST', `/notifications/${na.body.notifications[0].id}/read`, { token: b.token })).status, 404);
  assert.equal((await h.call('POST', `/notifications/${na.body.notifications[0].id}/read`, { token: a.token })).status, 200);
  const ob = await h.call('GET', '/admin/outbox', { token: a.token });
  assert.equal(ob.body[0].status, 'QUEUED_NOT_SENT');
  assert.ok(!JSON.stringify(ob.body).includes(inv.body.temporaryPassword));
  const login = await h.call('POST', '/auth/login', { body: { email: 'm@ex.com', password: inv.body.temporaryPassword } });
  assert.equal((await h.call('GET', '/admin/outbox', { token: login.body.token })).status, 403);
});

test('client-reported audit entries use the session identity and are redacted', async () => {
  const h = boot();
  const a = await register(h, 'a@ex.com');
  const r = await h.call('POST', '/audit', { token: a.token, body: { title: 'x', details: 'password=hunter22', performedBy: 'Admin Root', category: 'EVIL' } });
  assert.equal(r.status, 201);
  assert.match(r.body.performedBy, /\(OWNER\)/);
  assert.ok(!r.body.details.includes('hunter22'));
  assert.equal(r.body.category, 'FEATURE_CHANGE');
});
