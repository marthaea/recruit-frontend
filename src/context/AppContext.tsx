import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import {
  auth as authApi, jobs as jobsApi, applications as appsApi,
  notifications as notifApi, settings as settingsApi,
  cv as cvApi, criteria as criteriaApi, departments as departmentsApi, permissions as permissionsApi,
  setToken, restoreSession, setSessionExpiredHandler,
  type UserResponse, type Department,
} from "@/lib/api/client";

// ─── Base types ───────────────────────────────────────────────────────────────

export type Visibility = "external" | "internal";
export type QualLevel = "O-Level" | "A-Level" | "Certificate" | "Diploma" | "Degree" | "Masters" | "PhD";
export type ApplicationStatus =
  | "Pending" | "Under Review" | "Shortlisted" | "Interview"
  | "Assessment Scheduled" | "Assessment Complete" | "Shortlisted II" | "Background Check"
  | "Offered" | "Declined";
export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "Pending", "Under Review", "Shortlisted", "Interview",
  "Assessment Scheduled", "Assessment Complete", "Shortlisted II", "Background Check",
  "Offered", "Declined",
];
export type AdminRole = "super" | "hr" | "recruiter" | "auditor" | "hr_officer" | "it_admin" | "dhra" | "hod";
export const ADMIN_ROLES: AdminRole[] = ["super", "hr", "recruiter", "auditor", "hr_officer", "it_admin", "dhra", "hod"];
export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super: "Super Admin", hr: "HR Manager", recruiter: "Recruiter",
  auditor: "Auditor", hr_officer: "HR Officer", it_admin: "IT Admin",
  dhra: "DHRA (Director HR & Administration)", hod: "Head of Department",
};
export type AuditEntry = { id: number; at: string; actor: string; role: string; action: string; target?: string };
export type AdminSettings = {
  minAgeThreshold: number;
  allowExternalInternalJobs: boolean;
  orgName: string;
  sessionTimeoutMinutes: number;
  emailSenderName: string;
  closingSoonDays: number;
  maxApplicationsPerCandidate: number;
  notifTemplates: { shortlist: string; decline: string; interview: string; offer: string };
};

// ─── New feature types ────────────────────────────────────────────────────────

export type Notification = {
  id: number;
  recipientEmail: string;
  title: string;
  message: string;
  read: boolean;
  at: string;
  type: "shortlisted" | "declined" | "interview" | "offered" | "info";
};

export type AnalyticsEvent = {
  type: "page_view" | "job_view" | "apply_click" | "save_job" | "search";
  jobId?: number;
  jobTitle?: string;
  query?: string;
  ts: number;
};

export type SentEmail = {
  id: number;
  to: string;
  candidateName: string;
  subject: string;
  body: string;
  sentAt: string;
  trigger: string;
  jobTitle: string;
};

export type ScreeningQuestion = {
  id: string;
  text: string;
  type: "qualifier" | "disqualifier";
  /** How the candidate answers this question on the application form. Legacy questions
   *  (created before this field existed) have no `kind` and fall back to fuzzy CV-text matching. */
  kind?: "yesno" | "number";
  /** kind: "yesno" — the answer ("Yes" | "No") that keeps the candidate eligible. */
  qualifyingAnswer?: "Yes" | "No";
  /** kind: "number" — inclusive range the candidate's numeric answer must fall within to stay eligible. */
  min?: number;
  max?: number;
};

export type JobCriteria = {
  jobId: number;
  minCgpa?: number;
  requiredKeywords: string[];
  notes?: string;
  screeningQuestions?: ScreeningQuestion[];
  minExperienceYears?: number;
  requiredQualLevel?: QualLevel;
  disqualifyingUniversities?: string[];
  assessmentTypes?: AssessmentType[];
};

export const ASSESSMENT_TYPES = ["Written", "Oral Interview", "Practical Test"] as const;
export type AssessmentType = typeof ASSESSMENT_TYPES[number];

export type PermissionOverride = {
  email: string;
  role: AdminRole;
  canViewAudit: boolean;
  canManageJobs: boolean;
  canExport: boolean;
  canViewStaff: boolean;
  canManageSettings: boolean;
  canGrantPermissions: boolean;
  canManageCriteria: boolean;
  canShortlist: boolean;
  canViewApplications: boolean;
  canScreenInterns: boolean;
  canSendNotifications: boolean;
  canReviewJob: boolean;
  canApproveJob: boolean;
  canManageDepartments: boolean;
  canManageAdmins: boolean;
  canAssignRights: boolean;
  canScheduleAssessment: boolean;
  canRecordAssessment: boolean;
  canManageBackgroundChecks: boolean;
};

// ─── RBAC ─────────────────────────────────────────────────────────────────────
// This starts as a hardcoded fallback (so the console isn't blank for the
// instant between an admin logging in and the fetch below completing), then
// gets overwritten with the real thing from GET /api/permissions/roles/defaults
// — the backend is the single source of truth, this is no longer an
// independently-maintained copy. See setRoleDefaults() / apiSignIn.
export let ROLE_DEFAULTS: Record<AdminRole, Partial<PermissionOverride>> = {
  super: {
    canViewAudit: true, canManageJobs: true, canExport: true, canViewStaff: true,
    canManageSettings: true, canGrantPermissions: true, canManageCriteria: true,
    canShortlist: true, canViewApplications: true,
    canScreenInterns: true, canSendNotifications: true,
    canReviewJob: true, canApproveJob: true, canManageDepartments: true,
    canManageAdmins: true, canAssignRights: true,
    canScheduleAssessment: true, canRecordAssessment: true, canManageBackgroundChecks: true,
  },
  hr: {
    canViewAudit: false, canManageJobs: true, canExport: true, canViewStaff: true,
    canManageSettings: false, canGrantPermissions: false, canManageCriteria: true,
    canShortlist: true, canViewApplications: true,
    canScreenInterns: true, canSendNotifications: true,
    canScheduleAssessment: true, canManageBackgroundChecks: true,
  },
  recruiter: {
    canViewAudit: false, canManageJobs: false, canExport: false, canViewStaff: false,
    canManageSettings: false, canGrantPermissions: false, canManageCriteria: true,
    canShortlist: true, canViewApplications: true,
    canScreenInterns: false, canSendNotifications: false,
  },
  auditor: { canExport: true, canViewAudit: true },
  hr_officer: {
    canViewApplications: true, canShortlist: true, canManageJobs: true,
    canManageCriteria: true, canSendNotifications: true,
    canScheduleAssessment: true, canManageBackgroundChecks: true,
  },
  it_admin: { canAssignRights: true },
  dhra: {
    canViewApplications: true, canShortlist: true, canApproveJob: true,
    canExport: true, canViewAudit: true,
    canScheduleAssessment: true, canRecordAssessment: true, canManageBackgroundChecks: true,
  },
  hod: { canViewApplications: true, canShortlist: true, canReviewJob: true, canRecordAssessment: true },
};

/** Overwrites the role-defaults table with the real one from the backend. */
export function setRoleDefaults(defaults: Record<AdminRole, Partial<PermissionOverride>>) {
  ROLE_DEFAULTS = defaults;
}

export function canAccess(role: AdminRole | undefined, perm: keyof PermissionOverride, overrides?: PermissionOverride[]): boolean {
  if (!role) return false;
  const override = overrides?.find((o) => o.role === role);
  if (override && perm in override) return !!override[perm];
  const def = ROLE_DEFAULTS[role] ?? {};
  return !!((def as any)[perm]);
}

// ─── Job / Application ────────────────────────────────────────────────────────

export type JobStatus = "draft" | "pending_review" | "pending_approval" | "published" | "declined";
export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: "Draft", pending_review: "Pending Review", pending_approval: "Pending Approval",
  published: "Published", declined: "Declined",
};

export type Job = {
  id: number; abbr: string; title: string; dept: string; deptKey: string;
  location: string; salary: string; salaryBand: string;
  type: "Full-time" | "Contract";
  closes: string; closesAt: string; visibility: Visibility;
  minAge: number; requiredExperience: number; requiredQualification: QualLevel;
  description?: string; featured?: boolean;
  status?: JobStatus; departmentId?: number | null; declineReason?: string | null;
};

export type Application = {
  id: number; abbr: string; title: string; dept: string; date: string;
  status: ApplicationStatus; completion: number;
  jobId?: number; candidateEmail?: string; candidateName?: string;
  cgpa?: number; university?: string;
  /** Candidate's answers to the job's screening questions, keyed by ScreeningQuestion.id. */
  screeningAnswers?: Record<string, string>;
  deploymentStation?: string | null;
  deploymentDate?: string | null;
};

