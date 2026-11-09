// Runs against REAL Express (CI installs it). Closes the gap left by the test-only shim.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { createApp } from '../app.js';

async function boot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-rx-'));
  const dist = path.join(dir, 'dist'); fs.mkdirSync(dist);
  fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>spa</title>');
  const inst = createApp({ express, dataDir: path.join(dir, 'data'), authSecret: 'x'.repeat(40), distDir: dist, allowedOrigins: [], production: true, demo: false, trustProxy: false, platformAdminEmails: [] });
  const server = await new Promise((r) => { const s = inst.app.listen(0, '127.0.0.1', () => r(s)); });
  return { base: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) };
}

test('real express: health, ready, headers, SPA fallback, JSON 404, body limit', async (t) => {
  const { base, close } = await boot();
  t.after(close);
  assert.equal((await fetch(`${base}/api/v1/health`)).status, 200);
  assert.equal((await fetch(`${base}/api/v1/ready`)).status, 200);
  const r = await fetch(`${base}/api/v1/health`);
  assert.ok(r.headers.get('content-security-policy'));
  assert.ok(r.headers.get('x-request-id'));
  const spa = await fetch(`${base}/some/client/route`);
  assert.match(await spa.text(), /spa/);
  const nf = await fetch(`${base}/api/v1/nope`);
  assert.equal(nf.status, 404);
  assert.match(nf.headers.get('content-type') || '', /json/);
  const big = await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'a@b.co', password: 'x'.repeat(2_000_000) }) });
  assert.equal(big.status, 413);
  const bad = await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad' });
  assert.ok([400, 422].includes(bad.status));
});
