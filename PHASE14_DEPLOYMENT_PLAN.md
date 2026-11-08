# SitePulse AI — Phase 14, Stages 1–2: Architecture Audit, Deployment Plan & Cost Estimate

Status: **PLAN ONLY. Nothing has been deployed, no account created, no paid service enabled.** Waiting for approval (Stage 3).
Prices below were read from the vendors' own pages on 2026-11-09 unless marked *(not verified)*. Prices change; re-check before purchase.

## 1. Stage 1 — Current architecture (as inspected)

| Layer | What exists today | Deployment implication |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind (`web/src`), built to `web/dist`. Calls the API with **relative** `/api/...` URLs | Must be served from the **same origin** as the API (no CORS needed) |
| Backend | One Node/Express process (`web/server/index.js` → `app.js`); serves `web/dist` + SPA fallback itself | **One container serves everything**; no separate frontend host required |
| Database | JSON file (`DATA_DIR/database.json`, atomic writes, `database.prev.json`) | Needs a **persistent disk**, **exactly one instance**; not horizontally scalable |
| File storage | Uploads in `DATA_DIR/uploads` (private, authenticated download) | Same persistent disk; plan quotas up to 5 GB/org |
| Auth | Bearer token in `sessionStorage`; **no cookies** | "Secure cookies" task is N/A by design (migrating to httpOnly cookies would be an architectural change; not proposed) |
| Secrets | `AUTH_SECRET` (required), `GEMINI_API_KEY` (optional, server-only), none in client bundle | Store in host secret manager, never in git |
| AI | Optional Gemini via backend only; rule-based fallback | Needs a billing-enabled Google AI key + budget alert |
| Payments | **No gateway verifiers exist**; billing is fail-closed (503) | Nothing can be sold until eSewa/Khalti/Fonepay/Stripe verifiers are built and sandbox-tested |
| Email | Outbox only queues (`QUEUED_NOT_SENT`); no transport | Needs an email provider + a sending domain (SPF/DKIM) |
| Health/shutdown | `/api/v1/health` (liveness only); SIGTERM closes the listener | No readiness/DB check, no shutdown timeout, in-flight webhooks not drained |
| Infra-as-code | **None**: no Dockerfile, CI, or host config in the repo | I will add Dockerfile, `.dockerignore`, CI workflow, runbooks |
| Android | Bundled stale web build in `app/src/main/assets/web`; relative `/api` calls will not reach a server from inside the app | Out of Phase 14 scope; flagged |

Not verifiable from my sandbox: `npm run build` (no dependencies/network), real Express, any cloud deployment (no cloud credentials, no network, no domain access). Build and live checks must run in CI and on the real hosts; I will report only what I actually observe there.

## 2. Gaps that must be closed before PRODUCTION (staging can proceed with them open)
1. **FAIL-002 (P1)** failed disk write leaves the change live (phantom write). 2. **PERF-002 (P1)** synchronous scrypt freezes the server under concurrent logins. 3. **Real payment verifiers** (otherwise no revenue). 4. **Email provider + password reset** (AUTH-008) and enforcing `mustChangePassword`. 5. Readiness probe, graceful shutdown with timeout/drain, structured request logging without secrets. 6. Real-Express run + client build in CI (never executed so far). 7. Backup job + a restoration drill. 8. Optional error-monitoring hook (Sentry). These are code changes — each needs your approval (Stage 3).

## 3. Environments (proposed)
| | Development | Staging | Production |
|---|---|---|---|
| Host | local | own app + own volume | own app + own volume |
| `NODE_ENV` | development | production | production |
| `AUTH_SECRET` | random per run | unique 48+ chars | unique 48+ chars (different) |
| Data | local `web/data` (git-ignored) | separate volume, **synthetic data only** | separate volume |
| Demo seed / simulated payments | allowed | **refused** (production mode) | **refused** |
| Payments | simulated | provider **sandbox/test keys** (needs verifiers) | live keys, no real charges during validation |
| Domain | localhost | `staging.<your-domain>` | `<your-domain>` |
Note: because production mode refuses simulated payments, billing can only be exercised in staging after gateway sandbox verifiers exist. Alternative: a `staging` flag that allows simulation — weaker; your call.

## 4. Recommended hosting (decision needed)
**Option A — Fly.io (recommended for cost):** one Machine + one Volume per environment, free TLS, auto-restart, volume snapshots. **Option B — Render:** one Web Service + Persistent Disk (simpler dashboard, higher base price). **Option C — a plain VPS** (cheapest at scale, most manual ops: patching, TLS, firewall) *(not priced here)*.
Both A and B satisfy: persistent disk, single instance, HTTPS, health checks, restart-on-crash. Neither gives high availability: a deploy or host failure means brief downtime (acceptable for a pilot, not for a high-SLA product). Customers are in Nepal: nearest regions are Singapore/Mumbai — **Fly's prices above are for US regions; Asia-Pacific/India machine and egress prices differ and are unverified.**

