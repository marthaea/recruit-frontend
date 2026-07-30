# Phase 3 E2E Test Checklist — July 30, 2026

## Pre-Test Setup
- [ ] Clear browser cache and cookies (or use incognito/private window)
- [ ] Backend deployed to Railway (check git push status)
- [ ] Frontend deployed to Netlify (check git push status)
- [ ] Browser console open (F12) to watch for errors
- [ ] Have admin credentials ready:
  - Super Admin: `admin@caa.co.ug` / `Admin@2026`
  - HR Director: `hr.director@caa.co.ug` / `HrDir@2026`
  - Recruiter: `recruit@caa.co.ug` / `Recruit@2026`

---

## 1. Candidate Registration & Application

### 1.1 External Candidate Registration
- [ ] Go to https://aviation-careers-hub-live.netlify.app/register
- [ ] Select "External" account type
- [ ] Enter email (anything except @caa.co.ug)
- [ ] Set password (min 8 chars, uppercase, number, symbol)
- [ ] Verify registration succeeds and redirects to vacancies

### 1.2 Browse Jobs & Verify Candidate Detail Page
- [ ] Click on any job to view job detail page
- [ ] **Verify Phase 3 fields present:**
  - [ ] Job Ref (e.g., "UCAA/ADV/EXT/01/2026")
  - [ ] "About the Role" section
  - [ ] Accountabilities (structured list)
  - [ ] Required Qualifications
  - [ ] Special Skills
  - [ ] Reports To, Vacancies, Location
- [ ] **Verify NO salary range shown** (only "Salary Scale: UG5" or similar)
- [ ] "Apply Now" button present and clickable

### 1.3 Multi-Step Application Form
- [ ] Click "Apply Now"
- [ ] **Eligibility step** (if job has screening questions):
  - [ ] Answer Yes/No or numeric questions
  - [ ] Proceed to next step
- [ ] **Personal Info:** Fill first name, last name, DOB, phone, NIN, address
- [ ] **Qualifications:** Add O-Level, A-Level, or Degree entries
- [ ] **Skills:** Add 2-3 skills
- [ ] **Experience:** Add work history (job title, company, dates, description)
- [ ] **Referees:** Add minimum 2 referees
- [ ] **Next of Kin:** Fill details
- [ ] **Passport Photo:** Upload a photo
- [ ] **Review step:** Verify all fields show; no validation errors
- [ ] **Submit:** Success modal appears with reference number (e.g., "REF-2026-00123")
- [ ] **Close modal** → Dashboard shows new application as "Pending"

---

## 2. Admin Console — Job Management

### 2.1 Admin Login
- [ ] Go to https://aviation-careers-hub-live.netlify.app/admin
- [ ] Click "HR Director" button (pre-fills credentials)
- [ ] **Verify dashboard loads** with KPI cards and charts

### 2.2 Jobs Tab — Verify Phase 3 Job Creation
- [ ] Click **Jobs** tab
- [ ] **Verify job list shows:**
  - [ ] Job Ref column
  - [ ] Status badges: draft, pending_review, pending_approval, published
  - [ ] Salary scale (not full range)
- [ ] **Look for "Create Job" or "New Job" button**
- [ ] Click to start job creation (should be single-page form)
- [ ] **Verify creation flow includes:**
  - [ ] Template picker at top (pre-built starter templates)
  - [ ] PDF import option
  - [ ] Basic fields: Title, Job Ref, Department, Employment Category, Salary Scale
  - [ ] "About the Role" (rich text)
  - [ ] Accountabilities (structured area + activities)
  - [ ] **Structured Requirement Builder** (Phase 3):
    - [ ] "Add Requirement" button
    - [ ] Kind selector: minAge, maxAge, flying hours, experience, sex, qualification, etc.
    - [ ] Usage: qualifier, disqualifier, or criteria-only
    - [ ] Mandatory toggle
  - [ ] Desirable requirements section
  - [ ] Special Skills section
  - [ ] Review preview showing candidate-facing content
  - [ ] "Save as Draft" and "Submit for Review" buttons
