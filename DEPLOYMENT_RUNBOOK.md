# SitePulse AI — Deployment Runbook (Fly.io, Singapore)

> **Status: prepared, NOT executed.** No command below has been run against Fly.io. Nothing has been deployed.
> Verified in the build sandbox: 33 server tests pass; backup/restore scripts run and detect tampering.
> **Not verified:** Docker build, real Express (test written, runs in CI), Fly deploy, TLS/DNS, real payments, email.

## 0. Rules
- Secrets only via `fly secrets set` — never in git, chat or `fly.toml`.
- Never delete the volume or run destructive commands on production without explicit approval.
- Run all commands from `web/`. Production is deployed only after explicit approval (Stage 6).

## 1. One-time setup (staging first)
```bash
fly auth login
fly apps create sitepulse-ai-staging
fly volumes create sitepulse_data --app sitepulse-ai-staging --region sin --size 1
fly secrets set --app sitepulse-ai-staging \
  AUTH_SECRET="$(openssl rand -hex 32)" \
  ALLOWED_ORIGINS="https://staging.<your-domain>" \
  PLATFORM_ADMIN_EMAILS="<owner-email>"
# optional: GEMINI_API_KEY=...
fly deploy --config ../deploy/fly.staging.toml --dockerfile Dockerfile --app sitepulse-ai-staging --ha=false
```
`--ha=false` and a single volume: the JSON store supports **one instance only**. Never scale above 1 machine.

## 2. Verify staging
```bash
node ../deploy/smoke.mjs https://sitepulse-ai-staging.fly.dev --register   # staging only
fly logs --app sitepulse-ai-staging
```
Manual: register, add a site, run a check, export data, confirm payments return 503 (no verifier), confirm
`fly machine restart` keeps the data, and run a backup + restore-verify.

## 3. Production (only after written approval)
Same as above with `sitepulse-ai`, `fly.production.toml`, a **new** random `AUTH_SECRET`, and
`ENABLE_DEMO_SEED`/`ALLOW_SIMULATED_PAYMENTS` unset. Smoke **without** `--register`.
DNS: CNAME `app.<domain>` → `sitepulse-ai.fly.dev`; `fly certs add app.<domain>`; set `ALLOWED_ORIGINS` accordingly.

## 4. Backups
- Automatic: `fly volumes snapshots` (daily, 5-day retention by default; confirm with `fly volumes snapshots list`).
- Logical off-box: `fly ssh console -C "DATA_DIR=/data /app/scripts/backup.sh /tmp"` then `fly ssh sftp get` the archive.
  (`scripts/` is copied into the image.)
- Verify any archive: `scripts/restore-verify.sh archive.tar.gz` (checksums + JSON parses). Do this monthly.

## 5. Rollback
**Code:** `fly releases --app sitepulse-ai` → `fly deploy --image <previous image ref>`; then smoke.
**Data:** the store keeps `database.prev.json`. For a bad data change: stop writes (`fly scale count 0`), restore from a
verified archive or `fly volumes create --snapshot-id <id>` into a *new* volume, point the app at it, start, smoke.
Never overwrite the existing volume in place; keep it until the restore is confirmed.
**Secrets:** rotating `AUTH_SECRET` signs everyone out (acceptable) but breaks decryption of any data encrypted with it —
do not rotate without a plan.

## 6. Monitoring (free tier)
UptimeRobot (5-min) on `/api/v1/ready`; Sentry optional (not wired in code). Fly alerts on machine crash.

## 7. Known launch blockers (unchanged)
No real payment verifiers (billing is fail-closed), no email delivery, no password recovery, no browser/mobile or
Android verification, single-instance JSON store (migrate to a database before scaling).
