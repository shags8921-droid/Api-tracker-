# Phase 11 — Independent System Audit: SitePulse AI

Repository: `shags8921-droid/Api-tracker-` (commit `389de59`, single shallow commit)
Audit mode: read-only. No application code, data, or configuration was modified. Nothing was deployed.
Note: the product in this repo is named **SitePulse AI**, not "Bibek AI". I audited what is in the repo.

---

## 1. Executive summary

**Verdict: NOT ready for real customers or commercial use.**

The app is a convincing prototype whose most important "working" behaviour is simulated. Three problems dominate:

1. **There is no authentication.** The server trusts a role header and a tenant header that the browser sets, and the UI lets anyone pick "EXECUTIVE OWNER" from a dropdown. Any anonymous caller can read all orders (with shipping addresses), export all users and webhook secrets, change stock, forge audit entries, and replace the whole database.
2. **Billing is not real.** The payment "verification" endpoint marks any transaction verified and upgrades the plan without contacting a gateway. Separately, anyone can self-register an organisation directly on the BUSINESS tier. Subscriptions never expire and plan limits are never enforced anywhere.
3. **Core features report success without doing the work.** Web website-discovery is a timed animation over canned sample data. Android "PKCE login" fabricates tokens locally. Android feature actions record "HTTP 200 OK" without sending any request. The in-app QA suite and Launch Readiness screen contain assertions that cannot fail. `COMMERCIAL_LAUNCH_REPORT.md` repeats these as PASS results.

There is also **no real AI model integration** anywhere (no Gemini, Firebase AI, or other model call), despite UI model selectors, `metadata.json`, and Android dependencies implying one.

**What is genuinely good:** the Android credential vault (Keystore AES-GCM) and PKCE generator are correctly built; the Android destructive-operation detector has real unit tests; no real API keys were found in tracked files; the Android release signing reads secrets from environment variables; JSON body size is capped; there is a sole-owner delete guard.

### Method and limits (read this before relying on the findings)
| Activity | Result |
|---|---|
| Full read of backend (`web/server/index.js`, 1,171 lines) and most client/Android code paths that touch auth, billing, support, discovery, storage | Executed |
| Client-to-server route cross-check script (all `/api/v1` paths) | Executed |
| 9 logic tests running the server's **real extracted functions** (corrupt-DB load, idempotency, role check, redaction, etc.) against temp data | Executed — see §9, tests T1–T9 |
| Secret-pattern scan of tracked files | Executed (current tree only; history not scanned, clone is shallow) |
| Partial TypeScript check (global compiler 7.0.2, project pins 5.9.3) | Executed, limited (React/Vite types not installed) |
| Full server run / HTTP endpoint tests | **Could not run**: dependencies not installed and package installs are blocked. Route-level behaviour is therefore from code reading plus extracted-function tests |
| `npm audit` / dependency vulnerability check | **Failed**: registry unreachable (network disabled). Dependency vulnerabilities are **unverified** |
| Android build, unit tests (7), instrumented test (1) | **Could not run**: no Android SDK, no network |
| Web tests | **None exist** (no test script or runner in either `package.json`) |
| Live UI / browser testing, responsiveness, performance profiling | **Not performed** |

Findings below are tagged **Confirmed** (executed, or contradicted directly by code on both sides) or **Potential** (depends on deployment or tooling I could not run).

---

## 2. Feature inventory with verified status