const NON_WITHDRAWABLE_STATUSES: ApplicationStatus[] = [
  "Shortlisted", "Interview", "Assessment Scheduled", "Assessment Complete",
  "Shortlisted II", "Background Check", "Offered",
];
export function canWithdraw(status: ApplicationStatus): boolean {
  return !NON_WITHDRAWABLE_STATUSES.includes(status);
}

/** Evaluate one screening-question answer precisely. Pass = stays eligible. Legacy
 *  text-only questions (no `kind`) have no structured answer to check — they're scored
 *  from the CV via fuzzy keyword matching instead, so they always pass here. */
export function screeningAnswerPasses(q: ScreeningQuestion, answer: string | undefined): boolean {
  if (q.kind === "yesno") return !!answer && answer === (q.qualifyingAnswer ?? "Yes");
  if (q.kind === "number") {
    const n = answer !== undefined && answer !== "" ? Number(answer) : NaN;
    if (Number.isNaN(n)) return false;
    if (q.min !== undefined && n < q.min) return false;
    if (q.max !== undefined && n > q.max) return false;
    return true;
  }
  return true;
}

export type ToastType = "success" | "info" | "warning";
export type Toast = { id: number; type: ToastType; title: string; message?: string };

export type AccountType = "external" | "internal" | "admin";
type Auth = {
  isLoggedIn: boolean; firstName: string; lastName: string; email: string;
  accountType: AccountType; employeeNumber?: string;
  effectiveType?: AccountType; adminRole?: AdminRole;
  photoUrl?: string;
  /** undefined = unknown (legacy account); false = pending verification */
  emailVerified?: boolean;
};

// ─── CV ───────────────────────────────────────────────────────────────────────

export type CvQualification = {
  level: QualLevel; course: string; institution: string; year: string;
  awardFile?: string; transcriptFile?: string;
  school?: string; indexNumber?: string;
  subjects?: { subject: string; grade: string }[];
  aggregate?: string;
};
export type CvExperience = {
  title: string; organisation: string; start: string; end: string; description: string; proofFile?: string;
};
export type CvReferee = { name: string; title: string; organisation: string; phone: string; email: string };
export type CvProfile = {
  personal: {
    firstName: string; lastName: string; otherName?: string;
    dob: string; gender: string; nationality: string; nin: string;
    phone: string; email: string; address: string;
  };
  highestLevel: QualLevel | "";
  qualifications: CvQualification[];
  skills: string[];
  experience: CvExperience[];
  referees: CvReferee[];
  nextOfKin: { name: string; relationship: string; phone: string };
  photoFile?: string;
};

export const EMPTY_CV: CvProfile = {
  personal: { firstName: "", lastName: "", otherName: "", dob: "", gender: "", nationality: "Ugandan", nin: "", phone: "", email: "", address: "" },
  highestLevel: "",
  qualifications: [],
  skills: [],
  experience: [],
  referees: [{ name: "", title: "", organisation: "", phone: "", email: "" }, { name: "", title: "", organisation: "", phone: "", email: "" }],
  nextOfKin: { name: "", relationship: "", phone: "" },
};

const DEMO_CV_STORE: Record<string, CvProfile> = {
  "jbukenya@gmail.com": {
    personal: {
      firstName: "John", lastName: "Bukenya",
      dob: "1990-03-15", gender: "Male", nationality: "Ugandan",
      nin: "CM79000315BUKJN", phone: "+256 701 234 567",
      email: "jbukenya@gmail.com", address: "Plot 45, Kisaasi, Kampala",
    },
    highestLevel: "Degree",
    qualifications: [
      { level: "Degree", course: "BSc Electrical Engineering", institution: "Makerere University", year: "2013" },
      { level: "A-Level", course: "PCM", institution: "Namilyango College", school: "Namilyango College", year: "2009" },
    ],
    experience: [
      { title: "Air Traffic Control Officer", organisation: "Uganda Civil Aviation Authority", start: "2014-01-01", end: "2024-12-31", description: "Managed en-route and approach traffic at Entebbe ACC. Supervised radar and procedural control." },
    ],
    skills: ["Air Traffic Control", "Radar Systems", "Radio Communication", "ICAO Procedures", "Emergency Handling", "Team Leadership"],
    referees: [
      { name: "Col. Peter Wamala", title: "Director, Air Traffic Management", organisation: "UCAA", phone: "+256 414 352 000", email: "pwamala@caa.go.ug" },
      { name: "Dr. Rose Nalwoga", title: "Head of Department", organisation: "Makerere University", phone: "+256 772 900 100", email: "r.nalwoga@mak.ac.ug" },
    ],
    nextOfKin: { name: "Margaret Bukenya", relationship: "Spouse", phone: "+256 772 111 222" },
  },
  "mauma@gmail.com": {
    personal: {
      firstName: "Mary", lastName: "Auma",
      dob: "1992-07-22", gender: "Female", nationality: "Ugandan",
      nin: "CF92000722AUMAM", phone: "+256 772 345 678",
      email: "mauma@gmail.com", address: "Plot 12B, Ntinda, Kampala",
    },
    highestLevel: "Degree",
    qualifications: [
      { level: "Degree", course: "Bachelor of Commerce (Accounting)", institution: "Kyambogo University", year: "2015" },
      { level: "A-Level", course: "ECA", institution: "St Mary's College Namagunga", school: "St Mary's College Namagunga", year: "2011" },
    ],
    experience: [
      { title: "Finance Analyst", organisation: "Stanbic Bank Uganda", start: "2016-03-01", end: "2024-01-31", description: "Led revenue assurance audits, reconciled accounts, and produced monthly financial and compliance reports." },
    ],
    skills: ["Financial Analysis", "Revenue Assurance", "IFRS Reporting", "MS Excel", "QuickBooks", "Budget Planning", "Internal Audit"],
    referees: [
      { name: "Mr. Charles Kiggundu", title: "Chief Finance Officer", organisation: "Stanbic Bank Uganda", phone: "+256 312 224 600", email: "c.kiggundu@stanbicbank.ug" },
      { name: "Dr. Beatrice Nampijja", title: "Dean, School of Business", organisation: "Kyambogo University", phone: "+256 414 287 100", email: "b.nampijja@kyu.ac.ug" },
    ],
    nextOfKin: { name: "Robert Auma", relationship: "Brother", phone: "+256 701 999 888" },
  },
};

// ─── Context shape ────────────────────────────────────────────────────────────

type Ctx = {
  auth: Auth;
  isLoading: boolean;
  /** True while a stored session is being revalidated against the backend on mount. */
  sessionRestoring: boolean;
  /** Async sign-in that calls the real API. Resolves with the signed-in user so callers can branch on accountType (see admin.tsx). */
  apiSignIn: (email: string, password: string) => Promise<UserResponse>;
  /** Async register that calls the real API. Use this in register.tsx. */
  apiRegister: (data: { email: string; password: string; firstName: string; lastName: string; accountType: AccountType; employeeNumber?: string }) => Promise<void>;
  /** Sync shim kept for demo/admin shortcuts — prefer apiSignIn for real auth. */
  signIn: (firstName: string, lastName?: string, email?: string, opts?: { accountType?: AccountType; employeeNumber?: string; adminRole?: AdminRole }) => void;
  signOut: () => void;
  updateProfile: (patch: Partial<Pick<Auth, "firstName" | "lastName" | "email">>) => void;
  updatePhotoUrl: (url: string) => void;
  markEmailVerified: () => void;
  toasts: Toast[];
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
  jobs: Job[];
  addJob: (j: Omit<Job, "id" | "abbr">) => Promise<Job>;
  updateJob: (id: number, patch: Partial<Job>) => Promise<void>;
  deleteJob: (id: number) => Promise<void>;
  submitJobForReview: (id: number) => Promise<void>;
  reviewJob: (id: number, approve: boolean, reason?: string) => Promise<void>;
  approveJob: (id: number, approve: boolean, reason?: string) => Promise<void>;
  publishJobDirect: (id: number) => Promise<void>;
  canSeeJob: (j: Job) => boolean;
  isExpired: (j: Job) => boolean;
  applications: Application[];
  withdrawApplication: (id: number) => void;
  addApplication: (a: Omit<Application, "id" | "date" | "status">) => Application;
  updateApplicationStatus: (appId: number, status: ApplicationStatus, notifyEmail?: string, notifyMessage?: string) => void;
  /** Apply many status changes in one state update + one localStorage write — use this instead
   *  of calling updateApplicationStatus in a loop (batch screening, bulk interview approval). */
  bulkUpdateApplicationStatus: (updates: { id: number; status: ApplicationStatus }[]) => void;
  signInPromptOpen: boolean;
  openSignInPrompt: () => void;
  closeSignInPrompt: () => void;
  cv: CvProfile;
  saveCv: (cv: CvProfile) => void;
  hasCv: boolean;
  cvStore: Record<string, CvProfile>;
  audit: AuditEntry[];
  settings: AdminSettings;
  updateSettings: (p: Partial<AdminSettings>) => void;
  logAction: (action: string, target?: string) => void;
  notifications: Notification[];
  sendNotification: (recipientEmail: string, title: string, message: string, type: Notification["type"]) => void;
  markNotificationRead: (id: number) => void;
  criteria: JobCriteria[];
  saveCriteria: (c: JobCriteria) => void;
  departments: Department[];
  loadDepartments: () => void;
  addDepartment: (data: { name: string; code: string }) => Promise<void>;
  permissionOverrides: PermissionOverride[];
  savePermissionOverride: (p: PermissionOverride) => void;
  sentEmails: SentEmail[];
  logEmail: (e: Omit<SentEmail, "id" | "sentAt">) => void;
  /** Log many emails in one state update + one localStorage write — use instead of logEmail in a loop. */
  bulkLogEmails: (emails: Omit<SentEmail, "id" | "sentAt">[]) => void;
  clearEmailLog: () => void;
  analyticsEvents: AnalyticsEvent[];
  trackEvent: (e: Omit<AnalyticsEvent, "ts">) => void;
};

