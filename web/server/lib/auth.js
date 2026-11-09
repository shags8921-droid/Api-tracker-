/**
 * Authentication primitives: scrypt password hashing and HMAC-signed session tokens.
 * Uses only node:crypto. Roles and tenants are NEVER taken from the client: the middleware
 * re-reads the user from the store on every request, so revocation and role changes apply immediately.
 */
import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(crypto.scrypt);

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const COMMON_PASSWORDS = new Set(['password', 'password1', 'password123', 'qwerty123', '1234567890', 'letmein123', 'admin12345', 'welcome123']);

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, SCRYPT_PARAMS);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password, stored) {
  try {
    const [scheme, saltB64, hashB64] = String(stored).split('$');
    if (scheme !== 'scrypt') return false;
    const expected = Buffer.from(hashB64, 'base64');
    const actual = crypto.scryptSync(String(password), Buffer.from(saltB64, 'base64'), expected.length, SCRYPT_PARAMS);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

// Used to keep login timing similar whether or not the account exists.
export const DUMMY_HASH = hashPassword('dummy-password-for-timing-only');

export function validatePasswordStrength(password) {
  const pw = String(password ?? '');
  if (pw.length < 10) return 'Password must be at least 10 characters';
  if (pw.length > 128) return 'Password must be at most 128 characters';
  if (COMMON_PASSWORDS.has(pw.toLowerCase())) return 'Password is too common';
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(pw)).length;
  if (classes < 2) return 'Password must mix at least two of: lowercase, uppercase, digits, symbols';
  return null;
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');

export function signToken(payload, secret, ttlSeconds, nowMs = Date.now()) {
  const iat = Math.floor(nowMs / 1000);
  const body = b64url(JSON.stringify({ ...payload, iat, exp: iat + ttlSeconds }));
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token, secret, nowMs = Date.now()) {
  if (typeof token !== 'string' || token.length > 2048) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = crypto.createHmac('sha256', secret).update(body).digest();
  let given;
  try {
    given = Buffer.from(sig, 'base64url');
  } catch {
    return null;
  }
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload || typeof payload.exp !== 'number' || payload.exp * 1000 <= nowMs) return null;
    return payload;
  } catch {
    return null;
  }
}

export function normaliseEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

export function publicUser(user) {
  return {
    id: user.id,
    orgId: user.orgId,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    lastLogin: user.lastLogin || 'Never',
    permissions: user.permissions || [],
    mustChangePassword: !!user.mustChangePassword
  };
}

/** Failed-login throttling per account (in addition to the per-IP rate limiter). */
export function createLoginThrottle({ maxFails = 5, lockMs = 15 * 60 * 1000, now = () => Date.now() } = {}) {
  const state = new Map();
  return {
    isLocked(email) {
      const s = state.get(email);
      return !!s && s.lockedUntil > now();
    },
    recordFailure(email) {
      const s = state.get(email) || { fails: 0, lockedUntil: 0 };
      s.fails += 1;
      if (s.fails >= maxFails) {
        s.lockedUntil = now() + lockMs;
        s.fails = 0;
      }
      state.set(email, s);
    },
    recordSuccess(email) {
      state.delete(email);
    }
  };
}

// ---------------------------------------------------------------------------
// Async hashing. scryptSync blocks the event loop (~30 ms per hash, measured in Phase 13), so request
// handlers use these instead: hashing runs in libuv's thread pool, concurrency is capped, and an overload
// fails fast with 503 instead of queueing without bound.
// ---------------------------------------------------------------------------
const MAX_CONCURRENT_HASHES = 4;
const MAX_QUEUED_HASHES = 200;
let activeHashes = 0;
const hashQueue = [];

function acquireHashSlot() {
  return new Promise((resolve, reject) => {
    const grant = () => {
      activeHashes += 1;
      resolve(() => {
        activeHashes -= 1;
        const next = hashQueue.shift();
        if (next) next();
      });
    };
    if (activeHashes < MAX_CONCURRENT_HASHES) grant();
    else if (hashQueue.length >= MAX_QUEUED_HASHES) reject(Object.assign(new Error('Too many concurrent password operations'), { status: 503 }));
    else hashQueue.push(grant);
  });
}

export async function hashPasswordAsync(password) {
  const release = await acquireHashSlot();
  try {
    const salt = crypto.randomBytes(16);
    const hash = await scryptAsync(String(password), salt, 64, SCRYPT_PARAMS);
    return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
  } finally {
    release();
  }
}

export async function verifyPasswordAsync(password, stored) {
  const release = await acquireHashSlot();
  try {
    const [scheme, saltB64, hashB64] = String(stored).split('$');
    if (scheme !== 'scrypt') return false;
    const expected = Buffer.from(hashB64, 'base64');
    const actual = await scryptAsync(String(password), Buffer.from(saltB64, 'base64'), expected.length, SCRYPT_PARAMS);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  } finally {
    release();
  }
}