## 5. Cost estimate (USD)
| Service | Why needed | Price (source) | Free-tier limits | Monthly | Annual |
|---|---|---|---|---|---|
| Fly.io Machine, prod 1 GB shared-cpu-1x | app + scrypt headroom | $6.70/mo, US regions ([Fly](https://docs.fly.io/about/pricing)) | none (no free allowance for new orgs) | 6.70 | 80 |
| Fly Machine, staging 256 MB | staging | $2.19/mo | – | 2.19 | 26 |
| Fly Volumes 3 GB prod + 1 GB staging | DB + uploads | $0.15/GB-mo, billed even if stopped | – | 0.60 | 7 |
| Fly snapshots | backups | $0.08/GB-mo, first 10 GB free | 10 GB | 0.00 | 0 |
| Outbound bandwidth | users download | $0.02/GB NA/EU, $0.04 APAC, $0.12 India | none | ~0–1 (pilot) | ~0–12 |
| Domain (.com) | custom domain | ≈ $10–15/yr *(not verified)* | – | ~1 | ~12 |
| DNS + proxy (Cloudflare Free) | DNS, DDoS shield | free *(not verified)* | – | 0 | 0 |
| TLS certificates | HTTPS | included by host | – | 0 | 0 |
| Resend (email) | invites, resets, receipts | Free: 3,000/mo, **100/day**, 3 domains; Pro $20/mo for 50k ([Resend](https://resend.com/pricing.md)) | 100/day | 0 → 20 | 0 → 240 |
| Sentry (errors) | error monitoring/alerts | Free: 5k errors, 1 user; Team $29/mo ($26 annual) ([Sentry](https://sentry.io/pricing/?content=467860164422)) | 5k errors | 0 → 29 | 0 → 312 |
| UptimeRobot (uptime) | outage alerts | Free: 50 monitors, 5-min checks; Solo from €10/mo ([UptimeRobot](https://uptimerobot.com/pricing.md)) | **commercial use not stated — check terms** | 0 → ~11 | 0 → ~118 |
| Cloudflare R2 (off-site backups) | backups off the host | $0.015/GB-mo, 10 GB free, egress free ([Filebase summary](https://filebase.com/blog/cloudflare-r2-pricing-costs-savings-and-alternatives-in-2026/) — secondary source) | 10 GB | 0 | 0 |
| Gemini 2.5 Flash | AI chat | $0.30 / $2.50 per 1M input/output tokens; free tier exists but is rate-limited and for testing ([Google](https://ai.google.dev/pricing?hl=sl)) | testing only | ≈ $3 per 5,000 chats* | – |
| Payment gateways | take payments | per-transaction fees; **not researched** — confirm eligibility/fees with each provider | – | % of revenue | – |
\*Assumes ~300 input + ~200 output tokens per chat ≈ $0.0006; thinking tokens count as output and could raise this several-fold. The highest plan allows 25,000 chats/org/month (≈ $15 at the base estimate).

**Totals:** *Lean* (Fly staging + prod, free tiers for email/monitoring) ≈ **$10–12/month ≈ $125–145/year** including domain. *Comfortable* (+ Sentry Team, UptimeRobot Solo, Resend Pro) ≈ **$70–75/month ≈ $850–900/year**. Render instead of Fly: web service $7/mo (512 MB) or $25/mo (1 CPU/2 GB) + disk $0.25/GB ([Render](https://render.com/pricing)) → prod+staging ≈ $15–35/month before add-ons. Payment-gateway fees and AI usage scale with customers.

**Unexpected-billing risks:** Fly has no free tier; volumes bill while stopped; egress is per-GB (India $0.12) so a large public download could surprise; snapshots beyond 10 GB bill. Resend overage only happens if you enable pay-as-you-go. Sentry: set a maximum-spend of $0 or low cap. **Gemini: a billing-enabled key has no hard cap — set a Google Cloud budget alert and quota**; per-plan AI quotas limit abuse. Uploads (up to 5 GB/org on top plan) grow the volume; volumes can be extended but typically not shrunk. Never enable payment keys in live mode until sandbox tests pass.

## 6. Deployment steps (after approval)
Stage 4 (staging): add Dockerfile/CI/health-readiness/shutdown/logging (+ approved fixes) → CI: install, `tsc`, build, server tests → create Fly (or Render) staging app + volume + secrets → deploy → verify: health, registration/login, upload/download, persistence across restart, role matrix, limits, backup + restore drill, CORS/headers, rate limits, mobile viewport check in a real browser → write observed results.
Stage 6: ask explicit approval. Stage 7: same on production with the custom domain: DNS (CNAME/A to host, via Cloudflare), HTTPS check, live-mode payment configuration verified **without charging**, email SPF/DKIM verified, monitoring + alert tests (deliberate error and deliberate outage), final validation. Stage 8: runbook + rollback docs.

## 7. Rollback procedure (draft)
1. **Code:** every deploy is an immutable image tagged with the git SHA; rollback = redeploy the previous tag (`fly deploy --image …` / Render "Rollback"); target < 5 min. 2. **Data:** before every deploy take a volume snapshot + export to off-site storage; schema is additive, so older code can read newer data; if data is damaged, stop the app, restore the snapshot to a *new* volume, attach, start, verify, then retire the old volume (never delete first). 3. **Config/secrets:** keep prior secret versions; rotating `AUTH_SECRET` invalidates sessions and encrypted webhook secrets (documented). 4. **DNS:** keep TTL low (300 s) until stable; fallback is pointing DNS back to the previous host. 5. After any rollback: run the smoke test script and record the result.

## 8. Decisions and inputs I need from you (Stage 3)
1. Approve hosting option (A Fly / B Render / C VPS) and region (Singapore/Mumbai vs US). 2. The **domain name** and who controls its DNS (Cloudflare recommended). 3. Authorise the pre-production code work in §2 (suggest: items 1, 2, 5, 6, 7 first; 3, 4 as separate approvals). 4. Which payment providers to integrate first, and confirm you hold sandbox accounts. 5. Email sender address and provider approval. 6. Your own cloud accounts: I cannot create accounts or pay; I need you to create the host account and give me **a scoped deploy token via the platform's secret mechanism**, or run the deploy commands I prepare. Never paste secrets into chat or git. 7. Whether staging may use a simulation flag for billing tests.
