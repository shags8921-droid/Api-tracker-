/**
 * Phase 13 test harness. Records every test with ID, expected, actual, pass/fail, evidence, severity.
 * Only tests that actually executed are recorded; anything not executable is listed separately as UNVERIFIED.
 * NOTE: the Express layer is replaced by the test-only shim (no express in this sandbox).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createShim } from '../express-shim.js';
import { createApp } from '../../app.js';

export const SECRET = 'p13-'.padEnd(48, 'x');
export const PW = 'Str0ng-Passw0rd!';
export const API = '/api/v1';
export const results = [];
export const silent = { warn() {}, error() {}, log() {} };

export async function T(id, area, feature, expected, severity, fn) {
  const rec = { id, area, feature, expected, severity, actual: '', pass: false, status: 'FAIL', evidence: '' };
  try {
    const r = await fn();
    rec.pass = r.pass === true;
    rec.status = r.unverified ? 'UNVERIFIED' : r.pass === true ? 'PASS' : 'FAIL';
    rec.actual = r.actual ?? (rec.pass ? 'as expected' : 'unexpected');
    rec.evidence = r.evidence ?? '';
  } catch (e) {
    rec.pass = false;
    rec.actual = `threw: ${e.message}`;
    rec.evidence = String(e.stack || '').split('\n').slice(0, 3).join(' | ');
  }
  results.push(rec);
  console.log(`${rec.status} ${id} ${feature}${rec.pass ? '' : ' -> ' + rec.actual}`);
  return rec;
}

export function boot(extra = {}) {
  const dataDir = extra.dataDir || fs.mkdtempSync(path.join(os.tmpdir(), 'p13-'));
  const clockRef = { t: Date.now() };
  const inst = createApp({
    express: createShim(), dataDir, authSecret: SECRET, logger: silent,
    now: extra.fixedClock === false ? undefined : () => clockRef.t,
    rateLimits: { apiMax: 1e9, authMax: 1e9, aiMax: 1e9, probeMax: 1e9 }, ...extra
  });
  const call = (method, url, { token, body, headers = {}, ip } = {}) =>
    inst.app.handle({ method, url: API + url, body, ip, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers } });
  return { ...inst, dataDir, call, clock: clockRef, advance: (ms) => { clockRef.t += ms; } };
}

let seq = 0;
export async function register(h, label = 'u', orgName) {
  seq += 1;
  const email = `${label}${seq}@test.example.com`;
  const r = await h.call('POST', '/auth/register', { body: { orgName: orgName || `Org ${label}${seq}`, email, password: PW, name: 'Tester' } });
  if (r.status !== 201) throw new Error(`register failed ${r.status} ${JSON.stringify(r.body)}`);
  return { ...r.body, email };
}

export async function upgrade(h, a, planId = 'plan_pro', gateway = 'KHALTI') {
  const init = await h.call('POST', '/commercial/payments/initiate', { token: a.token, body: { planId, gateway } });
  const v = await h.call('POST', '/commercial/payments/verify', { token: a.token, body: { transactionId: init.body.transactionId } });
  return v;
}

/** Real HTTP front for load tests: node:http -> shim app. Measures app logic over a real socket (not Express). */
export function listen(h) {
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', async () => {
      let body;
      try { body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : undefined; } catch { body = undefined; }
      const out = await h.app.handle({ method: req.method, url: req.url, headers: req.headers, body, ip: req.socket.remoteAddress });
      const payload = JSON.stringify(out.body ?? {});
      res.writeHead(out.status, { 'Content-Type': 'application/json', ...Object.fromEntries(Object.entries(out.headers).map(([k, v]) => [k, String(v)])) });
      res.end(payload);
    });
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({ server, port: server.address().port })));
}

export function save(name) {
  const dir = path.dirname(new URL(import.meta.url).pathname);
  fs.writeFileSync(path.join(dir, `${name}.results.json`), JSON.stringify(results, null, 2));
}
export const summary = () => ({ total: results.length, passed: results.filter((r) => r.status === 'PASS').length, failed: results.filter((r) => r.status === 'FAIL').length, unverified: results.filter((r) => r.status === 'UNVERIFIED').length });