const AppCtx = createContext<Ctx | null>(null);

// ─── Seed data ────────────────────────────────────────────────────────────────

export const CAA_STAFF: Record<string, { firstName: string; lastName: string }> = {
  "CAA-1001": { firstName: "Sarah",     lastName: "Namutebi" },
  "CAA-1002": { firstName: "James",     lastName: "Okello" },
  "CAA-1003": { firstName: "Patricia",  lastName: "Akello" },
  "CAA-1004": { firstName: "Robert",    lastName: "Ssebayiga" },
  "CAA-1005": { firstName: "Grace",     lastName: "Atim" },
  "CAA-1006": { firstName: "David",     lastName: "Mugisha" },
  "CAA-1007": { firstName: "Florence",  lastName: "Nansubuga" },
  "CAA-1008": { firstName: "Charles",   lastName: "Opio" },
  "CAA-1009": { firstName: "Anita",     lastName: "Nakazibwe" },
  "CAA-1010": { firstName: "Peter",     lastName: "Wanyama" },
  "CAA-1011": { firstName: "Christine", lastName: "Nassali" },
  "CAA-1012": { firstName: "Joseph",    lastName: "Abalo" },
  "CAA-1013": { firstName: "Esther",    lastName: "Nakiganda" },
  "CAA-1014": { firstName: "Moses",     lastName: "Kiggundu" },
  "CAA-1015": { firstName: "Agnes",     lastName: "Achola" },
};

export const HR_USERS: Record<string, { firstName: string; lastName: string; password: string; role: AdminRole }> = {
  "admin@caa.go.ug":      { firstName: "Alex",  lastName: "Mukasa",   password: "Admin@2026",   role: "super" },
  "hrdirector@caa.go.ug": { firstName: "Jane",  lastName: "Mirembe",  password: "HrDir@2026",   role: "hr" },
  "recruit@caa.go.ug":    { firstName: "David", lastName: "Ssempala", password: "Recruit@2026", role: "recruiter" },
};

export function isCAAEmail(email: string) { return /@caa\.go\.ug$/i.test(email.trim()); }
export const ADMIN_DEMO = { email: "admin@caa.go.ug", password: "Admin@2026" };
/** Sign in with this email (any password) on /login to see a candidate account with a realistic,
 *  small set of applications instead of a brand-new empty one. */
export const CANDIDATE_DEMO = { email: "jbukenya@gmail.com", firstName: "John", lastName: "Bukenya" };

const JOBS: Job[] = [
  { id: 1, abbr: "ATC", title: "Senior Air Traffic Controller", dept: "Air Traffic Mgmt", deptKey: "atm", location: "Entebbe Airport", salary: "UGX 4.2M–5.8M", salaryBand: "UG4", type: "Full-time", closes: "Jun 15, 2026", closesAt: "2026-06-15", visibility: "external", minAge: 25, requiredExperience: 5, requiredQualification: "Degree", featured: true, description: "Direct en-route and approach traffic at Entebbe ACC." },
  { id: 2, abbr: "ASI", title: "Principal Safety Inspector (Airworthiness)", dept: "Aviation Safety", deptKey: "safety", location: "Kampala HQ", salary: "UGX 3.8M–5.2M", salaryBand: "UG3", type: "Full-time", closes: "Jun 20, 2026", closesAt: "2026-06-20", visibility: "external", minAge: 28, requiredExperience: 7, requiredQualification: "Degree", featured: true },
  { id: 3, abbr: "SYS", title: "Systems Administrator", dept: "ICT & Systems", deptKey: "ict", location: "Kampala HQ", salary: "UGX 2.6M–3.5M", salaryBand: "UG5", type: "Full-time", closes: "Jul 1, 2026", closesAt: "2026-07-01", visibility: "external", minAge: 23, requiredExperience: 3, requiredQualification: "Degree" },
  { id: 4, abbr: "FIN", title: "Finance Officer (Revenue Assurance)", dept: "Finance & Admin", deptKey: "finance", location: "Kampala HQ", salary: "UGX 2.8M–3.6M", salaryBand: "UG5", type: "Contract", closes: "Jun 30, 2026", closesAt: "2026-06-30", visibility: "external", minAge: 25, requiredExperience: 4, requiredQualification: "Degree" },
  { id: 5, abbr: "LEG", title: "Legal Counsel (Aviation Regulations)", dept: "Legal", deptKey: "legal", location: "Kampala HQ", salary: "UGX 3.2M–4.4M", salaryBand: "UG4", type: "Full-time", closes: "Jul 10, 2026", closesAt: "2026-07-10", visibility: "external", minAge: 27, requiredExperience: 5, requiredQualification: "Masters" },
  { id: 6, abbr: "ATT", title: "ATC Trainee (Graduate Entry)", dept: "Air Traffic Mgmt", deptKey: "atm", location: "Entebbe Airport", salary: "UGX 1.8M–2.4M", salaryBand: "UG7", type: "Full-time", closes: "Jul 15, 2026", closesAt: "2026-07-15", visibility: "external", minAge: 21, requiredExperience: 0, requiredQualification: "Degree" },
  { id: 7, abbr: "INT", title: "Internal — Manager, Aerodrome Operations", dept: "Operations", deptKey: "ops", location: "Entebbe Airport", salary: "UGX 5.5M–7.0M", salaryBand: "UG2", type: "Full-time", closes: "Jun 25, 2026", closesAt: "2026-06-25", visibility: "internal", minAge: 30, requiredExperience: 8, requiredQualification: "Masters", description: "Open to verified CAA staff only." },
  { id: 8,  abbr: "ACO", title: "Approach Control Officer", dept: "Air Traffic Mgmt", deptKey: "atm", location: "Entebbe Airport", salary: "UGX 3.5M–4.8M", salaryBand: "UG4", type: "Full-time", closes: "Jul 20, 2026", closesAt: "2026-07-20", visibility: "external", minAge: 24, requiredExperience: 3, requiredQualification: "Degree", featured: true },
  { id: 9,  abbr: "FOI", title: "Flight Operations Inspector", dept: "Aviation Safety", deptKey: "safety", location: "Kampala HQ", salary: "UGX 3.2M–4.5M", salaryBand: "UG4", type: "Full-time", closes: "Jul 5, 2026", closesAt: "2026-07-05", visibility: "external", minAge: 28, requiredExperience: 6, requiredQualification: "Degree" },
  { id: 10, abbr: "DGI", title: "Dangerous Goods Inspector", dept: "Aviation Safety", deptKey: "safety", location: "Entebbe Airport", salary: "UGX 2.8M–3.8M", salaryBand: "UG5", type: "Full-time", closes: "Jul 8, 2026", closesAt: "2026-07-08", visibility: "external", minAge: 25, requiredExperience: 4, requiredQualification: "Degree" },
  { id: 11, abbr: "ASec", title: "Aviation Security Inspector", dept: "Aviation Safety", deptKey: "safety", location: "Entebbe Airport", salary: "UGX 2.9M–3.9M", salaryBand: "UG5", type: "Full-time", closes: "Jul 12, 2026", closesAt: "2026-07-12", visibility: "external", minAge: 25, requiredExperience: 4, requiredQualification: "Degree" },
  { id: 12, abbr: "PRO", title: "Procurement Officer", dept: "Finance & Admin", deptKey: "finance", location: "Kampala HQ", salary: "UGX 2.4M–3.2M", salaryBand: "UG6", type: "Contract", closes: "Jul 3, 2026", closesAt: "2026-07-03", visibility: "external", minAge: 23, requiredExperience: 2, requiredQualification: "Degree" },
  { id: 13, abbr: "NET", title: "Network Engineer", dept: "ICT & Systems", deptKey: "ict", location: "Kampala HQ", salary: "UGX 2.8M–3.7M", salaryBand: "UG5", type: "Full-time", closes: "Jul 18, 2026", closesAt: "2026-07-18", visibility: "external", minAge: 24, requiredExperience: 3, requiredQualification: "Degree" },
  { id: 14, abbr: "AIS", title: "Internal — Principal, Aeronautical Information Services", dept: "Operations", deptKey: "ops", location: "Entebbe Airport", salary: "UGX 4.5M–6.0M", salaryBand: "UG3", type: "Full-time", closes: "Jul 22, 2026", closesAt: "2026-07-22", visibility: "internal", minAge: 28, requiredExperience: 6, requiredQualification: "Degree", description: "Open to verified CAA staff only." },
];

