/**
 * Outbound webhook delivery: HMAC-signed, SSRF-safe at connect time, no redirects, bounded retries.
 * Signature header: X-SitePulse-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>">
 * Receivers should reject timestamps older than a few minutes and compare signatures in constant time.
 */
import crypto from 'node:crypto';
import https from 'node:https';
import { safeLookup } from './probe.js';

export function signPayload(secret, timestampSeconds, body) {
  return crypto.createHmac('sha256', secret).update(`${timestampSeconds}.${body}`).digest('hex');
}

export function safePost(url, headers, body, { timeoutMs = 5000, maxBytes = 64_000 } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v) => { if (!settled) { settled = true; resolve(v); } };
    let req;
    try {
      req = https.request(url, { method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(body) }, lookup: safeLookup, timeout: timeoutMs }, (res) => {
        let size = 0;
        res.on('data', (c) => { size += c.length; if (size > maxBytes) req.destroy(); });
        res.on('end', () => done({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode }));
        res.on('error', (e) => done({ ok: false, status: 0, error: e.message }));
      });
    } catch (e) {
      return done({ ok: false, status: 0, error: e.message });
    }
    req.on('timeout', () => { req.destroy(); done({ ok: false, status: 0, error: 'Timed out' }); });
    req.on('error', (e) => done({ ok: false, status: 0, error: e.code === 'EBLOCKED' ? 'Blocked: private address' : e.message }));
    req.write(body);
    req.end();
  });
}

/**
 * Deliver one event to one endpoint with retries. `post(url, headers, body)` is injectable for tests.
 * Returns { ok, attempts, status, error }.
 */
export async function deliverWithRetry({ url, secret, event, payload, now = () => Date.now(), post = safePost, delaysMs = [1000, 5000, 25000], sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const body = JSON.stringify({ id: `evt_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`, event, createdAt: new Date(now()).toISOString(), data: payload });
  let last = { ok: false, status: 0, error: 'not attempted' };
  for (let attempt = 1; attempt <= delaysMs.length + 1; attempt += 1) {
    const t = Math.floor(now() / 1000);
    last = await post(url, {
      'Content-Type': 'application/json',
      'User-Agent': 'SitePulse-Webhook/6.0',
      'X-SitePulse-Event': event,
      'X-SitePulse-Signature': `t=${t},v1=${signPayload(secret, t, body)}`
    }, body);
    if (last.ok) return { ...last, attempts: attempt };
    // 4xx (except 408/429) will not succeed on retry
    if (last.status >= 400 && last.status < 500 && last.status !== 408 && last.status !== 429) return { ...last, attempts: attempt };
    if (attempt <= delaysMs.length) await sleep(delaysMs[attempt - 1]);
  }
  return { ...last, attempts: delaysMs.length + 1 };
}
