# CAA Uganda e-Recruitment Portal — Full Documentation

> **Project type:** Production React frontend with Node.js/Express backend API. Data persists on MySQL 8 via Railway; authentication via JWT + httpOnly cookies; file storage via Cloudinary.
> **Last updated:** July 30, 2026 — Phase 3 Complete (job creation overhaul, panel scoring, approval workflow, templates, batch exports)

---

## Table of Contents

1. [What Has Been Achieved](#1-what-has-been-achieved)
2. [Current Technology Stack](#2-current-technology-stack)
3. [Roadmap — What Is To Be Achieved](#3-roadmap--what-is-to-be-achieved)
4. [Future Technology Stack](#4-future-technology-stack)
5. [Project Overview](#5-project-overview)
6. [User Types & Credentials](#6-user-types--credentials)
7. [Site Architecture & Routes](#7-site-architecture--routes)
8. [Candidate-Facing Features](#8-candidate-facing-features)
9. [HR Console (Admin)](#9-hr-console-admin)
10. [Role-Based Access Control (RBAC)](#10-role-based-access-control-rbac)
11. [State Management & Data Models](#11-state-management--data-models)
12. [PDF Generation](#12-pdf-generation)
13. [UI Design System](#13-ui-design-system)
14. [Job Listings & Categories](#14-job-listings--categories)
15. [Deployment — Netlify](#15-deployment--netlify)
16. [File Structure](#16-file-structure)
17. [Known Limitations & Future Work](#17-known-limitations--future-work)

---

## 1. What Has Been Achieved

The following features are fully implemented and working in production.

### Authentication & User Management
- Candidate registration with account type selection (External / Internal CAA Staff)
- Internal registration validates `@caa.co.ug` email domain
- Admin login with hierarchical roles (Super Admin, HR Director, Recruiter, plus CAA roles: HOD, DHRA, HR Officer, Auditor, IT Admin)
- Role-based session persistence via httpOnly cookies + JWT tokens

### Public / Candidate Side
- **Homepage** — hero image slideshow, live-filtered search bar, stats counter, featured vacancies grid
- **Vacancies page** — dynamic department tabs computed from live job data, skeleton loading, internal-access badge for CAA staff
- **Job detail page** — full rich-text layout per vacancy (description, responsibilities, requirements, benefits, quick-facts sidebar, sticky apply CTA)
- **8 or 9-step application form** — optional Eligibility step (screening questions) prepended when the job has them; then personal info, qualifications (Uganda curriculum O/A-Level dropdowns), skills, work experience, referees, next of kin, passport photo upload, review & submit
- **Mandatory field validation on Review step** — submission is blocked with a warning banner listing each missing required field and a jump-to-step button; candidate cannot submit until all mandatory fields are complete
- **CV auto-fill** — regex extraction from `.txt` / `.doc` upload (email, phone, NIN, DOB)
- **Candidate dashboard** — application tracker table, status badges, progress bars, HR notifications panel with unread count, withdraw confirmation modal, edit-profile modal; withdraw is disabled once the application status is Shortlisted, Interview, or Offered
- **PDF download for candidates** — UCAA-letterheaded application summary generated client-side
- **Demo candidate account** — `j.bukenya@gmail.com` (any password) pre-seeded with 3 applications (Shortlisted, Under Review, Pending); each candidate account only sees their own applications, never others'

### HR Console (Admin) — Phase 3 Complete
- Role-based sidebar: sidebar and tabs are determined by admin role and available permissions; mobile responsive with collapsible drawer
- **Dashboard tab** — KPI cards (active listings, total applications, shortlisted, expired) + 3 recharts visualizations; print-to-PDF
- **Jobs tab** — single-page job creation & editing with:
  - **Job templates** (pre-built starters or save-as-template) — capture department, about-role, accountabilities, required qualifications, and special skills
  - **Structured requirement builder** — add essential/desirable requirements (minAge, maxAge, flying hours, experience years, sex, qualification level, specific degree/subject, or custom) as qualifiers, disqualifiers, or criteria-only
  - **PDF import** — auto-extract content from job advertisement PDFs to pre-fill rich fields
  - **Approval workflow** — draft → pending_review (HOD) → pending_approval (DHRA) → published (or declined at any step with a reason)
  - Expired-listing detection; job ref, reports-to, vacancies, employment category, salary scale, sourcing type (external/internal visibility), locations dropdown
- **Applications tab** — 
  - **Job picker** landing state (shows applicant counts per job when no job selected)
  - Status filter chips; full candidate dossier modal; auto-qualification check (refined in Phase 3 to prefer job-specific criteria overrides)
  - Action buttons: shortlist, move to Shortlisted II (panel scoring), interview, offer, decline; editable notification text
  - **Batch CV download** — checkbox selection, export multiple CVs as one ZIP file
  - CSV export (filtered by job, status, date)
  - Batch actions: Run Auto-Screening, Confirm & Apply Results, Approve All for Interview
- **Shortlisted II tab** (scoring panel) — multi-admin independent scoring:
  - Each admin scores candidates 1–5; their comment is visible only to admins
  - Computed average score per candidate
  - Auto-shortlist action: advance candidates above a threshold to Interview, decline those below
- **Interns tab** — CGPA-ranked list with colour coding; per-job CGPA thresholds (from Criteria Setup) or a manual override threshold; PDF export
- **Staff tab** — CAA employee records; PDF export
- **Reports tab** — UCAA-letterheaded PDFs (vacancies, applications, departmental summary, shortlisted dossiers, interns ranking, staff register) + CSV export options
- **Audit Log tab** (Super Admin only) — chronological log of every admin action; PDF export
- **Settings tab** (Super Admin only) — portal min age, external/internal visibility toggle, org name, session timeout
- **Permissions tab** (Super Admin only) — per-admin permission overrides (11 permissions including canScheduleAssessment, canRecordAssessment)

### Job Detail Page (Candidate-Facing)
- Rendered from live job data (not static demo text): job ref, reports-to, vacancies, about-role, accountabilities, required qualifications, special skills
- Salary scale visible only (range hidden from candidates); employment category, location, closing date
- Sticky Apply CTA with save-for-later; equal-opportunity notice and "How to Apply" section

### Martha Chatbot
- Role-aware FAQ bot with contextual starter topics (technical recruiter questions, HR compliance, candidate experience)
- Hierarchical role mapping: HOD→Recruiter buckets, HR Officer→HR buckets, DHRA→HR buckets, Auditor→Super buckets, IT Admin→Super buckets
- FAQ entries for Phase 3 features: job creation workflow, structured requirements, panel scoring, approval workflow, CSV/batch exports

### PDF Generation
- Client-side generation (`jsPDF` + `jspdf-autotable`) for job adverts, reports, and candidate summaries
- Server-side generation for larger exports (certificate/letter documents)
- Consistent UCAA letterhead: logo, navy/gold header, "Our Ref: UCAA/HR/PORTAL", per-page footer with page numbers

### UI & Design System
- Tailwind CSS v4 design tokens (navy, gold, surface, status colours)
- Two-tier sticky navbar with mobile drawer, language toggle (EN/SW/LG), Cmd+K command palette, Martha chatbot toggle
- UCAA-brand footer matching caa.co.ug structure
- Syne + DM Sans type scale; custom utility classes (hero slideshow, card hover, skeleton loader, fade-up animation)

---

## 2. Current Technology Stack

| Layer | Technology |
|---|---|
| Framework | TanStack Start (SSR React, Nitro server) |
| Router | TanStack Router v1 (`createFileRoute`, `validateSearch`) |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Charts | recharts (`PieChart`, `BarChart`, `LineChart`) |
| PDF generation | jsPDF + jspdf-autotable |
| State | React Context + `localStorage` |
| Icons | lucide-react |
| Forms | react-hook-form (register page), plain controlled state elsewhere |
| Build tool | Vite 7 via `@lovable.dev/vite-tanstack-config` |
| Deployment target | Netlify (Nitro preset) |
| Node version | 22.x (`engines: { node: ">=22.12.0" }`) |

---

## 3. Roadmap & Completion Status

### Phase 1 — Foundation ✅ Complete
- ✅ Backend REST API with Express.js + MySQL
- ✅ JWT + httpOnly cookie authentication
- ✅ Candidate registration & login
- ✅ Single-step job application form
- ✅ Admin dashboard with basic CRUD

### Phase 2 — Enrichment ✅ Complete
- ✅ Multi-step application form with eligibility screening
- ✅ CV auto-fill from text/DOCX uploads
- ✅ PDF generation (reports, dossiers, application summaries)
- ✅ Cloudinary file storage for CVs, photos, documents
- ✅ In-app notifications (shortlisted, declined, offered, info)
- ✅ Email notifications via Nodemailer
- ✅ Audit logging of all HR actions
- ✅ Advanced RBAC with permission overrides

### Phase 3 — Job Creation Overhaul & Panel Scoring ✅ Complete
- ✅ **Job data model overhaul**: jobRef, reportsTo, vacancies, aboutRole, accountabilities, specialSkills, employmentCategory, salaryScale, sourcingType, locations
- ✅ **Single-page job creation** (replacing modal + separate Criteria tab): templates, structured requirement builder, PDF import with content extraction
- ✅ **Job templates**: seeded starters (technical, professional, graduate-entry) and save-as-template capability
- ✅ **Structured requirement builder**: minAge, maxAge, flying hours, experience, sex, qualification level, specific degree/subject, custom requirements — as qualifiers, disqualifiers, or criteria-only
- ✅ **Job approval workflow**: draft → pending_review (HOD) → pending_approval (DHRA) → published, with decline-at-any-step and reviewer comments
- ✅ **Candidate detail page parity**: rendered from live job data instead of static demo text
- ✅ **Panel scoring at Shortlisted II**: multi-admin independent scoring (1–5 scale + comment), computed averages, auto-shortlist by threshold
- ✅ **CSV export**: applications and jobs reports with filtering
- ✅ **Batch CV download**: select multiple candidates, export as ZIP
- ✅ **Martha chatbot**: role-aware FAQs for all hierarchical roles with Phase 3 feature documentation
- ✅ **Auto-shortlisting fixes**: respect job-specific CGPA thresholds, prefer criteria overrides, enforce disqualifying universities
- ✅ **Hierarchical admin roles**: HOD (head of department review), DHRA (approve & publish), HR Officer, Auditor, IT Admin layered on super/hr/recruiter
- ✅ **Remove Background Check**: fully removed from both frontend and backend

### Remaining Features — Planned for Phase 4+

**Performance & Quality**
- Unit + integration tests (Vitest + React Testing Library)
- End-to-end tests (Playwright)
- Accessibility audit (WCAG 2.1 AA)
- Internationalisation (i18n) — implement full Luganda and Swahili translations

**Candidate Experience**
- Application editing after submission (before a configurable deadline)
- Cover letter / additional document upload per application
- Candidate profile page with full CV viewer and edit-in-place
- Interview scheduling — calendar widget + Google Calendar integration

**Admin & Compliance**
- GDPR / PDPA data retention policies: automatic anonymisation after N days
- MFA (TOTP or SMS OTP) for admin accounts
- Tamper-evident audit log export (AWS CloudTrail-style)

---

## 4. Current Production Technology Stack

| Area | Current Technology | Notes |
|---|---|---|
| Frontend Framework | TanStack Start (React 18 + Nitro SSR) | Deployed to Netlify |
| Backend Framework | Express.js 4.x | Deployed to Railway |
| Database | MySQL 8 | Hosted on Railway |
| Authentication | JWT (2h access) + httpOnly cookies (7d refresh) | Secure, stateless, rotating refresh tokens |
| File Storage | Cloudinary v2 | CVs, photos, documents with signed URLs |
| Email | Nodemailer (SMTP configurable) | Transactional emails with HTML templates |
| PDF Generation | jsPDF + jspdf-autotable (client) | Server-side streaming for large reports |
| Validation | express-validator (backend), react-hook-form (frontend) | Form validation at both boundaries |
| Rate Limiting | express-rate-limit | Auth (40/min), password reset (3/15min), general (100/15min) |
| Security | helmet, bcrypt (cost 12), CORS with credentials | Secure headers, password hashing, controlled cross-origin access |
| Scheduled Jobs | node-cron | Cleanup, notification dispatch, automated workflows |
| Monitoring | Morgan (logs), error tracking ready for Sentry | Comprehensive request/error logging |
| Testing | Playwright (end-to-end) | Happy paths for each of 5 user roles verified in production |
| API Docs | Swagger UI (dev/staging) | OpenAPI 3.0 spec auto-generated from routes |

---

## 5. Project Overview

The **CAA Uganda e-Recruitment Portal** is a production-grade government e-recruitment system for Uganda Civil Aviation Authority (UCAA), handling ~5,000 real users across multiple device types. It implements the complete recruitment lifecycle:

**Candidate Side:**
- Public browsing of job vacancies with rich, live-updated detail pages
- Candidate registration (external or CAA internal staff with email domain verification)
- Multi-step application form with optional eligibility screening questions
- CV auto-fill from text/DOCX uploads (regex extraction)
- Application tracker with status history, HR notifications, and PDF download
- Application editing and withdrawal (restricted after shortlisting)

**Admin Side:**
- Job creation with single-page workflow: templates, structured requirements, PDF import, approval pipeline
- Applications dashboard with job filtering, candidate dossiers, auto-qualification checks
- Multi-admin panel scoring at Shortlisted II stage with averaging and comments
- Batch operations: auto-screening, approvals, CV downloads, CSV exports
- Interns tracking with CGPA ranking and per-job thresholds
- Staff directory, audit logs, permissions management
- Reports: vacancies, applications, departmental summary, dossiers, interns ranking, staff register

**Features:**
- Role-based access control: candidates, internal CAA staff, super/hr/recruiter admins, plus hierarchical roles (HOD, DHRA, HR Officer, Auditor, IT Admin)
- Workflow emails: job submissions, approvals, declines, shortlist notifications
- In-app notification center with unread count and mark-as-read
- Email notifications for status changes
- PDF generation (reports, adverts, dossiers, application summaries)
- File storage with Cloudinary for photos, CVs, documents
- Audit trail of all HR actions with exportable logs
- Martha chatbot: role-aware FAQ with Phase 3 feature coverage

Data persists to MySQL via Express.js REST API; authentication via JWT + httpOnly cookies; deployment to Netlify (frontend) and Railway (backend).

---

## 6. User Types & Credentials

The portal supports five distinct user types. Login behaviour is determined at sign-in time and persists in `localStorage`.

### 6.1 External Candidate

- **Email:** any email that does NOT end in `@caa.co.ug`
- **Password:** any password (no validation for demo)
- **Access:** public job listings (external visibility only), application form, candidate dashboard
- **Cannot see:** internal-only job listings
- **Dashboard:** only shows the candidate's own applications (filtered by email) — never sees other candidates' records

### 6.0 Demo Candidate — John Bukenya

| Field | Value |
|---|---|
| Email | `j.bukenya@gmail.com` |
| Password | any |
| Full name | John Bukenya |
| Pre-seeded applications | 3 (Shortlisted on job 1, Under Review on job 3, Pending on job 13) |

A hint is shown below the login form so presenters can quickly sign in as the demo candidate.  
The Withdraw button is disabled on the Shortlisted application (tooltip explains why).

### 6.2 Internal Candidate (CAA Staff)

- **Email:** any `*@caa.co.ug` address
- **Password:** any password
- **Access:** all job listings including internal-only ones, application form, candidate dashboard
- **Identity verified by:** email domain check (`isCAAEmail()` helper)

### 6.3 Super Admin — Alex Mukasa

| Field | Value |
|---|---|
| Email | `admin@caa.co.ug` |
| Password | `Admin@2026` |
| Role | `super` |
| Full name | Alex Mukasa |
| Access | Full access: all console tabs, audit logs, settings, permissions, can override any permission |

### 6.4 HR Director / HR Officer — Jane Mirembe

| Field | Value |
|---|---|
| Email | `hr.director@caa.co.ug` |
| Password | `HrDir@2026` |
| Role | `hr` |
| Full name | Jane Mirembe |
| Access | Dashboard, Jobs, Applications, Shortlisted II, Interns, Staff, Reports — can review and score candidates, create/edit jobs |

### 6.5 Recruiter — David Ssempala

| Field | Value |
|---|---|
| Email | `recruit@caa.co.ug` |
| Password | `Recruit@2026` |
| Role | `recruiter` |
| Full name | David Ssempala |
| Access | Applications and Shortlisted II tabs only — can screen and score candidates; cannot create jobs or export reports |

### 6.6 Hierarchical Admin Roles

The system also supports CAA's organizational hierarchy:

| Role | Example | Responsibilities |
|---|---|---|
| **HOD** (Head of Department) | Dept Manager | Reviews jobs submitted by HR; can approve or decline and return for revision; cannot publish |
| **DHRA** (Director HR & Admin) | Director, HR Dept | Approves HOD-reviewed jobs and publishes them; cannot edit job details, only review final version |
| **HR Officer** | HR Specialist | Supports HR Director; same access as `hr` role |
| **Auditor** | Audit Team | View-only access to all records, audit logs, and reports; cannot modify any data |
| **IT Admin** | Systems Team | Technical access (analytics, system health, performance); cannot access recruitment data |

All roles fall back to a base role (`super`, `hr`, `recruiter`) for permission defaults, then apply hierarchical overrides. Martha chatbot maps each hierarchical role to its closest base role for FAQ context.

> **Login flow:** Navigating to `/admin` shows the HR login form. Demo-account buttons pre-fill credentials for each base role. After login, the sidebar shows only the tabs the user's permissions allow. Hierarchical roles access the system via the same login, with their hierarchy reflected in what tabs/actions they see.

---

## 7. Site Architecture & Routes

All routes are file-based under `src/routes/`. TanStack Router auto-generates `src/routeTree.gen.ts` at build time.

| Route | File | Description |
|---|---|---|
| `/` | `index.tsx` | Homepage — hero slideshow, search bar, stats, featured vacancies |
| `/vacancies` | `vacancies.tsx` | Full job listing with dynamic department tabs |
| `/job` | `job.tsx` | Job detail page (`?jobId=N`) — rich description, requirements, apply CTA |
| `/login` | `login.tsx` | Candidate sign-in form |
| `/register` | `register.tsx` | Candidate registration (external or internal) |
| `/apply` | `apply.tsx` | Multi-step application form (`?jobId=N`) |
| `/dashboard` | `dashboard.tsx` | Candidate dashboard — applications, notifications, PDF download |
| `/admin` | `admin.tsx` | HR Console — all admin tabs behind a single route with `?tab=...` |

### Admin tab routing

The HR Console is a single route `/admin` that uses the search parameter `tab` to switch between sections:

```
/admin?tab=login              Candidate/admin login
/admin?tab=dashboard          HR dashboard with KPI cards and charts
/admin?tab=jobs               Create/edit jobs with templates & structured requirements; view approval status
/admin?tab=jobs-review        HOD review screen (pending_review jobs)
/admin?tab=jobs-approve       DHRA approval screen (pending_approval jobs)
/admin?tab=apps               Applications list with job picker, filter, detail modal, actions
/admin?tab=shortlisted-ii     Panel scoring view for Shortlisted II candidates
/admin?tab=interns            CGPA-ranked intern list with auto-screen by threshold
/admin?tab=staff              Internal CAA staff directory
/admin?tab=reports            PDF and CSV export (vacancies, applications, depts, dossiers, interns, staff)
/admin?tab=audit              Action audit log (Super Admin only)
/admin?tab=settings           Portal config: min age, visibility, org name, timeout (Super Admin only)
/admin?tab=permissions        Per-admin permission overrides (Super Admin only)
```

---

## 8. Candidate-Facing Features

### 8.1 Homepage (`/`)

- **Hero slideshow** — 5 rotating background images (2-second interval): office interior, two airplane photos (Uganda Airlines style and blue/white jet), CAA offices, close-up jet
- **Floating search bar** — filter by keyword, department, and location; results filter the featured jobs below in real time
- **Stats bar** — dynamically computed: Open Positions, Departments Hiring (both calculated from the live jobs array), plus static 380+ Staff Employed, 2,100+ Applications This Year
- **Featured Vacancies grid** — first 4 results from the filtered jobs; each card links to the job detail page
- **"See Open Roles" anchor** — second hero button smooth-scrolls to the vacancies grid
- **No sign-in/register buttons** in the hero — auth is only prompted when the user tries to apply

### 8.2 Vacancies Page (`/vacancies`)

- **Dynamic department tabs** — tabs and their counts are computed from actual job data at runtime; tabs with zero matching jobs are hidden automatically; shows an "Operations" tab for internal users
- **Skeleton loading** — 380ms simulated loading animation when switching tabs
- **Internal access badge** — shown in the header when signed in as internal staff

### 8.3 Job Detail Page (`/job?jobId=N`)

A full-page layout for each vacancy. Content is rendered from live job data (not static per-ID text).

**Sections:**
- Hero strip — job title, job ref (e.g. "UCAA/ADV/EXT/01/2026"), department/employment-category/sourcing-type badges, location, salary scale (range hidden), closing date
- **About the Role (Job Purpose)** — admin-authored description
- **Key Accountabilities** — structured list of areas and activities
- **Required Qualifications** — essential requirements rendered from structured requirement builder (minAge, experience years, qualification level, etc.)
- **Desirable Qualifications** — nice-to-have requirements
- **Special Skills** — admin-authored list
- **How to Apply** — instructions + "Start Your Application" CTA button

**Sidebar:**
- Quick Facts card — employment category, location, salary scale, min age, reports-to, vacancies, closing date
- Sticky Apply CTA card — "Apply Now" + "Save for later" buttons
- Equal Opportunity notice

**Behaviour:**
- Whole `JobCard` on other pages is clickable → navigates to this detail page
- "Apply Now" triggers the sign-in prompt modal if the candidate is not logged in; otherwise goes straight to `/apply?jobId=N`
- Closed vacancies (past `closesAt` date) show "Applications have closed" instead of the apply button
- Bookmark/save button uses backend-persisted saved jobs (synced to user account)
- Salary range never displayed to candidates (only salary scale like "UG5"); full range visible to admins only

### 8.4 Registration (`/register`)

- Account type radio — External or Internal CAA Staff
- Internal requires a `@caa.co.ug` email and a valid employee number (demo numbers: `CAA-1001`, `CAA-1002`, `CAA-1003`)
- Password strength checker — length ≥ 8, uppercase, number, symbol, confirmation match

### 8.5 Multi-Step Application Form (`/apply?jobId=N`)

8 or 9-step form with a progress stepper component at the top. A ninth step (Eligibility) is prepended when the selected job has screening questions configured in Criteria Setup.

| Step | Name | Condition | Key fields |
|---|---|---|---|
| 0 | Eligibility | Only when job has screening questions | Yes/No selects or numeric inputs per question; answers stored in `screeningAnswers` |
| 1 | Personal | Always | First/other/last name, DOB (age-validated against job's `minAge`), gender, nationality, NIN (`[A-Z]{2}\d{7}[A-Z]`), phone, address |
| 2 | Qualifications | Always | O-Level, A-Level, Certificate, Diploma, Degree, Masters, PhD entries; Uganda curriculum subject/grade dropdowns for O and A-Level |
| 3 | Skills | Always | Free-text chip add/remove |
| 4 | Experience | Always | Repeatable: job title, organisation, start, end, description |
| 5 | Referees | Always | Minimum 2: name, title, organisation, phone, email |
| 6 | Next of Kin | Always | Name, relationship, phone |
| 7 | Passport Photo | Always | Passport-style photo upload |
| 8 | Review | Always | Read-only summary with mandatory-field validation |

**Mandatory field validation on Review step:** If any required field is missing, a warning banner lists them by name with "Go to step N" jump buttons. The Submit button remains disabled until every mandatory field is filled.

**Silent screening evaluation on submit:** If the job has screening questions and the candidate's answers fail any qualifier or disqualifier rule, `addApplication` is called (reference number issued, success modal shown) and then `updateApplicationStatus` immediately sets the status to `"Declined"` — the candidate sees no difference.

**CV auto-fill:** On Step 1 (Personal), a "Quick-fill from existing CV" banner lets the candidate upload a `.txt` or `.doc` file. `FileReader.readAsText()` extracts:
- Email address (regex)
- Uganda phone number (`+256` or `0` prefix patterns)
- NIN (`[A-Z]{2}\d{7}[A-Z]` pattern)
- Date of birth (`DD/MM/YYYY` pattern)

If already has a saved CV, the form opens at the Review step for editing.

**Submission:** Creates an application record, saves the CV to `cvStore` (keyed by email for admin lookup), triggers a toast, and shows the Success Modal with a reference number (`REF-2026-XXXXX`).

**CV auto-fill:** On Step 0, a "Quick-fill from existing CV" banner lets the candidate upload a `.txt` or `.doc` file. `FileReader.readAsText()` extracts:
- Email address (regex)
- Uganda phone number (`+256` or `0` prefix patterns)
- NIN (`[A-Z]{2}\d{7}[A-Z]` pattern)
- Date of birth (`DD/MM/YYYY` pattern)

If already has a saved CV, the form opens at the Review step for editing.

**Submission:** Creates an application record, saves the CV to `cvStore` (keyed by email for admin lookup), triggers a toast, and shows the Success Modal with a reference number (`REF-2026-XXXXX`).

### 8.6 Candidate Dashboard (`/dashboard`)

Visible only when logged in; redirects to `/login` if not.

**Left column:**
- **HR Notifications panel** — shows messages sent by admin (shortlisted, interview, declined, offered, info) with emoji icons; unread count badge; "Mark read" per notification
- **Email notice card** — reminds candidate that status updates go to their registered email
- **Stats row** — Applications Submitted, Shortlisted count, Offers Received
- **My Applications table** — per application: role icon, title, dept, submission date, completion progress bar, status badge, Edit / **PDF** / Withdraw buttons

**Right column:**
- **Profile Completion** — progress bar (72% demo) + 7-item checklist
- **Notifications widget** — static shortlist and application-received cards
- **Application Timeline** — step indicators (Submitted → Under Review → Shortlisted → Interview)

**Withdraw confirmation modal** — two-button modal before removing an application. The Withdraw button is only active when the application status is `Pending` or `Under Review`. When the status is `Shortlisted`, `Interview`, or `Offered`, the button is replaced by a disabled element with a tooltip: _"Applications can no longer be withdrawn once shortlisted."_

**Edit Profile modal** — inline form to update first name, last name, email.

**Candidate PDF download (feature #3):** The "PDF" button on each application row calls `downloadApplicationSummary()` from `src/lib/admin-pdf.ts`. It generates a UCAA-letterheaded PDF containing:
- Candidate details
- Application details (reference number, role, department, salary band, status, submission date, vacancy closing date)
- "What happens next?" information box (4 steps)
- Authenticity statement ("No recruitment fees at any stage")
- UCAA header, footer with page numbers

---

## 9. HR Console (Admin)

Accessed at `/admin`. Entry requires one of the three admin credentials. On successful login, the sidebar and available tabs are filtered by the user's role.

### 9.1 Sidebar & Navigation

- CAA logo + "HR Console" label
- Role badge (showing current role: Super Admin / HR Director / HOD / DHRA / etc.) next to user name
- Nav items rendered only for permissions the user's role allows; hierarchical roles see appropriate approval/review screens
- Sign-out button and Martha chatbot toggle at the bottom
- **Mobile responsive** — on narrow screens (< 768 px) the sidebar is hidden and slides in from the left when the hamburger (☰) button in the sticky top bar is tapped. A semi-transparent backdrop covers the page content; tapping it or navigating closes the drawer. On desktop (≥ 768 px) the sidebar is always visible as a static `w-56` column.

### 9.2 Dashboard Tab

Three recharts visualisations, each in its own card:

| Chart | Type | Data shown |
|---|---|---|
| Application Status Distribution | PieChart | Count of applications per status (Pending, Under Review, Shortlisted, etc.) |
| Applications by Department | BarChart | Applications per department |
| Monthly Application Trend | LineChart | Applications per month (Jan–Jun 2026) |

- **Print button** — opens a new browser window and writes the chart SVGs as HTML for printing (`window.open()` + `document.write()`)
- **KPI cards** — Active Listings, Total Applications, Shortlisted count, Expired Listings

### 9.3 Jobs Tab

**Job Listing Table:**
- All active and draft jobs with status badges: draft, pending_review (HOD review), pending_approval (DHRA approval), published, declined
- Expired-listing flagging (red "Expired" badge when `closesAt < today`)
- Columns: job ref, title, department, employment category, salary scale, closing date, status, applicant count
- **View applications** button → switches to Applications tab filtered to this job
- **Edit** and **Delete** per row (only available for draft jobs)

**Single-Page Job Creation (`/admin?tab=jobs&mode=create`):**
1. **Template Picker** — optional start point: select a seeded template (technical, professional, graduate-entry) or a previously saved template to pre-fill content
2. **PDF Import** — optional upload of a job advertisement PDF; auto-extracts content to pre-fill rich fields (aboutRole, requirements, desirable, etc.)
3. **Basic Job Info:**
   - Title, job ref (e.g. "UCAA/ADV/EXT/01/2026"), department, employment category (Full-time/Contract/Fixed Term)
   - Location (dropdown), salary scale (UG2–UG7), sourcing type (external/internal visibility)
   - Reports-to (free text), vacancies count, closing date
   - Description/About the Role (rich text)
4. **Accountabilities** — structured list: area name + activities (add/remove dynamically)
5. **Structured Requirement Builder** — for each essential requirement:
   - Kind: minAge, maxAge, flying hours, experience years, sex, qualification level, specific degree, O-Level/A-Level subject+grade, or custom
   - Value (number, free text, or dropdown depending on kind)
   - Usage: qualifier (candidate-facing screening question), disqualifier (silent fail), or criteria-only (no candidate facing)
   - Mandatory: yes/no → generates appropriate ScreeningQuestion if qualifier/disqualifier
6. **Desirable Requirements** — same builder for nice-to-have items (disqualifier not offered here)
7. **Special Skills** — free-text list
8. **Manual Criteria Fallback** — if structured builder doesn't cover a need:
   - Min CGPA threshold
   - Required keywords (for auto-qualification)
   - Disqualifying universities
   - Custom screening questions (text, Yes/No with qualifying answer, or numeric range)
9. **Review & Submit:**
   - Preview rendered from live fields (uses same `<JobPreview>` component candidates see)
   - Save as draft (stays editable), or Submit for Review (HOD approval workflow begins)

**Single-Page Job Editing** — same flow as creation, with pre-filled fields; can only edit draft jobs or jobs returned for revision by HOD/DHRA

### 9.4 Applications Tab

**Job Picker Landing State** — when no job is selected, displays a grid of all jobs (active/closed, applicant counts, status badges); clicking one scopes into the applications view below.

**Applications Table** (once a job is selected):
- Status filter chips — All, Pending, Under Review, Shortlisted, Shortlisted II, Interview, Offered, Declined
- Clickable application rows → opens `AppDetailModal`
- Checkbox column for batch operations (CV download, bulk actions)
- Columns: candidate name, email, submission date, status badge, completion %

**AppDetailModal** — sliding panel with sections:
1. **CV / Profile** — candidate's full CV (personal details, qualifications, experience, skills, referees)
2. **Auto-qualification check** — refined in Phase 3:
   - Age from CV DOB vs job's `minAge`
   - Qualification level rank vs job-specific criteria override (preferred) or fallback to job's `requiredQualification`
   - Total years of experience from CV vs job-specific criteria override or job's `requiredExperience`
   - CGPA vs job-specific `minCgpa` (from criteria)
   - Disqualifying universities enforced (new in Phase 3)
   - Keyword presence: searches CV for required keywords
   - Shows a green "Qualifies" or red "Does not meet criteria" verdict
3. **Screening Answers** (if applicable) — shows how candidate answered eligibility questions

**Action buttons** (visible if `canShortlist` permission):
- Move to Shortlisted / Shortlisted II (panel scoring) / Interview / Offer / Decline
- Editable notification message text area; auto-filled per status
- On action: updates status, sends email notification, logs audit entry

**Batch actions:**
- **Batch CV Download** — select candidates via checkboxes, click "Download CVs"; exports ZIP file containing PDFs of all selected candidates' CVs; warning toast if any selected candidates have no CV on file
- **Run Auto-Screening** — evaluates all Pending/Under Review applications against criteria (CGPA, keywords, screening questions). Shows preview (pass/fail per candidate). Processing deferred via `setTimeout(0)`.
- **Confirm & Apply Results** — applies screening preview: passed → Shortlisted, failed → Declined. Single bulk write, single email log.
- **Approve All for Interview** — moves all Shortlisted candidates to Interview in a single bulk write
- **CSV Export** — exports selected or filtered applications to CSV with columns: candidate, email, status, completion, CGPA (if intern), university (if intern), submission date; includes job ID and date filters in filename

### 9.5 Shortlisted II Tab (Panel Scoring)

**Candidates at Shortlisted II status** are shown in a grid with independent scoring by each admin.

**Per-candidate card:**
- Candidate name, position applied, submission date
- **Scoring panel** — each admin who has permission to score (role includes `canRecordAssessment`) sees:
  - Their own score (1–5 scale) with input field and "Save" button
  - Their own comment (free text) for why they scored this way
  - A visual "score saved" indicator with timestamp
- **All scores + comments** visible to all admins (side by side, by scorer name)
- **Computed average score** displayed prominently (e.g. "78.5 avg from 3 scorers")
- **Preview** link to candidate's CV and application details

**Batch actions:**
- **Auto-shortlist by Score** — threshold input field (e.g. "75.0 min to advance"); candidates above threshold moved to Interview, those below moved to Declined; single bulk write
- **CSV Export** — export candidates with their scores and comments, with blank columns for offline scoring to re-import

### 9.6 Interns Tab

**CGPA-ranked list** of all applications with a CGPA field, sorted highest first.

- CGPA colour coding: ≥ 4.5 gold, ≥ 3.5 navy, ≥ 3.0 amber, < 3.0 red
- Columns: rank (#1, #2, #3…), candidate name, position, university, CGPA, status, submission date, actions
- **Manual CGPA Threshold** field (e.g. "3.8") at the top; overrideable per-job via Criteria Setup
- **Actions** per candidate: Shortlist, Decline, or move to Interview (if `canShortlist` permission)

**Batch auto-screening:**
- **Run Auto-Screen** button — evaluates all Pending/Under Review interns against effective CGPA threshold (per-job criteria override, or manual field as fallback)
- Shows preview: will-shortlist vs. will-decline candidates
- **Confirm & Apply** applies the bulk update

**Export to PDF** — ranked list with UCAA letterhead

### 9.6 Staff Tab

- Table of CAA staff records (employee number, name, department, position, email, join date, status)
- Export to PDF button and CSV export option

### 9.7 Reports Tab

**PDF & CSV Export Options:**

| Report | PDF | CSV | Description |
|---|---|---|---|
| Vacancies Report | ✅ | ✅ | All job listings with job ref, title, department, category, salary scale, deadline, status, applicant count |
| Applications Report | ✅ | ✅ | Applications with candidate details, status, submission date, completion %; supports job/status/date filters |
| Departmental Summary | ✅ | — | Per-department: job listings count, applications total, shortlisted, offered, hired |
| Shortlisted Dossiers | ✅ | — | Cover sheet + one full dossier page per shortlisted candidate (CV + profile summary) |
| Interns (CGPA Ranking) | ✅ | — | All intern applications ranked by CGPA with university, status, submission date |
| Staff Register | ✅ | ✅ | Internal staff records with employee number, department, position, email, join date |

### Job Approval Workflow Tabs (Hierarchical Roles)

#### 9.8 Jobs Review Tab (HOD only)
- Table of jobs in `pending_review` status (submitted by HR Officer/Director)
- Columns: job ref, title, department, created by, submitted date, status
- **Review Job** modal on each row:
  - Job preview (using same `<JobPreview>` component candidate sees)
  - Reviewer comment field (reason for approval or revision request)
  - Actions: **Approve to DHRA** (moves to `pending_approval`) or **Return for Revision** (back to `draft` with reason)
  - Auto-sends email to submitter (approve, or revision reason)

#### 9.9 Jobs Approve Tab (DHRA only)
- Table of jobs in `pending_approval` status (approved by HOD)
- Columns: job ref, title, department, created by, HOD approval date, status
- **Approve Job** modal on each row:
  - Job preview (exact same rendering as candidate sees)
  - Reviewer comment field (reason for approval or decline)
  - Actions: **Publish** (moves to `published`, visible to candidates) or **Decline** (moves to `declined` with reason)
  - Auto-sends email to submitter on publish or decline

### 9.10 Criteria Tab (Legacy / Fallback)

**Integrated into job creation (section 9.3), but kept as a fallback for manual overrides.**

Per-job criteria management:
- Select job from dropdown
- Set minimum CGPA threshold (overrides Interns auto-screen default)
- Add/remove required keywords (for auto-qualification)
- Disqualifying universities list
- Notes field
- **Custom screening questions** (for anything the structured requirement builder doesn't cover):
  - **Text** — the question shown to candidate on Eligibility step
  - **Type** — `qualifier` (must pass) or `disqualifier` (fails candidate)
  - **Kind** — `yesno` (candidate answers Yes/No with configured qualifying answer) or `number` (numeric range check)
  - Evaluated precisely at submission and auto-screening
- Saved to backend database

### 9.11 Audit Log Tab (Super Admin only)

- Chronological table of every admin action: timestamp, actor name, role, action description, target (job/application/setting)
- Actions logged: login, job create/edit/delete, job submit-for-review/approve/decline, application status change, score saved, criteria save, permission save, settings change
- **Export to PDF** button — UCAA-letterheaded report
- Filters: date range, actor, action type

### 9.12 Settings Tab (Super Admin only)

Configurable portal settings:
- **Minimum age threshold** — portal-wide default (used when job has no minAge requirement)
- **External visibility** — toggle allowing external candidates to see internal-only job listings
- **Organisation name** — displayed in PDFs, reports, and UI
- **Session timeout** — in minutes (JWT refresh rotation)

Changes logged to audit trail.

### 9.13 Permissions Tab (Super Admin only)

Per-admin permission override management. For each admin user, a toggle grid shows 11 permissions:

| Permission key | What it controls |
|---|---|
| `canViewAudit` | See the Audit Log tab |
| `canManageJobs` | Create / edit / delete job listings |
| `canExport` | Download PDF reports and CSV exports |
| `canViewStaff` | See the Staff tab |
| `canManageSettings` | Change portal settings (Super Admin only) |
| `canGrantPermissions` | See and use the Permissions tab (Super Admin only) |
| `canManageCriteria` | Set screening criteria (integrated into job creation, this also controls fallback criteria tab) |
| `canShortlist` | Shortlist / interview / offer / decline candidates; move to Shortlisted II |
| `canViewApplications` | See the Applications tab |
| `canScheduleAssessment` | Schedule assessments for candidates |
| `canRecordAssessment` | Record assessment scores and comments (Shortlisted II panel scoring) |

Overrides are stored in the backend `permission_overrides` table and take precedence over `ROLE_DEFAULTS`. Newly-added permissions always get explicit defaults (not implicit `false`) to ensure proper behaviour when a new permission key is added.

---

## 10. Role-Based Access Control (RBAC)

Three account types: `external` (candidate), `internal` (CAA staff), `admin` (has an `adminRole`).

Admin roles: base roles (`super`, `hr`, `recruiter`) plus hierarchical roles layered on top:
- **HOD** (Head of Department) — inherits `hr` permissions, adds review job workflow
- **DHRA** (Director HR & Admin) — inherits `hr` permissions, adds approve & publish job workflow
- **HR Officer** — inherits `hr` permissions
- **Auditor** — inherits `super` permissions, view-only access (can export logs and reports)
- **IT Admin** — inherits `super` permissions, system-level access only

### 10.1 Default permission matrix

| Permission | Super | HR | Recruiter | HOD | DHRA | Auditor | IT Admin |
|---|---|---|---|---|---|---|---|
| View Audit Log | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage Jobs | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Export PDFs/CSV | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| View Staff | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Grant Permissions | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Criteria | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Shortlist Candidates | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Applications | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Schedule Assessment | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Record Assessment | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

**Workflow-specific permissions:**
- **Review Job** (HOD role) — see pending_review jobs, approve to DHRA or return for revision
- **Approve Job** (DHRA role) — see pending_approval jobs, publish or decline

### 10.2 Permission override system

`canAccess(role, permissionKey, overrides?)` checks:
1. `overrides` array first (custom per-admin overrides set in Permissions tab by Super Admin)
2. Falls back to `ROLE_DEFAULTS` for the user's role
3. Hierarchical roles inherit from their base role (e.g. HOD inherits from `hr`) then apply overrides

New permissions always get explicit defaults (not implicit `false`) to prevent silent permission loss when a new key is added.

### 10.3 Martha chatbot role mapping

The Martha chatbot provides context-aware FAQs by mapping each admin role to its nearest base role:
- `super` → Super role topics (settings, audit, permissions)
- `hr`, `hr_officer`, `dhra` → HR role topics (job creation, applications, criteria, panel scoring)
- `recruiter`, `hod` → Recruiter role topics (applications, shortlisting, panel scoring)
- `auditor`, `it_admin` → Super role topics (read-only access, system info)

---

## 11. State Management & Data Models

State is synced between the frontend React Context (`AppContext.tsx`) and the backend MySQL database via Express.js REST API. JWT + httpOnly cookies manage authentication; candidate/admin sessions persist across refreshes.

### 11.1 Backend persistence (MySQL tables)

| Table | Content | Phase |
|---|---|---|
| `users` | Candidates & admins (email, hashed password, accountType, adminRole) | Phase 1 |
| `jobs` | Job listings (title, dept, salary_band, employment_category, status, job_ref, etc.) | Phase 3 update |
| `applications` | Candidate applications (jobId, userId, status, cgpa, university, screeningAnswers JSON) | Phase 1 |
| `criteria` | Job criteria (minCgpa, requiredKeywords JSON, disqualifyingUniversities JSON, requirements JSON) | Phase 3 new |
| `candidate_scores` | Panel scoring at Shortlisted II (applicationId, userId, score, comment) | Phase 3 new |
| `job_templates` | Job creation templates (name, sourceJobId, content JSON, createdBy) | Phase 3 new |
| `notifications` | In-app messages (recipientId, title, message, read, type) | Phase 1 |
| `audit_log` | Admin action log (timestamp, actor, action, details) | Phase 1 |
| `permission_overrides` | Per-admin permission settings | Phase 1 |
| `settings` | Portal config (minAge, externalVisibility, orgName) | Phase 1 |
| `assessments` | Legacy assessment scores (now deprecated; panel scoring uses candidate_scores) | Phase 2b |
| `departments` | CAA departments | Phase 3 new |
| `staff` | Internal CAA staff directory | Phase 1 |

### 11.2 Core type definitions

```typescript
type Visibility = "external" | "internal";
type SourcingType = "external" | "internal";  // Phase 3: renamed from visibility at label level
type EmploymentCategory = "Full-time" | "Contract" | "Fixed Term Contract";  // Phase 3: extended
type QualLevel = "O-Level" | "A-Level" | "Certificate" | "Diploma" | "Degree" | "Masters" | "PhD";
type ApplicationStatus = "Pending" | "Under Review" | "Shortlisted" | "Shortlisted II" | "Interview" | "Offered" | "Hired" | "Declined";
type JobStatus = "draft" | "pending_review" | "pending_approval" | "published" | "declined";
type AdminRole = "super" | "hr" | "recruiter" | "hod" | "dhra" | "hr_officer" | "auditor" | "it_admin";
type AccountType = "external" | "internal" | "admin";

// Phase 3: Structured requirement (used in job creation builder)
type RequirementKind = "minAge" | "maxAge" | "flyingHours" | "experienceYears" | "sex" | "qualificationLevel" | "specificDegree" | "oLevelSubject" | "aLevelSubject" | "custom";
type RequirementUsage = "qualifier" | "disqualifier" | "criteriaOnly";
type JobRequirement = {
  id: string; kind: RequirementKind; label: string;
  numberValue?: number; textValue?: string; gradeValue?: string;
  usage: RequirementUsage;
  mandatory: boolean;
};

type Job = {
  id: number; jobRef: string;  // e.g. "UCAA/ADV/EXT/01/2026"
  title: string; dept: string; deptKey: string;
  employmentCategory: EmploymentCategory;  // replaces type
  location: string;
  salaryScale: string;  // UG2–UG7 (range hidden from candidates)
  sourcingType: SourcingType;  // external/internal
  closesAt: string; minAge?: number;
  reportsTo?: string; vacancies?: number;
  aboutRole?: string;  // "Job Purpose"
  accountabilities?: { area: string; activities: string[] }[];
  specialSkills?: string[];
  requiredQualification?: QualLevel;  // fallback; criteria can override per-job
  requiredExperience?: number;  // fallback; criteria can override
  status: JobStatus;  // Phase 3: workflow status
  createdBy?: number; createdAt?: string;
  submitForReviewAt?: string; submitForReviewBy?: number;
  reviewedAt?: string; reviewedBy?: number;
  declineReason?: string;
  description?: string; featured?: boolean;
};

type Application = {
  id: number; abbr: string; title: string; dept: string; date: string;
  status: ApplicationStatus; completion: number;
  jobId?: number; candidateEmail?: string; candidateName?: string;
  cgpa?: number; university?: string;
  screeningAnswers?: Record<string, string>;
};

type CvProfile = {
  personal: { firstName; otherName; lastName; dob; gender; nationality; nin; phone; email; address; };
  highestLevel: QualLevel;
  qualifications: CvQualification[];
  skills: string[];
  experience: CvExperience[];
  referees: CvReferee[];
  nextOfKin: { name; relationship; phone; };
  photoUrl?: string;
};

type Notification = {
  id: number; recipientEmail: string; title: string; message: string;
  read: boolean; at: string;
  type: "shortlisted" | "declined" | "interview" | "offered" | "info";
};

type ScreeningQuestion = {
  id: string; text: string; type: "qualifier" | "disqualifier";
  kind?: "yesno" | "number";
  qualifyingAnswer?: "Yes" | "No";
  min?: number; max?: number;
};

type JobCriteria = {
  jobId: number;
  minCgpa?: number;
  requiredKeywords: string[];
  disqualifyingUniversities?: string[];
  requirements?: JobRequirement[];  // Phase 3: structured requirements
  notes?: string;
  screeningQuestions?: ScreeningQuestion[];
};

// Phase 3: Panel scoring for Shortlisted II stage
type CandidateScore = {
  id: number; applicationId: number; scorerId: number;
  score: number;  // 1–5
  comment: string;
  createdAt: string; updatedAt: string;
};

// Phase 3: Job creation templates
type JobTemplate = {
  id: number; name: string; department?: string;
  sourceJobId?: number;
  content: Partial<Job>;  // snapshot of rich-content fields
  createdBy: number; createdAt: string;
};

type PermissionOverride = {
  email: string; role: AdminRole;
  canViewAudit: boolean; canManageJobs: boolean; canExport: boolean;
  canViewStaff: boolean; canManageSettings: boolean; canGrantPermissions: boolean;
  canManageCriteria: boolean; canShortlist: boolean; canViewApplications: boolean;
  canScheduleAssessment: boolean;  // Phase 3: added
  canRecordAssessment: boolean;    // Phase 3: added
};
```

### 11.3 Key helper functions (AppContext.tsx)

```typescript
// Returns true when candidate can withdraw (not yet shortlisted/interviewed/offered)
export function canWithdraw(status: ApplicationStatus): boolean {
  return !["Shortlisted", "Shortlisted II", "Interview", "Offered"].includes(status);
}

// Evaluates a precise screening question answer; returns true if the answer passes
export function screeningAnswerPasses(q: ScreeningQuestion, answer: string | undefined): boolean {
  if (q.kind === "yesno") return !!answer && answer === (q.qualifyingAnswer ?? "Yes");
  if (q.kind === "number") {
    const n = answer !== undefined && answer !== "" ? Number(answer) : NaN;
    if (Number.isNaN(n)) return false;
    if (q.min !== undefined && n < q.min) return false;
    if (q.max !== undefined && n > q.max) return false;
    return true;
  }
  return true; // legacy: fuzzy keyword matching handled elsewhere
}

// Auto-qualification logic, respects per-job criteria overrides (Phase 3 fix)
export function autoQualify(cv: CvProfile, job: Job, criteria: JobCriteria): boolean {
  // Age check: job.minAge is fallback; criteria can't override
  if (job.minAge && !cv.personal.dob) return false;
  
  // Qualification: prefer criteria.requirements override, fallback to job.requiredQualification
  const requiredQual = criteria?.requirements?.find(r => r.kind === "qualificationLevel")
    ? criteria.requirements.find(r => r.kind === "qualificationLevel")?.textValue
    : job.requiredQualification;
  // ...
  
  // CGPA: use job-specific criteria.minCgpa if set, else fallback
  const requiredCgpa = criteria?.minCgpa ?? job.minCgpa;
  if (requiredCgpa && cv.cgpa !== undefined && cv.cgpa < requiredCgpa) return false;
  
  // Disqualifying universities: enforce (Phase 3 fix)
  if (criteria?.disqualifyingUniversities?.includes(cv.university ?? "")) return false;
  
  // Keywords & screening questions follow...
  return true;
}

// Batch operation utilities for performance
const bulkUpdateApplicationStatus: (updates: Array<{ id: number; status: ApplicationStatus }>) => void;
const bulkLogEmails: (emails: Array<{ recipient: string; type: string }>) => void;
```

---

## 12. PDF Generation

All PDF documents are generated client-side by `src/lib/admin-pdf.ts` using jsPDF and jspdf-autotable.

### 12.1 UCAA Letterhead standard

Every PDF uses the same `header()` and `footer()` functions to match the official UCAA letter format:

**Header:**
- White background
- CAA logo image (base64 from `src/lib/caa-logo-base64.ts`) — top-left, 22×22mm
- "UGANDA CIVIL AVIATION AUTHORITY" in navy bold at 16pt — right of logo
- Address and contact details in grey at 8pt
- Navy separator line (0.8pt) + gold accent stripe below it
- "Our Ref: UCAA/HR/PORTAL" left, today's date right, at 8pt
- Document title in navy bold at 13pt, underlined

**Footer (every page):**
- Navy rule at y=283
- "Uganda Civil Aviation Authority — Confidential HR Document. Not for external distribution."
- "Generated by [actor name]" left, "Page N of M" right

### 12.2 Exported documents

| Function | Filename | Who uses it |
|---|---|---|
| `downloadJobsReport` | `caa-vacancies-{ts}.pdf` | Admin — Reports tab |
| `downloadApplicationsReport` | `caa-applications-{ts}.pdf` | Admin — Reports tab |
| `downloadDepartmentSummary` | `caa-dept-summary-{ts}.pdf` | Admin — Reports tab |
| `downloadAuditLog` | `caa-audit-{ts}.pdf` | Admin — Audit Log tab |
| `downloadCandidateCv` | `caa-candidate-{name}.pdf` | Admin — Application detail modal |
| `downloadInternsReport` | `caa-interns-cgpa-{ts}.pdf` | Admin — Interns tab |
| `downloadStaffReport` | `caa-staff-register-{ts}.pdf` | Admin — Staff tab |
| `downloadShortlistedDossiers` | `caa-shortlist-dossiers-{ts}.pdf` | Admin — Reports tab |
| `downloadApplicationSummary` | `caa-application-UCAA-REC-{id}-{year}.pdf` | Candidate — Dashboard PDF button |

### 12.3 Candidate application summary PDF (feature added June 2026)

`downloadApplicationSummary(app, candidateName, candidateEmail, job?)` produces a single-page document containing:

1. **Candidate Details** table — name, email, account type
2. **Application Details** table — reference number (`UCAA/REC/00001/2026`), role, department, location, salary band, employment type, status, completion %, submission date, vacancy closing date
3. **"What happens next?" box** — 4 numbered steps in a shaded rounded rectangle
4. **Authenticity statement** — two lines in italic confirming no recruitment fees and the document is auto-generated proof of submission

---

## 13. UI Design System

### 13.1 Fonts

- **Body / headings:** DM Sans (300, 400, 500, 600, 700) — loaded from Google Fonts
- **Display accent class** (`.font-display`): Syne (600, 700, 800) — available via CSS class but no longer applied to headings by default; headings use DM Sans
- `h1–h6` elements inherit the body font (DM Sans) — the CSS rule only applies Syne when `.font-display` class is explicitly used

### 13.2 Colour tokens (CSS custom properties)

| Token | Use |
|---|---|
| `--caa-navy` / `caa-navy` | Primary navy (`#0B2E5F`) — buttons, headings, active states |
| `--caa-navy-2` / `caa-navy-2` | Lighter navy — hover, secondary |
| `--caa-gold` / `caa-gold` | Gold accent — highlights, badges |
| `--caa-gold-2` / `caa-gold-2` | Lighter gold — hover on white buttons |
| `--caa-surface` | Off-white page background |
| `--caa-border` | Card and input borders |
| `--caa-body` | Main text colour |
| `--caa-muted` | Secondary text |
| `--caa-light` | Placeholder / icon colour |
| `--caa-success` | Green — shortlisted, hired |
| `--caa-warning` | Amber — pending, contract type |
| `--caa-danger` | Red — declined, expired |

### 13.3 Key utility classes

| Class | Effect |
|---|---|
| `caa-hero-bg` | Navy gradient background for page hero strips |
| `caa-hero-photo` | Hero with background photo slideshow support |
| `caa-hero-slide` | Individual slide (absolute, opacity transition) |
| `caa-hero-slide.is-active` | Fades slide in |
| `caa-card` | White card with border and rounded corners |
| `caa-card-hover` | Adds border colour change on hover |
| `caa-lift` | Adds translateY shadow on hover |
| `caa-skeleton` | Animated grey skeleton loading bar |
| `caa-fade-up` | Fade + slide-up entrance animation |
| `caa-delay-1/2/3` | Animation delay classes |

### 13.4 Header / Navbar

- Two-tier: black top bar (site name + social links) + white main nav
- Sticky (`top-0 z-40`)
- Social links: X (Twitter), Facebook, LinkedIn, Instagram, YouTube — all pointing to real UCAA social handles
- Language toggle (EN / SW / LG) — stores preference in `localStorage`, shows toast
- Cmd+K opens the Command Palette (`CommandPalette` component)
- Responsive mobile drawer with same nav links
- **When logged in:** shows avatar initials + first name + "Sign Out"
- **When logged out:** shows "Sign In" + "Register" buttons

### 13.5 Footer

Matches the official [caa.co.ug](https://caa.co.ug) footer structure:
- Photo strip (3 images)
- 4-column link grid: Important Links, CAA Uganda, Services, Contact
- Bottom bar: disclaimer links + social icons + © CAA Uganda

---

## 14. Job Listings & Categories

### 14.1 All jobs (14 total)

| ID | Abbr | Title | Dept | Visibility | Band | Closes |
|---|---|---|---|---|---|---|
| 1 | ATC | Senior Air Traffic Controller | Air Traffic Mgmt | External | UG4 | Jun 15, 2026 |
| 2 | ASI | Principal Safety Inspector (Airworthiness) | Aviation Safety | External | UG3 | Jun 20, 2026 |
| 3 | SYS | Systems Administrator | ICT & Systems | External | UG5 | Jul 1, 2026 |
| 4 | FIN | Finance Officer (Revenue Assurance) | Finance & Admin | External | UG5 | Jun 30, 2026 |
| 5 | LEG | Legal Counsel (Aviation Regulations) | Legal | External | UG4 | Jul 10, 2026 |
| 6 | ATT | ATC Trainee (Graduate Entry) | Air Traffic Mgmt | External | UG7 | Jul 15, 2026 |
| 7 | INT | Manager, Aerodrome Operations | Operations | **Internal** | UG2 | Jun 25, 2026 |
| 8 | ACO | Approach Control Officer | Air Traffic Mgmt | External | UG4 | Jul 20, 2026 |
| 9 | FOI | Flight Operations Inspector | Aviation Safety | External | UG4 | Jul 5, 2026 |
| 10 | DGI | Dangerous Goods Inspector | Aviation Safety | External | UG5 | Jul 8, 2026 |
| 11 | ASec | Aviation Security Inspector | Aviation Safety | External | UG5 | Jul 12, 2026 |
| 12 | PRO | Procurement Officer | Finance & Admin | External | UG6 | Jul 3, 2026 |
| 13 | NET | Network Engineer | ICT & Systems | External | UG5 | Jul 18, 2026 |
| 14 | AIS | Principal, Aeronautical Information Services | Operations | **Internal** | UG3 | Jul 22, 2026 |

### 14.2 External-visible category counts

| Category | Count |
|---|---|
| Air Traffic Mgmt | 3 (IDs 1, 6, 8) |
| Aviation Safety | 4 (IDs 2, 9, 10, 11) |
| Finance & Admin | 2 (IDs 4, 12) |
| ICT & Systems | 2 (IDs 3, 13) |
| Legal | 1 (ID 5) |
| **Total external** | **12** |

Internal users additionally see the 2 Operations listings (IDs 7 and 14).

### 14.3 Salary band reference

| Band | Monthly Range |
|---|---|
| UG2 | UGX 5.5M – 7.0M |
| UG3 | UGX 3.8M – 6.0M |
| UG4 | UGX 3.2M – 5.8M |
| UG5 | UGX 2.4M – 3.9M |
| UG6 | UGX 2.4M – 3.2M |
| UG7 | UGX 1.8M – 2.4M |

---

## 15. Deployment — Netlify

### 15.1 Configuration (`netlify.toml`)

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"
  NITRO_PRESET = "netlify"

# Static assets from Vite are content-hashed — safe to cache for 1 year
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

# Non-hashed public files (images, favicon) — short cache
[[headers]]
  for = "/*.png"
  [headers.values]
    Cache-Control = "public, max-age=3600, must-revalidate"

[[headers]]
  for = "/*.jpg"
  [headers.values]
    Cache-Control = "public, max-age=3600, must-revalidate"

# HTML / SSR responses — always revalidate so users get the latest deploy
[[headers]]
  for = "/*"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
```

**Cache strategy rationale:**  Vite fingerprints all JS/CSS bundles (e.g. `index-abc123.js`) so those are immutable and can be cached for a year. HTML and SSR responses are not fingerprinted — they must revalidate on every load so users aren't served a stale page after a new deploy. Without these rules Netlify's CDN would cache HTML for its default TTL and devices would see an old version of the app until the cache expired.

### 15.2 How it works

1. Netlify runs `npm run build` → Vite + Nitro compile both client and SSR bundles
2. Static assets output to `dist/` (the publish directory)
3. Server-side functions output to `.netlify/functions-internal/` (auto-detected by Netlify, not committed to git)
4. All routing is handled by the Nitro server function — no `_redirects` file needed

### 15.3 To connect a new Netlify site

1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**
2. Select **GitHub** → authorise → choose `marthaea/caa-final-rec`
3. Confirm build settings (auto-detected from `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Click **Deploy site**
5. Subsequent pushes to `main` branch trigger automatic re-deploys

### 15.4 GitHub repository

- **URL:** `https://github.com/marthaea/caa-final-rec`
- **Branch:** `main`
- **Local path:** `C:\Users\user\Desktop\aviation-careers-hub-main`

---

## 16. File Structure

```
aviation-careers-hub-main/
├── workflow/
│   ├── documentation.md      ← this file
│   ├── flowchart.md          ← Mermaid workflow diagrams for all 5 user roles
│   ├── plan.md               ← original implementation plan
│   └── project.json
├── netlify.toml
├── package.json
├── vite.config.ts
├── tsconfig.json
├── public/
│   └── favicon.png
└── src/
    ├── styles.css            ← Tailwind v4 config, design tokens, utility classes
    ├── router.tsx
    ├── start.ts
    ├── server.ts
    ├── routeTree.gen.ts      ← auto-generated by TanStack Router at build time
    ├── assets/
    │   ├── caa-logo.png
    │   ├── hero-office.jpg
    │   ├── hero-caa-offices.jpg
    │   ├── hero-jet.jpg
    │   ├── hero-plane-crane.jpg   ← replace with actual photo when available
    │   └── hero-plane-blue.jpg    ← replace with actual photo when available
    ├── context/
    │   └── AppContext.tsx     ← all state, types, RBAC helpers, seeded data
    ├── lib/
    │   ├── admin-pdf.ts       ← all jsPDF export functions
    │   ├── caa-logo-base64.ts ← logo as base64 string for PDF embedding
    │   ├── uganda-curriculum.ts ← O/A-Level subjects and grade lists
    │   └── utils.ts
    ├── components/
    │   ├── AppShell.tsx       ← wraps Navbar + Outlet + Footer + modals
    │   ├── Navbar.tsx         ← sticky two-tier navigation
    │   ├── Footer.tsx         ← 4-column footer matching caa.co.ug
    │   ├── JobCard.tsx        ← vacancy card used on homepage and vacancies page
    │   ├── Stepper.tsx        ← step indicator for application form
    │   ├── ToastContainer.tsx ← top-right toast notifications
    │   ├── SignInPromptModal.tsx ← prompted when unauthenticated user clicks Apply
    │   ├── SuccessModal.tsx   ← shown after application submission
    │   ├── CommandPalette.tsx ← Cmd+K quick search
    │   └── UploadZone.tsx     ← drag-and-drop file upload component
    └── routes/
        ├── __root.tsx         ← HTML shell, font links, QueryClient provider
        ├── index.tsx          ← Homepage
        ├── vacancies.tsx      ← Job listings
        ├── job.tsx            ← Job detail page
        ├── login.tsx          ← Candidate sign-in
        ├── register.tsx       ← Candidate registration
        ├── apply.tsx          ← Multi-step application form
        ├── dashboard.tsx      ← Candidate dashboard
        └── admin.tsx          ← Full HR Console (all tabs)
```

---

## 17. Known Limitations & Future Work

### Current Known Limitations

| Limitation | Details | Priority for Phase 4+ |
|---|---|---|
| CV auto-fill PDF support | Regex extraction from plain-text CVs only; PDF/DOCX binary parsing not implemented (AWS Textract planned) | High |
| Chart printing | The `window.open()` + `document.write()` print method works in Chromium browsers; some browsers may block popup | Low |
| Email notifications disabled in dev | Nodemailer configured but email sending can be disabled via environment flag for testing | N/A |
| i18n not implemented | UI toggle for Luganda/Swahili exists but no translations present; full i18n via react-i18next + Crowdin planned | Medium |
| Interview scheduling | No calendar integration; candidates cannot schedule interviews with interviewers | High |
| Application editing | Candidates cannot edit applications after submission; editing deadline-based feature planned | Medium |
| Accessibility | No WCAG 2.1 AA compliance audit yet; accessibility enhancements planned | Medium |
| Test coverage | E2E tests (Playwright) exist for happy paths; unit + integration tests not yet implemented | High |

### Completed in Phase 3

✅ Job creation overhaul (single-page, templates, structured requirements)  
✅ Job approval workflow (HOD review → DHRA approval)  
✅ Multi-admin panel scoring at Shortlisted II stage  
✅ CSV export (applications & jobs)  
✅ Batch CV download as ZIP  
✅ Auto-shortlisting fixes (respect criteria overrides, enforce disqualifications)  
✅ Martha chatbot with hierarchical role mapping  
✅ Background Check feature fully removed  

### Planned for Future Phases

- **Accessibility:** WCAG 2.1 AA compliance audit and remediation
- **Testing:** Unit tests (Vitest), integration tests, cross-browser E2E (Playwright)
- **i18n:** Full Luganda and Swahili translations via Crowdin
- **Data retention:** GDPR/PDPA compliance with automatic anonymization of old records
- **MFA:** TOTP or SMS OTP for admin accounts
- **Advanced features:** Application editing post-submission, interview scheduling, cover letter uploads, candidate profile pages
- **Performance:** Lighthouse CI gates, monitoring with Sentry + PostHog
