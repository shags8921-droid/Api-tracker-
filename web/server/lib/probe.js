/**
 * Server-side discovery probe with SSRF protection enforced at CONNECT time.
 * Hostname checks alone are bypassable (DNS rebinding), so a custom `lookup` validates every resolved
 * address before the socket is opened. Redirects are never followed; responses are size/time limited.
 */
import dns from 'node:dns';
import https from 'node:https';
import net from 'node:net';

export function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) || a >= 224
    );
  }
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    if (l === '::' || l === '::1') return true;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(l);
    if (mapped) return isPrivateAddress(mapped[1]);
    return l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe8') || l.startsWith('fe9') || l.startsWith('fea') || l.startsWith('feb') || l.startsWith('ff');
  }
  return true;
}

export function safeLookup(hostname, options, callback) {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    const list = Array.isArray(addresses) ? addresses : [{ address: addresses, family: net.isIPv6(addresses) ? 6 : 4 }];
    if (!list.length || list.some((a) => isPrivateAddress(a.address))) {
      return callback(Object.assign(new Error('Target resolves to a private or reserved address'), { code: 'EBLOCKED' }));
    }
    if (options && options.all) return callback(null, list);
    return callback(null, list[0].address, list[0].family);
  });
}

/** GET https://host/path with SSRF-safe connect. Resolves { ok, status, latency, json, error }. */
export function safeGet(origin, pathName, headers = {}, { timeoutMs = 3500, maxBytes = 1_000_000 } = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    let settled = false;
    const done = (v) => {
      if (!settled) {
        settled = true;
        resolve({ latency: Date.now() - start, ...v });
      }
    };
    let req;
    try {
      req = https.request(`${origin}${pathName}`, { method: 'GET', headers, lookup: safeLookup, timeout: timeoutMs }, (res) => {
        const chunks = [];
        let size = 0;
        res.on('data', (c) => {
          size += c.length;
          if (size > maxBytes) {
            req.destroy();
            return done({ ok: false, status: res.statusCode, error: 'Response too large' });
          }
          chunks.push(c);
        });
        res.on('end', () => {
          let json = null;
          if (String(res.headers['content-type'] || '').includes('json')) {
            try {
              json = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            } catch {
              json = null;
            }
          }
          done({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, json });
        });
        res.on('error', (e) => done({ ok: false, status: 0, error: e.message }));
      });
    } catch (e) {
      return done({ ok: false, status: 0, error: e.message });
    }
    req.on('timeout', () => {
      req.destroy();
      done({ ok: false, status: 0, error: 'Timed out' });
    });
    req.on('error', (e) => done({ ok: false, status: 0, error: e.code === 'EBLOCKED' ? 'Blocked: private address' : e.message }));
    req.end();
  });
}