- [ ] **Close form** (don't save yet)

### 2.3 Job Approval Workflow
- [ ] **Look for "Jobs Review" or "Review" tab** (for HOD review workflow)
- [ ] **Look for "Jobs Approve" or "Approve" tab** (for DHRA approval workflow)
- [ ] If found, click one to see:
  - [ ] Jobs in pending_review or pending_approval status
  - [ ] Preview of job as candidate will see it
  - [ ] Reviewer comment field
  - [ ] Action buttons: Approve/Decline
- [ ] **Verify job status workflow:** draft → pending_review → pending_approval → published

---

## 3. Admin Console — Applications & Shortlisting

### 3.1 Applications Tab
- [ ] Click **Applications** tab
- [ ] **Job Picker:** If no job selected, should see grid of jobs with applicant counts
- [ ] **Select a job** with applications
- [ ] **Verify application list includes:**
  - [ ] Candidate name, email, status, completion %
  - [ ] Status filter chips: All, Pending, Under Review, Shortlisted, Shortlisted II, Interview, Offered, Declined
  - [ ] Checkboxes for batch selection
- [ ] **Click on an application** → Detail modal opens with:
  - [ ] Candidate CV/Profile section
  - [ ] Auto-qualification check (green/red verdict)
  - [ ] Screening answers (if applicable)
  - [ ] Action buttons: Shortlist, Shortlisted II, Interview, Offer, Decline
  - [ ] Editable notification message
- [ ] **Close modal**

### 3.2 Batch Actions
- [ ] **CSV Export button:**
  - [ ] Should be visible in Applications or Reports tab
  - [ ] Click to download CSV
  - [ ] Verify file contains: candidate name, email, status, CGPA, university, submission date
- [ ] **Batch CV Download:**
  - [ ] Select multiple candidates (checkboxes)
  - [ ] Look for "Download CVs" or "Export as ZIP" button
  - [ ] Click and download ZIP file
  - [ ] Verify ZIP contains multiple PDF files (one per candidate)
- [ ] **Run Auto-Screening:**
  - [ ] Look for button in Applications or Interns tab
  - [ ] Click "Run Auto-Screen"
  - [ ] Preview shows pass/fail candidates
  - [ ] Click "Confirm & Apply" to bulk-move candidates
  - [ ] Verify status updates in table

---

## 4. Admin Console — Shortlisted II Panel Scoring

### 4.1 Shortlisted II Tab
- [ ] Click **Shortlisted II** tab
- [ ] **Verify candidates are displayed with:**
  - [ ] Candidate name
  - [ ] Panel scores from each admin
  - [ ] Computed average score (e.g., 85.3/100)
  - [ ] Score range (min–max)
  - [ ] Comments from each scorer
  - [ ] Example: "Lillian Kalule: 90.3 avg (89–92) | Jane: 89, David: 90, Alex: 92"

### 4.2 Multi-Admin Scoring
- [ ] **Verify at least 3 candidates with 2+ scores each**
- [ ] **For one candidate, examine scores:**
  - [ ] Jane's score + comment visible
  - [ ] David's score + comment visible
  - [ ] Alex's score + comment visible
  - [ ] Computed average shown
- [ ] **Verify no overwriting:** Each admin's score appears independently

### 4.3 Auto-Shortlist by Score
- [ ] **Look for "Auto-Shortlist by Score" or "Advance to Interview" button**
- [ ] Input threshold (e.g., "75.0" minimum)
- [ ] Click to execute
- [ ] **Verify:** Candidates above threshold move to Interview, below move to Declined

---

## 5. Admin Console — Reports & Exports

### 5.1 Reports Tab
- [ ] Click **Reports** tab
- [ ] **Verify report options:**
  - [ ] Vacancies Report (PDF + CSV options)
  - [ ] Applications Report (PDF + CSV options)
  - [ ] Departmental Summary (PDF)
  - [ ] Shortlisted Dossiers (PDF)
  - [ ] Interns Ranking (PDF)
  - [ ] Staff Register (PDF + CSV options)
- [ ] **Download one PDF** → Verify UCAA letterhead, page numbers, correct data
- [ ] **Download one CSV** → Open in Excel, verify columns and data

### 5.2 Interns Tab
- [ ] Click **Interns** tab
- [ ] **Verify CGPA-ranked list:**
  - [ ] Candidates ranked by CGPA (highest first)
  - [ ] CGPA color coding: gold (≥4.5), blue (≥3.5), amber (≥3.0), red (<3.0)
  - [ ] "Auto-screen CGPA ≥ [threshold]" input field
  - [ ] Per-job CGPA thresholds respected (from Criteria Setup)
- [ ] **Export to PDF** → Verify UCAA letterhead and ranking order

---

## 6. Admin Console — Hierarchical Roles

### 6.1 Permissions Tab (Super Admin only)
- [ ] Log out and log back in as **Super Admin** (`admin@caa.co.ug` / `Admin@2026`)
- [ ] Click **Permissions** tab
- [ ] **Verify permission grid includes:**
  - [ ] All 3 demo admins (Jane, David, Alex)
  - [ ] **11 permissions** (was 9, now includes):
    - [ ] canViewAudit
    - [ ] canManageJobs
    - [ ] canExport
    - [ ] canViewStaff
    - [ ] canManageSettings
    - [ ] canGrantPermissions
    - [ ] canManageCriteria
    - [ ] canShortlist
    - [ ] canViewApplications
    - [ ] ✨ **canScheduleAssessment** (new)
    - [ ] ✨ **canRecordAssessment** (new)
- [ ] **Verify hierarchical role references** (if visible in the system):
  - [ ] HOD (Head of Department)
  - [ ] DHRA (Director HR & Admin)
  - [ ] HR Officer
  - [ ] Auditor
  - [ ] IT Admin

### 6.2 Role Defaults
- [ ] Check Audit Log for action by different admins
- [ ] Verify each role can only access their permitted tabs:
  - [ ] **Super Admin:** All tabs
  - [ ] **HR Director:** Dashboard, Jobs, Applications, Shortlisted II, Interns, Staff, Reports
  - [ ] **Recruiter:** Applications, Shortlisted II (limited)

---

## 7. Candidate Dashboard

### 7.1 Candidate Login & Dashboard
- [ ] Log out and log back in as the candidate created in step 1.1
- [ ] **Dashboard shows:**
  - [ ] My Applications table with the application just submitted
  - [ ] Status: "Pending"
  - [ ] Completion: % shown
  - [ ] PDF download button
  - [ ] HR Notifications panel (initially empty)
  - [ ] Profile Completion progress bar

### 7.2 Application Actions
- [ ] **Withdraw button** should be active (Pending status allows withdrawal)
- [ ] **Hover over "Withdraw"** → tooltip confirms it can be withdrawn
- [ ] **PDF download:** Click PDF button → Application Summary PDF downloads
- [ ] **Verify PDF contains:**
  - [ ] UCAA letterhead
  - [ ] Candidate details
  - [ ] Application reference number
  - [ ] "What happens next?" section
  - [ ] No recruitment fees statement

---

## 8. Martha Chatbot

### 8.1 Access Martha
- [ ] Look for chatbot icon/toggle in top navbar or floating button
- [ ] Click to open Martha chatbot panel

### 8.2 Verify Phase 3 FAQ Coverage
- [ ] **Look for FAQs about:**
  - [ ] Job creation workflow
  - [ ] Structured requirements
  - [ ] Job templates
  - [ ] Approval workflow (HOD → DHRA)
  - [ ] Panel scoring at Shortlisted II
  - [ ] CSV export
  - [ ] Batch CV download
- [ ] **Test role-aware FAQs:**
  - [ ] Log in as HR Director → Ask about "job approval"
  - [ ] Verify response mentions HOD/DHRA workflow
  - [ ] Log in as Recruiter → Ask about "shortlisting"
  - [ ] Verify response mentions shortlist actions

### 8.3 Verify No Background Check References
- [ ] Search Martha for "background" or "check"
- [ ] Should return no results or "I don't have info on that"
- [ ] ✅ Confirms feature removal

---

## 9. System-Wide Verification

### 9.1 No Background Check References Anywhere
- [ ] Admin console sidebar: no "Background Check" tab
- [ ] Applications status badges: no "Background Check" option
- [ ] Status dropdown in Applications detail: only shows Pending, Under Review, Shortlisted, Shortlisted II, Interview, Offered, Declined
- [ ] PDF reports: no Background Check columns or sections

### 9.2 Session Persistence
- [ ] Log in as admin
- [ ] Hard refresh the page (Ctrl+Shift+R)
- [ ] Should remain logged in (session persists via httpOnly cookie + JWT refresh)
- [ ] Navigate to different tabs → all data loads

### 9.3 Responsive Design
- [ ] Resize browser to mobile width (< 768px)
- [ ] Sidebar collapses into hamburger menu
- [ ] Click hamburger → drawer slides in from left
- [ ] Click a tab → drawer closes and tab content loads
- [ ] All functionality works on mobile

---

## 10. Data Integrity Checks

### 10.1 Multi-Admin Scoring
- [ ] Application has 3 different admins' scores
- [ ] Each admin's comment is unique and preserved
- [ ] Average = sum of all scores / count of scorers
- [ ] No overwriting of scores

### 10.2 Job Approval Workflow
- [ ] Create a draft job
- [ ] Status shows "draft" in Jobs list
- [ ] Verify it's NOT yet visible to candidates
- [ ] Submit for review → status = "pending_review"
- [ ] Only visible to HOD
- [ ] HOD approves → status = "pending_approval"
- [ ] Only visible to DHRA
- [ ] DHRA publishes → status = "published"
- [ ] Now visible to candidates on vacancies page

### 10.3 Structured Requirements Auto-Generation
- [ ] Create job with requirement: "minAge, 25, qualifier"
- [ ] Verify ScreeningQuestion is auto-generated
- [ ] On candidate apply page, Eligibility step shows the question
- [ ] Candidate answers → auto-qualification checks it

---

## 11. Performance & Error Checks

### 11.1 No Console Errors
- [ ] Open DevTools (F12)
- [ ] Go to Console tab
- [ ] Perform all test steps above
- [ ] ✅ No red error messages (only warnings are OK)

### 11.2 Network Performance
- [ ] Open DevTools Network tab
- [ ] Reload admin console
- [ ] All requests should return 200/201/204 status
- [ ] No 404/500 errors
- [ ] Page load time < 5 seconds for most pages

### 11.3 Database Connection
- [ ] Backend logs should show successful MySQL connections
- [ ] All CRUD operations complete without timeouts

---

## 12. Sign-Off

- [ ] All checkboxes above completed ✅
- [ ] No blocking issues found ✅
- [ ] All Phase 3 features verified working ✅
- [ ] System ready for production ✅

### Final Notes
- Tested by: ___________________
- Date: ___________________
- Issues found: 
  ```
  [List any issues]
  ```

---

**End of E2E Test Checklist**
