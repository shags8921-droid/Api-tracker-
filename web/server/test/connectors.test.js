// CONTRACT TESTS for the WooCommerce connector and its server wiring.
// The remote store is a TEST DOUBLE that follows the documented WooCommerce REST shapes. It proves SitePulse's own logic
// (vault, remote-first writes, isolation, signatures, dedupe, failure handling). It does NOT prove behaviour against a real
// store: that still needs a live WooCommerce test site (see PHASE16 report).
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createShim } from './express-shim.js';
import { createApp } from '../app.js';

const SECRET = 'x'.repeat(40);
const PW = 'Str0ng-Passw0rd!';
const API = '/api/v1';
const silent = { warn() {}, error() {}, log() {} };
const CK = 'ck_' + 'a'.repeat(20), CS = 'cs_' + 'b'.repeat(20);
const SITE = 'https://shop.example.com';

function makeStore() {
  const state = {
    products: [{ id: 11, name: 'Shirt', sku: 'SH-1', regular_price: '1200', price: '1200', manage_stock: true, stock_quantity: 7, categories: [{ name: 'Clothes' }], images: [{ src: 'https://shop.example.com/a.jpg' }], status: 'publish' }],
    orders: [{ id: 501, status: 'processing', total: '2400.00', billing: { first_name: 'Sita', last_name: 'K' }, line_items: [{ quantity: 2 }], date_created_gmt: '2026-11-09T01:00:00' }],
    keyOk: true, writeOk: true, down: false, calls: []
  };
  const http = async ({ method, origin, path: p, headers, body }) => {
    state.calls.push({ method, origin, p, auth: headers.Authorization, body });
    if (state.down) return { ok: false, status: 0, error: 'Timed out' };
    if (p === '/wp-json/') return { ok: true, status: 200, json: { name: 'Demo Shop', namespaces: ['wp/v2', 'wc/v3'] } };
    if (p.startsWith('/wp-json/wc/')) {
      const expected = 'Basic ' + Buffer.from(`${CK}:${CS}`).toString('base64');
      if (!state.keyOk || headers.Authorization !== expected) return { ok: false, status: 401, json: {} };
    }
    if (method === 'GET' && p.startsWith('/wp-json/wc/v3/products/categories')) return { ok: true, status: 200, headers: { 'x-wp-totalpages': '1' }, json: [{ id: 3, name: 'Clothes', count: 1 }] };
    if (method === 'GET' && p.startsWith('/wp-json/wc/v3/products')) return { ok: true, status: 200, headers: { 'x-wp-totalpages': '1' }, json: state.products };
    if (method === 'GET' && p.startsWith('/wp-json/wc/v3/orders')) return { ok: true, status: 200, headers: { 'x-wp-totalpages': '1' }, json: state.orders };
    if (method === 'PUT' && p.startsWith('/wp-json/wc/v3/')) {
      if (!state.writeOk) return { ok: false, status: 403, json: {} };
      const m = /products\/(\d+)$/.exec(p); const o = /orders\/(\d+)$/.exec(p);
      if (m) { Object.assign(state.products.find((x) => String(x.id) === m[1]), body); return { ok: true, status: 200, json: state.products.find((x) => String(x.id) === m[1]) }; }
      if (o) { Object.assign(state.orders.find((x) => String(x.id) === o[1]), body); return { ok: true, status: 200, json: state.orders.find((x) => String(x.id) === o[1]) }; }
    }
    if (method === 'POST' && /notes$/.test(p)) return { ok: true, status: 201, json: {} };
    return { ok: false, status: 404, json: {} };
  };
  return { state, http };
}

