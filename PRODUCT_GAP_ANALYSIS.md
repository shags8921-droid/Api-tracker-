# SitePulse AI — Product Gap Analysis (pre-Phase 15)

Method: read-only inspection of `main` + `phase14-prep` (server `web/server/`, client `web/src/`, Android `app/`).
Searched all source for image/video/audio generation, editing, model-provider and queue code. Costs are **directional
estimates, not verified quotes** (no provider pricing was fetched for this document). Nothing was changed.

## 0. Headline verdict

**The codebase is not the product described in the vision.** What exists is a *website-analysis and e-commerce
integration hub* ("AI website analyser … OpenAPI inspection, hub mapping, hybrid integration engine" — `web/metadata.json`
/ root `metadata.json`): connect a store website, discover its features, sync orders/catalog, webhooks, support tickets,
billing for those plans. The vision is an *AI creative/media generation SaaS* (image, video, audio, model hub, queue, credits).

- Vision sections A (Image), B (Video), C (Media tools), D (Model hub), E (Creative workspace), F (Generation management):
  **0 of ~45 listed capabilities exist.** Search for generation/editing/provider/ffmpeg code found nothing relevant
  (the only hit, "replicate", is an English word in `SecureEmbeddedBrowser.tsx:91`). The only AI feature is a text chat
  assistant about store operations (`web/server/lib/ai.js`, `POST /ai/chat`), Gemini 2.5 Flash, optional, falls back to rules.
- What *is* reusable: auth, tenancy, roles, rate limiting, audit log, upload validation, webhooks, billing skeleton,
  backups, deploy assets. Roughly the **platform chassis (~sections 3, 4, 6)**, not the product.
- The pricing plans in `web/server/lib/plans.js` sell *connected websites / team members / AI queries* — not credits, models
  or generation limits. They are hard-coded constants; no route lets the Owner edit plans, prices or models.

**Decision needed from you (blocks everything):** is this (a) a **pivot** — keep the chassis, build the creative product on
it, or (b) a **new product**, with this repo left as the store-integration tool? I recommend (a) only if you accept that
Phases 11–14 hardened a different product, and that the "launch readiness" claims apply to that product, not this vision.

## 1. Implemented and verified (33 server tests, executed)

| Feature | Evidence | Importance | Action | Complexity | Run cost |
|---|---|---|---|---|---|
| Auth (scrypt, signed 12h tokens, revocation, login throttle) | `lib/auth.js`, `app.js` auth routes; tests | Critical | Keep; add password recovery | S | ~0 |
| Tenant isolation & Owner/Manager role split (server-enforced) | `app.js` middleware; Phase 13 s1/s2 | Critical | Keep; add Customer end-user role (see §4) | M | 0 |
| Backend plan/limit enforcement for AI-chat quota & seats/sites | `app.js:106,932`, `lib/plans.js` | Critical | Generalise to credits | M | 0 |
| Rate limiting, validation, security headers, SSRF guard | `lib/security.js` | High | Keep | – | 0 |
| Audit log, per-org backups + restore verify (scripts) | `app.js` `/audit`,`/backups`; `web/scripts/` | High | Keep | S | storage |
| Typed image upload (png/jpg/gif/webp, magic-byte check, 6 MB, quota) | `app.js:1090-1130` | Medium | Extend to video/audio via object storage | M | storage/egress |
| Payments fail-closed (no fake charges in prod) | `app.js` payments routes; tests | Critical | Keep | – | 0 |
| Atomic JSON persistence, rollback on failed save | `lib/store.js`, `commit()` | High | **Replace with a DB before media workloads** | L | DB ~$15–60/mo est. |

Caveat: all verified *under a test-only Express shim*; real Express, client build, browser and Android are **unverified**.

## 2. Implemented but incomplete

| Feature | Status / evidence | Importance | Action | Cx | Cost |
|---|---|---|---|---|---|
| Subscription management | Initiate/verify/history exist; **no gateway verifiers, no cancel/downgrade, no renewal** (`PHASE13_TEST_REPORT.md`) | Critical | Implement ≥1 verifier (Stripe first) + cancel/downgrade | L | gateway fees ~3%+ |
| Usage tracking | Counts AI-chat requests & storage only; no per-provider, per-model, per-task usage | High | Ledger table: user, model, units, cost | M | 0 |
| Owner Hub / Manager Hub | Screens exist (570/536 lines) for store ops, users, tickets; **no plan/price/model/provider control** | High | Add plan+model admin backed by DB | L | 0 |
| Notifications | In-app only; email is a queue marked `QUEUED_NOT_SENT` | Medium | Add email provider | S | free tier→$20/mo (Resend, fetched earlier) |
| AI assistant | Text Q&A, 8 s timeout, grounded on store data | Low for vision | Keep as support helper only | – | token cost, small |

## 3. UI-only (no backend or data behind it)

I did **not** open every screen in a browser (unverified). From code reading: Voice input (`AiBusinessAssistantScreen.tsx`,
browser SpeechRecognition only — nothing server-side), landing page marketing claims (`PublicLandingPageScreen.tsx`),
`LaunchReadinessScreen` (static checklist, previously flagged as overstating readiness in `COMMERCIAL_LAUNCH_REPORT.md`
correction note). Recommended action: audit each screen against a real API before any marketing use. Cx: S. Cost: 0.

## 4. Missing capabilities (vision → status: **missing**)

