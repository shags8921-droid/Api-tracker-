/**
 * Security primitives: rate limiting, secret redaction, SSRF-safe URL validation,
 * security headers and CORS. No third-party dependencies; compatible with Express 4 and 5.
 */
import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, fixed window). For multi-instance deployments use a shared store.
// ---------------------------------------------------------------------------
export function createRateLimiter({ windowMs, max, keyFn, name = 'rate', now = () => Date.now() }) {
  const hits = new Map();
  return function rateLimit(req, res, next) {
    const t = now();
    if (hits.size > 20000) {
      for (const [k, v] of hits) if (v.resetAt <= t) hits.delete(k);
    }
    const key = `${name}:${keyFn(req)}`;
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= t) {
      entry = { count: 0, resetAt: t + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    const remaining = Math.max(0, max - entry.count);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    if (entry.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - t) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({ error: 'Too Many Requests', message: 'Rate limit exceeded. Try again later.', retryAfterSeconds });
    }
    return next();
  };
}

// ---------------------------------------------------------------------------
// Secret redaction for anything written to logs / audit trails.
// ---------------------------------------------------------------------------
const SENSITIVE_KEY = '[A-Za-z0-9_-]*(?:password|passwd|secret|token|api[_-]?key|apikey|authorization|private[_-]?key|credential)[A-Za-z0-9_-]*';

export function redactSecrets(input) {
  let s = String(input ?? '');
  s = s.replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi, '$1 [REDACTED]');
  s = s.replace(/eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g, '[REDACTED_JWT]');
  s = s.replace(/\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{6,}/g, '[REDACTED_KEY]');
  s = s.replace(/\bwhsec_[A-Za-z0-9]{6,}/g, '[REDACTED_WEBHOOK_SECRET]');
  s = s.replace(
    new RegExp(`(["']?${SENSITIVE_KEY}["']?\\s*[:=]\\s*)(?:"[^"]*"|'[^']*'|[^\\s,;&}"']+)`, 'gi'),
    '$1[REDACTED]'
  );
  s = s.replace(/\b(api key|secret|password|passcode|token)\s+(?:is|was|=|:)\s+\S+/gi, '$1 is [REDACTED]');
  return s;
}

// ---------------------------------------------------------------------------
// Public-URL validation (anti-SSRF). The server must never fetch a URL that fails this check.
// NOTE: a hostname check cannot stop DNS rebinding; any code that actually fetches a validated URL
// must also validate the resolved IP address at connect time.
// ---------------------------------------------------------------------------
const BLOCKED_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.home.arpa', '.corp', '.intranet'];

export function validatePublicUrl(raw, { allowedHosts = [] } = {}) {
  let parsed;
  try {
    parsed = new URL(String(raw ?? '').trim());
  } catch {
    return { ok: false, reason: 'Invalid URL format' };
  }
  const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
  const explicitlyAllowed = allowedHosts.map((h) => h.toLowerCase()).includes(host);

  if (parsed.protocol !== 'https:') return { ok: false, reason: 'HTTPS is mandatory' };
  if (parsed.username || parsed.password) return { ok: false, reason: 'Credentials in URL are not allowed' };
  if (explicitlyAllowed) return { ok: true, url: parsed.href, host };

  // IP literals (v4 in any numeric spelling is normalised by URL(); v6 is bracketed) are rejected outright.
  if (host.startsWith('[') || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || /^\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) {
    return { ok: false, reason: 'IP address targets are not allowed; use a public DNS hostname' };
  }
  if (host === 'localhost' || host === 'metadata.google.internal' || host === 'metadata') {
    return { ok: false, reason: 'Private or metadata hosts are forbidden' };
  }
  if (BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    return { ok: false, reason: 'Private or internal hostnames are forbidden' };
  }
  if (!host.includes('.')) return { ok: false, reason: 'Single-label hostnames are not allowed' };
  return { ok: true, url: parsed.href, host };
}

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'"
].join('; ');

export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  if (req.secure || proto === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  if (String(req.path || req.url || '').startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
}

// ---------------------------------------------------------------------------
// CORS. Auth uses the Authorization header (no cookies), so credentials are never enabled.
// Same-origin requests are always fine; cross-origin requests must be explicitly allow-listed.
// ---------------------------------------------------------------------------
export function corsPolicy({ allowedOrigins = [] } = {}) {
  const allowed = new Set(allowedOrigins.map((o) => o.trim()).filter(Boolean));
  return function cors(req, res, next) {
    const origin = req.headers.origin;
    if (!origin) return next();

    let sameOrigin = false;
    try {
      sameOrigin = new URL(origin).host === req.headers.host;
    } catch {
      return res.status(403).json({ error: 'Forbidden', message: 'Invalid Origin header' });
    }
    const isAllowed = sameOrigin || allowed.has(origin);
    res.setHeader('Vary', 'Origin');

    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key');
      res.setHeader('Access-Control-Max-Age', '600');
    }
    if (req.method === 'OPTIONS') {
      return isAllowed ? res.status(204).end() : res.status(403).json({ error: 'Forbidden', message: 'Origin not allowed' });
    }
    if (!isAllowed) {
      return res.status(403).json({ error: 'Forbidden', message: 'Origin not allowed' });
    }
    return next();
  };
}

// ---------------------------------------------------------------------------
// Secret-at-rest helpers (AES-256-GCM) for values the server must be able to read back (e.g. webhook signing secrets).
// ---------------------------------------------------------------------------
export function deriveKey(secret) {
  return crypto.createHash('sha256').update(`sitepulse-data-key:${secret}`).digest();
}

export function encryptSecret(plain, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export function decryptSecret(payload, key) {
  try {
    const [v, iv, tag, enc] = String(payload).split(':');
    if (v !== 'v1') return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(enc, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

export function randomId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}
