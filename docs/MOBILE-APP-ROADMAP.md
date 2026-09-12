# Mobile app — preparation roadmap

Planning doc for a **native mobile client** for the UCAA e-Recruitment portal. The web app (`recruit-frontend`) and API (`final-caa-backend`) stay the source of truth; mobile is a new client, not a rewrite.

## Current platform (reuse as-is)

| Layer | URL / repo |
| --- | --- |
| Public API | `https://api.mukasamatthew.com/api` |
| Web portal | `https://recruitfront.netlify.app` (Netlify `/api` proxy — **web only**) |
| OpenAPI | `final-caa-backend/contracts/openapi.yaml` |
| Auth (web) | Access JWT in memory + **httpOnly** refresh cookie on the **Netlify** origin |

Mobile must call the **API host directly**, not `recruitfront.netlify.app/api`.

## Recommended stack

| Choice | Why |
| --- | --- |
| **Expo (React Native) + TypeScript** | Same language as the web app; fast iteration; EAS Build for iOS/Android |
| **New repo** e.g. `recruit-mobile` | Keeps Netlify web deploy independent; optional later: npm workspace for shared types |

Alternatives (only if you have a strong preference): Flutter, or **Capacitor** wrapping the web app (fastest MVP, weaker native UX).

## Auth — plan before coding screens

Web login flow today:

1. `POST /api/auth/login` → JSON includes **access `token`**; response **Set-Cookie** `caa_refresh`.
2. `POST /api/auth/refresh-token` reads refresh **from cookie only** (no body field).

For a native app you should pick one approach and implement it in the **backend first**:

| Option | Work |
| --- | --- |
| **A. Mobile refresh in request body** (recommended) | Extend `refresh-token` to accept `{ "refreshToken": "..." }` when cookie absent; optionally return `{ token, refreshToken }` on login/register for `Client-Type: mobile` header |
| **B. Cookie jar on API domain** | Store `caa_refresh` from `Set-Cookie` and send `Cookie` on refresh — fragile across app restarts unless persisted carefully |

Also confirm **CORS** is irrelevant for native clients; ensure **rate limits** on auth endpoints still apply.

Store **refresh token** in **Expo SecureStore** (Keychain / Keystore). Keep **access token** in memory only (same as web `client.ts`).

## MVP scope (candidate-first)

Ship in phases; HR console can stay web-only initially.

| Phase | Features |
| --- | --- |
| **M1** | Login, register, verify email (deep link), forgot/reset password |
| **M2** | Vacancies list/detail, apply, my applications, withdraw |
| **M3** | CV profile (qualifications, experience, referees, photo upload) |
| **M4** | Push notifications (FCM/APNs) for application status — needs backend device tokens |

Deep links: `recruitfront.netlify.app/verify-email?token=…` can open the app via **Universal Links / App Links** once the app is published; same token API as web.

## Code reuse from web

Copy or extract (later) without dragging in TanStack Router / DOM:

- `src/utils/validators.ts` — email, phone, name rules  
- `src/constants/uganda-curriculum.ts` — pickers  
- `src/features/candidate/utils/cv-completion.ts` — checklist logic  
- API types/endpoints — generate from **OpenAPI** into `recruit-mobile/src/api/` (openapi-generator or hand-maintained subset mirroring `src/services/api/client.ts`)

Do **not** reuse `AppContext.tsx` wholesale; mobile needs React Navigation + smaller stores (Zustand or TanStack Query).

## Backend / ops checklist (before sprint 1)

- [ ] Mobile auth contract (refresh body + optional login response fields)  
- [ ] `CORS_ALLOWED_ORIGINS` unchanged for web; document mobile as direct API client  
- [ ] File upload paths (`/api/cv`, photos) tested from multipart mobile client  
- [ ] Email templates already use `FRONTEND_URL` for links — add **`MOBILE_DEEP_LINK_SCHEME`** later if app uses custom URL scheme  
- [ ] Staging API hostname (optional) so mobile dev doesn’t hit production rate limits  

## Suggested repo bootstrap (when you start)

```bash
npx create-expo-app@latest recruit-mobile -t expo-template-blank-typescript
cd recruit-mobile
# env: EXPO_PUBLIC_API_URL=https://api.mukasamatthew.com/api
```

CI: EAS Build + lint/typecheck; no secrets in repo.

## Related docs

- [DEPLOYMENT-RUNBOOK.md](./DEPLOYMENT-RUNBOOK.md) — production API, SMTP, server compose  
- Backend integration notes (if present in backend repo `README.md` / OpenAPI)

When mobile work starts, create **`recruit-mobile`**, link it in this doc, and track **M1** auth API changes in `final-caa-backend` before UI polish.
