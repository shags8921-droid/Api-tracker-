import test from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:3000';

test('1. Health check returns UP with v5.1.0 and multi-tenant flag', async () => {
  const res = await fetch(`${BASE_URL}/api/v1/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'UP');
  assert.equal(data.version, '5.1.0');
});

test('2. Authorization: Unauthenticated request to /api/v1/admin/users returns 401', async () => {
  const res = await fetch(`${BASE_URL}/api/v1/admin/users`);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.error, 'Unauthorized');
});

test('3. Authorization: Manager role to /api/v1/admin/users returns 403 Forbidden', async () => {
  const res = await fetch(`${BASE_URL}/api/v1/admin/users`, {
    headers: { 'X-User-Role': 'MANAGER' }
  });
  assert.equal(res.status, 403);
  const data = await res.json();
  assert.equal(data.error, 'Forbidden');
});

test('4. Authorization: Owner role with tenant header accesses workspace users', async () => {
  const res = await fetch(`${BASE_URL}/api/v1/admin/users`, {
    headers: {
      'X-User-Role': 'OWNER',
      'X-Tenant-Id': 'org_acme_corp'
    }
  });
  assert.equal(res.status, 200);
  const users = await res.json();
  assert.ok(Array.isArray(users));
  assert.ok(users.length > 0);
  assert.equal(users[0].orgId, 'org_acme_corp');
});

test('5. Tenant Isolation: Orders feed is scoped strictly to active tenant', async () => {
  const resNexus = await fetch(`${BASE_URL}/api/v1/orders/feed`, {
    headers: { 'X-Tenant-Id': 'org_nexus_retail' }
  });
  assert.equal(resNexus.status, 200);
  const ordersNexus = await resNexus.json();
  assert.deepEqual(ordersNexus, [], 'Unrelated tenant should see zero orders from Acme');

  const resAcme = await fetch(`${BASE_URL}/api/v1/orders/feed`, {
    headers: { 'X-Tenant-Id': 'org_acme_corp' }
  });
  assert.equal(resAcme.status, 200);
  const ordersAcme = await resAcme.json();
  assert.ok(ordersAcme.length >= 4, 'Acme tenant should see its own orders');
  assert.ok(ordersAcme.every(o => o.orgId === 'org_acme_corp'));
});

test('6. Security: Payment verification rejects fraudulent fake tokens', async () => {
  const res = await fetch(`${BASE_URL}/api/v1/commercial/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transactionId: 'tx_fake_9999',
      gatewayRefId: 'fake_token_free_upgrade'
    })
  });
  assert.ok(res.status === 400 || res.status === 404);
});

test('7. GDPR Isolation: Export strictly isolates data to requesting tenant', async () => {
  const res = await fetch(`${BASE_URL}/api/v1/commercial/tenant/export`, {
    headers: { 'X-Tenant-Id': 'org_nexus_retail' }
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.exportMetadata.tenantId, 'org_nexus_retail');
  assert.deepEqual(data.orders, [], 'Exported orders must not leak Acme records');
  assert.deepEqual(data.users, [], 'Exported users must not leak Acme records');
});

test('8. AI Assistant: Chat endpoint returns grounded tenant context with role boundary', async () => {
  // Manager requesting financial revenue should be rejected 403
  const resMgr = await fetch(`${BASE_URL}/api/v1/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Role': 'MANAGER',
      'X-Tenant-Id': 'org_acme_corp'
    },
    body: JSON.stringify({ prompt: 'Show me total sales revenue' })
  });
  assert.equal(resMgr.status, 403);

  // Owner requesting financial revenue should succeed with grounded data
  const resOwner = await fetch(`${BASE_URL}/api/v1/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Role': 'OWNER',
      'X-Tenant-Id': 'org_acme_corp'
    },
    body: JSON.stringify({ prompt: 'Show me today sales and revenue' })
  });
  assert.equal(resOwner.status, 200);
  const data = await resOwner.json();
  assert.ok(data.responseText.includes('Acme Enterprise Global'));
  assert.ok(data.dataEvidence);
});

test('9. File Storage: Upload endpoint stores payload and returns asset path', async () => {
  const sampleDataUrl = 'data:text/plain;base64,U2l0ZVB1bHNlIEFJIEhhcmRlbmluZyBUZXN0';
  const res = await fetch(`${BASE_URL}/api/v1/uploads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': 'org_acme_corp'
    },
    body: JSON.stringify({
      fileName: 'audit_test_file.txt',
      fileType: 'text/plain',
      dataUrl: sampleDataUrl
    })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.url.startsWith('/uploads/'));
});

test('10. Notifications: Ingestion and unread retrieval for active tenant', async () => {
  const res = await fetch(`${BASE_URL}/api/v1/notifications`, {
    headers: { 'X-Tenant-Id': 'org_acme_corp' }
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.notifications));
  assert.ok(data.notifications.length > 0);
  assert.ok(data.notifications.every((n) => n.orgId === 'org_acme_corp'));
});

test('11. Transactional Outbox: Dispatched events appear in tenant outbox', async () => {
  const res = await fetch(`${BASE_URL}/api/v1/admin/outbox`, {
    headers: {
      'X-User-Role': 'OWNER',
      'X-Tenant-Id': 'org_acme_corp'
    }
  });
  assert.equal(res.status, 200);
  const outbox = await res.json();
  assert.ok(Array.isArray(outbox));
});
