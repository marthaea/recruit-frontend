# CAA Uganda e-Recruitment Portal — User Workflow Flowcharts

All diagrams use [Mermaid](https://mermaid.js.org/) syntax. Render them in VS Code (Mermaid Preview extension), GitHub, or any Mermaid-compatible viewer.

---

## Overview — All 5 User Journeys

```mermaid
flowchart TD
    ENTRY([User visits portal]) --> AUTH{Signed in?}

    AUTH -- No --> PUBLIC[Browse jobs / homepage]
    AUTH -- Yes --> ROLE{User role?}

    PUBLIC --> APPLY_PROMPT[Clicks Apply → Sign-in prompt]
    APPLY_PROMPT --> LOGIN_PAGE[/login or /register]
    LOGIN_PAGE --> ROLE

    ROLE -- External Candidate --> EC_FLOW[External Candidate journey]
    ROLE -- Internal CAA Staff --> IC_FLOW[Internal Candidate journey]
    ROLE -- Super Admin --> SA_FLOW[Super Admin journey]
    ROLE -- HR Director --> HD_FLOW[HR Director journey]
    ROLE -- Recruiter --> REC_FLOW[Recruiter journey]
```

---

## 1. External Candidate

Any person registering with a non-`@caa.co.ug` email address.

> **Demo account:** `j.bukenya@gmail.com` (any password) — pre-seeded with 3 applications (1 Shortlisted, 1 Under Review, 1 Pending).

```mermaid
flowchart TD
    START([Visit portal]) --> HOME[Homepage — hero, search, featured jobs]
    HOME --> BROWSE[/vacancies — External jobs only]
    BROWSE --> JOB_DETAIL[/job?jobId=N — Job detail page]

    JOB_DETAIL --> APPLY_BTN{Click Apply Now}
    APPLY_BTN -- Not signed in --> PROMPT[Sign-in prompt modal]
    PROMPT --> REGISTER[/register — External account]
    REGISTER --> REG_FORM["Email + password\n+ Account type: External"]
    REG_FORM --> LOGIN[/login]
    LOGIN --> APPLY_BTN

    APPLY_BTN -- Signed in --> CV_CHECK{CV already saved?}
    CV_CHECK -- No --> APPLY["/apply?jobId=N"]
    CV_CHECK -- Yes --> REVIEW_EDIT["Review & Edit saved CV"]
    REVIEW_EDIT --> APPLY

    APPLY --> SCREENING{Job has screening\nquestions?}
    SCREENING -- Yes --> ELIGIBILITY_STEP["Step 0: Eligibility\n(Yes/No or numeric questions)"]
    SCREENING -- No --> STEP0
    ELIGIBILITY_STEP --> STEP0

    STEP0[Step: Personal Info]
    STEP0 --> STEP1[Step: Qualifications]
    STEP1 --> STEP2[Step: Skills]
    STEP2 --> STEP3[Step: Work Experience]
    STEP3 --> STEP4[Step: Referees ×2 min]
    STEP4 --> STEP5[Step: Next of Kin]
    STEP5 --> STEP6[Step: Passport Photo upload]
    STEP6 --> STEP7[Step: Review & Submit]

    STEP7 --> MANDATORY_CHECK{All mandatory\nfields filled?}
    MANDATORY_CHECK -- No --> WARN["Warning banner lists missing fields\n(jump-to-step buttons)"]
    WARN --> STEP7
    MANDATORY_CHECK -- Yes --> SUBMIT[Submit application]

    SUBMIT --> SCREENING_EVAL{Fails any\nscreening question?}
    SCREENING_EVAL -- No --> SUCCESS[Success modal — Reference number issued]
    SCREENING_EVAL -- Yes --> SUCCESS_SILENT["Success modal shown\n(candidate unaware)\nStatus silently set to Declined"]

    SUCCESS --> DASH[/dashboard — Candidate dashboard]
    SUCCESS_SILENT --> DASH

    DASH --> STATUS[Track application status]
    DASH --> NOTIF[Read HR notifications]
    DASH --> PDF[Download application PDF]
    DASH --> WITHDRAW_CHECK{Status allows\nwithdrawal?}
    WITHDRAW_CHECK -- "Pending / Under Review" --> WITHDRAW[Withdraw application ✓]
    WITHDRAW_CHECK -- "Shortlisted / Interview / Offered" --> WITHDRAW_BLOCKED["Withdraw disabled\n(tooltip explains why)"]
```

---

## 2. Internal CAA Staff Candidate

CAA employees with a `@caa.co.ug` email and a valid employee number.

```mermaid
flowchart TD
    START([Visit portal]) --> HOME[Homepage]
    HOME --> BROWSE[/vacancies]
    BROWSE --> INTERNAL_BADGE[Internal access badge shown]
    INTERNAL_BADGE --> ALL_JOBS["Sees ALL jobs:\nExternal + Internal-only listings\n(Operations dept visible)"]

    ALL_JOBS --> JOB_DETAIL[/job?jobId=N]
    JOB_DETAIL --> APPLY_BTN{Apply Now}

    APPLY_BTN -- Not signed in --> REGISTER[/register — Internal account]
    REGISTER --> INT_FORM["@caa.co.ug email\n+ Employee number (CAA-1001/1002/1003)\n+ Password"]
    INT_FORM --> VALIDATED{Employee number\nvalid?}
    VALIDATED -- No --> INT_FORM
    VALIDATED -- Yes --> LOGIN[/login]
    LOGIN --> APPLY_BTN

    APPLY_BTN -- Signed in --> APPLY[/apply?jobId=N — same multi-step form]
    APPLY --> SUBMIT[Submit application]
    SUBMIT --> DASH[/dashboard]
    DASH --> MONITOR["Monitor shortlist / interview\nstatus via notifications"]

    INT_FORM -. "Wrong email domain?" .-> DOWNGRADE["Downgraded to External\n(toast warning — internal jobs hidden)"]
```

---

## 3. Super Admin — Alex Mukasa

Full HR Console access. Credentials: `admin@caa.co.ug` / `Admin@2026`.

```mermaid
flowchart TD
    START([Visit /admin]) --> LOGIN_FORM[HR login form]
    LOGIN_FORM --> QUICK[Quick-fill: Super Admin button]
    QUICK --> AUTH[Authenticate → role = super]
    AUTH --> SIDEBAR["Sidebar: all tabs unlocked\n(mobile: hamburger menu ☰)"]

    SIDEBAR --> TAB_DASH[Dashboard — KPI cards + 3 charts]
    SIDEBAR --> TAB_JOBS[Jobs — manage all listings]
    SIDEBAR --> TAB_APPS[Applications — review all]
    SIDEBAR --> TAB_INTERNS[Interns — CGPA ranking]
    SIDEBAR --> TAB_STAFF[Staff register]
    SIDEBAR --> TAB_REPORTS[Reports — 6 PDF exports]
    SIDEBAR --> TAB_CRITERIA[Criteria — set screening rules]
    SIDEBAR --> TAB_AUDIT[Audit Log — full history]
    SIDEBAR --> TAB_SETTINGS[Settings — portal config]
    SIDEBAR --> TAB_PERMS[Permissions — grant/revoke per user]

    TAB_JOBS --> NEW_JOB[Create / edit / delete listings]
    TAB_APPS --> DETAIL[Open candidate dossier modal]
    DETAIL --> AUTO_QUAL[Auto-qualification check]
    DETAIL --> ACTIONS["Shortlist / Interview\nOffer / Decline + notify"]
    ACTIONS --> NOTIF[In-app notification sent to candidate]
    ACTIONS --> AUDIT_LOG[Entry added to Audit Log]

    TAB_APPS --> BATCH["Batch actions\n(with loading spinner)"]
    BATCH --> RUN_SCREEN["Run Auto-Screening\n→ evaluates screening questions + CV keywords"]
    RUN_SCREEN --> CONFIRM_SCREEN["Confirm & Apply Results\n→ Shortlist passes / Decline fails\n(single bulk write)"]
    BATCH --> APPROVE_INT["Approve All for Interview\n→ moves all Shortlisted → Interview\n(single bulk write)"]

    TAB_CRITERIA --> SELECT_JOB[Select job from dropdown]
    SELECT_JOB --> KEYWORD_RULES[Set min CGPA + required keywords]
    SELECT_JOB --> SCREENING_QS["Add screening questions:\n• Yes/No qualifier/disqualifier\n• Numeric range qualifier/disqualifier"]
    SCREENING_QS --> SHOW_ON_FORM["Questions shown on candidate's\nEligibility step when applying"]

    TAB_PERMS --> OVERRIDE["Toggle 9 permissions per HR user\nOverrides stored in localStorage"]
    TAB_SETTINGS --> CONFIG["Min age / session timeout\nOrg name / internal-job visibility"]
```

---

## 4. HR Director — Jane Mirembe

Broad HR access — cannot touch Audit Log, Settings, or Permissions. Credentials: `hr.director@caa.co.ug` / `HrDir@2026`.

```mermaid
flowchart TD
    START([Visit /admin]) --> LOGIN_FORM[HR login form]
    LOGIN_FORM --> QUICK[Quick-fill: HR Director button]
    QUICK --> AUTH[Authenticate → role = hr]
    AUTH --> SIDEBAR["Sidebar: limited tabs\n(mobile: hamburger menu ☰)"]

    SIDEBAR --> TAB_DASH[Dashboard — KPIs + charts]
    SIDEBAR --> TAB_JOBS[Jobs — create / edit / delete]
    SIDEBAR --> TAB_APPS[Applications — full review]
    SIDEBAR --> TAB_INTERNS[Interns — CGPA ranking]
    SIDEBAR --> TAB_STAFF[Staff register — view + export]
    SIDEBAR --> TAB_REPORTS[Reports — all 6 PDFs]
    SIDEBAR --> TAB_CRITERIA[Criteria — configure]

    SIDEBAR -. BLOCKED .-> TAB_AUDIT[Audit Log — hidden]
    SIDEBAR -. BLOCKED .-> TAB_SETTINGS[Settings — hidden]
    SIDEBAR -. BLOCKED .-> TAB_PERMS[Permissions — hidden]

    TAB_APPS --> REVIEW["Review candidates\nShortlist / Interview / Offer / Decline"]
    REVIEW --> NOTIF[Notification sent to candidate]
    TAB_REPORTS --> PDF_EXPORT["Download:\nVacancies / Applications\nDept Summary / Dossiers\nInterns / Staff PDFs"]
```

---

## 5. Recruiter — David Ssempala

Minimal access — applications review and criteria setup only. Credentials: `recruit@caa.co.ug` / `Recruit@2026`.

```mermaid
flowchart TD
    START([Visit /admin]) --> LOGIN_FORM[HR login form]
    LOGIN_FORM --> QUICK[Quick-fill: Recruiter button]
    QUICK --> AUTH[Authenticate → role = recruiter]
    AUTH --> SIDEBAR["Sidebar: 3 tabs only\n(mobile: hamburger menu ☰)"]

    SIDEBAR --> TAB_APPS[Applications — review candidates]
    SIDEBAR --> TAB_CRITERIA[Criteria — set screening rules per job]
    SIDEBAR --> TAB_DASH[Dashboard — read-only KPIs]

    SIDEBAR -. BLOCKED .-> TAB_JOBS[Jobs — hidden]
    SIDEBAR -. BLOCKED .-> TAB_REPORTS[Reports / Export — hidden]
    SIDEBAR -. BLOCKED .-> TAB_STAFF[Staff — hidden]
    SIDEBAR -. BLOCKED .-> TAB_AUDIT[Audit Log — hidden]
    SIDEBAR -. BLOCKED .-> TAB_SETTINGS[Settings — hidden]
    SIDEBAR -. BLOCKED .-> TAB_PERMS[Permissions — hidden]

    TAB_APPS --> OPEN_APP[Open candidate dossier]
    OPEN_APP --> AUTO_QUAL[Auto-qualification check runs]
    AUTO_QUAL --> SHORTLIST["Shortlist / Decline candidate\n(canShortlist permission required)"]
    SHORTLIST --> NOTIF[In-app notification to candidate]

    TAB_CRITERIA --> SELECT_JOB[Select job from dropdown]
    SELECT_JOB --> SET_RULES["Set min CGPA\nAdd required keywords\nAdd notes"]
    SELECT_JOB --> ADD_SCREENING["Add precise screening questions\n(Yes/No or numeric range)"]
    ADD_SCREENING --> SAVE[Save → used by auto-qualify + candidate eligibility step]
```

---

## Permission Matrix Summary

```mermaid
flowchart LR
    subgraph Permissions
        P1[View Audit Log]
        P2[Manage Jobs]
        P3[Export PDFs]
        P4[View Staff]
        P5[Manage Settings]
        P6[Grant Permissions]
        P7[Manage Criteria]
        P8[Shortlist Candidates]
        P9[View Applications]
    end

    SA[Super Admin] --> P1 & P2 & P3 & P4 & P5 & P6 & P7 & P8 & P9
    HD[HR Director] --> P2 & P3 & P4 & P7 & P8 & P9
    REC[Recruiter] --> P7 & P8 & P9
```
