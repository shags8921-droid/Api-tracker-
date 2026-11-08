# Phase 12 — Critical Bug Fixes & Hardening Report

Branch: `phase12-hardening` (not merged to `main`, not deployed). Rollback point: `main` @ `8f3bb34` (local tag `phase12-rollback-point`; the tag push was rejected by the remote, the commit itself is on `main`).
Evidence standard: "Fixed" = covered by an executed test or a stated check. Everything else is listed as unverified.

## How things were run
- Server: `cd web && npm test` → `node --test server/test/server.test.js` → **30 passed, 0 failed.** Uses a **test-only Express shim** (`server/test/express-shim.js`) because Express/npm installs are blocked here. Proves route/authorisation/business logic; does NOT prove real-Express wiring.
- Types: global `tsc 7.0.2` with a loose audit config (project pins 5.9.3, no node_modules): only the pre-existing `./index.css` declaration message remains. Not a substitute for `npm run build`.
- NOT run: `npm run build`/`vite build`, `npm audit`, real Express server, browser/mobile-responsiveness checks, Android build, any live Gemini/payment/webhook call.

## P0 (Stage 1) — all verified by tests
| Issue | Root cause | Fix | Evidence |
|---|---|---|---|
| S-1/B-1/B-7 no auth, role from headers | server trusted `X-User-Role`/`X-Tenant-Id` | signed-session auth (scrypt + HMAC), role/tenant from DB+token, tenant-scoped data | tests: unauth 401, forged/tampered token 401, headers ignored, manager 403, tenant isolation |
| S-2/B-2/B-3 free paid plans | verify accepted client ref; register accepted tier | gateway verifier required (fail closed 503), amount/currency match, ref reuse blocked, register forces FREE; simulation only in non-prod opt-in | tests: no gateway→503/no upgrade, mismatch 402, reuse 409, register tier ignored, prod refuses simulation |
| S-3/B-4 mass export + secrets | open, global export | owner-only, tenant-filtered, no hashes/secrets | test: export excludes secrets/hashes |
| S-4 open destructive routes | no auth | auth + tenant scope + validation | tests |
| S-5/B-5/D-4 rollback traversal/global restore | unvalidated id, global restore | id regex + path containment, tenant-scoped snapshot, schema validation, auto pre-rollback snapshot | tests: traversal ids rejected, reversible restore |
| D-1/D-2/B-6 DB wiped on corruption / re-seeded | parse error → seed; non-atomic write | fail-closed load, atomic temp+fsync+rename, no re-seed, demo seed opt-in/never in prod | tests: corrupt file untouched, crash-leftover tmp ignored, emptied collections stay empty |
| Exposed secrets | `web/data` tracked | untracked + `.gitignore`; repo scan found no live keys | **Remaining:** git history still holds two demo `whsec_…` values — rotate if ever real; no history rewrite without approval |

## P1
| Issue | Status |
|---|---|
| B-20/AI chat | **Restored & hardened.** Optional Gemini (`GEMINI_API_KEY`); key sent in header; role-filtered grounding built server-side (managers never receive revenue/team data); output text-only; 8 s timeout; safe fallback. Tested with an injected fetch only — **no live model call was made.** |
| B-12 webhooks never delivered | **Fixed (logic).** HMAC-signed (`X-SitePulse-Signature`), SSRF-safe at connect time, 3 retries on 5xx/429/408, none on other 4xx, never blocks the request, delivery log. Tested with injected transport; real `safePost` verified to refuse localhost. Never delivered to a real endpoint. |
| B-10/B-11 expiry & entitlements | Fixed + tested (expired→FREE; website/user/AI/storage limits). |
| B-13 fabricated health | Real memory/latency/connection numbers; unimplemented services labelled. |
| W-2/W-3/W-4/W-5/W-12 client contracts, role dropdown, hard-coded emails | Fixed (Phase 11 branch); type-checked only, **not browser-tested**. |
| W-6 fake PKCE | Real RFC 7636 S256 generation (verified against the RFC vector); no fake token; copy corrected. No authorization server exists, so no token is issued. |
| W-7/W-8 fake QA / "13/13 PASS" | Tautologies removed; only evidenced criterion marked PASS. |
| W-1 simulated discovery | **Partially**: server-side live probe (SSRF-safe) exists and Connect-screen test now uses it; the 11-stage pipeline's feature list is still largely canned. |

## P2/P3
Fixed: audit history persisted server-side (D-9); idempotency (D-6); input validation & unique ids (D-7/D-8/B-17); redaction (S-10); SSRF validation + webhook URL validation + encrypted secrets (S-11/S-12); CORS/CSP/headers/rate limits (S-7/S-8/S-9); unknown `/api` → JSON 404 (S-15); W-9 diagnostics ping real; W-10 connect test real; W-14 pinch-zoom re-enabled; W-15 proxy port consistent (3001); Android Auto Backup excluded (A-4, XML parses; not built); unbacked uptime/GDPR/payment claims softened in Legal screen (placeholders flagged for counsel — not legal advice).

## Still unresolved
- Android: A-1 (fake PKCE login), A-2 (fake "HTTP 200" action results), A-3 (destructive DB migration), A-5 (placeholder applicationId), S-13 (API key forwarded on redirects). Not changed: no Android SDK/compiler here to verify Kotlin edits.
- W-13 legal text needs qualified counsel; entity/governing-law/contact still missing.
- D-3 backups share the live disk; no off-site copy or restore drill. Hosting with an ephemeral filesystem would lose data on redeploy.
- Single-process JSON file store (no multi-instance, no transactions at scale); in-memory rate-limit/idempotency/login-throttle state; no email transport (outbox queues only); no real payment gateway verifiers; no real discovery of arbitrary sites beyond the probe; AI actions remain advisory.
- Express 4 vs 5 version drift between root and `web` lockfiles; code is written to work on both but was never run on either.
- `npm audit` and dependency review not performed.

## Remaining security risks
Real-Express/CSP behaviour untested in a browser; session token lives in `sessionStorage` (XSS would expose it); no MFA/password reset/email verification; DNS-rebinding defence is connect-time `lookup` only (unit-tested, not live-tested); platform-admin is an env email allow-list; webhook secrets encrypted with a key derived from `AUTH_SECRET` (rotating it invalidates them); demo seed must stay off in production.

## Paid services / infrastructure needed
Payment gateway accounts + verifier implementations (eSewa/Khalti/Fonepay/Stripe); transactional email provider; Gemini API key (usage billed); managed Postgres/SQLite-on-volume with backups and off-site copy; hosting with persistent storage + TLS/reverse proxy; error/uptime monitoring; Google Play developer account and a final application id for Android.

## Files changed in Phase 12 (this branch vs main)
`web/server/{app.js,index.js}`, `web/server/lib/{ai.js,webhooks.js,store.js}`, `web/server/test/server.test.js`, `web/src/{App.tsx}`, `web/src/screens/{AuthenticationScreen,ConnectWebsiteScreen,DiagnosticsScreen,LegalAndTrustScreen,OwnerHubScreen}.tsx`, `web/src/domain/testing/production_suite.ts`, `web/index.html`, `app/src/main/res/xml/{backup_rules,data_extraction_rules}.xml`, this report. (Earlier Phase 11 remediation, already on `main`, is described in `PHASE11_AUDIT_REPORT.md` and the commit messages.)
