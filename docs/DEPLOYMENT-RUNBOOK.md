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
# sync source (git pull or rsync from final-caa-backend)
docker compose build api
docker compose up -d api
docker compose ps
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

Then `cd /opt/caa-recruitment && docker compose up -d api`.

From the backend repo you can merge vars safely:

```bash
SMTP_USER='…' SMTP_PASSWORD='…' SMTP_FROM='…' ./scripts/configure-brevo-env.sh /opt/caa-recruitment/.env
```

## Related repos

- `final-caa-backend` — API, Flyway migrations, seeder
- `final-caa-database` — PostgreSQL init SQL (mirrors Flyway for fresh volumes)

## CI (GitHub)

Every push/PR to `main` runs `npm run typecheck` and `npm run build` (see `.github/workflows/ci.yml`).
