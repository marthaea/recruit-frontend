# CAA e-Recruitment Portal — Stakeholder Presentation Script

*Prepared for the July 21, 2026 presentation. Written to be read/spoken from, with a
reference comparison table at the end for hand-outs or a slide.*

---

## 1. Opening (30–60 seconds)

> "Before I show you what we've built, I want to show you what's live today —
> because it explains why this project exists."

Pull up **https://recruitment.caa.co.ug/** on screen. Let it sit for a second — it's a
bare login page.

> "This is CAA's current e-recruitment portal — the 'Future-Gateway' system. There's
> no way to browse a job without an account. No search. No listing of open roles. No
> indication of how many positions exist or what departments are hiring. It's a login
> form bolted onto an old ASP.NET Web Forms application — you can see it in the page
> itself, it still uses classic postback-based forms, image-based logos instead of
> scalable graphics, and no responsive layout for mobile. If a candidate wants to know
> what jobs are open, their *only* option is to register an account first and hope
> something's listed once they're inside.
>
> What I'm going to show you today replaces that entirely — a full recruitment
> platform built from the ground up: public job browsing, a guided application
> process, a self-service candidate dashboard, and a complete HR back office with
> analytics, reporting, and audit trails. Everything you're about to see is real,
> working code connected to a live database — not a mockup."

---

## 2. Candidate Experience Walkthrough

Drive this live in the browser. Talking points per screen:

### Homepage
> "Anyone — no account required — lands here and immediately sees what's open: a
> live count of positions, departments hiring, and featured vacancies pulled
> straight from our database. There's a search bar with department and location
> filters, so a candidate can narrow down to 'ICT jobs in Kampala' in two clicks."

### Job listing → job detail
> "Each listing shows salary band, required qualification, experience, and closing
> date up front — no surprises after they've started an application. Internal-only
> postings are automatically hidden from external candidates and only appear to
> verified CAA staff — that's enforced on the server, not just hidden in the UI."

### Registration & application
> "Registration takes an email and password, with email verification before the
> account is fully activated. When a candidate applies, the CV builder is tailored
> specifically for the Ugandan education system — O-Level, A-Level, Certificate,
> Diploma, Degree, Masters, PhD — with a pre-loaded list of Ugandan universities and
> common local degree programmes, so candidates aren't typing free-text qualifications
> that HR then has to interpret by hand. They upload a photo and supporting documents
> directly — those go straight to secure cloud storage.
>
> Some roles have screening questions attached — yes/no qualifiers, or numeric ranges
> like 'years of experience' — so the system can flag whether a candidate meets the
> bar before HR ever opens the file."

### Candidate dashboard
> "Once they've applied, candidates get a real dashboard — not a support inbox. A
> visual pipeline shows exactly where each application sits: Applied → Shortlisted →
> Interview → Offered. They get in-app notifications the moment their status
> changes, and they can download a PDF summary of any application for their own
> records."

### Martha — the FAQ assistant
> "We also built an assistant, Martha, that answers common questions — how to
> register, how to reset a password, what documents are needed — instantly, in
> plain language, without a candidate needing to email HR and wait. Every question
> she's asked is logged, which means we can see exactly what's confusing candidates
> and fix it — that data feeds directly into the analytics dashboard on the admin
> side."

---

## 3. HR / Admin Experience Walkthrough

> "Now let's switch to what your HR and recruitment team sees day to day."

### Applications management
> "HR can review, shortlist, decline, or move a candidate to interview — individually
> or in bulk. Every status change can trigger an automatic, templated email to the
> candidate, so there's no manual email-writing for routine updates."

### Criteria-driven & CGPA-based auto-screening
> "For high-volume roles — like graduate trainee intakes, where we might get over a
> hundred applicants for one posting — HR can set a CGPA threshold and required
> qualification level per job, and the system will preview exactly who passes and
> who doesn't before anything is finalized. One click applies the decision to the
> whole batch instead of opening a hundred files by hand."

