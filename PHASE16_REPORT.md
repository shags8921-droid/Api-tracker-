# Phase 16 — Core Product Implementation: Completion Report

Basis: approved Phase 15 audit. Scope this phase: P0 truthfulness fixes + P1 connector foundation, **WooCommerce only**.
Shopify, custom REST/GraphQL, description/image/category/page/banner **writes**, and existing-dashboard replication are NOT built.

## Verification status (read this first)
| Area | Status |
|---|---|
| Server logic, 42 tests (33 existing + 9 new), all passing | **Executed** |
| WooCommerce behaviour against a **real store** | **NOT tested** — no store/keys available. Connector tests use a documented-shape test double. |
| Real Express (body limits, `rawBody` signature capture) | **NOT run** (Express cannot be installed here). `test/realexpress.test.js` runs in CI. Inbound-webhook signature verification relies on `express.json({verify})` capturing the raw body; unverified on real Express. |
| Client | Type-checked only (changed files show no real type errors; React typings unavailable offline). **Not run in a browser or on mobile.** |
| Android app | Not touched, not verified. |

## Implemented
- **Truthfulness (P0):** Connect screen now calls the real backend probe (fake 650 ms "HTTP 200" removed). Real-site discovery reports only observed facts; unperformed stages are `SKIPPED`, never invented; sample data only in the sandbox, labelled DEMO. Plan copy and Manager Hub text corrected; workspace-only data is labelled and API responses carry `workspaceOnly` / `remoteConfirmed`.
- **Secure connections (A):** `PUT /websites/:id/credentials` detects WooCommerce (`/wp-json/` namespace `wc/v3`), verifies the key with a real authenticated read, stores credentials AES-GCM encrypted (`credentialsEnc`), never returns them (also stripped from `/websites`, export), never logs them. HTTPS only, SSRF-safe at connect time. `DELETE /websites/:id` destroys credentials and webhook secret, keeps records, blocks all further remote calls. Rollback of backups can no longer restore credentials. Connection status/health/last error exposed.
- **Discovery & manifest (B/E):** `POST /websites/:id/sync` reads products, categories, orders (paged, capped at 20×100, truncation reported). `GET /websites/:id/manifest` lists what is Supported / Not built yet / Not possible. Existing-dashboard replication is explicitly "not possible" for WooCommerce beyond REST-exposed functions.
- **Hubs (C/D):** price (owner), stock, order completion through the store **first**; local data changes only after the store confirms; failure returns `applied:false` and is audited as FAILED. Remote writes require `confirm:true`. Managers cannot change prices.
- **Sync (F):** inbound WooCommerce webhooks (`/inbound/woocommerce/:siteId`, HMAC-SHA256 base64 over raw body, timing-safe, deduplicated by delivery id, 404 after disconnect), polling fallback with exponential back-off (`SYNC_INTERVAL_MS`, default 15 min), idempotent upserts keyed by (site, remoteId), per-site sync lock. `order.created` and `catalog.stock_low` outbound events now actually fire.
- **AI management (G):** `POST /ai/command` (rule-based parser, no model needed) answers low-stock/today's-orders, **proposes** price changes (nothing executed), `POST /ai/command/:id/confirm` executes after owner confirmation: single-use, 5-min expiry, bound to user and tenant. Unsupported requests are labelled unsupported.
- **UI:** `ConnectedStoresPanel` (add site, connect with key, sync, disconnect, capability list, AI box) mounted in the Connect screen; Manager Hub sends `confirm:true`.
- Also: FAIL-002/PERF-002 fixes, readiness, graceful shutdown, deploy assets (Phase 14 prep) are included in this merge.

## Files
New: `server/lib/connectors/{index,woocommerce}.js`, `server/test/connectors.test.js`, `src/components/ConnectedStoresPanel.tsx`, this report.
Modified: `server/app.js`, `server/index.js`, `server/lib/{probe,plans,store}.js`, `server/test/express-shim.js`, `src/domain/discovery/engine.ts`, `src/screens/{ConnectWebsite,ManagerHub,MultiTenantWorkspace}Screen.tsx`, `src/services/api.ts`.

## Security results
Verified by test: credentials never in DB plaintext, API output, export or audit log; tenant isolation on connect/sync/manifest/AI proposals; manager forbidden from connect/price; bad signature 401; replay ignored; disconnect stops outbound calls; failed remote write leaves local data unchanged; no remote call without confirmation. Existing 33 tests (auth, isolation, billing fail-closed, SSRF, persistence) still pass.

## Remaining issues
- **P0:** none known in tested code; real-store and real-Express behaviour unverified (see above).
- **P1:** Shopify connector; custom REST/GraphQL connector; real WooCommerce test; write-permission pre-check (key permission is unknown until first write); description/image/category/page/banner writes; per-site scoping in the non-synced "workspace" screens; client-side sync queue (`localStorage`) still present and unrelated to remote sync; Owner Hub has no price editing UI yet (price is available via API and AI box); order list not filtered per active site.
- **P2:** payment verifiers, email/password recovery, JSON store → database before scale, browser/mobile/Android testing, conflict detection on concurrent store edits (remote wins on next sync, no per-field merge).
- **P3:** more platforms, bulk operations.

## Recommended next phase (Phase 17, needs approval)
1. Provide a WooCommerce test store + keys (secret mechanism) and run the connector against it; fix whatever differs from the documented shapes.
2. Run the client in a browser (desktop + phone widths); add Owner Hub price/description editing UI.
3. Shopify decision and connector, or custom OpenAPI connector.
4. Then staging deploy (Phase 14 Stage 4) with your Fly token and domain.