// ─── Seed application generator (~900 realistic Ugandan applicants) ───────────

function lcg(s: number): number { return (((s * 1664525) + 1013904223) >>> 0); }

function generateSeedApplications(): Application[] {
  const M = ["Samuel","Robert","John","James","David","Peter","Emmanuel","Joseph","Charles","Michael","Daniel","George","Richard","Patrick","Stephen","Francis","Andrew","William","Christopher","Moses","Paul","Mark","Henry","Joshua","Benjamin","Isaac","Lawrence","Gerald","Ronald","Ivan","Martin","Simon","Philip","Anthony","Alfred","Raymond","Vincent","Godfrey","Herbert","Dickson","Rogers","Apollo","Caleb","Joel","Amos","Pius","Enoch","Gilbert","Nelson","Dixon","Rashid","Hassan","Ibrahim","Yusuf","Abbas","Karim","Bosco","Innocent","Ambrose","Cyprian","Fabian","Leonard","Fred","Alex","Brian","Denis","Eric","Frank","Geoffrey","Herman","Julius","Kenneth","Levi","Maurice","Nathan","Oscar","Prosper","Quentin","Ronnie","Tadeo","Umar","Victor","Walter","Xavier","Yoweri","Zaid","Arnold","Benedict","Conrad","Duncan","Elijah","Felix","Gregory","Humphrey","Idris","Jerome","Kevin","Luca","Matthew","Nicholas","Oliver"];
  const F = ["Mary","Sarah","Grace","Florence","Patricia","Christine","Agnes","Anita","Esther","Brenda","Gloria","Stella","Harriet","Doreen","Irene","Joan","Judith","Sharon","Caroline","Victoria","Juliet","Beatrice","Rebecca","Susan","Dorothy","Lydia","Miriam","Winfred","Diana","Josephine","Hellen","Anne","Margaret","Catherine","Ruth","Phiona","Olive","Flavia","Jacqueline","Rosemary","Evelyn","Lillian","Robinah","Winnie","Zainab","Aisha","Fatuma","Halima","Immaculate","Dorcas","Barbra","Mercy","Patience","Perpetua","Scholastica","Veronicah","Assumpta","Cissy","Ritah","Norah","Daphne","Alice","Betty","Claire","Deborah","Edith","Fiona","Gladys","Hope","Irma","Jane","Karen","Linda","Monica","Nancy","Olivia","Phoebe","Rita","Sandra","Tina","Uzma","Vanessa","Winifred","Yvonne","Zelda","Amina","Hadija","Khadija","Mariam","Nadia","Rahma","Sumayya","Taslima","Ukhty","Yasmin"];
  const SN = ["Mukasa","Ssali","Nkutu","Bukenya","Okello","Opio","Atim","Achola","Namukasa","Nakamya","Namutebi","Kiggundu","Mugisha","Ssebayiga","Wanyama","Nakazibwe","Nassali","Abalo","Nakiganda","Kizito","Musoke","Lutalo","Ssekamwa","Nsubuga","Balaba","Muwanga","Katumba","Nkwanzi","Acen","Apiyo","Nansubuga","Nabirye","Nakigozi","Nanteza","Nambi","Nabukenya","Nalwoga","Nabwire","Nabukalu","Oulanyah","Kagolo","Lunkuse","Sekajja","Muliisa","Mulindwa","Mutyaba","Mubiru","Ddungu","Kyeyune","Kiyingi","Kibuuka","Kasozi","Katende","Kamya","Kabuga","Kayiwa","Kalanzi","Kalule","Nyanzi","Nyakato","Tumwebaze","Tuhaise","Tugume","Tusiime","Tweheyo","Twesigye","Ahimbisibwe","Akankwasa","Akello","Amuge","Okwir","Odongo","Obua","Ochola","Opiro","Olweny","Omara","Ojok","Ogwal","Ouma","Owino","Onyango","Drago","Amony","Chebet","Sang","Rutto","Were","Wekesa","Simiyu","Namiiro","Naluwooza","Namubiru","Nakitto","Nakintu","Nakayiza","Nakkazi","Nakawunde","Ssemwanga","Ssempijja","Ssenoga","Ssengonzi","Ssentamu","Luyima","Lukyamuzi","Lubega","Lukwago","Lutwama","Mugerwa","Muyingo","Mukaaya","Mukalazi","Nambooze","Nankya","Nansamba","Nantumbwe","Babirye","Birungi","Byarugaba","Katureebe","Kabaale","Kabahenda","Kabugo","Rwamirama","Rwabwogo","Tibaijuka","Ayot","Apio","Aparo","Okumu","Oboth","Odomel","Okwonga","Ayiku","Bbaale","Bbosa","Bbira","Ggayi","Kizza","Kitaka","Waiswa","Walusimbi","Walakira","Serunkuma","Ssebuggwawo","Ssebugwawo","Nsereko","Ntege","Nteziryayo","Mutebi","Mutebe","Mwanje","Mwesige","Mwesigwa","Kyambadde","Kyaligonza","Kyagulanyi","Sentamu","Semakula","Sempa","Ssemmanda","Zziwa","Zzimwe","Kavuma","Kawooya","Kawuki","Kawuma","Kisenyi","Kiwanuka","Kiwanda","Magezi","Magembe","Matagi","Matovu","Matsiko","Mazur","Muhumuza","Muhwezi","Natukunda","Ndawula","Ndimwibo","Ndiwalana","Ndinawe","Nizeyimana","Ntambi","Nuwagaba","Nuwamanya","Nuwabine","Rukewe","Rukundo","Rushegyera","Rwakakamba"];
  const UNIS = ["Makerere University","Kyambogo University","Mbarara University of Science & Technology","Uganda Christian University","Gulu University","Busitema University","Kampala International University","Uganda Management Institute","Kabale University","Nkumba University","Islamic University in Uganda","Uganda Martyrs University","Mountains of the Moon University","Civil Aviation Training College (CATC)"];
  const DOM = ["gmail.com","gmail.com","gmail.com","gmail.com","gmail.com","yahoo.com","outlook.com","hotmail.com","gmail.com","gmail.com"];
  const DATES = ["Jan 6, 2026","Jan 13, 2026","Jan 19, 2026","Jan 27, 2026","Feb 3, 2026","Feb 10, 2026","Feb 17, 2026","Feb 24, 2026","Mar 3, 2026","Mar 10, 2026","Mar 17, 2026","Mar 24, 2026","Apr 1, 2026","Apr 8, 2026","Apr 14, 2026","Apr 21, 2026","May 5, 2026","May 12, 2026","May 19, 2026","May 26, 2026","Jun 2, 2026","Jun 6, 2026","Jun 9, 2026","Jun 12, 2026","Jun 16, 2026","Jun 19, 2026","Jun 23, 2026"];

  // Weighted status pool: 38 Pending, 24 Under Review, 16 Shortlisted, 9 Interview, 5 Offered, 8 Declined = 100
  const ST: ApplicationStatus[] = [
    ...Array<ApplicationStatus>(38).fill("Pending"),
    ...Array<ApplicationStatus>(24).fill("Under Review"),
    ...Array<ApplicationStatus>(16).fill("Shortlisted"),
    ...Array<ApplicationStatus>(9).fill("Interview"),
    ...Array<ApplicationStatus>(5).fill("Offered"),
    ...Array<ApplicationStatus>(8).fill("Declined"),
  ];

  type JS = { id: number; abbr: string; title: string; dept: string; n: number; isCgpa?: true };
  const SPECS: JS[] = [
    { id: 1,  abbr: "ATC",  title: "Senior Air Traffic Controller",                      dept: "Air Traffic Mgmt",  n: 80 },
    { id: 2,  abbr: "ASI",  title: "Principal Safety Inspector (Airworthiness)",         dept: "Aviation Safety",   n: 65 },
    { id: 3,  abbr: "SYS",  title: "Systems Administrator",                              dept: "ICT & Systems",     n: 88 },
    { id: 4,  abbr: "FIN",  title: "Finance Officer (Revenue Assurance)",                dept: "Finance & Admin",   n: 83 },
    { id: 5,  abbr: "LEG",  title: "Legal Counsel (Aviation Regulations)",               dept: "Legal",             n: 42 },
    { id: 6,  abbr: "ATT",  title: "ATC Trainee (Graduate Entry)",                       dept: "Air Traffic Mgmt",  n: 142, isCgpa: true },
    { id: 7,  abbr: "INT",  title: "Internal — Manager, Aerodrome Operations",           dept: "Operations",        n: 21 },
    { id: 8,  abbr: "ACO",  title: "Approach Control Officer",                           dept: "Air Traffic Mgmt",  n: 69 },
    { id: 9,  abbr: "FOI",  title: "Flight Operations Inspector",                        dept: "Aviation Safety",   n: 58 },
    { id: 10, abbr: "DGI",  title: "Dangerous Goods Inspector",                          dept: "Aviation Safety",   n: 46 },
    { id: 11, abbr: "ASec", title: "Aviation Security Inspector",                        dept: "Aviation Safety",   n: 52 },
    { id: 12, abbr: "PRO",  title: "Procurement Officer",                                dept: "Finance & Admin",   n: 70 },
    { id: 13, abbr: "NET",  title: "Network Engineer",                                   dept: "ICT & Systems",     n: 73 },
    { id: 14, abbr: "AIS",  title: "Internal — Principal, Aeronautical Information Services", dept: "Operations",  n: 18 },
  ];
  // Total generated: 80+65+88+83+42+142+21+69+58+46+52+70+73+18 = 907

  const apps: Application[] = [];
  let s = 0x4A3B2C1D;
  let nextId = 100;

  for (const spec of SPECS) {
    const usedEmails = new Set<string>();
    for (let k = 0; k < spec.n; k++) {
      s = lcg(s + k * 17);
      const female = (s % 3) === 0;
      const pool = female ? F : M;
      s = lcg(s); const fn = pool[s % pool.length];
      s = lcg(s); const ln = SN[s % SN.length];
      s = lcg(s); const st = ST[s % ST.length];
      s = lcg(s);
      const comp = st === "Pending" ? 45 + (s % 56)
                 : st === "Under Review" ? 68 + (s % 33)
                 : st === "Declined" ? 30 + (s % 65)
                 : 87 + (s % 14);
      s = lcg(s); const dt = DATES[s % DATES.length];
      s = lcg(s); const dom = DOM[s % DOM.length];

      // Unique-ify email
      const base = `${fn.toLowerCase().replace(/[^a-z]/g,"")}${ln.toLowerCase().replace(/[^a-z]/g,"")}`;
      let em = `${base}@${dom}`;
      if (usedEmails.has(em)) em = `${base}${k}@${dom}`;
      usedEmails.add(em);

      const app: Application = {
        id: nextId++, jobId: spec.id, abbr: spec.abbr, title: spec.title,
        dept: spec.dept, date: dt, status: st, completion: comp,
        candidateName: `${fn} ${ln}`, candidateEmail: em,
      };

      if (spec.isCgpa) {
        s = lcg(s);
        app.cgpa = parseFloat(Math.max(2.0, Math.min(5.0, 2.0 + (s % 31) / 10)).toFixed(1));
        s = lcg(s);
        app.university = UNIS[s % UNIS.length];
      }

      apps.push(app);
    }
  }

  return apps;
}

