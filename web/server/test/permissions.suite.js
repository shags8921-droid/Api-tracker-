// Shared permission / assignment test suite. Executed twice:
//   permissions.test.js            -> over the test-only Express stand-in (runs anywhere)
//   permissions.realexpress.test.js -> over REAL Express + real HTTP (needs `npm ci`; runs in CI)
// Both use the real createApp, real tokens, real password hashing and the real authorisation code: nothing is stubbed.
import assert from 'node:assert/strict';

const PW = 'Str0ng-Passw0rd!';
const ALL = ['website.view', 'website.sync', 'orders.view', 'customers.view', 'orders.fulfill', 'products.view', 'products.create', 'products.price.edit', 'inventory.view', 'inventory.update'];

export function defineSuite(test, makeHarness, label) {
  const T = (name, fn) => test(`${label}: ${name}`, async (t) => {
    const h = await makeHarness();
    t.after(() => h.close?.());
    await fn(h);
  });

  let seq = 0;
  async function register(h, orgName) {
    seq += 1;
    const email = `owner${seq}@perm.example.com`;
    const r = await h.call('POST', '/auth/register', { body: { orgName, email, password: PW, name: 'Owner' } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    return { token: r.body.token, orgId: r.body.user.orgId, email, userId: r.body.user.id };
  }
  async function pro(h, o) {
    const init = await h.call('POST', '/commercial/payments/initiate', { token: o.token, body: { planId: 'plan_pro', gateway: 'KHALTI' } });
    assert.equal(init.status, 201, JSON.stringify(init.body));
    assert.equal((await h.call('POST', '/commercial/payments/verify', { token: o.token, body: { transactionId: init.body.transactionId } })).status, 200);
  }
  async function site(h, o, host) {
    const r = await h.call('POST', '/websites', { token: o.token, body: { url: `https://${host}`, name: host } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    return r.body.id;
  }
  async function manager(h, o, email, body = {}) {
    const inv = await h.call('POST', '/admin/users/invite', { token: o.token, body: { email, role: 'MANAGER', ...body } });
    assert.equal(inv.status, 201, JSON.stringify(inv.body));
    const l = await h.call('POST', '/auth/login', { body: { email, password: inv.body.temporaryPassword } });
    assert.equal(l.status, 200, JSON.stringify(l.body));
    return { token: l.body.token, id: inv.body.user.id, email };
  }
  /** Two websites + a workspace with one order and one product each, for organisation `o`. */
  async function world(h, o, tag = 'a') {
    await pro(h, o);
    const s1 = await site(h, o, `${tag}1.example.com`), s2 = await site(h, o, `${tag}2.example.com`);
    for (const [scope, websiteId] of [['S1', s1], ['S2', s2], ['WS', undefined]]) {
      h.db.orders.push({ id: `O-${tag}-${scope}`, orgId: o.orgId, websiteId, customer: `Cust ${scope}`, itemsCount: 1, totalAmount: 10, status: 'NEW', placedAt: new Date().toISOString(), trackingNumber: null, shippingAddress: `Addr ${scope}` });
      h.db.catalog.push({ id: `P-${tag}-${scope}`, orgId: o.orgId, websiteId, name: `Item ${scope}`, category: 'G', price: 5, stock: 10, minThreshold: 2, sku: `SKU-${tag}-${scope}`, status: 'IN_STOCK' });
    }
    return { s1, s2, o1: `O-${tag}-S1`, o2: `O-${tag}-S2`, ow: `O-${tag}-WS`, p1: `P-${tag}-S1`, p2: `P-${tag}-S2`, pw: `P-${tag}-WS` };
  }
  const ids = (r) => r.body.map((x) => x.id).sort();

  T('1. owner can access every website of the organisation', async (h) => {
    const o = await register(h, 'Org A'); const w = await world(h, o);
    const sites = await h.call('GET', '/websites', { token: o.token });
    assert.deepEqual(ids(sites), [w.s1, w.s2].sort());
    for (const s of [w.s1, w.s2]) assert.equal((await h.call('GET', `/websites/${s}/manifest`, { token: o.token })).status, 200);
    assert.deepEqual(ids(await h.call('GET', '/orders/feed', { token: o.token })), [w.o1, w.o2, w.ow].sort());
    assert.deepEqual(ids(await h.call('GET', '/catalog/items', { token: o.token })), [w.p1, w.p2, w.pw].sort());
    assert.equal((await h.call('PATCH', `/catalog/items/${w.p2}/stock`, { token: o.token, body: { stock: 4 } })).status, 200);
    assert.equal((await h.call('POST', `/orders/${w.o2}/fulfill`, { token: o.token, body: { trackingNumber: 'T1' } })).status, 200);
    const me = (await h.call('GET', '/auth/me', { token: o.token })).body;
    assert.equal(me.access.fullAccess, true);
  });

  T('2. manager can use an assigned website, and only it', async (h) => {
    const o = await register(h, 'Org A'); const w = await world(h, o);
    const m = await manager(h, o, 'm1@perm.example.com', { permissions: ALL.filter((p) => p !== 'products.price.edit'), websiteIds: [w.s1] });
    assert.deepEqual(ids(await h.call('GET', '/websites', { token: m.token })), [w.s1]);
    assert.equal((await h.call('GET', `/websites/${w.s1}/manifest`, { token: m.token })).status, 200);
    assert.deepEqual(ids(await h.call('GET', '/orders/feed', { token: m.token })), [w.o1]);
    assert.deepEqual(ids(await h.call('GET', '/catalog/items', { token: m.token })), [w.p1]);
    assert.equal((await h.call('PATCH', `/catalog/items/${w.p1}/stock`, { token: m.token, body: { stock: 3 } })).status, 200);
    assert.equal((await h.call('POST', `/orders/${w.o1}/fulfill`, { token: m.token, body: { trackingNumber: 'T2' } })).status, 200);
    const me = (await h.call('GET', '/auth/me', { token: m.token })).body;
    assert.deepEqual(me.access.websiteIds, [w.s1]); assert.equal(me.access.fullAccess, false);
  });

  T('3. manager cannot access an unassigned website (reads, writes, sync, switch, filters)', async (h) => {
    const o = await register(h, 'Org A'); const w = await world(h, o);
    const m = await manager(h, o, 'm1@perm.example.com', { permissions: ALL, websiteIds: [w.s1] });
    const t = m.token;
    for (const [method, url, body] of [
      ['GET', `/websites/${w.s2}/manifest`], ['POST', `/websites/${w.s2}/sync`, {}], ['POST', `/websites/${w.s2}/switch`, {}],
      ['GET', `/orders/feed?websiteId=${w.s2}`], ['GET', `/catalog/items?websiteId=${w.s2}`],
      ['POST', `/orders/${w.o2}/fulfill`, { trackingNumber: 'X1' }], ['PATCH', `/catalog/items/${w.p2}/stock`, { stock: 1 }], ['PATCH', `/catalog/items/${w.p2}/price`, { price: 1 }],
      ['POST', `/orders/${w.ow}/fulfill`, { trackingNumber: 'X2' }], ['PATCH', `/catalog/items/${w.pw}/stock`, { stock: 1 }] // workspace not assigned either
    ]) {
      const r = await h.call(method, url, { token: t, body });
      assert.equal(r.status, 403, `${method} ${url} -> ${r.status}`);
      assert.equal(r.body.code, 'WEBSITE_NOT_ASSIGNED', `${method} ${url}`);
    }
    assert.equal(h.db.orders.find((x) => x.id === w.o2).status, 'NEW'); assert.equal(h.db.catalog.find((x) => x.id === w.p2).stock, 10);
    // never appears in lists or search
    assert.deepEqual(ids(await h.call('GET', `/orders/feed?search=${w.o2}`, { token: t })), []);
    assert.ok(!JSON.stringify((await h.call('GET', '/catalog/items', { token: t })).body).includes(w.p2));
  });

  T('4. manager (and owner) cannot touch another organisation\'s website, orders or products', async (h) => {
    const a = await register(h, 'Org A'); const wa = await world(h, a, 'a');
    const b = await register(h, 'Org B'); const wb = await world(h, b, 'b');
    const m = await manager(h, a, 'm1@perm.example.com', { permissions: ALL, websiteIds: [wa.s1] });
    for (const token of [m.token, a.token]) {
      assert.equal((await h.call('GET', `/websites/${wb.s1}/manifest`, { token })).status, 404);
      assert.equal((await h.call('POST', `/websites/${wb.s1}/sync`, { token, body: {} })).status, 404);
      assert.equal((await h.call('POST', `/websites/${wb.s1}/switch`, { token, body: {} })).status, 404);
      assert.equal((await h.call('POST', `/orders/${wb.o1}/fulfill`, { token, body: { trackingNumber: 'Z1' } })).status, 404);
      assert.equal((await h.call('PATCH', `/catalog/items/${wb.p1}/stock`, { token, body: { stock: 0 } })).status, 404);
      assert.equal((await h.call('PATCH', `/catalog/items/${wb.p1}/price`, { token, body: { price: 0 } })).status, 404);
      assert.equal((await h.call('GET', `/orders/feed?websiteId=${wb.s1}`, { token })).status, 403);
    }
    assert.equal(h.db.orders.find((x) => x.id === wb.o1).status, 'NEW'); assert.equal(h.db.catalog.find((x) => x.id === wb.p1).stock, 10);
    assert.ok(!JSON.stringify((await h.call('GET', '/orders/feed', { token: a.token })).body).includes('-b-'));
    // owner B cannot administer org A's manager, nor assign org B websites to... org A's manager
    assert.equal((await h.call('PUT', `/admin/users/${m.id}/websites`, { token: b.token, body: { websiteIds: [wb.s1] } })).status, 404);
    assert.equal((await h.call('PUT', `/admin/users/${m.id}/permissions`, { token: b.token, body: { permissions: ALL } })).status, 404);
    // owner A cannot assign org B's website to their own manager
    assert.equal((await h.call('POST', `/admin/users/${m.id}/websites`, { token: a.token, body: { websiteId: wb.s1 } })).status, 400);
  });

  T('5. manager cannot perform operations without the permission', async (h) => {
    const o = await register(h, 'Org A'); const w = await world(h, o);
    const m = await manager(h, o, 'm1@perm.example.com', { permissions: ['orders.view'], websiteIds: [w.s1, 'workspace'] });
    const t = m.token;
    const denied = [
      ['POST', `/orders/${w.o1}/fulfill`, { trackingNumber: 'T3' }, 'orders.fulfill'], ['PATCH', `/catalog/items/${w.p1}/stock`, { stock: 1 }, 'inventory.update'],
      ['PATCH', `/catalog/items/${w.p1}/price`, { price: 1 }, 'products.price.edit'], ['POST', '/catalog/items', { name: 'N', sku: 'N1', price: 1 }, 'products.create'],
      ['GET', '/catalog/items', undefined, 'products.view|inventory.view'], ['POST', `/websites/${w.s1}/sync`, {}, 'website.sync'],
      ['GET', `/websites/${w.s1}/manifest`, undefined, 'website.view'], ['GET', '/websites', undefined, 'website.view'], ['POST', `/websites/${w.s1}/switch`, {}, 'website.view']
    ];
    for (const [method, url, body, perm] of denied) {
      const r = await h.call(method, url, { token: t, body });
      assert.equal(r.status, 403, `${method} ${url}`); assert.equal(r.body.code, 'PERMISSION_DENIED'); assert.equal(r.body.requiredPermission, perm);
    }
    assert.equal(h.db.orders.find((x) => x.id === w.o1).status, 'NEW'); assert.equal(h.db.catalog.find((x) => x.id === w.p1).stock, 10);
    assert.equal((await h.call('GET', '/orders/feed', { token: t })).status, 200); // the one thing it may do
    // AI reads obey the same permissions
    assert.equal((await h.call('POST', '/ai/command', { token: t, body: { text: 'which products are low in stock' } })).status, 403);
    const kpi = (await h.call('GET', '/ai/analytics/kpis', { token: t })).body.kpis; assert.equal(kpi.totalCatalogSkus, 0);
  });

  T('6. manager cannot grant themselves (or anyone) permissions or access', async (h) => {
    const o = await register(h, 'Org A'); const w = await world(h, o);
    const m = await manager(h, o, 'm1@perm.example.com', { permissions: ['orders.view'], websiteIds: [w.s1] });
    const t = m.token;
    for (const [method, url, body] of [
      ['GET', '/admin/permissions'], ['GET', '/admin/managers'], ['GET', `/admin/users/${m.id}/access`],
      ['PUT', `/admin/users/${m.id}/permissions`, { permissions: ALL }], ['PUT', `/admin/users/${m.id}/websites`, { websiteIds: [w.s1, w.s2, 'workspace'] }],
      ['POST', `/admin/users/${m.id}/websites`, { websiteId: w.s2 }], ['DELETE', `/admin/users/${m.id}/websites/${w.s1}`], ['POST', `/admin/users/${m.id}/revoke-access`, {}],
      ['POST', '/admin/users/invite', { email: 'x@perm.example.com', role: 'OWNER' }], ['PUT', `/websites/${w.s2}/credentials`, { platform: 'woocommerce' }], ['DELETE', `/websites/${w.s1}`],
      ['POST', '/discovery/probe', { targetUrl: 'https://example.com' }]
    ]) assert.equal((await h.call(method, url, { token: t, body })).status, 403, `${method} ${url}`);
    // client-supplied identity/permissions are ignored
    const spoof = { 'x-user-role': 'OWNER', 'x-role': 'OWNER', 'x-org-id': 'x', 'x-permissions': ALL.join(',') };
    assert.equal((await h.call('PATCH', `/catalog/items/${w.p1}/stock`, { token: t, body: { stock: 1, role: 'OWNER', permissions: ALL }, headers: spoof })).status, 403);
    assert.equal((await h.call('GET', `/orders/feed?websiteId=${w.s2}&role=OWNER`, { token: t, headers: spoof })).status, 403);
    assert.deepEqual(h.db.users.find((u) => u.id === m.id).grants, ['orders.view']);
    assert.deepEqual(h.db.websiteAssignments.filter((a) => a.userId === m.id).map((a) => a.websiteId), [w.s1]);
  });

  T('7. revoking an assignment blocks access immediately (same token)', async (h) => {
    const o = await register(h, 'Org A'); const w = await world(h, o);
    const m = await manager(h, o, 'm1@perm.example.com', { permissions: ALL, websiteIds: [w.s1, w.s2] });
    assert.equal((await h.call('GET', `/websites/${w.s2}/manifest`, { token: m.token })).status, 200);
    assert.equal((await h.call('DELETE', `/admin/users/${m.id}/websites/${w.s2}`, { token: o.token })).status, 200);
    assert.equal((await h.call('GET', `/websites/${w.s2}/manifest`, { token: m.token })).status, 403);
    assert.equal((await h.call('POST', `/orders/${w.o2}/fulfill`, { token: m.token, body: { trackingNumber: 'T9' } })).status, 403);
    assert.deepEqual(ids(await h.call('GET', '/orders/feed', { token: m.token })), [w.o1]);
    assert.equal((await h.call('GET', `/websites/${w.s1}/manifest`, { token: m.token })).status, 200); // the other assignment is untouched
    assert.equal((await h.call('DELETE', `/admin/users/${m.id}/websites/${w.s2}`, { token: o.token })).status, 404); // already gone
  });

  T('8. revoking a permission blocks that operation immediately (same token)', async (h) => {
    const o = await register(h, 'Org A'); const w = await world(h, o);
    const m = await manager(h, o, 'm1@perm.example.com', { permissions: ALL, websiteIds: [w.s1] });
    assert.equal((await h.call('PATCH', `/catalog/items/${w.p1}/stock`, { token: m.token, body: { stock: 8 } })).status, 200);
    const put = await h.call('PUT', `/admin/users/${m.id}/permissions`, { token: o.token, body: { permissions: ALL.filter((p) => p !== 'inventory.update') } });
    assert.equal(put.status, 200); assert.ok(!put.body.permissions.includes('inventory.update'));
    assert.equal((await h.call('PATCH', `/catalog/items/${w.p1}/stock`, { token: m.token, body: { stock: 7 } })).status, 403);
    assert.equal(h.db.catalog.find((x) => x.id === w.p1).stock, 8);
    assert.equal((await h.call('POST', `/orders/${w.o1}/fulfill`, { token: m.token, body: { trackingNumber: 'T7' } })).status, 200); // other permissions remain
    // full revoke: signs the manager out as well
    assert.equal((await h.call('POST', `/admin/users/${m.id}/revoke-access`, { token: o.token, body: {} })).status, 200);
    assert.equal((await h.call('GET', '/orders/feed', { token: m.token })).status, 401);
    const again = await h.call('POST', '/auth/login', { body: { email: m.email, password: 'wrong' } }); assert.equal(again.status, 401);
  });

  T('9. a manager cannot change another manager\'s assignments or permissions', async (h) => {
    const o = await register(h, 'Org A'); const w = await world(h, o);
    const m1 = await manager(h, o, 'm1@perm.example.com', { permissions: ALL, websiteIds: [w.s1] });
    const m2 = await manager(h, o, 'm2@perm.example.com', { permissions: ['orders.view'], websiteIds: [w.s2] });
    for (const [method, url, body] of [
      ['PUT', `/admin/users/${m2.id}/websites`, { websiteIds: [w.s1, w.s2] }], ['POST', `/admin/users/${m2.id}/websites`, { websiteId: w.s1 }],
      ['DELETE', `/admin/users/${m2.id}/websites/${w.s2}`], ['PUT', `/admin/users/${m2.id}/permissions`, { permissions: [] }], ['POST', `/admin/users/${m2.id}/revoke-access`, {}]
    ]) assert.equal((await h.call(method, url, { token: m1.token, body })).status, 403, `${method} ${url}`);
    assert.deepEqual(h.db.websiteAssignments.filter((a) => a.userId === m2.id).map((a) => a.websiteId), [w.s2]);
    assert.deepEqual(h.db.users.find((u) => u.id === m2.id).grants, ['orders.view']);
    assert.deepEqual(ids(await h.call('GET', '/orders/feed', { token: m2.token })), [w.o2]); // m2 unaffected
  });

  T('10. cross-website order and inventory access is rejected; two managers see only their own websites', async (h) => {
    const o = await register(h, 'Org A'); const w = await world(h, o);
    const m1 = await manager(h, o, 'm1@perm.example.com', { permissions: ALL, websiteIds: [w.s1] });
    const m2 = await manager(h, o, 'm2@perm.example.com', { permissions: ALL, websiteIds: [w.s2] });
    assert.deepEqual(ids(await h.call('GET', '/orders/feed', { token: m1.token })), [w.o1]);
    assert.deepEqual(ids(await h.call('GET', '/orders/feed', { token: m2.token })), [w.o2]);
    assert.equal((await h.call('POST', `/orders/${w.o2}/fulfill`, { token: m1.token, body: { trackingNumber: 'C1' } })).status, 403);
    assert.equal((await h.call('POST', `/orders/${w.o1}/fulfill`, { token: m2.token, body: { trackingNumber: 'C2' } })).status, 403);
    assert.equal((await h.call('PATCH', `/catalog/items/${w.p1}/stock`, { token: m2.token, body: { stock: 0 } })).status, 403);
    // AI answers are scoped as well
    const ans = (await h.call('POST', '/ai/command', { token: m1.token, body: { text: 'show me all orders' } })).body;
    assert.deepEqual(ans.data.map((x) => x.id), [w.o1]);
    // switching websites is per user
    await h.call('POST', `/websites/${w.s1}/switch`, { token: m1.token, body: {} });
    await h.call('POST', `/websites/${w.s2}/switch`, { token: m2.token, body: {} });
    assert.equal((await h.call('GET', '/websites', { token: m1.token })).body.find((x) => x.id === w.s1).isActive, true);
    assert.equal((await h.call('GET', '/websites', { token: m2.token })).body.find((x) => x.id === w.s2).isActive, true);
  });

  T('11. unauthenticated requests are rejected on every new or changed route', async (h) => {
    const o = await register(h, 'Org A'); const w = await world(h, o);
    const m = await manager(h, o, 'm1@perm.example.com', { permissions: ALL, websiteIds: [w.s1] });
    const routes = [
      ['GET', '/websites'], ['GET', `/websites/${w.s1}/manifest`], ['POST', `/websites/${w.s1}/sync`], ['POST', `/websites/${w.s1}/switch`], ['GET', '/orders/feed'], ['POST', `/orders/${w.o1}/fulfill`],
      ['GET', '/catalog/items'], ['POST', '/catalog/items'], ['PATCH', `/catalog/items/${w.p1}/stock`], ['PATCH', `/catalog/items/${w.p1}/price`], ['GET', '/admin/permissions'], ['GET', '/admin/managers'],
      ['GET', `/admin/users/${m.id}/access`], ['PUT', `/admin/users/${m.id}/permissions`], ['PUT', `/admin/users/${m.id}/websites`], ['POST', `/admin/users/${m.id}/websites`],
      ['DELETE', `/admin/users/${m.id}/websites/${w.s1}`], ['POST', `/admin/users/${m.id}/revoke-access`], ['POST', '/ai/command'], ['GET', '/audit'], ['POST', '/discovery/probe']
    ];
    for (const [method, url] of routes) {
      assert.equal((await h.call(method, url, { body: {} })).status, 401, `${method} ${url} (no token)`);
      assert.equal((await h.call(method, url, { token: 'abc.def.ghi', body: {} })).status, 401, `${method} ${url} (bad token)`);
    }
  });

  T('12. existing owner functionality still works; new managers start with NO access (fail closed)', async (h) => {
    const o = await register(h, 'Org A'); const w = await world(h, o);
    const created = await h.call('POST', '/catalog/items', { token: o.token, body: { name: 'New', sku: 'NEW-1', price: 9, stock: 5 } });
    assert.equal(created.status, 201);
    assert.equal((await h.call('PATCH', `/catalog/items/${created.body.id}/price`, { token: o.token, body: { price: 12 } })).status, 200);
    assert.equal((await h.call('POST', `/orders/${w.ow}/fulfill`, { token: o.token, body: { trackingNumber: 'OK1' } })).status, 200);
    assert.equal((await h.call('GET', '/ai/analytics/kpis', { token: o.token })).status, 200);
    assert.equal((await h.call('POST', `/websites/${w.s1}/switch`, { token: o.token, body: {} })).status, 200);
    const bare = await manager(h, o, 'bare@perm.example.com'); // no permissions, no websites
    for (const url of ['/orders/feed', '/catalog/items', '/websites']) assert.equal((await h.call('GET', url, { token: bare.token })).status, 403, url);
    assert.equal((await h.call('POST', '/catalog/items', { token: bare.token, body: { name: 'N', sku: 'B1', price: 1 } })).status, 403);
    const sum = await h.call('GET', `/admin/users/${bare.id}/access`, { token: o.token });
    assert.deepEqual(sum.body.permissions, []); assert.deepEqual(sum.body.websites, []);
  });

  T('13. owner APIs validate input: unknown permissions / foreign websites / owners are rejected', async (h) => {
    const o = await register(h, 'Org A'); const w = await world(h, o);
    const m = await manager(h, o, 'm1@perm.example.com');
    const perms = await h.call('GET', '/admin/permissions', { token: o.token });
    assert.deepEqual(perms.body.permissions.map((p) => p.id).sort(), [...ALL].sort());
    for (const bad of [['content.edit'], ['orders.view', 'nope'], 'orders.view', [1], ['*']]) assert.equal((await h.call('PUT', `/admin/users/${m.id}/permissions`, { token: o.token, body: { permissions: bad } })).status, 400);
    assert.equal((await h.call('PUT', `/admin/users/${m.id}/websites`, { token: o.token, body: { websiteIds: ['site_nope'] } })).status, 400);
    assert.equal((await h.call('POST', '/admin/users/invite', { token: o.token, body: { email: 'z@perm.example.com', role: 'MANAGER', permissions: ['bogus'] } })).status, 400);
    assert.equal((await h.call('PUT', `/admin/users/${o.userId}/permissions`, { token: o.token, body: { permissions: [] } })).status, 404); // owners are not editable
    const ok = await h.call('PUT', `/admin/users/${m.id}/permissions`, { token: o.token, body: { permissions: ['orders.view', 'orders.view'] } });
    assert.deepEqual(ok.body.permissions, ['orders.view']);
    const mine = await h.call('GET', '/admin/managers', { token: o.token }); assert.equal(mine.body.length, 1);
  });

  T('14. permission changes and denials are audited; managers only see their own audit entries', async (h) => {
    const o = await register(h, 'Org A'); const w = await world(h, o);
    const m = await manager(h, o, 'm1@perm.example.com', { permissions: ['orders.view'], websiteIds: [w.s1] });
    await h.call('PUT', `/admin/users/${m.id}/permissions`, { token: o.token, body: { permissions: ['orders.view', 'inventory.view'] } });
    await h.call('POST', `/admin/users/${m.id}/websites`, { token: o.token, body: { websiteId: w.s2 } });
    await h.call('POST', `/orders/${w.o1}/fulfill`, { token: m.token, body: { trackingNumber: 'A1' } }); // denied
    const titles = (await h.call('GET', '/audit', { token: o.token })).body.map((l) => l.title);
    for (const t of ['Manager permissions changed', 'Website assigned to manager', 'Access denied']) assert.ok(titles.includes(t), `missing audit: ${t}`);
    const mine = (await h.call('GET', '/audit', { token: m.token })).body;
    assert.ok(mine.every((l) => l.userId === m.id), 'manager must not read other people\'s audit entries');
  });

  T('15. customer data is hidden without customers.view (also in search and AI answers)', async (h) => {
    const o = await register(h, 'Org A'); const w = await world(h, o);
    const m = await manager(h, o, 'm1@perm.example.com', { permissions: ['orders.view'], websiteIds: [w.s1] });
    const feed = (await h.call('GET', '/orders/feed', { token: m.token })).body;
    assert.equal(feed.length, 1); assert.ok(!JSON.stringify(feed).includes('Cust S1') && !JSON.stringify(feed).includes('Addr S1'));
    assert.deepEqual((await h.call('GET', '/orders/feed?search=Cust', { token: m.token })).body, []);
    const ans = (await h.call('POST', '/ai/command', { token: m.token, body: { text: 'show all orders' } })).body;
    assert.ok(!JSON.stringify(ans).includes('Cust S1'));
    await h.call('PUT', `/admin/users/${m.id}/permissions`, { token: o.token, body: { permissions: ['orders.view', 'customers.view'] } });
    assert.ok(JSON.stringify((await h.call('GET', '/orders/feed', { token: m.token })).body).includes('Cust S1'));
  });
}
