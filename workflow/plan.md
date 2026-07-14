## Goal
Restructure the CAA portal into two modules (Admin + Candidate) sharing one backend, with role-based visibility, a multi-step CV builder, and full job-listing management. This is a demonstration build (no real backend yet) — state is held in `AppContext` + `localStorage` so the workflow is fully clickable end-to-end.

## Scope at a glance

### 1. Auth & account types
- Email + password + account type radio: **External** (any email) or **Internal CAA staff** (`@caa.co.ug` + employee number).
- Internal users downgraded to external if non-CAA email used on subsequent sign-in.
- Admin route `/admin` with separate login (seeded demo: `admin@caa.co.ug` / `Admin@2026`).
- Three HR roles: **super** (Alex Mukasa), **hr** (Jane Mirembe), **recruiter** (David Ssempala).

### 2. Admin module (`/admin`, gated)
- Tab-based navigation with RBAC — tabs hidden if role lacks permission.
- **Dashboard** — KPIs (active listings, total applications, shortlisted, expired), application funnel pie chart, department bar chart, monthly trend line, Pending Actions panel.
- **Job Listings** — full CRUD with New/Edit modal, job advert PDF download, expired-badge detection.
- **Applications** — per-job filter, CV viewer modal with jsPDF dossier download, status controls, batch interview approval, auto-qualify screening, offer letter PDF.
- **Email Log** — searchable/filterable log of every notification email sent through the portal.
- **Interns (CGPA)** — CGPA-sorted intern applicants with per-row Shortlist/Decline, auto-screen modal (configurable threshold, default 3.8).
- **Site Analytics** — 7-day bar chart, top jobs by views, top search terms, recent event feed (page views, job views, apply clicks, searches, saves).
- **Internal Staff** — staff register with PDF download.
- **Reports & Exports** — 10 PDF report types with date-range filter (see below).
- **Criteria Setup** — per-job screening rules (CGPA, experience years, qualification level, keywords, disqualifying universities, qualifier/disqualifier questions, copy-from-job).
- **Audit Log** — searchable chronological log of all admin actions.
- **Settings** — portal-wide config (see below).
- **Permissions** — per-user permission overrides for all 11 permission flags.

### 3. Candidate module
- `/vacancies` — filterable job board (by department tab + search); only shows non-expired, visibility-appropriate jobs.
- `/job/$id` — full job detail with Apply Now CTA at the bottom only (not top).
- `/apply/$id` — multi-step application form with CV builder (7 steps).
- `/dashboard` — candidate's applications list with status badges and withdrawal option.
- Analytics tracking on job views, apply clicks, saves, searches.

### 4. CV Builder (`/cv-builder`, 7 steps)
1. Personal Info (name, DOB, gender, nationality, NIN, phone, email, address)
2. Qualifications (level, course, institution, year; O/A-Level: subjects + grades)
3. Professional Skills (chip input)
4. Work Experience (repeatable entries with proof upload)
5. References (min 2)
6. Next of Kin
7. Photo (passport upload)

CV stored in `cvStore` keyed by email. Two demo CVs seeded at startup (John Bukenya / Mary Auma).

### 5. Settings (admin)
- **Organisation name** and **email sender name** (shown in notification emails)
- **Closing-soon alert threshold** (days before deadline — configurable, default 7)
- **Max active applications per candidate** (enforced on addApplication, 0 = unlimited)
- **Allow external applicants to see internal jobs** toggle
- **Auto-logout after inactivity** (minutes)
- **Notification message templates** — 4 editable boilerplate messages (Shortlisted, Declined, Interview, Offer) with `{name}` and `{role}` placeholders

### 6. Permissions (admin)
11 per-user override flags:
- canViewApplications, canShortlist, canScreenInterns, canSendNotifications
- canManageJobs, canManageCriteria, canViewStaff
- canExport, canViewAudit, canManageSettings, canGrantPermissions

Role defaults: super = all true | hr = most true (no audit/settings/permissions) | recruiter = minimal