const APPLICATIONS: Application[] = [
  // ── Pinned demo entries (IDs 1–8) — specific scenarios kept intact ───────
  // ID 1 is CANDIDATE_DEMO's headline (Shortlisted) application — the other two of their
  // three demo applications (IDs 20, 21) are scattered into the bulk list below instead of
  // sitting right here, so "John Bukenya" doesn't appear three times in a row at the top of
  // the admin's All Applications view.
  { id: 1, jobId: 1, abbr: "ATC", title: "Senior Air Traffic Controller", dept: "Air Traffic Mgmt", date: "Jun 3, 2026", status: "Shortlisted", completion: 100, candidateName: "John Bukenya", candidateEmail: "jbukenya@gmail.com" },
  { id: 2, jobId: 4, abbr: "FIN", title: "Finance Officer (Revenue Assurance)", dept: "Finance & Admin", date: "May 28, 2026", status: "Under Review", completion: 85, candidateName: "Mary Auma", candidateEmail: "mauma@gmail.com" },
  { id: 3, jobId: 3, abbr: "SYS", title: "Systems Administrator", dept: "ICT & Systems", date: "May 15, 2026", status: "Pending", completion: 60, candidateName: "Peter Nkutu", candidateEmail: "pnkutu@gmail.com" },
  { id: 4, jobId: 6, abbr: "ATT", title: "ATC Trainee (Graduate Entry)", dept: "Air Traffic Mgmt", date: "Jun 1, 2026", status: "Shortlisted", completion: 95, candidateName: "Kevin Ssali", candidateEmail: "kssali@student.mak.ac.ug", cgpa: 4.7, university: "Makerere University" },
  { id: 5, jobId: 6, abbr: "ATT", title: "ATC Trainee (Graduate Entry)", dept: "Air Traffic Mgmt", date: "Jun 2, 2026", status: "Under Review", completion: 90, candidateName: "Brenda Akello", candidateEmail: "bakello@student.mak.ac.ug", cgpa: 4.3, university: "Makerere University" },
  { id: 6, jobId: 6, abbr: "ATT", title: "ATC Trainee (Graduate Entry)", dept: "Air Traffic Mgmt", date: "Jun 3, 2026", status: "Pending", completion: 80, candidateName: "Ivan Mucunguzi", candidateEmail: "imucunguzi@student.ucu.ac.ug", cgpa: 3.9, university: "Uganda Christian University" },
  { id: 7, jobId: 6, abbr: "ATT", title: "ATC Trainee (Graduate Entry)", dept: "Air Traffic Mgmt", date: "Jun 5, 2026", status: "Pending", completion: 70, candidateName: "Stella Nabirye", candidateEmail: "snabirye@student.must.ac.ug", cgpa: 3.6, university: "Mbarara University" },
  { id: 8, jobId: 6, abbr: "ATT", title: "ATC Trainee (Graduate Entry)", dept: "Air Traffic Mgmt", date: "Jun 7, 2026", status: "Declined", completion: 55, candidateName: "Ronald Oulanyah", candidateEmail: "roulanyah@student.gulu.ac.ug", cgpa: 2.8, university: "Gulu University" },
  // ── Generated bulk (IDs 100+, ~907 entries), with CANDIDATE_DEMO's other 2 applications
  // (IDs 20, 21) spliced in at scattered positions — see note above. ─────────
  ...(() => {
    const bulk = generateSeedApplications();
    const extra: Application[] = [
      { id: 20, jobId: 3, abbr: "SYS", title: "Systems Administrator", dept: "ICT & Systems", date: "May 20, 2026", status: "Under Review", completion: 90, candidateName: "John Bukenya", candidateEmail: "jbukenya@gmail.com" },
      { id: 21, jobId: 13, abbr: "NET", title: "Network Engineer", dept: "ICT & Systems", date: "Jun 10, 2026", status: "Pending", completion: 65, candidateName: "John Bukenya", candidateEmail: "jbukenya@gmail.com" },
    ];
    bulk.splice(Math.floor(bulk.length / 3), 0, extra[0]);
    bulk.splice(Math.floor((bulk.length * 2) / 3), 0, extra[1]);
    return bulk;
  })(),
];

