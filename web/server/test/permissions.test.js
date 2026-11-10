import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createShim } from './express-shim.js';
import { createApp } from '../app.js';
import { defineSuite } from './permissions.suite.js';

const silent = { warn() {}, error() {}, log() {} };
const API = '/api/v1';
const mk = (dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-perm-'))) => {
  const inst = createApp({ express: createShim(), dataDir, authSecret: 'x'.repeat(40), logger: silent, allowSimulatedPayments: true, rateLimits: { apiMax: 1e9, authMax: 1e9, aiMax: 1e9, probeMax: 1e9 } });
  return { ...inst, dataDir, call: (method, url, { token, body, headers = {} } = {}) => inst.app.handle({ method, url: API + url, body, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers } }) };
};

defineSuite(test, async () => mk(), 'perm[shim]');

test('migration: managers created before granular permissions keep exactly their old access', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-mig-'));
  const h = mk(dir);
  const r = await h.call('POST', '/auth/register', { body: { orgName: 'Legacy Org', email: 'o@legacy.example.com', password: 'Str0ng-Passw0rd!', name: 'O' } });
  const inv = await h.call('POST', '/admin/users/invite', { token: r.body.token, body: { email: 'm@legacy.example.com', role: 'MANAGER' } });
  const orgId = r.body.user.orgId;
  h.db.websites.push({ id: 'site_legacy', orgId, url: 'https://legacy.example.com', name: 'Legacy', isActive: true });
  h.db.orders.push({ id: 'O-L', orgId, customer: 'Old', itemsCount: 1, totalAmount: 1, status: 'NEW', placedAt: new Date().toISOString() });
  // simulate a pre-v7 database: manager without grants, no assignments, old schema version
  const mgr = h.db.users.find((u) => u.email === 'm@legacy.example.com'); delete mgr.grants; h.db.websiteAssignments.length = 0; h.db.schemaVersion = 6;
  h.store.save();
  const h2 = mk(dir);
  const l = await h2.call('POST', '/auth/login', { body: { email: 'm@legacy.example.com', password: inv.body.temporaryPassword } });
  assert.equal(l.status, 200);
  const me = (await h2.call('GET', '/auth/me', { token: l.body.token })).body;
  assert.ok(me.access.permissions.includes('orders.fulfill') && me.access.permissions.includes('inventory.update'));
  assert.ok(!me.access.permissions.includes('products.price.edit'), 'price editing was owner-only before and stays that way');
  assert.deepEqual([...me.access.websiteIds].sort(), ['site_legacy', 'workspace']);
  assert.equal((await h2.call('GET', '/orders/feed', { token: l.body.token })).body.length, 1);
  assert.equal(h2.db.schemaVersion, 7);
  // idempotent: a second load changes nothing, and owner edits are never overwritten
  await h2.call('PUT', `/admin/users/${mgr.id}/permissions`, { token: r.body.token, body: { permissions: ['orders.view'] } });
  h2.store.save();
  const h3 = mk(dir);
  assert.deepEqual(h3.db.users.find((u) => u.id === mgr.id).grants, ['orders.view']);
  assert.equal(h3.db.websiteAssignments.filter((a) => a.userId === mgr.id).length, 2);
});

test('fail closed: a manager whose permission data is missing or corrupt gets nothing', async () => {
  const h = mk();
  const r = await h.call('POST', '/auth/register', { body: { orgName: 'FC Org', email: 'o@fc.example.com', password: 'Str0ng-Passw0rd!', name: 'O' } });
  const inv = await h.call('POST', '/admin/users/invite', { token: r.body.token, body: { email: 'm@fc.example.com', role: 'MANAGER', permissions: ['orders.view'], websiteIds: ['workspace'] } });
  const l = await h.call('POST', '/auth/login', { body: { email: 'm@fc.example.com', password: inv.body.temporaryPassword } });
  assert.equal((await h.call('GET', '/orders/feed', { token: l.body.token })).status, 200);
  const u = h.db.users.find((x) => x.email === 'm@fc.example.com');
  for (const bad of [undefined, null, 'orders.view', { 0: 'orders.view' }, ['*'], ['unknown.perm']]) {
    if (bad === undefined) delete u.grants; else u.grants = bad;
    assert.equal((await h.call('GET', '/orders/feed', { token: l.body.token })).status, 403, JSON.stringify(bad));
  }
  u.grants = ['orders.view']; u.role = 'SUPERUSER'; // unknown role: no owner powers, no manager powers
  assert.equal((await h.call('GET', '/orders/feed', { token: l.body.token })).status, 403);
});
