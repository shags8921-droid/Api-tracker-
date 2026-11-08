/**
 * SitePulse AI server bootstrap. All behaviour lives in app.js (createApp) so it can be tested.
 * Configuration is read from the environment and validated; production fails closed.
 *
 *   PORT                       listen port (default 3001)
 *   NODE_ENV                   "production" enables strict checks
 *   AUTH_SECRET                REQUIRED in production, >= 32 chars (signs sessions, derives data-encryption key)
 *   DATA_DIR                   database + backups directory (default ./data)
 *   ALLOWED_ORIGINS            comma-separated cross-origin allow-list (same-origin is always allowed)
 *   TRUST_PROXY                set to 1 (or a hop count) when behind a reverse proxy so client IPs are correct
 *   PLATFORM_ADMIN_EMAILS      comma-separated emails allowed to view platform-wide metrics
 *   ENABLE_DEMO_SEED=1         seed demo data + accounts (refused in production)
 *   DEMO_PASSWORD              password for demo accounts (random and logged once if unset)
 *   GEMINI_API_KEY             optional; enables model-backed assistant answers (falls back to rule-based)
 *   GEMINI_MODEL               optional model id (default gemini-2.5-flash)
 *   ALLOW_SIMULATED_PAYMENTS=1 allow fake payments for local development (refused in production)
 */
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createApp } from './app.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const env = process.env;
const production = env.NODE_ENV === 'production';
const list = (v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);
const flag = (v) => v === '1' || v === 'true';

let authSecret = env.AUTH_SECRET;
if (!authSecret) {
  if (production) {
    console.error('FATAL: AUTH_SECRET is required in production (>= 32 characters).');
    process.exit(1);
  }
  authSecret = crypto.randomBytes(32).toString('hex');
  console.warn('[dev] AUTH_SECRET not set: using a random secret. Sessions will be invalidated on restart.');
}

let trustProxy = false;
if (env.TRUST_PROXY) trustProxy = /^\d+$/.test(env.TRUST_PROXY) ? Number(env.TRUST_PROXY) : env.TRUST_PROXY;

let instance;
try {
  instance = createApp({
    express,
    dataDir: path.resolve(env.DATA_DIR || path.join(here, '..', 'data')),
    authSecret,
    distDir: path.resolve(here, '..', 'dist'),
    allowedOrigins: list(env.ALLOWED_ORIGINS),
    production,
    demo: flag(env.ENABLE_DEMO_SEED),
    demoPassword: env.DEMO_PASSWORD || null,
    allowSimulatedPayments: flag(env.ALLOW_SIMULATED_PAYMENTS),
    platformAdminEmails: list(env.PLATFORM_ADMIN_EMAILS),
    trustProxy,
    geminiApiKey: env.GEMINI_API_KEY || null,
    geminiModel: env.GEMINI_MODEL || undefined
  });
} catch (err) {
  console.error(`FATAL: ${err.message}`);
  process.exit(1);
}

const port = Number(env.PORT) || 3001;
const server = instance.app.listen(port, () => {
  console.log(`SitePulse AI server listening on :${port} (${production ? 'production' : 'development'})`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