const DEFAULT_SETTINGS: AdminSettings = {
  orgName: "Uganda Civil Aviation Authority",
  minAgeThreshold: 21,
  allowExternalInternalJobs: false,
  sessionTimeoutMinutes: 30,
  emailSenderName: "CAA HR Team",
  closingSoonDays: 7,
  maxApplicationsPerCandidate: 5,
  notifTemplates: {
    shortlist: "Dear {name}, we are pleased to inform you that your application for {role} has been shortlisted. Our team will contact you with further instructions shortly.",
    decline: "Dear {name}, thank you for applying for {role}. After careful review, we regret to inform you that your application has not been successful at this stage.",
    interview: "Dear {name}, congratulations! Your application for {role} has progressed to the interview stage. Our HR team will contact you to confirm the date and time.",
    offer: "Dear {name}, we are delighted to offer you the position of {role}. Please review the attached offer letter and respond within five (5) working days.",
  },
};

// ─── Storage keys ─────────────────────────────────────────────────────────────

function generateAnalyticsSeed(): AnalyticsEvent[] {
  const now = Date.now();
  const DAY = 86_400_000;
  const events: AnalyticsEvent[] = [];
  let s = 77391;
  const rng = () => { s = lcg(s); return s / 0x100000000; };

  const jobPool = [
    { id: 1, title: "Senior Air Traffic Controller" },
    { id: 8, title: "Approach Control Officer" },
    { id: 2, title: "Principal Safety Inspector (Airworthiness)" },
    { id: 3, title: "Systems Administrator" },
    { id: 4, title: "Finance Officer (Revenue Assurance)" },
    { id: 6, title: "ATC Trainee (Graduate Entry)" },
  ];
  const searchPool = ["air traffic", "safety", "ICT jobs", "finance", "entebbe", "procurement", "network", "ATC trainee"];

  for (let d = 29; d >= 0; d--) {
    const dayBase = now - d * DAY;
    const pvCount = 18 + Math.round(rng() * 20);
    for (let i = 0; i < pvCount; i++) events.push({ type: "page_view", ts: dayBase + Math.round(rng() * (DAY - 1)) });

    const jvCount = 10 + Math.round(rng() * 16);
    for (let i = 0; i < jvCount; i++) {
      const j = jobPool[Math.floor(rng() * jobPool.length)];
      events.push({ type: "job_view", jobId: j.id, jobTitle: j.title, ts: dayBase + Math.round(rng() * (DAY - 1)) });
    }

    const acCount = 2 + Math.round(rng() * 5);
    for (let i = 0; i < acCount; i++) {
      const j = jobPool[Math.floor(rng() * jobPool.length)];
      events.push({ type: "apply_click", jobId: j.id, jobTitle: j.title, ts: dayBase + Math.round(rng() * (DAY - 1)) });
    }

    const sCount = 1 + Math.round(rng() * 3);
    for (let i = 0; i < sCount; i++) {
      events.push({ type: "search", query: searchPool[Math.floor(rng() * searchPool.length)], ts: dayBase + Math.round(rng() * (DAY - 1)) });
    }

    if (rng() > 0.4) {
      const j = jobPool[Math.floor(rng() * jobPool.length)];
      events.push({ type: "save_job", jobId: j.id, jobTitle: j.title, ts: dayBase + Math.round(rng() * (DAY - 1)) });
    }
  }
  return events;
}

