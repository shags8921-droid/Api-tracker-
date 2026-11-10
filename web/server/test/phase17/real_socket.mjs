// REAL-SOCKET tests: the WooCommerce connector talks real HTTPS (TLS, headers, chunking) to a LOCAL fake store.
// This is NOT WooCommerce and NOT safeRequest (which correctly refuses local addresses). It validates wire-level handling only.
import https from 'node:https';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { T, results } from '../phase13/harness.mjs';
import { createWooConnector } from '../../lib/connectors/woocommerce.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p17-tls-'));
execSync(`openssl req -x509 -newkey rsa:2048 -nodes -keyout ${dir}/k.pem -out ${dir}/c.pem -days 1 -subj "/CN=localhost" 2>/dev/null`);
const CK = 'ck_' + 'a'.repeat(20), CS = 'cs_' + 'b'.repeat(20); const good = 'Basic ' + Buffer.from(`${CK}:${CS}`).toString('base64');
const products = Array.from({ length: 250 }, (_, i) => ({ id: i + 1, name: `P${i + 1}`, sku: `S${i + 1}`, regular_price: '10', manage_stock: true, stock_quantity: 5, categories: [{ name: 'C' }], images: [] }));
let mode = 'ok'; let putBody = null;
const srv = https.createServer({ key: fs.readFileSync(dir + '/k.pem'), cert: fs.readFileSync(dir + '/c.pem') }, (req, res) => {
  const u = new URL(req.url, 'https://x'); const send = (code, body, h = {}) => { res.writeHead(code, { 'content-type': 'application/json', ...h }); res.end(JSON.stringify(body)); };
  if (mode === 'ratelimit') return send(429, {});
  if (mode === 'html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<html>maintenance</html>'); }
  if (mode === 'slow') return; // never answers
  if (u.pathname === '/wp-json/') return send(200, { name: 'Local fake', namespaces: ['wc/v3'] });
  if (req.headers.authorization !== good) return send(401, { code: 'woocommerce_rest_cannot_view' });
  if (req.method === 'GET' && u.pathname === '/wp-json/wc/v3/products') { const per = +u.searchParams.get('per_page'), pg = +u.searchParams.get('page'); return send(200, products.slice((pg - 1) * per, pg * per), { 'X-WP-TotalPages': String(Math.ceil(products.length / per)) }); }
  if (req.method === 'GET' && u.pathname === '/wp-json/wc/v3/products/categories') return send(200, [], { 'X-WP-TotalPages': '1' });
  if (req.method === 'PUT') { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => { putBody = JSON.parse(Buffer.concat(c).toString()); send(200, { id: 1, regular_price: putBody.regular_price }); }); return; }
  send(404, {});
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const http = ({ method, path: p, headers, body, timeoutMs = 1500 }) => new Promise((resolve) => {
  const payload = body === undefined ? null : Buffer.from(JSON.stringify(body)); const h = { Accept: 'application/json', ...headers }; if (payload) { h['Content-Type'] = 'application/json'; h['Content-Length'] = payload.length; }
  const req = https.request({ host: '127.0.0.1', port, path: p, method, headers: h, rejectUnauthorized: false, timeout: timeoutMs }, (res) => { const c = []; res.on('data', (d) => c.push(d)); res.on('end', () => { let json = null; try { json = JSON.parse(Buffer.concat(c).toString()); } catch {} resolve({ ok: res.statusCode < 300, status: res.statusCode, headers: res.headers, json }); }); });
  req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 0, error: 'Timed out' }); }); req.on('error', (e) => resolve({ ok: false, status: 0, error: e.message })); if (payload) req.write(payload); req.end();
});
const woo = createWooConnector({ http }); const creds = { consumerKey: CK, consumerSecret: CS }; const O = 'https://local';

await T('REAL-01', 'RealSocket', 'detect() over real TLS parses the WP index', 'detected', 'P1', async () => { const r = await woo.detect(O); return { pass: r.detected === true, actual: JSON.stringify(r) }; });
await T('REAL-02', 'RealSocket', 'verify() with good key OK; bad key -> AUTH_REJECTED', 'ok / AUTH_REJECTED', 'P1', async () => {
  const ok = await woo.verify(O, creds); let code; try { await woo.verify(O, { consumerKey: CK, consumerSecret: 'cs_x' }); } catch (e) { code = e.code; }
  return { pass: ok.ok && code === 'AUTH_REJECTED', actual: `good=${ok.ok} bad=${code}` };
});
await T('REAL-03', 'RealSocket', 'Pagination follows the real X-WP-TotalPages header (250 products / 3 pages)', '250 products', 'P1', async () => { const r = await woo.readCatalog(O, creds); return { pass: r.products.length === 250 && !r.truncated, actual: `${r.products.length} products truncated=${r.truncated}` }; });
await T('REAL-04', 'RealSocket', 'Write sends correct JSON body and method', 'PUT {regular_price:"999"}', 'P1', async () => { await woo.updatePrice(O, creds, '1', 999); return { pass: putBody && putBody.regular_price === '999', actual: JSON.stringify(putBody) }; });
await T('REAL-05', 'RealSocket', 'HTTP 429 maps to RATE_LIMITED (not success)', 'RATE_LIMITED', 'P2', async () => { mode = 'ratelimit'; let c; try { await woo.readCatalog(O, creds); } catch (e) { c = e.code; } mode = 'ok'; return { pass: c === 'RATE_LIMITED', actual: String(c) }; });
await T('REAL-06', 'RealSocket', 'Store returns an HTML maintenance page with 200 -> not treated as data', 'BAD_RESPONSE', 'P1', async () => { mode = 'html'; let c; try { await woo.readCatalog(O, creds); } catch (e) { c = e.code; } mode = 'ok'; return { pass: c === 'BAD_RESPONSE', actual: String(c) }; });
await T('REAL-07', 'RealSocket', 'Hanging store -> clean timeout error, no hang', 'error within ~1.5 s', 'P2', async () => { mode = 'slow'; const t = Date.now(); let c; try { await woo.verify(O, creds); } catch (e) { c = e.code; } const ms = Date.now() - t; mode = 'ok'; return { pass: !!c && ms < 3000, actual: `${c} after ${ms} ms`, evidence: 'Timeout value here comes from this test wrapper; the production 8 s default in safeRequest was not exercised (see SEC-09).' }; });
srv.close();
fs.writeFileSync(new URL('./real.results.json', import.meta.url), JSON.stringify(results, null, 1));
console.log(`TOTAL ${results.length} PASS ${results.filter((r) => r.status === 'PASS').length} FAIL ${results.filter((r) => r.status === 'FAIL').length}`);
