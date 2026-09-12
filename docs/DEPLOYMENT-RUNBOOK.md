# Deployment runbook — CAA recruitment portal

Frontend (Netlify) and backend (Docker on your server) are deployed independently. PostgreSQL holds all business data; the frontend never bundles demo jobs or applications.

## Production URLs (current)

| Layer | Where |
| --- | --- |
| Frontend | Netlify site **recruitfront** (e.g. `https://recruitfront.netlify.app`) |
| API | `http://67.205.157.80:8082` (container port 8080, host 8082) |
| Database | PostgreSQL in Docker on the same host (`/opt/caa-recruitment`) |

## Netlify (frontend)

1. **Environment variables** (Site settings → Environment variables → Production):

   | Variable | Value |
   | --- | --- |
   | `BACKEND_API_URL` | `http://67.205.157.80:8082` (no trailing `/api`) |
   | `VITE_API_URL` | leave unset / empty |

2. **Deploy**: merge to `main` → Netlify builds automatically.

3. **Verify after deploy**:

   ```bash
   curl -sS -o /dev/null -w '%{http_code}\n' https://recruitfront.netlify.app/api/jobs
   curl -sS -o /dev/null -w '%{http_code}\n' https://recruitfront.netlify.app/api/settings
   ```

   Expect `200`. In the browser, hard refresh once (`Ctrl+Shift+R`) so old demo `localStorage` keys are cleared.

4. **Smoke pages**: `/`, `/vacancies`, `/login`, `/dashboard` (candidate), `/admin` (HR).

## Server (API + database)

Path on server: `/opt/caa-recruitment` (`docker compose`).

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
curl -sS http://67.205.157.80:8082/api/jobs | head -c 200
curl -sS -X POST http://67.205.157.80:8082/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@caa.go.ug","password":"Admin@2026"}'
```

## Demo vs real production data

| Mode | When |
| --- | --- |
| **Demo seed** (`seed:all`) | Staging, demos, training — includes ~900 sample applications |
| **Real hiring** | Run `seed:core` once (structure + settings), then create jobs in admin UI; **avoid** `seed:volume` on prod |

After go-live, rotate demo admin passwords and restrict demo accounts to non-production environments when possible.

## Related repos

- `final-caa-backend` — API, Flyway migrations, seeder
- `final-caa-database` — PostgreSQL init SQL (mirrors Flyway for fresh volumes)

## CI (GitHub)

Every push/PR to `main` runs `npm run typecheck` and `npm run build` (see `.github/workflows/ci.yml`).