const STORAGE_KEY    = "caa_auth_v1";
const CV_KEY         = "caa_cv_v1";
const CV_STORE_KEY   = "caa_cv_store_v1";
const JOBS_KEY       = "caa_jobs_v1";
const APPS_KEY       = "caa_apps_v1";
const AUDIT_KEY      = "caa_audit_v1";
const SETTINGS_KEY   = "caa_settings_v1";
const NOTIF_KEY      = "caa_notif_v1";
const CRITERIA_KEY   = "caa_criteria_v1";
const PERMS_KEY      = "caa_perms_v1";
const EMAILS_KEY     = "caa_emails_v1";
const ANALYTICS_KEY  = "caa_analytics_v1";

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<Auth>({ isLoggedIn: false, firstName: "", lastName: "", email: "", accountType: "external" });
  const [isLoading, setIsLoading] = useState(false);
  // True only while a stored session is being revalidated against the backend
  // (see the mount effect below). Consumers that fetch real data on mount for
  // a logged-in-looking user — the HR Console in particular — must wait for
  // this to clear before rendering, or they'll fire an authenticated request
  // with no token yet and get bounced out by the 401 handler in client.ts.
  const [sessionRestoring, setSessionRestoring] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [signInPromptOpen, setSignInPromptOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>(JOBS);
  const [applications, setApplications] = useState<Application[]>(APPLICATIONS);
  const [cv, setCv] = useState<CvProfile>(EMPTY_CV);
  const [hasCv, setHasCv] = useState(false);
  const [cvStore, setCvStore] = useState<Record<string, CvProfile>>(DEMO_CV_STORE);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [criteria, setCriteria] = useState<JobCriteria[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [permissionOverrides, setPermissionOverrides] = useState<PermissionOverride[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>(generateAnalyticsSeed);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as Auth;
        if (stored.isLoggedIn) {
          // Restore the UI state optimistically, then revalidate against the
          // httpOnly refresh cookie. The access token itself is never stored —
          // restoreSession() obtains a fresh one (or signs the user out).
          setAuth(stored);
          setSessionRestoring(true);
          restoreSession().then((ok) => {
            if (!ok) {
              setAuth({ isLoggedIn: false, firstName: "", lastName: "", email: "", accountType: "external" });
              try { localStorage.removeItem(STORAGE_KEY); } catch {}
            }
            setSessionRestoring(false);
          });
        } else {
          setAuth(stored);
        }
      }
      const rj = localStorage.getItem(JOBS_KEY);
      if (rj) setJobs(JSON.parse(rj));
      const ra = localStorage.getItem(APPS_KEY);
      if (ra) {
        const stored: Application[] = JSON.parse(ra);
        if (stored.length >= APPLICATIONS.length) {
          setApplications(stored);
        } else {
          // Stored data pre-dates the bulk seed — merge, keeping any saved statuses
          const byId = new Map(stored.map((a: Application) => [a.id, a]));
          const merged = APPLICATIONS.map((a) => byId.get(a.id) ?? a);
          setApplications(merged);
          try { localStorage.setItem(APPS_KEY, JSON.stringify(merged)); } catch {}
        }
      }
      const rc = localStorage.getItem(CV_KEY);
      if (rc) { setCv(JSON.parse(rc)); setHasCv(true); }
      const rcs = localStorage.getItem(CV_STORE_KEY);
      if (rcs) setCvStore({ ...DEMO_CV_STORE, ...JSON.parse(rcs) });
      const rau = localStorage.getItem(AUDIT_KEY);
      if (rau) setAudit(JSON.parse(rau));
      const rs = localStorage.getItem(SETTINGS_KEY);
      if (rs) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(rs) });
      const rn = localStorage.getItem(NOTIF_KEY);
      if (rn) setNotifications(JSON.parse(rn));
      const rcr = localStorage.getItem(CRITERIA_KEY);
      if (rcr) setCriteria(JSON.parse(rcr));
      const rp = localStorage.getItem(PERMS_KEY);
      if (rp) setPermissionOverrides(JSON.parse(rp));
      const rem = localStorage.getItem(EMAILS_KEY);
      if (rem) setSentEmails(JSON.parse(rem));
      const ran = localStorage.getItem(ANALYTICS_KEY);
      if (ran) setAnalyticsEvents((seed) => [...seed, ...JSON.parse(ran)]);
    } catch {}

    // Load live vacancies + portal settings from the backend for every visitor,
    // logged in or not — the hardcoded/localStorage jobs above are only a
    // same-paint fallback so the page isn't blank while this resolves. Without
    // this, anonymous visitors were stuck on the seed data's fixed closing dates,
    // which age past "today" and quietly filter themselves out of every listing.
    jobsApi.list().then(r => { if (r.success) persistJobs(r.data as unknown as Job[]); }).catch(() => {});
    settingsApi.get().then(r => { if (r.success) setSettings(prev => ({ ...prev, ...(r.data as unknown as AdminSettings) })); }).catch(() => {});
  }, []);

  // A local-only session (e.g. the demo admin shortcut, which sets isLoggedIn
  // without ever obtaining a real backend token) looks "logged in" here but
  // has nothing to authenticate with. The first real API call it makes gets
  // rejected, and without clearing this persisted flag too, the next reload
  // just repeats the same failure — see setSessionExpiredHandler in client.ts.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      persist({ isLoggedIn: false, firstName: "", lastName: "", email: "", accountType: "external" });
    });
  }, []);

  const persist = (a: Auth) => {
    setAuth(a);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(a)); } catch {}
  };
  const persistJobs = (next: Job[]) => { setJobs(next); try { localStorage.setItem(JOBS_KEY, JSON.stringify(next)); } catch {} };
  const persistApps = (next: Application[]) => { setApplications(next); try { localStorage.setItem(APPS_KEY, JSON.stringify(next)); } catch {} };
  const persistNotifs = (next: Notification[]) => { setNotifications(next); try { localStorage.setItem(NOTIF_KEY, JSON.stringify(next)); } catch {} };

  const signIn = (firstName: string, lastName = "", email = "", opts?: { accountType?: AccountType; employeeNumber?: string; adminRole?: AdminRole }) => {
    const accountType = opts?.accountType ?? "external";
    const effectiveType: AccountType = accountType === "internal" && !isCAAEmail(email) ? "external" : accountType;
    persist({ isLoggedIn: true, firstName, lastName, email, accountType, employeeNumber: opts?.employeeNumber, effectiveType, adminRole: opts?.adminRole });
  };

  // ── Real API auth ─────────────────────────────────────────────────────────
  const apiSignIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(email, password);
      const u = res.data;
      setToken(u.token);
      persist({
        isLoggedIn: true,
        firstName: u.firstName, lastName: u.lastName, email: u.email,
        accountType: u.accountType as AccountType,
        effectiveType: (u.effectiveType ?? u.accountType) as AccountType,
        adminRole: u.adminRole ?? undefined,
        employeeNumber: u.employeeNumber ?? undefined,
        emailVerified: u.emailVerified,
      });
      // Load real data in the background
      Promise.all([
        jobsApi.list().then(r => { if (r.success) persistJobs(r.data as unknown as Job[]); }).catch(() => {}),
        appsApi.list().then(r => { if (r.success) persistApps(r.data as unknown as Application[]); }).catch(() => {}),
        settingsApi.get().then(r => { if (r.success) setSettings(prev => ({ ...prev, ...(r.data as unknown as AdminSettings) })); }).catch(() => {}),
        notifApi.list().then(r => { if (r.success) persistNotifs(r.data as unknown as Notification[]); }).catch(() => {}),
        // Role-defaults are fetched for every login (harmless, small payload)
        // so the frontend never has to hardcode its own copy of them.
        permissionsApi.roleDefaults().then(r => { if (r.success) setRoleDefaults(r.data.defaults as Record<AdminRole, Partial<PermissionOverride>>); }).catch(() => {}),
        permissionsApi.list().then(r => {
          if (r.success) {
            const data = r.data as unknown as PermissionOverride[];
            setPermissionOverrides(data);
            try { localStorage.setItem(PERMS_KEY, JSON.stringify(data)); } catch {}
          }
        }).catch(() => {}),
        cvApi.get().then(r => {
          if (r.success && r.data.photoFile) {
            const photoUrl = r.data.photoFile;
            setAuth(prev => {
              const next = { ...prev, photoUrl };
              try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
              return next;
            });
          }
        }).catch(() => {}),
      ]);
      return u;
    } finally {
      setIsLoading(false);
    }
  };

  const apiRegister = async (data: { email: string; password: string; firstName: string; lastName: string; accountType: AccountType; employeeNumber?: string }) => {
    setIsLoading(true);
    try {
      const res = await authApi.register(data);
      const u = res.data;
      setToken(u.token);
      persist({
        isLoggedIn: true,
        firstName: u.firstName, lastName: u.lastName, email: u.email,
        accountType: u.accountType as AccountType,
        effectiveType: (u.effectiveType ?? u.accountType) as AccountType,
        emailVerified: u.emailVerified,
      });
      Promise.all([
        jobsApi.list().then(r => { if (r.success) persistJobs(r.data as unknown as Job[]); }).catch(() => {}),
        appsApi.list().then(r => { if (r.success) persistApps(r.data as unknown as Application[]); }).catch(() => {}),
        notifApi.list().then(r => { if (r.success) persistNotifs(r.data as unknown as Notification[]); }).catch(() => {}),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = () => {
    authApi.logout().catch(() => {});
    setToken(null);
    persist({ isLoggedIn: false, firstName: "", lastName: "", email: "", accountType: "external" });
  };

  const updateProfile = (patch: Partial<Pick<Auth, "firstName" | "lastName" | "email">>) => {
    persist({ ...auth, ...patch });
    // Previously local-only — the backend row never changed, so a reload
    // silently reverted the edit. Persist for real, keep the optimistic
    // local update either way.
    authApi.updateProfile(patch).catch((err) => {
      pushToast({ type: "warning", title: "Profile not saved to server", message: err instanceof Error ? err.message : "Please check your connection and try again." });
    });
  };

  const markEmailVerified = () => {
    persist({ ...auth, emailVerified: true });
  };

  const updatePhotoUrl = (url: string) => {
    setAuth(prev => {
      const next = { ...prev, photoUrl: url };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const withdrawApplication = (id: number) => {
    const app = applications.find((a) => a.id === id);
    if (app && !canWithdraw(app.status)) return;
    persistApps(applications.filter((a) => a.id !== id));
    // Persist the withdrawal to the database as well
    appsApi.withdraw(id).catch(() => {});
  };

  const addApplication: Ctx["addApplication"] = (a) => {
    const cap = settings.maxApplicationsPerCandidate;
    if (cap > 0 && a.candidateEmail) {
      const email = a.candidateEmail.toLowerCase();
      const active = applications.filter(
        (x) => x.candidateEmail?.toLowerCase() === email && x.status !== "Declined"
      ).length;
      if (active >= cap) {
        pushToast({ type: "warning", title: "Application limit reached", message: `You may not have more than ${cap} active application${cap !== 1 ? "s" : ""} at one time.` });
      }
    }
    const tempId = Date.now();
    const newApp: Application = {
      ...a,
      id: tempId,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      status: "Pending",
    };
    persistApps([newApp, ...applications]);

    // Persist to database; on success replace the temp ID with the server-assigned one.
    // The backend derives job details and candidate identity from the job record and
    // the auth token, so only the application-specific fields are sent.
    if (a.jobId != null) {
      appsApi.submit({
        jobId: a.jobId,
        completion: a.completion,
        cgpa: (a as unknown as Record<string, unknown>).cgpa as number | undefined,
        university: (a as unknown as Record<string, unknown>).university as string | undefined,
        screeningAnswers: a.screeningAnswers as Record<string, string> | undefined,
      }).then((res) => {
        if (res.success && res.data?.id && res.data.id !== tempId) {
          setApplications((prev) => {
            const next = prev.map((x) => x.id === tempId ? { ...x, id: res.data.id } : x);
            try { localStorage.setItem(APPS_KEY, JSON.stringify(next)); } catch {}
            return next;
          });
        }
      }).catch(() => {});
    }

    return newApp;
  };

  const updateApplicationStatus: Ctx["updateApplicationStatus"] = (appId, status, notifyEmail, notifyMessage) => {
    // Functional update — this is called in tight loops (batch screening, bulk interview
    // approval) where React batches the state updates. Reading the `applications` closure
    // directly would make every call in the loop overwrite the previous one, leaving only
    // the last candidate in the batch actually updated.
    setApplications((prev) => {
      const next = prev.map((a) => a.id === appId ? { ...a, status } : a);
      try { localStorage.setItem(APPS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    // Persist to database so changes are visible to the candidate on next load
    appsApi.updateStatus(appId, status, notifyEmail, notifyMessage).catch(() => {});
    if (notifyEmail && notifyMessage) {
      const type: Notification["type"] =
        status === "Shortlisted" ? "shortlisted" :
        status === "Declined"    ? "declined" :
        status === "Interview"   ? "interview" :
        status === "Offered"     ? "offered" : "info";
      sendNotification(notifyEmail, `Application update — ${status}`, notifyMessage, type);
    }
  };

  const bulkUpdateApplicationStatus: Ctx["bulkUpdateApplicationStatus"] = (updates) => {
    if (updates.length === 0) return;
    const byId = new Map(updates.map((u) => [u.id, u.status]));
    setApplications((prev) => {
      const next = prev.map((a) => byId.has(a.id) ? { ...a, status: byId.get(a.id)! } : a);
      try { localStorage.setItem(APPS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    // Persist all status changes to database in one call
    appsApi.bulkStatus(updates.map((u) => ({ id: u.id, status: u.status }))).catch(() => {});
  };

  // These previously only ever touched local state/localStorage and never
  // called the backend — meaning no job created through the admin UI had
  // ever actually reached the `jobs` table. Fixed to call the real API and
  // reconcile local state from its response (real id, real status).
  const addJob: Ctx["addJob"] = async (j) => {
    const res = await jobsApi.create(j);
    const created = res.data as unknown as Job;
    persistJobs([created, ...jobs]);
    return created;
  };
  const updateJob: Ctx["updateJob"] = async (id, patch) => {
    const res = await jobsApi.update(id, patch);
    const updated = res.data as unknown as Job;
    persistJobs(jobs.map((j) => (j.id === id ? updated : j)));
  };
  const deleteJob: Ctx["deleteJob"] = async (id) => {
    await jobsApi.delete(id);
    persistJobs(jobs.filter((j) => j.id !== id));
  };

  // Job-approval workflow transitions — each reconciles local state from the
  // backend's response so the status badge/action buttons update immediately.
  const reconcileJob = (updated: Job) => persistJobs(jobs.map((j) => (j.id === updated.id ? updated : j)));
  const submitJobForReview: Ctx["submitJobForReview"] = async (id) => {
    const res = await jobsApi.submitForReview(id);
    reconcileJob(res.data as unknown as Job);
  };
  const reviewJob: Ctx["reviewJob"] = async (id, approve, reason) => {
    const res = await jobsApi.review(id, approve, reason);
    reconcileJob(res.data as unknown as Job);
  };
  const approveJob: Ctx["approveJob"] = async (id, approve, reason) => {
    const res = await jobsApi.approve(id, approve, reason);
    reconcileJob(res.data as unknown as Job);
  };
  const publishJobDirect: Ctx["publishJobDirect"] = async (id) => {
    const res = await jobsApi.publishDirect(id);
    reconcileJob(res.data as unknown as Job);
  };

  const isExpired: Ctx["isExpired"] = (j) => new Date(j.closesAt).getTime() < Date.now();
  const canSeeJob: Ctx["canSeeJob"] = (j) => {
    if (isExpired(j)) return false;
    if (j.visibility === "external") return true;
    return auth.isLoggedIn && auth.effectiveType === "internal";
  };

  const saveCv: Ctx["saveCv"] = (next) => {
    setCv(next); setHasCv(true);
    try { localStorage.setItem(CV_KEY, JSON.stringify(next)); } catch {}
    if (auth.email) {
      const key = auth.email.toLowerCase();
      const nextStore = { ...cvStore, [key]: next };
      setCvStore(nextStore);
      try { localStorage.setItem(CV_STORE_KEY, JSON.stringify(nextStore)); } catch {}
    }
    // Previously local-only (localStorage/context only) — the backend CV row
    // never changed, which is why profile completion (computed server-side
    // from GET /api/cv) never reflected what a candidate actually filled in.
    cvApi.save(next).catch((err) => {
      pushToast({ type: "warning", title: "CV not saved to server", message: err instanceof Error ? err.message : "Please check your connection and try again." });
    });
  };

  const pushToast = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
  }, []);

  const dismissToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const logAction = (action: string, target?: string) => {
    const entry: AuditEntry = {
      id: Date.now(),
      at: new Date().toISOString(),
      actor: auth.isLoggedIn ? `${auth.firstName} ${auth.lastName}` : "System",
      role: auth.adminRole ?? "hr",
      action, target,
    };
    const next = [entry, ...audit].slice(0, 200);
    setAudit(next);
    try { localStorage.setItem(AUDIT_KEY, JSON.stringify(next)); } catch {}
  };

  const updateSettings = (p: Partial<AdminSettings>) => {
    const next = { ...settings, ...p };
    setSettings(next);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch {}
  };

  const sendNotification: Ctx["sendNotification"] = (recipientEmail, title, message, type) => {
    const notif: Notification = {
      id: Date.now() + Math.random(),
      recipientEmail: recipientEmail.toLowerCase(),
      title, message, read: false,
      at: new Date().toISOString(),
      type,
    };
    setNotifications((prev) => {
      const next = [notif, ...prev];
      try { localStorage.setItem(NOTIF_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const markNotificationRead = (id: number) => {
    persistNotifs(notifications.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const saveCriteria: Ctx["saveCriteria"] = (c) => {
    const next = [...criteria.filter((x) => x.jobId !== c.jobId), c];
    setCriteria(next);
    try { localStorage.setItem(CRITERIA_KEY, JSON.stringify(next)); } catch {}
    // Previously local-only — the backend criteria row never changed, so the
    // server-side auto-screening on submit (which reads from the `criteria`
    // table) never actually saw what was configured here.
    const { jobId, ...data } = c;
    criteriaApi.save(jobId, data).catch((err) => {
      pushToast({ type: "warning", title: "Criteria not saved to server", message: err instanceof Error ? err.message : "Please check your connection and try again." });
    });
  };

  // Departments are admin-only server data — fetched on demand by whichever
  // admin screen needs them (Job Listings' dept dropdown, Settings' manager)
  // rather than on every login, since most logins (candidates) can't read it.
  const loadDepartments: Ctx["loadDepartments"] = () => {
    departmentsApi.list().then((r) => { if (r.success) setDepartments(r.data); }).catch(() => {});
  };

  const addDepartment: Ctx["addDepartment"] = async (data) => {
    const res = await departmentsApi.create(data);
    setDepartments((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const savePermissionOverride: Ctx["savePermissionOverride"] = (p) => {
    const next = [...permissionOverrides.filter((x) => x.email !== p.email), p];
    setPermissionOverrides(next);
    try { localStorage.setItem(PERMS_KEY, JSON.stringify(next)); } catch {}
    // Previously local-only — the backend permission_overrides row never
    // changed, so overrides granted here never actually affected what the
    // backend's requirePerm() middleware allowed that user to do.
    permissionsApi.save(p).catch((err) => {
      pushToast({ type: "warning", title: "Permissions not saved to server", message: err instanceof Error ? err.message : "Please check your connection and try again." });
    });
  };

  const logEmail: Ctx["logEmail"] = (e) => {
    const entry: SentEmail = { ...e, id: Date.now(), sentAt: new Date().toISOString() };
    setSentEmails((prev) => {
      const next = [entry, ...prev];
      try { localStorage.setItem(EMAILS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const bulkLogEmails: Ctx["bulkLogEmails"] = (emails) => {
    if (emails.length === 0) return;
    const base = Date.now();
    const entries: SentEmail[] = emails.map((e, i) => ({ ...e, id: base + i, sentAt: new Date().toISOString() }));
    setSentEmails((prev) => {
      const next = [...entries.reverse(), ...prev];
      try { localStorage.setItem(EMAILS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const clearEmailLog: Ctx["clearEmailLog"] = () => {
    setSentEmails([]);
    try { localStorage.removeItem(EMAILS_KEY); } catch {}
  };

  const trackEvent: Ctx["trackEvent"] = (e) => {
    const entry: AnalyticsEvent = { ...e, ts: Date.now() };
    setAnalyticsEvents((prev) => {
      const next = [...prev, entry];
      try { localStorage.setItem(ANALYTICS_KEY, JSON.stringify(next.filter(ev => ev.ts > Date.now() - 30 * 86_400_000))); } catch {}
      return next;
    });
  };

  return (
    <AppCtx.Provider
      value={{
        auth, isLoading, sessionRestoring, apiSignIn, apiRegister, signIn, signOut, updateProfile, updatePhotoUrl, markEmailVerified,
        toasts, pushToast, dismissToast,
        jobs, addJob, updateJob, deleteJob, submitJobForReview, reviewJob, approveJob, publishJobDirect, canSeeJob, isExpired,
        applications, withdrawApplication, addApplication, updateApplicationStatus, bulkUpdateApplicationStatus,
        signInPromptOpen,
        openSignInPrompt: () => setSignInPromptOpen(true),
        closeSignInPrompt: () => setSignInPromptOpen(false),
        cv, saveCv, hasCv, cvStore,
        audit, settings, updateSettings, logAction,
        notifications, sendNotification, markNotificationRead,
        criteria, saveCriteria,
        departments, loadDepartments, addDepartment,
        permissionOverrides, savePermissionOverride,
        sentEmails, logEmail, bulkLogEmails, clearEmailLog,
        analyticsEvents, trackEvent,
      }}
    >
      {children}
    </AppCtx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
