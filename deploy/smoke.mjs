// Usage: node deploy/smoke.mjs https://staging.example.com [--register]
// Public checks always; --register creates a throwaway account (STAGING ONLY, never production).
const base = (process.argv[2] || '').replace(/\/$/, '');
if (!base) { console.error('usage: smoke.mjs <baseUrl> [--register]'); process.exit(2); }
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) failed++; };
const get = (p, o) => fetch(base + p, o);
let r = await get('/api/v1/health'); check('health 200', r.status === 200);
r = await get('/api/v1/ready'); check('ready 200', r.status === 200);
check('https only', base.startsWith('https://') || base.includes('localhost') || base.includes('127.0.0.1'));
check('CSP header', !!r.headers.get('content-security-policy'));
check('HSTS header', !!r.headers.get('strict-transport-security') || !base.startsWith('https://'));
r = await get('/'); check('SPA served', r.status === 200 && (await r.text()).includes('<div id="root"'));
r = await get('/api/v1/auth/me'); check('unauthenticated /me rejected', r.status === 401);
r = await get('/api/v1/commercial/payments/history'); check('billing requires auth', r.status === 401);
r = await get('/data/database.json'); check('database not exposed', r.status !== 200 || !(await r.text()).includes('passwordHash'));
if (process.argv.includes('--register')) {
  const email = `smoke+${Date.now()}@example.test`, password = `Sm0ke-${Math.random().toString(36).slice(2)}-Pw!`;
  r = await get('/api/v1/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, name: 'Smoke', orgName: 'Smoke Test Org' }) });
  const j = await r.json().catch(() => ({}));
  check('register', r.status === 201 || r.status === 200, `(${r.status})`);
  const token = j.token;
  if (token) {
    r = await get('/api/v1/auth/me', { headers: { authorization: `Bearer ${token}` } }); check('authenticated /me', r.status === 200);
    r = await get('/api/v1/commercial/payments/initiate', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: '{}' });
    check('no simulated payments', r.status >= 400);
  }
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED'); process.exit(failed ? 1 : 0);
