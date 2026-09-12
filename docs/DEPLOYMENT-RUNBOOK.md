# Deployment runbook — CAA recruitment portal

Frontend (Netlify) and backend (Docker on your server) are deployed independently. PostgreSQL holds all business data; the frontend never bundles demo jobs or applications.

## Production URLs (current)

| Layer | Where |
| --- | --- |
| Frontend | Netlify site **recruitfront** (e.g. `https://recruitfront.netlify.app`) |
| API | `https://api.mukasamatthew.com` only (NPM → `caa-api` on Docker network) |
| API (SSH on server) | `http://127.0.0.1:8082` for local ops — **not** exposed on the public IP |
| Database | PostgreSQL in Docker on the same host (`/opt/caa-recruitment`) |

## Netlify (frontend)

### API routing (recommended)

| Layer | Pattern |
| --- | --- |
| Browser | `fetch("/api/…")` on the Netlify site origin |
| Netlify | `dist/_redirects` proxies `/api/*` → `${BACKEND_API_URL}/api/*` |
| Auth | Refresh cookie stays **first-party** on the frontend host (no cross-origin API URL in the bundle) |
| Config | **`BACKEND_API_URL` only in Netlify environment variables** — not in git |

Do **not** set `VITE_API_URL` in production unless you deliberately host the API on another origin and have configured backend CORS and cookie policy for that.

The production build **fails** if `BACKEND_API_URL` uses port `8082`, a raw IP, `http://`, or a trailing `/api`.

1. **Environment variables** (Site settings → Environment variables → Production):

   | Variable | Value |
   | --- | --- |
   | `BACKEND_API_URL` | Your public API origin, e.g. `https://api.example.com` (no trailing `/api`) |
   | `VITE_API_URL` | **Unset / empty** |

2. **Deploy**: merge to `main` → Netlify builds automatically.

3. **Verify after deploy**:

   ```bash
   export SMOKE_BASE_URL="https://your-frontend.netlify.app"
   export SMOKE_API_URL="https://api.example.com"
   npm run smoke:prod
   ```

   Or manually:

   ```bash
   curl -sS -o /dev/null -w '%{http_code}\n' "$SMOKE_BASE_URL/api/jobs"
   curl -sS -o /dev/null -w '%{http_code}\n' "$SMOKE_API_URL/api/settings"
   ```

   Expect `200`. In the browser, hard refresh once (`Ctrl+Shift+R`) so old demo `localStorage` keys are cleared. Log in with backend demo accounts to confirm dashboards (passwords in backend README only).

4. **Smoke pages**: `/`, `/vacancies`, `/login`, `/dashboard` (candidate), `/admin` (HR).

### Troubleshooting: `/api/*` returns HTTP 500 on Netlify

Symptoms in the browser: `POST /api/auth/register` 500, empty response, registration fails; `GET /api/jobs` also 500 through `recruitfront.netlify.app` while `https://api.mukasamatthew.com/api/jobs` returns 200.

**Cause:** Production build wrote `dist/_redirects` with a backend origin Netlify cannot reach — usually `http://67.205.157.80:8082` after the API was bound to `127.0.0.1:8082` only.

**Fix:**

1. Netlify → **Environment variables** → **Production** → set **`BACKEND_API_URL`** to your public HTTPS API origin (remove any `:8082` or raw IP). Clear **`VITE_API_URL`** if it was set during an earlier workaround.
2. **Deploys** → **Trigger deploy** → **Clear cache and deploy site**.
3. Confirm:

   ```bash
   curl -sS -o /dev/null -w '%{http_code}\n' https://recruitfront.netlify.app/api/jobs
   ```

   Expect `200`. Then retry candidate registration.

**Noise in DevTools:** `Could not establish connection. Receiving end does not exist` comes from a browser extension, not this app. `GET /api/permissions` 403/401 is expected for candidates (admin-only); it does not block registration.

## Server (API + database)

Path on server: `/opt/caa-recruitment` (`docker compose`).

**Public API hostname:** Cloudflare DNS `api.mukasamatthew.com` → Nginx Proxy Manager (`npm-app-1` on `caa-net`) → `http://caa-api:8080`. Port **8082** is bound to **127.0.0.1** on the host only (no `http://SERVER_IP:8082` from the internet).

### Routine API update

```bash
cd /opt/caa-recruitment
# sync source (git pull or rsync from final-caa-backend — never overwrite .env)
docker compose build api
docker compose -f docker-compose.prod.yml up -d api --no-deps --force-recreate
docker compose ps
```

**Protect secrets:** keep `/opt/caa-recruitment/.env` only on the server. After any change:

```bash
cp -a /opt/caa-recruitment/.env /opt/caa-recruitment/.env.backup-$(date +%F)
chmod 600 /opt/caa-recruitment/.env*
```

**One-shot production env + API restart** (on the server, after Brevo creds are exported):

```bash
cd /opt/caa-recruitment
SMTP_USER='your-brevo-smtp-login' \
SMTP_PASSWORD='your-brevo-smtp-key' \
SMTP_FROM='verified-sender@yourdomain.com' \
./scripts/finish-production-on-server.sh
```

Flyway runs on API startup; new migrations apply automatically.

### Database seed (idempotent)

Demo/bootstrap data lives in the Java seeder (`SeedCatalog` / `DatabaseSeeder`). **Do not** re-seed production casually if you already have real applications.

When you need a fresh demo dataset:

```bash
cd /opt/caa-recruitment
set -a && source .env && set +a
export SPRING_PROFILES_ACTIVE=prod
export SEED_DEMO=true
export SEED_ALLOW_PRODUCTION=true
# Host needs JDK 21, or use the Maven Docker one-liner documented in backend README
./scripts/seed.sh all   # or: core, demo, volume separately
```