| # | Feature | Claimed | Verified status | Evidence |
|---|---|---|---|---|
| 1 | User login / registration / sessions | Secure auth, sessions | **Does not exist** | No login, password, session, or JWT code in `web/src` or `server/index.js` |
| 2 | Role-based access (Owner/Manager) | Server-enforced RBAC | **Broken** | Role read from client header, default OWNER (`index.js:365-378`); UI dropdown (`Navigation.tsx:242-247`) |
| 3 | Multi-tenant isolation | Isolated workspaces | **Broken** | Tenant from client header, falls back to first org (`index.js:381-385`); most data tables are global |
| 4 | Website discovery (web) | 11-stage real discovery | **Simulated** | `engine.ts:126-262` uses `delay()` and hard-coded latencies; no request ever targets the user's URL |
| 5 | Website discovery (Android) | Native discovery | **Partially working** | Real OkHttp probes in `DiscoveryNetworkClient.kt`; unverified (cannot build/run) |
| 6 | OAuth2 PKCE login (web) | Secure PKCE | **Simulated** | Hard-coded verifier/challenge and fake token (`AuthenticationScreen.tsx:43-59`) |
| 7 | OAuth2 PKCE login (Android) | Secure PKCE | **Simulated** | Fabricates tokens, reports "exchanged successfully" (`MainViewModel.kt:187-205`); `exchangePkceCode` has no callers; no redirect-URI intent filter |
| 8 | AI Business Assistant | AI grounded in real records | **Keyword matcher, not AI** | `index.js:1033-1156` uses `query.includes('sales')` etc. over demo data |
| 9 | AI model integration (Gemini etc.) | Gemini 2.5 selectable | **Missing** | No model call in server, web, or Android; selector in `AiAgentDashboardScreen.tsx:34` is UI only |
| 10 | AI agent feature analysis | AI plans | **Rule-based heuristics** | `domain/ai/agent.ts` if/else logic |
| 11 | Owner Hub: team directory | Invite/revoke | **Partially working** | CRUD works on demo data; no email invite sent; role unvalidated; unauthenticated (see 1-2) |
| 12 | Owner Hub: webhooks | Real-time event relay | **Broken** | Records stored only; server makes no outbound HTTP, never dispatches; `webhookDispatcher: 'UP'` is hard-coded (`index.js:695`) |
| 13 | Manager Hub: orders, catalog | Live feed, dispatch, stock | **Partially working** | CRUD on a JSON file of demo data; not connected to any customer website; no auth |
| 14 | Pricing page | USD/NPR, monthly/annual | **Partially working** | Display works; server charges monthly price regardless of cycle (`index.js:536`) |
| 15 | Payment checkout (UI flow) | eSewa/Khalti/Fonepay/cards | **Broken** | UI reads `data.transactionId` but server returns `data.transaction.transactionId` (`PricingAndBillingScreen.tsx:131-136` vs `index.js:556-560`), so verify fails 404 |
| 16 | Payment verification | Cryptographic server check | **Missing** | `index.js:563-593` accepts any reference; no gateway call, no signature, no amount check |
| 17 | Subscription limits / usage enforcement | Enforced | **Missing** | `maxWebsites`, `monthlyAiRequests`, etc. are stored, never checked; `expiresAt` never enforced |
| 18 | Support desk: create ticket | Works | **Broken** | UI sends `initialMessage`, server requires `messageText` → always 400 (`CustomerSupportCenterScreen.tsx:95` vs `index.js:613-614`) |
| 19 | Support desk: list / reply | Works | **Broken** | UI reads `data.tickets` but server returns a bare array → list always empty; replies are local state only (`:119-151`) |
| 20 | GDPR/data export | Per-tenant export | **Broken + leaking** | UI passes `?orgId=` but server reads only the header → always default org; includes all users, orders, webhook secrets (`index.js:648-667`) |
| 21 | Backups / rollback | Point-in-time restore | **Partially working, dangerous** | Writes local snapshots; restore is path-traversable, global across tenants (`index.js:898-951`) |
| 22 | Audit log | Tamper-evident trail | **Weak** | Unauthenticated writes; weak redaction; web UI keeps its own copy in localStorage and never uses the server log |
| 23 | System health / diagnostics | Live telemetry | **Fabricated** | `index.js:680-701` hard-coded CPU/memory/latency/TLS values; web `DiagnosticsScreen.tsx:67-74` random latency |
| 24 | In-app QA suite | 4 test categories | **Self-certifying** | Several tests assert constants (§9 B-17) |
| 25 | Launch Readiness screen | 13/13 PASS | **Hard-coded** | `LaunchReadinessScreen.tsx:73-182, 227` |
| 26 | Secure embedded browser / WebView fallback | Authenticated WebView | **Not implemented** | No iframe/WebView in web or Android; Android just prints a message |
| 27 | Email, notifications | Team notified | **Missing** | No mail/notification code; "team has been notified" text is false |
| 28 | File upload / media processing | — | **Not present** | No upload endpoints or media code (not a defect unless planned) |
| 29 | Public landing page, legal pages | Complete | **Present, content unverified** | See B-24 |
| 30 | Android local DB (Room) | Offline store | **Working but data-loss prone** | `fallbackToDestructiveMigration` (`AppDatabase.kt:45`) |
| 31 | Android credential vault | Keystore encryption | **Good (not run)** | `SecureCredentialManager.kt` correct design |

