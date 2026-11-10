// Same suite as permissions.test.js, but over REAL Express and real HTTP (run in CI after `npm ci`).
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { createApp } from '../app.js';
import { defineSuite } from './permissions.suite.js';

const silent = { warn() {}, error() {}, log() {} };
async function boot() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-permrx-'));
  const inst = createApp({ express, dataDir, authSecret: 'x'.repeat(40), logger: silent, allowSimulatedPayments: true, rateLimits: { apiMax: 1e9, authMax: 1e9, aiMax: 1e9, probeMax: 1e9 } });
  const server = await new Promise((r) => { const s = inst.app.listen(0, '127.0.0.1', () => r(s)); });
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  const call = async (method, url, { token, body, headers = {} } = {}) => {
    const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: body === undefined || method === 'GET' ? undefined : JSON.stringify(body) });
    let json = null; try { json = await res.json(); } catch { json = null; }
    return { status: res.status, body: json };
  };
  return { ...inst, call, close: () => new Promise((r) => server.close(r)) };
}
defineSuite(test, boot, 'perm[real-express]');