### 7. Criteria Setup (admin)
Per-job auto-screening configuration:
- **Minimum CGPA** (intern/graduate roles)
- **Minimum experience years** (explicit override)
- **Required qualification level** (override job's default)
- **Required keywords** (CV must contain all)
- **Disqualifying universities** (auto-exclude applicants from these institutions)
- **Qualifier / Disqualifier screening questions** (Yes/No or Number range; candidates auto-declined on fail)
- **Copy criteria from another job** (one-click copy)
- Notes for recruiters

### 8. Reports & Exports (admin)
10 PDF reports, all styled to UCAA letterhead:
1. Vacancies Report
2. Applications Report ← respects date-range filter
3. Department Summary ← respects date-range filter
4. Intern CGPA Ranking
5. Internal Staff Register
6. Audit Log
7. **Time-to-Hire Report** (avg days from application to offer, per vacancy)
8. **Diversity Summary** (gender breakdown from CV data, by dept)
9. **Screening Pass Rate** (shortlist conversion rate per vacancy)
10. **Applicants per Closing Date** (application volume by deadline)

Date-range filter available at the top of the Reports tab.

### 9. Analytics (admin)
- Seeded with ~900 deterministic events over 30 days (LCG-based, always populated)
- Real tracking on all candidate-facing pages: page views, job views, apply clicks, saves, searches
- Persisted to localStorage (last 30 days)
- 7-day bar chart, top 5 jobs, top searches, recent event feed

### 10. UX polish
- Scroll-triggered fade-in animations on admin dashboard (IntersectionObserver, no external library)
- Apply Now button only at the bottom of job detail (not duplicated at top)
- Closing-soon threshold configurable via Settings
- Deterministic seed data: ~907 applications, 14 jobs, 2 demo CVs, ~900 analytics events

---

## Key files

| File | Purpose |
|---|---|
| `src/context/AppContext.tsx` | All state, types, seed data, localStorage persistence |
| `src/routes/admin.tsx` | Entire admin console (all tab components) |
| `src/routes/job.tsx` | Candidate job detail (analytics tracking, Apply Now placement) |
| `src/routes/vacancies.tsx` | Job board with search tracking |
| `src/lib/admin-pdf.ts` | All 10 PDF export functions (jsPDF + autoTable) |
| `src/lib/uganda-curriculum.ts` | QUAL_LEVELS, SALARY_BANDS, DEPARTMENTS, EMPLOYMENT_TYPES |
| `src/routes/cv-builder.tsx` | 7-step CV builder |
| `netlify.toml` | SSR via Nitro, Cache-Control headers for fresh HTML |
| `workflow/plan.md` | This file |

---

## Out of scope (backend TODO — see next section)
- Real database (Supabase / PostgreSQL)
- Server-side auth (JWT / sessions)
- File storage (Supabase Storage / S3)
- Email sending (Resend / SendGrid)
- Real analytics pipeline
- Multi-tenant / organisation isolation

---

## Backend implementation roadmap

### Phase 1 — Auth & database (critical path)
1. **Database**: PostgreSQL via Supabase (or Railway). Tables: `users`, `jobs`, `applications`, `cv_profiles`, `audit_log`, `notifications`, `criteria`, `permission_overrides`, `sent_emails`, `settings`.
2. **Auth**: Supabase Auth (email/password). Row Level Security policies per account type. Admin role stored in `users.admin_role` column.
3. **API**: TanStack Start server functions (`createServerFn`) replace all `AppContext` write operations. Read operations become server-side loaders (`loader: async () => ...`).

### Phase 2 — File storage
4. **CV files**: Supabase Storage bucket `cv-uploads/` (PDFs, images). Max 5 MB, virus-scan via Edge Function.
5. **CV data**: Store parsed CV JSON in `cv_profiles` table; link to uploaded files by URL.

### Phase 3 — Email
6. **Transactional email**: Resend (or SendGrid). Create a Supabase Edge Function `send-notification` triggered by `applications.status` changes via Postgres triggers.
7. **Templates**: Store in `settings.notif_templates` JSON column (matches current `AdminSettings.notifTemplates` shape).

### Phase 4 — Analytics
8. **Event ingestion**: Replace localStorage tracking with a lightweight Edge Function `POST /analytics/event`. Store in `analytics_events` table with `session_id`, `ip_hash` (anonymised).
9. **Aggregation**: Materialised view or Supabase scheduled function to pre-aggregate daily counts.

### Phase 5 — Real-time & notifications
10. **Supabase Realtime**: Subscribe to `applications` and `notifications` table changes so the admin dashboard updates live without refresh.

### Phase 6 — Deployment
11. **Frontend**: Netlify (already configured). Set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` as Netlify environment variables.
12. **Migrations**: Use `supabase db push` with migration files checked into `supabase/migrations/`.
13. **Seed script**: Convert `generateSeedApplications()` + `DEMO_CV_STORE` into a `supabase/seed.sql` file.

### Data model sketch
```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  first_name text, last_name text,
  account_type text check (account_type in ('external','internal','admin')),
  admin_role text check (admin_role in ('super','hr','recruiter')),
  employee_number text,
  created_at timestamptz default now()
);

create table jobs (
  id serial primary key,
  title text not null, dept text, dept_key text,
  location text, salary text, salary_band text,
  type text, closes_at date, visibility text,
  min_age int, required_experience int, required_qualification text,
  description text, featured bool default false,
  created_by uuid references users(id),
  created_at timestamptz default now()
);

create table applications (
  id serial primary key,
  job_id int references jobs(id),
  candidate_id uuid references users(id),
  status text default 'Pending',
  cgpa numeric(3,1), university text,
  screening_answers jsonb,
  completion int default 0,
  applied_at timestamptz default now(),
  status_changed_at timestamptz
);

create table cv_profiles (
  id serial primary key,
  user_id uuid unique references users(id),
  data jsonb not null,
  updated_at timestamptz default now()
);

create table criteria (
  job_id int primary key references jobs(id),
  min_cgpa numeric(3,1),
  min_experience_years int,
  required_qual_level text,
  required_keywords text[],
  disqualifying_universities text[],
  screening_questions jsonb,
  notes text
);
```