---

## 3. Working / partially working / broken / unverified

- **Working (by inspection):** Android credential vault and PKCE parameter generation; Android destructive-operation detection (7 unit tests exist, not executed); server CRUD on the JSON store; pricing display; Android probe client error categorisation.
- **Partially working:** Owner/Manager hubs, catalog and orders (demo data only), backups, audit, Android discovery (unverified).
- **Broken:** auth/RBAC/tenant isolation, payment flow, support desk, tenant export, webhook dispatch, billing cycle, subscription expiry and limits.
- **Simulated (reports success, does nothing real):** web discovery, both PKCE flows, Android feature actions, system health, diagnostics probes, QA suite, launch readiness.
- **Unverified (could not run):** Android build and tests, full server behaviour, dependency CVEs, UI responsiveness, runtime performance, deployment (no Dockerfile or Nginx config in repo despite the report describing Nginx on 8080).

---

## 4. Critical security vulnerabilities

| ID | Sev | Issue | Status |
|---|---|---|---|
| S-1 | **P0** | **No authentication; client-asserted role and tenant.** Every route is callable anonymously; 8 of 33 routes have a role check and that check trusts `X-User-Role` / `?userRole=`, defaulting to OWNER. Test T4: no headers → ALLOWED. | Confirmed |
| S-2 | **P0** | **Free paid plans.** `POST /payments/initiate` then `/payments/verify` upgrades any org with no payment (`index.js:563-593`); UI even pre-fills a fake gateway reference (`PricingAndBillingScreen.tsx:138`). `POST /saas/organisations/register` accepts any `tier` with status ACTIVE (`index.js:396-441`). | Confirmed (code, both sides) |
| S-3 | **P0** | **Unauthenticated mass data exposure.** `/commercial/tenant/export` returns all users, orders (customer names, shipping addresses), webhooks **including signing secrets**; `/orders/feed`, `/saas/organisations`, `/saas/platform/metrics` open. | Confirmed (code) |
| S-4 | **P0** | **Unauthenticated destructive actions.** Fulfil orders, set stock, create catalog items, forge audit entries, switch active website (which deactivates every tenant's sites). | Confirmed (code) |
| S-5 | **P0** | **Rollback path traversal replaces the live database.** `:id` is decoded and joined into a path (`index.js:922`); `..%2F..%2Fx` escapes the backups dir (T5). Any readable `*.json` becomes the database, then is persisted. Restore is also global, so one tenant's rollback rewrites all tenants. | Confirmed for path escape (T5); route-level exploit needs a live server |
| S-6 | P1 | **Runtime data committed to git.** `web/data/database.json` and a backup are tracked; `.gitignore` does not exclude them. Real customer data, payment records and webhook secrets would be committed by a routine `git add`. | Confirmed |
| S-7 | P1 | **No rate limiting** (the code comment promises one, `index.js:347`), no brute-force or abuse protection, no AI-cost guard. | Confirmed |
| S-8 | P1 | **CORS trusts every `*.run.app` origin with credentials** (`index.js:27`); anyone can host on `run.app`. Moot today (no cookies) but unsafe the moment sessions are added. | Confirmed |
| S-9 | P1 | **Security headers overstated.** Comment says CSP; no `Content-Security-Policy` is sent (`index.js:39-46`); no `helmet`. | Confirmed |
| S-10 | P2 | **Weak credential redaction.** Handles `token=abc`, misses JSON form, Authorization headers and prose (T6); only `details` redacted, not `title`/`performedBy`. | Confirmed |
| S-11 | P2 | **SSRF validator is porous.** `includes('localhost')` accepts `evil-localhost.attacker.com` over plain HTTP; 10.x, 172.16.x, 192.168.x, `::1`, `0.0.0.0` accepted (T8). Latent: the server does not fetch URLs yet. Also never invoked by the web UI (`ConnectWebsiteScreen.tsx:47-53` simulates). | Confirmed (logic); exploitability Potential |
| S-12 | P2 | **Webhook URLs unvalidated** (no scheme/host checks) and secrets stored in plaintext. | Confirmed |
| S-13 | P2 | **Android API key forwarded on redirects.** `followRedirects(true)` plus a custom `X-API-KEY` header (`DiscoveryNetworkClient.kt:22,99`); OkHttp strips only `Authorization` across hosts. | Potential (library behaviour, not run) |
| S-14 | P2 | **Android Auto Backup enabled** with the sample (empty) rules (`AndroidManifest.xml:9`); Room data is backed up; Keystore key is not, so restored credentials are unreadable. | Confirmed (config) |
| S-15 | P3 | Default Express error handler can expose stack traces (NODE_ENV unset; CORS rejection throws). Unknown `/api/*` routes hang (the catch-all never responds for `/api`). | Potential |
| S-16 | P3 | Org/user IDs are `Date.now()`-based and guessable; legal text claims "cryptographically unique" tenant IDs. | Confirmed |

---

## 5. Missing integrations and incomplete workflows

- Real payment gateways (eSewa, Khalti, Fonepay, cards): none. `paymentGatewayUrl` points at a fake `.internal` host; "STRIPE_INTL" has no integration.
- User identity: no signup, login, password reset, MFA, email verification, invitations that actually email.
- Email / notifications: none (support, invites, billing receipts, low-stock alerts).
- Webhook delivery: no dispatcher, no retries, no signature on outgoing calls.
- Subscription lifecycle: no expiry, renewal, dunning, downgrade, proration, annual billing, tax/VAT invoices, sequential invoice numbers.
- Usage metering and limit enforcement (websites, users, AI requests, storage).
- AI model calls (Gemini or any provider), prompt/response handling, quotas, fallbacks.
- Real website discovery on web; Android PKCE redirect handling; Android real action execution; WebView/embedded browser.
- Scheduled / background jobs: none (no cron, queue, or worker).
- Operational: no off-site backups, monitoring, structured logging, health checks that measure anything, deployment manifests.

---

## 6. Duplicate code, components, unnecessary dependencies

- **Orphaned build artefacts shipped in the Android app:** 14 of 16 bundles in `app/src/main/assets/web/assets/` are not referenced by `index.html`: 4.65 MB of 5.63 MB (83%). The bundled web app is also separate from the native Compose UI, so the APK carries two UIs.
- **Two parallel implementations of the same product** (web React and Android Compose: Owner Hub, Manager Hub, Diagnostics, Sync History, discovery engine, AI agent). They already diverge: web discovery is simulated, Android's is real.
- **Split dependency manifests:** root `package.json` (Express **5.3.0**, Capacitor) vs `web/package.json` (Express **4.22.3**, React, Vite). `web/src/services/platform.ts` imports four `@capacitor/*` packages that only the root declares. The root lockfile has no Vite or React. A correct build needs two separate installs, undocumented.
- **Unused / questionable Android dependencies:** `firebase.ai`, `firebase.appcheck.recaptcha`, `firebase.appcheck.debug` (the debug provider is in `implementation`, so it ships in release), Retrofit, Moshi converter, Coil, logging-interceptor: no call sites found for Firebase AI or App Check; `google-services` plugin runs with `WARN` and no `google-services.json`.
- **Hard-coded duplicated plan limits** in three places (`register`, `DEFAULT_PRICING_PLANS`, client display) that already disagree with the launch report (report: Pro = 10 sites/100k AI; code: 5 sites/5,000).
- `.gitignore` omits `node_modules`, `dist`, and `web/data`.

---

## 7. Performance and scalability

- **Single-file JSON database** rewritten in full (`writeFileSync`, pretty-printed) on every mutation, including each audit entry. Cost grows with data; blocks the event loop; cannot be shared by more than one server instance (last writer wins).
- **Unbounded growth:** audit logs, idempotency key `Set`, transactions, backups (each a full copy), with no retention.
- **No pagination** on orders, catalog, users, tickets; search is a linear scan.
- **Not horizontally scalable** and not safe on ephemeral filesystems (see §8).
- **Hard-coded `PORT = 3000`** (`index.js:11`); ignores `process.env.PORT`, which breaks most PaaS platforms.
- Web bundle size, render performance, and memory use were **not measured** (cannot build).

---

## 8. Data-loss and recovery risks

| ID | Sev | Risk | Status |
|---|---|---|---|
| D-1 | **P0** | **A crash mid-write corrupts the DB and the next start silently replaces it with demo seed data**, with no backup or quarantine copy (T1). Writes are not atomic (no temp-file + rename). | Confirmed |
| D-2 | P1 | **Emptied collections are re-seeded with demo data on restart** (orders, users incl. an OWNER, webhooks) (T2). Demo customers and an owner account can reappear in production. | Confirmed |
| D-3 | P1 | **Backups share the failure domain** of the live data (same disk, same directory); no off-site copy, no restore test, no retention, no integrity check. Cloud-style hosting (the CORS list suggests Cloud Run) usually has an **ephemeral filesystem**, so data could vanish on redeploy. | Backups: Confirmed; hosting impact: Potential |
| D-4 | P1 | **Rollback is global and unvalidated:** restores any parsed JSON with no schema check, affecting all tenants (§4 S-5). | Confirmed |
| D-5 | P1 | **Android DB wipes on schema change** (`fallbackToDestructiveMigration`, `exportSchema=false`, v2). Any app update that changes the schema deletes all local data. | Confirmed |
| D-6 | P2 | Idempotency: key is recorded before the handler runs, so a retry after a failed first attempt returns 200 "already processed" and the operation never happens (T3). | Confirmed |
| D-7 | P2 | Stock PATCH accepts non-numeric input and stores `null` while status says IN_STOCK (T7). Catalog `price: Number(price) || 99` silently turns 0 into 99. | Confirmed |
| D-8 | P2 | Duplicate IDs: invoice numbers repeat every ~16.7 minutes; SKU ids collide (50% by ~112 items); same-millisecond collisions on org/user/ticket/audit ids (T9). | Confirmed |
| D-9 | P2 | Support replies and web audit history live only in browser memory/localStorage; lost on refresh or device change. | Confirmed |

---

## 9. Detailed bug list

Paths are relative to the repo root. "Executed" = covered by tests T1–T9 (real server functions on temp data).

### Backend (`web/server/index.js`)
| ID | Sev | Lines | Bug | Evidence | Fix direction |
|---|---|---|---|---|---|
| B-1 | P0 | 365-385 | Role and tenant taken from client headers; default OWNER / first org | T4 executed | Real auth (sessions/JWT); derive user, role, tenant from the verified token only |
| B-2 | P0 | 563-593 | Payment "verified" without gateway proof; accepts client ref | Code | Server-to-server gateway verification (eSewa/Khalti APIs, HMAC/webhook signature), amount and currency match, idempotent upgrade |
| B-3 | P0 | 396-441 | Self-service registration with arbitrary paid tier | Code | Force FREE until verified payment; require authenticated account |
| B-4 | P0 | 648-667 | Export is unauthenticated, not tenant-scoped, includes webhook secrets and all users | Code | Auth + owner-only + tenant filter + omit secrets |
| B-5 | P0 | 920-951 | Path traversal in rollback; global restore; no schema validation | T5 executed | Strict id regex (`^bkp_\d+$`), `path.resolve` containment check, tenant-scoped snapshots, validate schema, require confirmation |
| B-6 | P0 | 314-333, 339-345 | Corrupt file replaced by seed; non-atomic writes; re-seeding of empty arrays | T1, T2 executed | Move to a real database (SQLite/Postgres); until then atomic write and fail-closed on parse error; never seed in production |
| B-7 | P1 | 814-891 | Orders, catalog, fulfil, stock routes have no auth of any kind | Route cross-check: OPEN | Auth plus tenant scoping |
| B-8 | P1 | 954-977 | Audit POST unauthenticated; weak redaction; forgeable `performedBy` | T6 executed | Server-side audit only (not a public POST); derive actor from session; structured redaction |
| B-9 | P1 | 529-561 | Initiate: ignores `billingCycle`; unknown plan silently becomes Starter; `gateway.toLowerCase()` throws when missing; transaction id predictable | Code | Validate input; compute amount by cycle; random ids |
| B-10 | P1 | 563-593 | No subscription expiry, renewal or downgrade; `expiresAt` set but never read | Grep: no read | Scheduled expiry job and entitlement checks |
| B-11 | P1 | 408-441, 704-741 | No enforcement of `maxWebsites`, `maxUsers`, `monthlyAiRequests`, `storageMb` | Grep | Central entitlement middleware |
| B-12 | P1 | 791-811 | Webhooks stored but never delivered; secrets returned in plaintext to any "owner" | No outbound HTTP in server | Dispatcher with signing, retries; hide secrets after creation |
| B-13 | P1 | 680-701 | Fabricated health metrics (CPU, memory, p95, TLS cipher, all services UP) | Hard-coded literals | Real metrics or remove |
| B-14 | P1 | 11, 1169 | Port hard-coded | Code | `process.env.PORT` |
| B-15 | P1 | 1162 | Catch-all `app.get('*')` is invalid in Express 5 (root lock pins 5.3.0) and throws at boot when `web/dist` exists; web lock pins Express 4.22.3 | Not executed (no Express installed) | Single Express version; use `/{*splat}` on v5 |
| B-16 | P2 | 350-362 | Idempotency: marks key before success; unbounded; global | T3 executed | Per-user/route keys, store response, set only on success, TTL |
| B-17 | P2 | 880-891, 860-878 | Stock/price/qty not validated (NaN stored); SKU not unique; random 4-digit ids | T7, T9 executed | Schema validation, unique constraint |
| B-18 | P2 | 757-774 | Invite: no duplicate check, role free-form (can invite OWNER), no email sent | Code | Validate role enum, send invite, check duplicates |
| B-19 | P2 | 743-750 | Switch accepts nonexistent id and deactivates all sites for all tenants | Code | Scope by tenant, 404 on unknown |
| B-20 | P2 | 1033-1156 | "AI" is keyword matching; role gate bypassed by wording; manager intent leaks order amounts; actions advisory (`requiredRole` not enforced by target routes) | Code | Real model with tool-calling plus server-side authorisation on each action |
| B-21 | P3 | 984-1031 | KPI label "active users" counts suspended users | Code | Filter on status |

### Web client (`web/src`)
| ID | Sev | Location | Bug | Evidence |
|---|---|---|---|---|
| W-1 | P1 | `domain/discovery/engine.ts:126-262` | Discovery is simulated; returns canned features for any URL | No `fetch` to `config.url` anywhere; `delay()` and constants |
| W-2 | P1 | `PricingAndBillingScreen.tsx:131-136, 168` | Checkout reads wrong response fields; upgrade UI path cannot complete; invoice shows `undefined` | Compared with `index.js:556-560, 592` |
| W-3 | P1 | `CustomerSupportCenterScreen.tsx:57, 95, 119-151` | Ticket create sends wrong field; list reads wrong shape; replies never sent | Compared with `index.js:605-645` |
| W-4 | P1 | `PricingAndBillingScreen.tsx:193`, `CustomerSupportCenterScreen.tsx:54` | `?orgId=` ignored by server (header used) → wrong tenant | Compared with `index.js:606, 649` |
| W-5 | P1 | `App.tsx:55,185`, `Navigation.tsx:242-247, 328` | Role is a UI dropdown; Owner-only gating is cosmetic; `platform` screen has no gate (`App.tsx:440`) | Code |
| W-6 | P1 | `AuthenticationScreen.tsx:43-59` | Fake PKCE state and fake token; copy claims "tokens are encrypted client-side" | Code |
| W-7 | P1 | `domain/testing/production_suite.ts:44-45, 58-59, 74, 93, 199-217, 294` | QA suite tests cannot fail (constants, `length >= 0`, literal `true`, local string checks); "coverage" is just pass rate; verdict PRODUCTION_READY when none fail | Code |
| W-8 | P1 | `LaunchReadinessScreen.tsx:73-182, 227` | 13/13 PASS and "READY" badges are hard-coded text | Code |
| W-9 | P2 | `DiagnosticsScreen.tsx:67-74` | Probes use `setTimeout` and `Math.random()` latency | Code |
| W-10 | P2 | `ConnectWebsiteScreen.tsx:47-53` | Connection test is a 650 ms timer; only `startsWith('https://')` checked | Code |
| W-11 | P2 | `PlatformAdminDashboardScreen.tsx:81` | `Object.values(x || {}).reduce((a,b)=>a+b,0)` infers `unknown`; could fail `tsc` in `npm run build` | tsc 7.0.2 error; project pins 5.9.3, not run: **Potential** |
| W-12 | P2 | `App.tsx:584` | Support author emails hard-coded `owner@sitepulse.ai` / `manager@sitepulse.ai` | Code |
| W-13 | P2 | `LegalAndTrustScreen.tsx` | No governing law, legal entity name, address or contact; commits to 99.9% uptime (`:42`), GDPR/CCPA compliance, "cryptographically unique" tenants; none backed by the system. Needs review by qualified counsel; I am not providing legal advice | Content scan |
| W-14 | P3 | `index.html` | No CSP meta; `maximum-scale=1, user-scalable=no` blocks pinch-zoom (accessibility) | Code |
| W-15 | P3 | `vite.config.ts` | Dev proxy targets port 3001 but server listens on 3000 | Code |

### Android (`app/`)
| ID | Sev | Location | Bug | Evidence |
|---|---|---|---|---|
| A-1 | P1 | `MainViewModel.kt:187-205` | PKCE "login" invents tokens and reports success; later probes send a bogus bearer | Code (comment says "simulate") |
| A-2 | P1 | `MainViewModel.kt:286-320` | Feature actions return "HTTP 200 OK" and log `statusCode 200`, `latencyMs 45` with no request made; "approved" destructive actions appear executed | Code |
| A-3 | P1 | `AppDatabase.kt:21,45` | Destructive migration, no schema export | Code |
| A-4 | P2 | `AndroidManifest.xml:9`, `res/xml/backup_rules.xml` | Auto Backup on with unconfigured rules | Code |
| A-5 | P2 | `app/build.gradle.kts:19` | `applicationId = com.aistudio.sitepulse.xmqzkv` is a generated placeholder; cannot change after Play publication | Code |
| A-6 | P2 | `app/build.gradle.kts:47` | Release build has minification and obfuscation off | Code |
| A-7 | P2 | `app/build.gradle.kts:120-121,81` | Debug App Check provider in release dependencies; Firebase configured without `google-services.json` | Code |
| A-8 | P2 | `DiscoveryNetworkClient.kt:188-241` | PKCE token exchange has no HTTPS enforcement and no callers; no redirect handler in manifest | Code |
| A-9 | P3 | tests | 7 unit tests (one is `2+2`) and 1 instrumented test; none cover networking, DB, credentials or ViewModel | Not executed |

### Executed logic tests (real server functions, temp data)
| Test | Result |
|---|---|
| T1 corrupt DB preserved/recovered | **FAILED** (replaced with seed, no backup) |
| T2 empty collection stays empty | **FAILED** (demo data re-injected) |
| T3 idempotent retry after failure | **FAILED** (operation skipped) |
| T4 role check requires proof | **FAILED** (no headers → ALLOWED) |
| T5 rollback path containment | **FAILED** (path escapes backups dir) |
| T6 redaction | **PARTIAL** (JSON, header, prose forms leak) |
| T7 stock input validation | **FAILED** (NaN → null) |
| T8 SSRF validation | **FAILED** (private ranges, look-alike host accepted) |
| T9 id/invoice uniqueness | **FAILED** (invoice repeats at +1,000,000 ms) |

These are tests of the audited code's behaviour; "FAILED" means the app does not meet the stated expectation. They do not substitute for end-to-end tests against a running server.

### Claims in `COMMERCIAL_LAUNCH_REPORT.md` contradicted by the code
| Claim | Evidence |
|---|---|
| "Cryptographic server-side verification" of payments | `index.js:563-593` has none |
| Test Case 3: Pro upgrade yields 10 sites / 100k AI requests, invoice `INV-2026-987123` | Code gives 5 sites / 5,000 AI requests; invoice format is `INV-` + 6 timestamp digits |
| Test Case 3 used reference `tx_esewa_test_987123` | Transaction ids are `tx_<gateway>_<Date.now()>`; that id would 404 |
| Test Case 4: ticket `#TICK-8842`, replies post to thread | Ids are `tkt_<ms>`; create and list are broken, replies are local only |
| Test Case 5: archive contains features, audit logs, tickets | Export has no features or tickets and is not tenant-scoped |
| Enterprise tier in matrix | No Enterprise plan exists in `DEFAULT_PRICING_PLANS` |
| Nginx reverse proxy on 8080, multi-tenant isolation | No Nginx config in repo; server listens on 3000 only; isolation absent |
| Support "SLA tracking, priority routing" | Static label (`< 2 hrs`) only |
| "Android build PASS" | Not reproducible here (no SDK or network); **unverified** |

---

## 10. Prioritised remediation roadmap

**Stage 0 — before any real user or data (blockers)**
1. Do **not** deploy or take payments or real customer data with the current build.
2. Implement real authentication and server-side authorisation: users, hashed passwords or an identity provider, sessions/JWT, role and tenant derived from the token; apply to every route; remove `X-User-Role` / `X-Tenant-Id` trust; remove the UI role dropdown.
3. Remove or lock the free-upgrade paths: payment verification against the gateway, registration forced to FREE, no client-supplied references.
4. Remove `web/data/` from git, add it and `.env`, `node_modules`, `dist` to `.gitignore`; rotate any webhook secrets that were ever real.
5. Close the rollback path traversal; disable rollback until it is tenant-scoped and validated.
6. Replace the JSON-file store with a real database (e.g., Postgres/SQLite with migrations), tenant-scoped queries, transactions; fail closed on errors; no production seeding.

**Stage 1 — make the claimed features true**
7. Real payment integrations (eSewa, Khalti, Fonepay, cards) with signed callbacks, amount checks, annual billing, receipts, sequential invoices; subscription expiry and entitlement enforcement.
8. Fix client/server contracts for checkout, support, export (use one typed API client and shared types; add contract tests).
9. Implement or remove: webhook dispatch, email/invites/notifications, usage metering, real AI model calls (with quotas and server-side tool authorisation), real web discovery (with SSRF-safe fetcher), Android PKCE with redirect handling, Android real action execution.
10. Replace fabricated health/diagnostics with real measurements; delete or relabel simulated screens ("Demo mode") until real.
11. Replace the in-app QA/readiness screens with genuine automated tests; stop claiming PASS from hard-coded values.

**Stage 2 — hardening and operations**
12. Rate limiting, `helmet` with a real CSP, strict CORS allow-list, input validation (schema), safe error handler, request logging with redaction.
13. Off-site encrypted backups, restore drills, retention; atomic writes if any file store remains; Android proper Room migrations and exported schemas.
14. Deployment manifests (Dockerfile, env-driven `PORT`, config), single Express version, unified dependency manifest, reproducible build and CI (lint, `tsc`, tests, dependency audit).
15. Android: real application id, enable minification, backup rules, remove unused Firebase dependencies and debug App Check from release, connect real tests.
16. Legal review of all public claims (uptime, GDPR/CCPA, isolation) by qualified counsel; align copy with reality.

**Stage 3 — quality**
17. Add web unit/integration/e2e tests and Android tests beyond the sample; accessibility (zoom), performance profiling, pagination, bundle trimming, remove 4.65 MB of orphaned bundles, consolidate duplicate logic.

### Verification still needed (cannot be done in this environment)
- Run the server with real dependencies and probe every route (a probe script can be provided on request).
- `npm audit` for both manifests; Android SDK build and test run.
- Confirm Express 5 catch-all failure and the `tsc` build break with the project's pinned toolchain.
- Scan full git history for secrets (clone is shallow).
- UI responsiveness, cross-browser checks, load testing, deployment configuration review.

---

*End of Phase 11 audit. No fixes were applied. Awaiting your explicit approval before any application code is changed.*
