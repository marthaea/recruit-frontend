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

1. **Environment variables** (Site settings → Environment variables → Production):

   | Variable | Value |
   | --- | --- |
   | `BACKEND_API_URL` | `https://api.mukasamatthew.com` (no trailing `/api`) |
   | `VITE_API_URL` | leave unset / empty |

2. **Deploy**: merge to `main` → Netlify builds automatically.

3. **Verify after deploy**:

   ```bash
   npm run smoke:prod
   ```

   Or manually:

   ```bash
   curl -sS -o /dev/null -w '%{http_code}\n' https://api.mukasamatthew.com/api/jobs
   curl -sS -o /dev/null -w '%{http_code}\n' https://api.mukasamatthew.com/api/settings
   ```

   Expect `200`. In the browser, hard refresh once (`Ctrl+Shift+R`) so old demo `localStorage` keys are cleared. Log in with backend demo accounts to confirm dashboards (passwords in backend README only).

4. **Smoke pages**: `/`, `/vacancies`, `/login`, `/dashboard` (candidate), `/admin` (HR).

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
