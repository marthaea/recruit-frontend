# CAA Recruitment Frontend

React and TypeScript recruitment portal built with TanStack Start, Vite, Tailwind CSS, and Nitro.
Deployed independently on Netlify; talks only to the backend HTTP API.

## Project architecture

- `src/app` — application providers, layouts, and error handling
- `src/components` — reusable navigation and feedback UI
- `src/features` — domain pages and feature components
- `src/routes` — thin TanStack file-route adapters
- `src/services` — API client and document utilities
- `src/assets/images`, `src/constants`, `src/hooks`, `src/utils`, `src/styles`
- `docs` — project notes and presentation material

`src/routeTree.gen.ts` is generated and should not be edited manually.

## Environment variables

### Netlify (production)

Set these in **Site settings → Environment variables**:

| Variable | Required | Value |
| --- | --- | --- |
| `BACKEND_API_URL` | Yes (production) | Backend origin only, no trailing `/api`. Example: `http://YOUR_API_HOST:8082`. Deploy previews build without it, but `/api` proxying will be missing until it is set for all contexts. |
| `VITE_API_URL` | No | Leave empty so the browser uses same-origin `/api` (proxied by Netlify) |

The production build writes `dist/_redirects`:

```text
/api/*  ${BACKEND_API_URL}/api/:splat  200!
```

That keeps auth cookies first-party on the Netlify domain.

### Local development

Copy `.env.example` to `.env`:

```bash
VITE_API_URL=
VITE_DEV_API_PROXY=http://YOUR_API_HOST:8082
```

Leave `VITE_API_URL` empty. Vite proxies `/api` to `VITE_DEV_API_PROXY`.

Never put secrets or database credentials in `VITE_*` variables.

## Bootstrap data (PostgreSQL, not the frontend)

Jobs, applications, portal settings, staff directory, demo CVs, and demo login accounts are **seeded by the Java backend** into PostgreSQL (`final-caa-backend` → `SeedCatalog` / `DatabaseSeeder`). This app starts empty and loads everything through `/api/*`.

After the database schema exists:

```bash
cd ../final-caa-backend
npm run seed:core    # departments, settings, admins, staff, 14 jobs
npm run seed:demo    # demo candidates, CVs, pinned applications, analytics
npm run seed:volume  # optional ~900 applications (dev/demo)
# or
npm run seed:all
```

Production: set `SEED_DEMO=true` and `SEED_ALLOW_PRODUCTION=true` when running the seed script (see backend README). Demo passwords are never shipped in this frontend bundle.

## Commands

```bash
npm ci
npm run dev
npm run verify    # typecheck + production build (same as CI)
npm run lint
npm run typecheck
npm run format:check
BACKEND_API_URL=http://YOUR_API_HOST:8082 npm run build
npm run preview
```

## Operations

See **[docs/DEPLOYMENT-RUNBOOK.md](docs/DEPLOYMENT-RUNBOOK.md)** for Netlify env vars, server deploy, seeding, and production smoke checks.