### Verify API directly

```bash
curl -sS https://api.mukasamatthew.com/api/jobs | head -c 200
# On the server only (localhost):
curl -sS http://127.0.0.1:8082/ping
```

## Demo vs real production data

| Mode | When |
| --- | --- |
| **Demo seed** (`seed:all`) | Staging, demos, training — includes ~900 sample applications |
| **Real hiring** | Run `seed:core` once (structure + settings), then create jobs in admin UI; **avoid** `seed:volume` on prod |

After go-live, rotate demo admin passwords and restrict demo accounts to non-production environments when possible.

### Protected production accounts (do not delete)

These are **real operator/test accounts**, not demo seed data. Do **not** remove them during DB cleanup, re-seed, or manual SQL unless the owner asks:

| Email | Notes |
| --- | --- |
| `matthewkesh950@gmail.com` | SMTP / portal test recipient; keep user row if registered |

Never run `TRUNCATE users`, `seed:all`, or `rsync --delete` on production without backing up `.env` and confirming you are not wiping live candidates.

## Email (Brevo SMTP)

Edit `/opt/caa-recruitment/.env` on the server (never commit secrets):

| Variable | Production value |
| --- | --- |
| `SMTP_ENABLED` | `true` |
| `SMTP_HOST` | `smtp-relay.brevo.com` |
| `SMTP_PORT` | `2525` (use **2525** on Thewton-Server; outbound **587** is blocked) |
| `SMTP_USER` | Brevo SMTP login from **Settings → SMTP & API** |
| `SMTP_PASSWORD` | Brevo **SMTP key** (not account password) |
| `SMTP_FROM` | Address verified in Brevo |
| `SMTP_SENDER_NAME` | `CAA HR Team` (or value from admin settings) |

Then `cd /opt/caa-recruitment && docker compose -f docker-compose.prod.yml up -d api --no-deps`.

**Required in `/opt/caa-recruitment/.env` for Netlify + cookies:**

| Variable | Value |
| --- | --- |
| `SPRING_PROFILES_ACTIVE` | `prod` (not `dev` — dev CORS defaults block `recruitfront.netlify.app` → **403** on login) |
| `CORS_ALLOWED_ORIGINS` | `https://recruitfront.netlify.app` |
| `FRONTEND_URL` | `https://recruitfront.netlify.app` |
| `AUTH_COOKIE_SECURE` | `true` |
| `AUTH_COOKIE_SAME_SITE` | `None` |

From the backend repo you can merge vars safely:

```bash
SMTP_USER='…' SMTP_PASSWORD='…' SMTP_FROM='…' ./scripts/configure-brevo-env.sh /opt/caa-recruitment/.env
```

### Verification emails not in the inbox

`POST /api/auth/resend-verification` returning **200** means the app **queued** mail in `outbox_events`. Delivery only happens when the API container has **`SMTP_ENABLED=true`** and valid Brevo credentials (`SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`). If SMTP is off, rows stay **`published_at IS NULL`** forever — no email leaves the server.

On the server, confirm env (no secrets in logs):

```bash
docker exec caa-api printenv SMTP_ENABLED SMTP_HOST SMTP_PORT SMTP_FROM FRONTEND_URL
```

Expect `SMTP_ENABLED=true`, `SMTP_PORT=2525` on Thewton-Server, `FRONTEND_URL=https://recruitfront.netlify.app`, and non-empty `SMTP_FROM`. Configure via backend `scripts/configure-brevo-env.sh`, then:

```bash
cd /opt/caa-recruitment && docker compose -f docker-compose.prod.yml up -d api --no-deps
```

Pending verification events are sent on the next outbox poll once SMTP works.

1. On the server, stuck outbox rows should be **0**:

   ```bash
   docker exec caa-postgres psql -U caa -d caa_recruitment -t -c \
     "SELECT count(*) FROM outbox_events WHERE event_type = 'identity.email-verification-requested' AND published_at IS NULL;"
   ```

   If `last_error` mentions mail connection failures, recheck `SMTP_HOST` / `SMTP_PORT` (2525) and restart `api`.

2. Ask the user to check **spam/junk/promotions** and wait a few minutes.

3. Each link works **once**; opening an old link again shows “invalid or already used” — use **Resend link** and the **newest** email.

4. In **Brevo → Transactional**, check logs for blocks/bounces on that address. **`SMTP_FROM`** must be a verified sender in Brevo.

5. **`FRONTEND_URL`** in `.env` must be `https://recruitfront.netlify.app` so links open the live portal.

### Auth rate limiting (keep enabled)

The API enforces per-IP limits in `ApiRateLimitFilter` (stored in `api_rate_limits`). This is **intentional** — do not disable it or bulk-clear the table in production.

| Bucket | Limit | Window |
| --- | --- | --- |
| Auth (`login`, `register`, `reset-password`, `resend-verification`) | 10 requests | 15 minutes |
| Forgot password | 3 requests | 1 hour |
| General `/api/*` | 300 requests | 15 minutes |

**HTTP 429** after repeated login or **Resend link** clicks is expected. Users should wait for the window to expire; the banner surfaces the API message (“Too many attempts. Please try again in 15 minutes.”).

**Do not** run `DELETE FROM api_rate_limits` (or truncate the table) as routine troubleshooting. Old rows are pruned automatically (entries older than one day). Clearing limits weakens protection against credential stuffing and verification-email abuse.

## Related repos

- `final-caa-backend` — API, Flyway migrations, seeder
- `final-caa-database` — PostgreSQL init SQL (mirrors Flyway for fresh volumes)

## CI (GitHub)

Every push/PR to `main` runs `npm run typecheck` and `npm run build` (see `.github/workflows/ci.yml`).