function boot() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-c-'));
  const remote = makeStore();
  const inst = createApp({ express: createShim(), dataDir, authSecret: SECRET, logger: silent, connectorHttp: remote.http, rateLimits: { probeMax: 1000, authMax: 1000, apiMax: 100000 } });
  const call = (method, url, { token, body, headers = {}, rawBody } = {}) =>
    inst.app.handle({ method, url: API + url, body, rawBody, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers } });
  return { ...inst, call, remote, dataDir };
}
async function register(h, email) {
  const r = await h.call('POST', '/auth/register', { body: { orgName: 'Org ' + email, email, password: PW, name: 'N' } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body;
}
async function connected(h, email = 'o@ex.com') {
  const a = await register(h, email);
  const site = (await h.call('POST', '/websites', { token: a.token, body: { url: SITE, name: 'Shop' } })).body;
  const c = await h.call('PUT', `/websites/${site.id}/credentials`, { token: a.token, body: { platform: 'woocommerce', consumerKey: CK, consumerSecret: CS } });
  return { a, site, c };
}

test('connect: detects WooCommerce, verifies key, stores credentials encrypted, never returns them', async () => {
  const h = boot();
  const { a, site, c } = await connected(h);
  assert.equal(c.status, 200, JSON.stringify(c.body));
  assert.equal(c.body.site.connection.status, 'CONNECTED');
  assert.equal(c.body.site.connection.writeVerified, false);
  assert.ok(c.body.inboundWebhook.secret.startsWith('whsec_'));
  const raw = JSON.stringify(h.db);
  assert.ok(!raw.includes(CK) && !raw.includes(CS), 'plaintext credentials must not be in the database');
  assert.ok(h.db.websites[0].credentialsEnc.startsWith('v1:'));
  const listed = JSON.stringify((await h.call('GET', '/websites', { token: a.token })).body);
  assert.ok(!listed.includes('credentialsEnc') && !listed.includes(CK) && !listed.includes('webhookSecretEnc'));
  const exp = JSON.stringify((await h.call('GET', '/commercial/tenant/export', { token: a.token })).body);
  assert.ok(!exp.includes('credentialsEnc') && !exp.includes(CS));
  const logs = JSON.stringify(h.db.auditLogs);
  assert.ok(!logs.includes(CS));
  // second connect does not re-issue the webhook secret
  const again = await h.call('PUT', `/websites/${site.id}/credentials`, { token: a.token, body: { platform: 'woocommerce', consumerKey: CK, consumerSecret: CS } });
  assert.equal(again.body.inboundWebhook.secret, null);
});

test('connect: rejects bad keys, non-WooCommerce sites, unsupported platforms, managers and other tenants', async () => {
  const h = boot();
  const a = await register(h, 'o@ex.com');
  const site = (await h.call('POST', '/websites', { token: a.token, body: { url: SITE } })).body;
  const put = (body, token = a.token) => h.call('PUT', `/websites/${site.id}/credentials`, { token, body });
  assert.equal((await put({ platform: 'shopify', consumerKey: CK, consumerSecret: CS })).status, 400);
  assert.equal((await put({ platform: 'woocommerce', consumerKey: 'nope', consumerSecret: CS })).status, 400);
  h.remote.state.keyOk = false;
  const bad = await put({ platform: 'woocommerce', consumerKey: CK, consumerSecret: CS });
  assert.equal(bad.status, 422);
  assert.ok(!JSON.stringify(h.db.websites[0]).includes('credentialsEnc'), 'failed verification stores nothing');
  h.remote.state.keyOk = true;
  const inv = await h.call('POST', '/admin/users/invite', { token: a.token, body: { email: 'm@ex.com', role: 'MANAGER' } });
  const mgr = await h.call('POST', '/auth/login', { body: { email: 'm@ex.com', password: inv.body.temporaryPassword } });
  assert.equal((await put({ platform: 'woocommerce', consumerKey: CK, consumerSecret: CS }, mgr.body.token)).status, 403);
  const other = await register(h, 'z@ex.com');
  assert.equal((await put({ platform: 'woocommerce', consumerKey: CK, consumerSecret: CS }, other.token)).status, 404);
});

test('sync: reads products and orders into the right tenant/site; failure is reported, never success', async () => {
  const h = boot();
  const { a, site } = await connected(h);
  const s = await h.call('POST', `/websites/${site.id}/sync`, { token: a.token });
  assert.equal(s.status, 200, JSON.stringify(s.body));
  assert.equal(s.body.products, 1); assert.equal(s.body.orders, 1);
  const items = (await h.call('GET', '/catalog/items', { token: a.token })).body;
  const it = items.find((i) => i.remoteId === '11');
  assert.equal(it.websiteId, site.id); assert.equal(it.price, 1200); assert.equal(it.stock, 7);
  const ords = (await h.call('GET', '/orders/feed', { token: a.token })).body;
  assert.equal(ords.find((o) => o.remoteId === '501').status, 'PROCESSING');
  // other tenant sees nothing
  const other = await register(h, 'z@ex.com');
  assert.equal((await h.call('GET', '/catalog/items', { token: other.token })).body.filter((i) => i.remoteId).length, 0);
  assert.equal((await h.call('POST', `/websites/${site.id}/sync`, { token: other.token })).status, 404);
  // re-sync is idempotent (no duplicates)
  await h.call('POST', `/websites/${site.id}/sync`, { token: a.token });
  assert.equal((await h.call('GET', '/catalog/items', { token: a.token })).body.filter((i) => i.remoteId === '11').length, 1);
  // remote down -> failure, health degraded, recovery works
  h.remote.state.down = true;
  const f = await h.call('POST', `/websites/${site.id}/sync`, { token: a.token });
  assert.equal(f.body.success, false); assert.ok(f.status >= 400);
  assert.equal(h.db.websites[0].apiHealth, 'DEGRADED');
  h.remote.state.down = false;
  assert.equal((await h.call('POST', `/websites/${site.id}/sync`, { token: a.token })).status, 200);
  assert.equal(h.db.websites[0].apiHealth, 'HEALTHY');
});

test('writes go to the store first; failures leave local data unchanged and say so; confirmation required', async () => {
  const h = boot();
  const { a, site } = await connected(h);
  await h.call('POST', `/websites/${site.id}/sync`, { token: a.token });
  const item = (await h.call('GET', '/catalog/items', { token: a.token })).body.find((i) => i.remoteId === '11');
  const price = (body) => h.call('PATCH', `/catalog/items/${item.id}/price`, { token: a.token, body });
  assert.equal((await price({ price: 999 })).body.error, 'CONFIRMATION_REQUIRED');
  assert.equal(h.remote.state.products[0].regular_price, '1200', 'nothing sent without confirmation');
  h.remote.state.writeOk = false; // read-only key
  const denied = await price({ price: 999, confirm: true });
  assert.equal(denied.status, 502); assert.equal(denied.body.applied, false);
  assert.equal(h.db.catalog.find((i) => i.id === item.id).price, 1200, 'local price unchanged after remote refusal');
  assert.ok(h.db.auditLogs.some((l) => l.status === 'FAILED' && /Remote price/.test(l.title)));
  h.remote.state.writeOk = true;
  const ok = await price({ price: 999, confirm: true });
  assert.equal(ok.status, 200); assert.equal(ok.body.remoteConfirmed, true);
  assert.equal(h.remote.state.products[0].regular_price, '999');
  assert.equal(h.db.catalog.find((i) => i.id === item.id).price, 999);
  const st = await h.call('PATCH', `/catalog/items/${item.id}/stock`, { token: a.token, body: { stock: 3, confirm: true } });
  assert.equal(st.status, 200); assert.equal(h.remote.state.products[0].stock_quantity, 3);
  const ord = (await h.call('GET', '/orders/feed', { token: a.token })).body.find((o) => o.remoteId === '501');
  assert.equal((await h.call('POST', `/orders/${ord.id}/fulfill`, { token: a.token, body: { trackingNumber: 'TRK1' } })).body.error, 'CONFIRMATION_REQUIRED');
  const f = await h.call('POST', `/orders/${ord.id}/fulfill`, { token: a.token, body: { trackingNumber: 'TRK1', confirm: true } });
  assert.equal(f.status, 200); assert.equal(h.remote.state.orders[0].status, 'completed');
  // manager cannot change prices
  const inv = await h.call('POST', '/admin/users/invite', { token: a.token, body: { email: 'm@ex.com', role: 'MANAGER' } });
  const mgr = await h.call('POST', '/auth/login', { body: { email: 'm@ex.com', password: inv.body.temporaryPassword } });
  assert.equal((await h.call('PATCH', `/catalog/items/${item.id}/price`, { token: mgr.body.token, body: { price: 1, confirm: true } })).status, 403);
  // workspace-only items are clearly labelled
  const local = (await h.call('POST', '/catalog/items', { token: a.token, body: { name: 'L', sku: 'LOC', price: 5, stock: 5 } })).body;
  const lp = await h.call('PATCH', `/catalog/items/${local.id}/price`, { token: a.token, body: { price: 6 } });
  assert.equal(lp.body.workspaceOnly, true); assert.equal(lp.body.remoteConfirmed, false);
});

test('disconnect destroys credentials, blocks further writes, keeps records; rollback cannot resurrect credentials', async () => {
  const h = boot();
  const { a, site } = await connected(h);
  await h.call('POST', `/websites/${site.id}/sync`, { token: a.token });
  const snap = await h.call('POST', '/backups/create', { token: a.token, body: { label: 'with creds' } });
  const item = (await h.call('GET', '/catalog/items', { token: a.token })).body.find((i) => i.remoteId === '11');
  const d = await h.call('DELETE', `/websites/${site.id}`, { token: a.token });
  assert.equal(d.status, 200);
  assert.equal(h.db.websites[0].credentialsEnc, undefined);
  assert.equal(h.db.websites[0].connection.status, 'DISCONNECTED');
  const callsBefore = h.remote.state.calls.length;
  const w = await h.call('PATCH', `/catalog/items/${item.id}/price`, { token: a.token, body: { price: 1, confirm: true } });
  assert.equal(w.status, 409); assert.equal(h.remote.state.calls.length, callsBefore, 'no request reaches the store after disconnect');
  assert.equal((await h.call('POST', `/websites/${site.id}/sync`, { token: a.token })).status, 409);
  assert.ok(h.db.catalog.some((i) => i.remoteId === '11'), 'records are kept');
  const id = snap.body.backupId || snap.body.id || h.db.backups[0].backupId;
  assert.equal((await h.call('POST', `/backups/${id}/rollback`, { token: a.token })).status, 200);
  assert.equal(h.db.websites.find((x) => x.id === site.id).credentialsEnc, undefined, 'rollback must not restore credentials');
  assert.notEqual(h.db.websites.find((x) => x.id === site.id).connection.status, 'CONNECTED');
});

test('inbound webhook: valid signature applies change once; bad signature, unknown site, replay are handled', async () => {
  const h = boot();
  const { a, site, c } = await connected(h);
  const secret = c.body.inboundWebhook.secret;
  const send = (payload, { sig, topic = 'order.created', delivery = 'd1', siteId = site.id } = {}) => {
    const raw = Buffer.from(JSON.stringify(payload));
    const s = sig ?? crypto.createHmac('sha256', secret).update(raw).digest('base64');
    return h.call('POST', `/inbound/woocommerce/${siteId}`, { body: payload, rawBody: raw, headers: { 'x-wc-webhook-signature': s, 'x-wc-webhook-topic': topic, 'x-wc-webhook-delivery-id': delivery } });
  };
  const order = { id: 777, status: 'processing', total: '50', billing: { first_name: 'A', last_name: 'B' }, line_items: [{ quantity: 1 }] };
  assert.equal((await send(order, { sig: 'AAAA' })).status, 401);
  assert.equal(h.db.orders.length, 0);
  assert.equal((await send(order, { siteId: 'site_nope' })).status, 404);
  const ok = await send(order);
  assert.equal(ok.status, 200); assert.equal(ok.body.processed, true);
  assert.equal(h.db.orders.filter((o) => o.remoteId === '777').length, 1);
  const dup = await send(order);
  assert.equal(dup.body.duplicate, true);
  assert.equal(h.db.orders.filter((o) => o.remoteId === '777').length, 1);
  await send({ ...order, status: 'completed' }, { topic: 'order.updated', delivery: 'd2' });
  assert.equal(h.db.orders.find((o) => o.remoteId === '777').status, 'SHIPPED');
  // after disconnect the endpoint stops accepting events
  await h.call('DELETE', `/websites/${site.id}`, { token: a.token });
  assert.equal((await send(order, { delivery: 'd3' })).status, 404);
});

test('scheduled polling fallback syncs connected sites and backs off failing ones', async () => {
  const h = boot();
  const { site } = await connected(h);
  const r = await h.runScheduledSync();
  assert.equal(r.length, 1); assert.equal(r[0].ok, true);
  h.remote.state.down = true;
  const f = await h.runScheduledSync();
  assert.equal(f[0].ok, false);
  const again = await h.runScheduledSync();
  assert.equal(again.length, 0, 'failing site is backed off, not hammered');
  assert.ok(h.db.websites.find((w) => w.id === site.id).connection.nextSyncAt > Date.now());
});

test('manifest: derived from the real connection; unsupported things are labelled, nothing invented', async () => {
  const h = boot();
  const a = await register(h, 'o@ex.com');
  const site = (await h.call('POST', '/websites', { token: a.token, body: { url: SITE } })).body;
  const before = (await h.call('GET', `/websites/${site.id}/manifest`, { token: a.token })).body;
  assert.equal(before.hubMode, 'NONE'); assert.deepEqual(before.capabilities, []);
  await h.call('PUT', `/websites/${site.id}/credentials`, { token: a.token, body: { platform: 'woocommerce', consumerKey: CK, consumerSecret: CS } });
  await h.call('POST', `/websites/${site.id}/sync`, { token: a.token });
  const m = (await h.call('GET', `/websites/${site.id}/manifest`, { token: a.token })).body;
  assert.equal(m.synced.products, 1);
  const by = Object.fromEntries(m.capabilities.map((c) => [c.id, c.support]));
  assert.equal(by['products.price.write'], 'SUPPORTED');
  assert.equal(by['products.description.write'], 'NOT_IMPLEMENTED');
  assert.equal(by['dashboard.replication'], 'NOT_POSSIBLE');
  assert.equal(m.writePermissionVerified, false);
  const other = await register(h, 'z@ex.com');
  assert.equal((await h.call('GET', `/websites/${site.id}/manifest`, { token: other.token })).status, 404);
});

test('AI commands: answers read-only questions; price change is only a proposal until the owner confirms; single use; role enforced', async () => {
  const h = boot();
  const { a, site } = await connected(h);
  await h.call('POST', `/websites/${site.id}/sync`, { token: a.token });
  const cmd = (text, token = a.token) => h.call('POST', '/ai/command', { token, body: { text } });
  const low = await cmd('Which products are low in stock?');
  assert.equal(low.body.kind, 'ANSWER');
  const p = await cmd('Change Shirt price to Rs. 999');
  assert.equal(p.body.kind, 'PROPOSAL'); assert.equal(p.body.nothingChangedYet, true);
  assert.equal(h.remote.state.products[0].regular_price, '1200', 'proposal must not touch the store');
  assert.equal(h.db.catalog.find((i) => i.remoteId === '11').price, 1200);
  const c = await h.call('POST', `/ai/command/${p.body.proposalId}/confirm`, { token: a.token });
  assert.equal(c.status, 200); assert.equal(h.remote.state.products[0].regular_price, '999');
  assert.equal((await h.call('POST', `/ai/command/${p.body.proposalId}/confirm`, { token: a.token })).status, 404, 'single use');
  assert.equal((await cmd('Update this product description to nice')).body.kind, 'UNSUPPORTED');
  assert.equal((await cmd('Change Nonexistent price to 5')).body.kind, 'CLARIFY');
  const inv = await h.call('POST', '/admin/users/invite', { token: a.token, body: { email: 'm@ex.com', role: 'MANAGER', permissions: ['orders.view', 'customers.view'], websiteIds: [site.id] } });
  const mgr = (await h.call('POST', '/auth/login', { body: { email: 'm@ex.com', password: inv.body.temporaryPassword } })).body;
  assert.equal((await cmd('Change Shirt price to 5', mgr.token)).status, 403);
  assert.equal((await cmd('show me today\'s orders', mgr.token)).body.kind, 'ANSWER');
  const p2 = (await cmd('Change Shirt price to 500')).body;
  const other = await register(h, 'z@ex.com');
  assert.equal((await h.call('POST', `/ai/command/${p2.proposalId}/confirm`, { token: other.token })).status, 404, 'proposal is bound to its tenant/user');
});