| Vision item | Evidence of absence | Importance | Action | Cx | Operating cost (directional) |
|---|---|---|---|---|---|
| A. Text-to-image, multi-model | no provider client, no route | Core | Provider abstraction + 1–2 providers | L | per-image provider fees (≈$0.02–0.08 typical; verify) |
| A. Edit / bg-removal / object-removal / upscale | none | Core | Via provider APIs, not self-hosted | M each | per-call fees |
| B. Text/image-to-video, animation | none | Core | Async provider jobs + polling/webhooks | XL | **highest**: ≈$0.3–several $/clip (verify) |
| B/C. Video edit, HD/HDR, slow-mo, conversion | none; no ffmpeg | Medium | Worker with ffmpeg *or* provider | XL | CPU/GPU minutes, egress |
| C. Audio tools / voice | browser SpeechRecognition only | Medium | Defer | L | per-minute fees |
| D. Model Hub (providers, selection, availability, fallback, per-provider usage) | none | Core | Registry table + health checks + fallback policy | L | 0 + provider |
| E. Projects, media library, history, saved prompts, preview, export | only `uploads` (flat, per-org) | Core | New data model; object storage | L | storage $0.015/GB-mo (R2, fetched earlier) |
| E. Batch generation / ZIP download | none | Medium | After queue | M | egress |
| F. Task queue, progress, cancel, retry, duplicate prevention | none. Only `idempotent` middleware on payments exists | Core | Durable job queue + workers; reuse idempotency | XL | worker VM(s) |
| Credits | none (limits are counts of queries) | Core | Credit ledger, atomic debit/refund-on-fail | L | 0 |
| Customer role | roles are only OWNER/MANAGER (`app.js:678`); "customers" are org owners | Core | Add END_USER within org or per-user accounts | M | 0 |
| Owner-editable plans/prices/limits/models | `PLANS` is a code constant | Core | Move to DB + admin API (server-enforced) | M | 0 |
| Password recovery, email delivery | not implemented | High | Email provider + reset tokens | M | ≤$20/mo |
| Error/perf monitoring | request ids + logs only; Sentry not wired | High | Sentry + uptime | S | free→$29/mo |

## 5. Broken or unreliable workflows

1. **Single-process JSON file store** — one writer, whole-file rewrite per change; large media metadata/job churn will hit
   latency and data-loss limits quickly. (`lib/store.js`; Phase 13 PERF results.) Must change before F is built.
2. **No real payment path** → cannot charge anyone today. 3. **No email** → no reset/receipts.
4. Client, browser, mobile and Android never executed in this environment. 5. Express 4/5 behaviour only tested via shim
   (real-Express test written, runs in CI, not yet executed).

## 6. Needs external API providers (none integrated)
Image + video + audio generation/editing providers (several, for fallback); payment gateway; email; object storage/CDN;
error monitoring. Only Gemini (chat) exists. Provider choice/terms/pricing not yet researched — do that in Phase 15 planning.

## 7. Features that create additional costs
Per-generation provider fees (dominant, esp. video), storage + **egress** for media, worker compute (ffmpeg/queue),
database, email, monitoring, gateway fees, abuse/fraud (free tier + generation = cost-drain target). A free tier with
real generation is the biggest financial risk: it needs hard credit caps, signup abuse limits and per-user spend ceilings
enforced **server-side before** the provider call.

## 8. Security & scalability concerns specific to the vision
- Provider API keys must be server-only, encrypted at rest (AES-GCM helper exists in `lib/security.js`).
- Generation cost-abuse: atomic credit reservation, refund on failure, per-IP/account velocity limits.
- User-generated media: content moderation/legal (provider policies, DMCA, CSAM reporting duties), signed URLs, malware
  scanning for uploads, size/type limits beyond 6 MB images, private-by-default storage.
- Webhook/poll callbacks from providers need signature verification and idempotency.
- Scalability: JSON store and single Fly machine are fine for ≤ low-hundreds of light users, **not** for media jobs.
- Backups: currently JSON + uploads only; media at scale needs object-storage versioning.

## 9. Professional customer experience gaps
Navigation is organised around store-integration concepts (Discovery, Feature Registry, Sync, Hub replication) — none
of it fits a creative workspace. Needed: prompt box + live generation progress, gallery with previews, clear
credit balance, failure messages with refund, upgrade prompts tied to server-side limits, mobile layout verified on a
real device, onboarding. Complexity: L; cost 0.

## 10. Recommended priorities (for your approval — no implementation started)

0. **Decide pivot vs new product** (above). Pause Phase 14 *production* launch of the current product accordingly.
1. **Foundations (chassis changes the vision needs):** real database (Postgres) replacing the JSON store; plans/limits/models
   as admin-editable data; credit ledger; Customer role. *(Architecture change — justified: media jobs, concurrent writers,
   credit atomicity cannot be built safely on a rewrite-the-whole-file store.)*
2. **Thin vertical slice:** ONE capability end-to-end — text-to-image via one provider, with job queue, progress, cancel/retry,
   credit debit/refund, gallery, download, Owner model toggle. Proves the architecture and the real unit economics.
3. **Billing for real:** Stripe verifier, cancel/downgrade, receipts email, password recovery.
4. **Model Hub + fallback + usage analytics** (second provider).
5. **Video** (image-to-video first) once queue and cost controls are proven.
6. **Editing tools**, then batch, then audio/media conversion.
7. Deferred/needs justification: HDR, slow-motion, self-hosted processing, voice tools.

Rough effort (engineer-weeks, order-of-magnitude, unverified): foundations 3–5, image slice 3–4, billing 2–3,
model hub 2–3, video 4–6, editing 3–5 → **~17–26 weeks of focused work** for a credible v1 with images+video+billing.
That is the honest scale; Phases 11–14 covered the chassis, not this product.

## 11. Risks to the plan
Unit economics unproven (provider cost vs plan price); provider policy/availability changes; moderation obligations;
the pivot discards unused store-integration screens (keep them hidden, don't delete, per your rules); my earlier
"commercial launch" statements referred to the old product and should not be read as readiness for this vision.