### Jobs, staff & permissions
> "Vacancies are managed entirely from the dashboard — create, edit, close, mark as
> featured. Internal postings are checked against a verified staff register by
> employee number, so someone can't falsely register as internal staff to see
> restricted roles.
>
> Access itself is role-based: Super Admin, HR, and Recruiter roles ship with sane
> defaults, but every permission — who can export data, who can manage settings, who
> can view the audit log — can be overridden per individual admin. That's the kind
> of access control a government institution needs before this can be trusted with
> real candidate data."

### Audit log & reporting
> "Every admin action is logged — who did what, to which record, and when — fully
> queryable. And when it's time to report upward, there isn't just one export button:
> there are ten distinct report types built in — vacancy reports, application
> reports, department summaries, intern CGPA rankings, staff registers, time-to-hire
> analysis, diversity summaries, screening pass rates, applicant volume by closing
> date — all generated as PDFs, on demand, from real data."

### Analytics
> "And underneath all of it is an analytics dashboard tracking page views, job views,
> apply-click conversion, and search terms over time — so you're not guessing which
> roles attract interest or where candidates drop off."

---

## 4. What's Under the Hood (keep this short and plain-language)

> "None of this is a prototype held together with tape. It's built on a proper
> production stack: a Node.js/Express API backed by MySQL, with authentication using
> industry-standard JSON Web Tokens — short-lived access tokens plus a rotating
> refresh token, so a stolen token has a narrow window of use. Passwords are hashed,
> never stored in plain text. Every login attempt is rate-limited to blunt
> brute-force attacks. The system was designed with a target capacity around five
> thousand concurrent users, which is well beyond what a national aviation authority's
> recruitment cycles need, even at peak.
>
> And this isn't a 'build it once and hope' project — as recently as today, we ran a
> deliberate quality pass and caught and fixed three real issues before they'd ever
> reach a candidate: a stale data bug affecting the public job listing, a
> cross-device session bug, and a login performance issue. That's the kind of active
> engineering process this system gets — not a one-time delivery."

---

## 5. Old vs. New — Reference Table

| | **recruitment.caa.co.ug (current)** | **This platform** |
|---|---|---|
| Browse jobs without an account | ❌ Not possible | ✅ Full public listing, search & filters |
| Mobile-friendly | ❌ No responsive design | ✅ Fully responsive |
| Application tracking for candidates | ❌ None visible | ✅ Visual pipeline + notifications |
| CV/profile builder | ❌ Generic/unknown | ✅ Uganda-curriculum-aware, with document upload |
| Automated screening | ❌ None | ✅ Criteria & CGPA-based bulk auto-screening |
| Role-based admin access | ❌ Unknown/likely flat | ✅ 3 roles + per-admin permission overrides |
| Audit trail | ❌ Not visible | ✅ Every admin action logged & queryable |
| Reporting | ❌ Not visible | ✅ 10 PDF report types on demand |
| Analytics on candidate behaviour | ❌ None | ✅ Full funnel + search analytics |
| Candidate self-service FAQ | ❌ None | ✅ "Martha" assistant, logged & analyzed |
| Internal vs. external job visibility | ❌ Unknown | ✅ Enforced server-side by verified staff registry |
| Security | Legacy ASP.NET Web Forms | JWT + refresh rotation, bcrypt, rate limiting, RBAC |

---

## 6. Closing

> "What you've seen today isn't a concept — it's a working system, front to back,
> that already does everything the current portal doesn't: it lets candidates see
> what's actually open, apply without friction, and know where they stand — and it
> gives HR the tools to manage volume, enforce fairness through consistent screening
> criteria, and prove accountability through audit trails and reporting. We'd like to
> talk about what it would take to bring this into production for CAA."

---

*Notes to self before presenting: warm up the backend (hit the live URL once) a
couple of minutes before you go on stage, since a cold first request can be slow —
everything after that is fast.*
