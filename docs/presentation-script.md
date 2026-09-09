# CAA e-Recruitment Portal — Stakeholder Presentation Script

*Updated for the July 30, 2026 final presentation. Written to be read/spoken from,
with a reference comparison table at the end for hand-outs or a slide.*

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

### Martha — the intelligent assistant
> "We also built an assistant, Martha — and she's not a canned FAQ bot. She's
> connected to the live system, so her answers come from real data, and she knows
> who she's talking to."

**Demo her live — type these exact questions:**

1. *(signed out or as a candidate)* **"What jobs are open right now?"** — she lists
   the actual vacancies from the database, with departments, closing dates and
   days remaining. Try **"What's closing soon?"** for the most urgent deadlines.
2. *(as a signed-in candidate)* **"What's the status of my application?"** — she
   looks up that candidate's own applications and reads their real statuses back,
   by name.
3. *(as an admin)* **"Which jobs are awaiting review?"** — she reads the live
   approval pipeline and lists exactly which listings are sitting at department
   review and which are at final approval. Try **"How many applications do we
   have?"** for a live status breakdown.

> "Notice she answered differently depending on who was signed in — a guest never
> sees internal-only listings, and only admins get pipeline data. She still handles
> all the everyday questions — registration, password resets, documents, drone
> permits, even how to become a pilot — and every question she's asked is logged,
> so we can see exactly what's confusing candidates and feed that into the
> analytics dashboard."

---

## 3. HR / Admin Experience Walkthrough

> "Now let's switch to what your HR and recruitment team sees day to day."

### The job-approval workflow (do this one live, start to finish)
> "In a government institution, a job advert shouldn't go public because one person
> clicked a button. So publishing here is a governed pipeline: an HR officer drafts
> the listing, the Head of Department reviews it, and the Director of HR &
> Administration gives final approval — every step recorded, every decline
> requiring a written reason that goes back to the author."

**Live demo sequence (~3 minutes):**
1. In **Create Job**, create a listing — point out you can start from a saved
   template or import an existing PDF advert and the form pre-fills itself.
2. Click **Save & submit for review** — note the status badge flips to *Pending
   Review* and the HOD is notified by email.
3. Open the **Review Job** tab — "this is the Head of Department's queue" — use
   *Preview as candidate* to show exactly what would go live, then **Approve**.
4. Open **Approve & Publish** — "and this is the Director's final gate" —
   **Approve & Publish**.
5. Switch to the public **Vacancies** page — the job is now live for candidates,
   seconds later. *(Optionally: show Decline on a second listing — the reason is
   mandatory, and the job goes back to draft with the feedback attached.)*

> "Nothing reaches a candidate without two sign-offs, and the audit log holds who
> approved what and when. A Super Admin can bypass the chain in an emergency — and
> that bypass is itself logged."

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
> And this isn't a 'build it once and hope' project — as recently as yesterday we
> ran a full end-to-end verification pass: twelve automated API tests covering the
> entire job-approval workflow, and nine automated browser tests that log in, click
> through the review-and-approve pipeline, and interrogate Martha, exactly the way
> a real user would. That pass caught and fixed three real issues before they'd
> ever reach a user — including a session-timing bug that could leave an
> approver's queue looking empty, and a data-visibility gap between admin and
> public views. That's the kind of active engineering process this system gets —
> not a one-time delivery."

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
| Job publishing governance | ❌ None visible | ✅ Draft → HOD review → Director approval, declines with mandatory reasons |
| Audit trail | ❌ Not visible | ✅ Every admin action logged & queryable |
| Reporting | ❌ Not visible | ✅ 10 PDF report types on demand |
| Analytics on candidate behaviour | ❌ None | ✅ Full funnel + search analytics |
| Candidate self-service assistant | ❌ None | ✅ "Martha" — answers from live data (vacancies, deadlines, your application status, admin pipeline), logged & analyzed |
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

## Pre-stage checklist (15 minutes before)

1. **Warm everything up.** Open the live site, browse Vacancies, and log in to the
   HR Console once. This wakes the backend AND warms its database connection pool —
   the first connection to the remote database can be slow, and a warm pool makes
   every demo click fast. Click around for a full minute.
2. **Stage the pipeline.** Create one draft job and submit it for review *before*
   you go on, so the Review tab already has something in it if you need to jump
   straight there — then create a second one live on stage for the full
   draft-to-published story.
3. **Test Martha's three demo questions** once, in order, so you know exactly what
   she'll say: "What jobs are open right now?" → "What's the status of my
   application?" (candidate account) → "Which jobs are awaiting review?" (admin).
4. **Have both logins on a sticky note** (admin + a demo candidate) — don't type
   from memory under stage lights.
5. **Plan B:** keep a screen recording of the full flow from your rehearsal on the
   desktop. If the venue network dies, narrate over the recording without missing
   a beat.*
