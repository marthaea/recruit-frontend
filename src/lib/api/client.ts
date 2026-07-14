// Central API client — all backend calls go through here.
// See docs/07-frontend-integration.md in the backend repo for full integration guide.

const BASE = (import.meta.env.VITE_API_URL as string) ?? "http://localhost:5000/api";

// Access token stored in memory, persisted to localStorage for page refresh survival.
let _token: string | null =
  typeof localStorage !== "undefined" ? localStorage.getItem("caa_token") : null;

export function setToken(t: string | null) {
  _token = t;
  if (typeof localStorage !== "undefined") {
    if (t) localStorage.setItem("caa_token", t);
    else localStorage.removeItem("caa_token");
  }
}

export function getToken() { return _token; }

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isMultipart = false
): Promise<T> {
  const headers: Record<string, string> = {};
  if (_token) headers["Authorization"] = `Bearer ${_token}`;
  if (!isMultipart) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: "include", // sends caa_refresh cookie automatically
    body: isMultipart
      ? (body as FormData)
      : body !== undefined
      ? JSON.stringify(body)
      : undefined,
  });

  // Auto-refresh on 401 (expired access token)
  if (res.status === 401 && path !== "/auth/refresh-token" && path !== "/auth/login") {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${_token}`;
      const retry = await fetch(`${BASE}${path}`, {
        method,
        headers,
        credentials: "include",
        body: isMultipart
          ? (body as FormData)
          : body !== undefined
          ? JSON.stringify(body)
          : undefined,
      });
      if (!retry.ok) throw await apiError(retry);
      return retry.json();
    }
    setToken(null);
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Session expired");
  }

  if (!res.ok) throw await apiError(res);
  return res.json();
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/auth/refresh-token`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const json = await res.json();
    if (json.success && json.data?.token) {
      setToken(json.data.token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function apiError(res: Response): Promise<Error> {
  try {
    const json = await res.json();
    return new Error(json.error ?? `HTTP ${res.status}`);
  } catch {
    return new Error(`HTTP ${res.status}`);
  }
}

const get  = <T>(path: string) => request<T>("GET", path);
const post = <T>(path: string, body?: unknown) => request<T>("POST", path, body);
const put  = <T>(path: string, body?: unknown) => request<T>("PUT", path, body);
const del  = <T>(path: string) => request<T>("DELETE", path);
const upload = <T>(path: string, form: FormData) => request<T>("POST", path, form, true);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  register: (data: {
    email: string; password: string;
    firstName: string; lastName: string;
    accountType: string; employeeNumber?: string
  }) => post<ApiResponse<UserResponse>>("/auth/register", data),

  login: (email: string, password: string) =>
    post<ApiResponse<UserResponse>>("/auth/login", { email, password }),

  me: () => get<ApiResponse<UserResponse>>("/auth/me"),

  updateProfile: (data: { firstName?: string; lastName?: string; email?: string }) =>
    put<ApiResponse<UserResponse>>("/auth/profile", data),

  logout: () => post<ApiResponse<{ message: string }>>("/auth/logout"),
};

// ── Jobs ──────────────────────────────────────────────────────────────────────
export const jobs = {
  list: () => get<ListResponse<Job>>("/jobs"),
  get: (id: number) => get<ApiResponse<Job>>(`/jobs/${id}`),
  create: (data: Partial<Job>) => post<ApiResponse<Job>>("/jobs", data),
  update: (id: number, data: Partial<Job>) => put<ApiResponse<Job>>(`/jobs/${id}`, data),
  delete: (id: number) => del<ApiResponse<{ message: string }>>(`/jobs/${id}`),
};

// ── Applications ──────────────────────────────────────────────────────────────
export const applications = {
  list: (params?: { jobId?: number; status?: string; fromDate?: string; toDate?: string; email?: string }) => {
    const qs = params
      ? "?" + new URLSearchParams(
          Object.entries(params).filter(([, v]) => v != null) as [string, string][]
        ).toString()
      : "";
    return get<ListResponse<Application>>(`/applications${qs}`);
  },

  submit: (data: {
    jobId: number; completion?: number;
    cgpa?: number; university?: string;
    screeningAnswers?: Record<string, string>
  }) => post<ApiResponse<Application>>("/applications", data),

  updateStatus: (id: number, status: string, notifyEmail?: string, notifyMessage?: string) =>
    put<ApiResponse<Application>>(`/applications/${id}/status`, { status, notifyEmail, notifyMessage }),

  bulkStatus: (updates: { id: number; status: string }[]) =>
    put<ApiResponse<{ updated: number }>>("/applications/bulk-status", { updates }),

  withdraw: (id: number) =>
    del<ApiResponse<{ message: string }>>(`/applications/${id}`),

  // Returns a URL for direct browser navigation (triggers file download)
  exportUrl: (params?: { jobId?: number; status?: string }) => {
    const qs = params
      ? "?" + new URLSearchParams(
          Object.entries(params).filter(([, v]) => v != null) as [string, string][]
        ).toString()
      : "";
    return `${BASE}/applications/export${qs}`;
  },
};

// ── CV ────────────────────────────────────────────────────────────────────────
export const cv = {
  get: () => get<ApiResponse<CvProfile>>("/cv"),
  save: (data: Partial<CvProfile>) => put<ApiResponse<CvProfile>>("/cv", data),
  upload: (file: File, type: "photo" | "document") => {
    const form = new FormData();
    form.append("file", file);
    form.append("type", type);
    return upload<ApiResponse<UploadResult>>("/cv/upload", form);
  },
  getByEmail: (email: string) =>
    get<ApiResponse<CvProfile | null>>(`/cv/by-email/${encodeURIComponent(email)}`),
};

// ── Settings ──────────────────────────────────────────────────────────────────
export const settings = {
  get: () => get<ApiResponse<PortalSettings>>("/settings"),
  update: (data: Partial<PortalSettings>) => put<ApiResponse<PortalSettings>>("/settings", data),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notifications = {
  list: () => get<ListResponse<Notification>>("/notifications"),
  markRead: (id: number) => put<ApiResponse<{ id: number; isRead: boolean }>>(`/notifications/${id}/read`),
};

// ── Audit ─────────────────────────────────────────────────────────────────────
export const audit = {
  list: (params?: { actor?: string; action?: string; from?: string; to?: string; limit?: number }) => {
    const qs = params
      ? "?" + new URLSearchParams(
          Object.entries(params).filter(([, v]) => v != null) as [string, string][]
        ).toString()
      : "";
    return get<ListResponse<AuditEntry>>(`/audit${qs}`);
  },
};

// ── Emails ────────────────────────────────────────────────────────────────────
export const emails = {
  list: () => get<ListResponse<SentEmail>>("/emails"),
  send: (data: { to: string; candidateName: string; subject: string; body: string; trigger: string; jobTitle: string }) =>
    post<ApiResponse<SentEmail>>("/emails", data),
  sendBulk: (emailList: Array<{ to: string; candidateName: string; subject: string; body: string; trigger: string; jobTitle: string }>) =>
    post<ApiResponse<{ inserted: number }>>("/emails/bulk", { emails: emailList }),
};

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsApi = {
  track: (type: string, jobId?: number, jobTitle?: string, query?: string) =>
    post<{ success: boolean }>("/analytics/event", { type, jobId, jobTitle, query }).catch(() => null),

  summary: (days = 30) =>
    get<ApiResponse<AnalyticsSummary>>(`/analytics?days=${days}`),
};

// ── Criteria ──────────────────────────────────────────────────────────────────
export const criteria = {
  get: (jobId: number) => get<ApiResponse<JobCriteria>>(`/criteria/${jobId}`),
  save: (jobId: number, data: Partial<JobCriteria>) =>
    put<ApiResponse<JobCriteria>>(`/criteria/${jobId}`, data),
};

// ── Permissions ───────────────────────────────────────────────────────────────
export const permissions = {
  get: (adminId: number) => get<ApiResponse<PermissionOverride>>(`/permissions/${adminId}`),
  set: (adminId: number, data: Partial<PermissionOverride>) =>
    put<ApiResponse<PermissionOverride>>(`/permissions/${adminId}`, data),
};

// ── Staff ─────────────────────────────────────────────────────────────────────
export const staff = {
  list: () => get<ListResponse<StaffMember>>("/staff"),
  create: (data: Partial<StaffMember>) => post<ApiResponse<StaffMember>>("/staff", data),
  update: (id: number, data: Partial<StaffMember>) => put<ApiResponse<StaffMember>>(`/staff/${id}`, data),
  delete: (id: number) => del<ApiResponse<{ message: string }>>(`/staff/${id}`),
};

// ── Response type helpers ─────────────────────────────────────────────────────
export interface ApiResponse<T> { success: boolean; data: T }
export interface ListResponse<T> { success: boolean; data: T[]; total: number }

// ── Domain types ──────────────────────────────────────────────────────────────
export interface UserResponse {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  accountType: "external" | "internal" | "admin";
  effectiveType: string;
  adminRole: "super" | "hr" | "recruiter" | null;
  employeeNumber: string | null;
  token: string;
}

export interface Job {
  id: number; abbr: string; title: string; dept: string; deptKey: string;
  location: string; salary: string; salaryBand: string; type: string;
  closes: string; closesAt: string; visibility: string; minAge: number;
  requiredExperience: number; requiredQualification: string; description: string; featured: boolean;
}

export interface Application {
  id: number; jobId: number; abbr: string; title: string; dept: string;
  date: string; status: string; completion: number; candidateName: string;
  candidateEmail: string; cgpa: number | null; university: string | null;
}

export interface CvProfile {
  personal: Record<string, string>;
  highestLevel: string | null;
  qualifications: unknown[];
  skills: string[];
  experience: unknown[];
  referees: unknown[];
  nextOfKin: Record<string, string>;
  photoFile: string | null;
}

export interface PortalSettings {
  minAgeThreshold: number;
  allowExternalInternalJobs: boolean;
  orgName: string;
  sessionTimeoutMinutes: number;
  emailSenderName: string;
  closingSoonDays: number;
  maxApplicationsPerCandidate: number;
  notifTemplates: { shortlist: string; decline: string; interview: string; offer: string };
}

export interface Notification {
  id: number; recipientEmail: string; title: string; message: string;
  read: boolean; type: string; at: string;
}

export interface AuditEntry {
  id: number; at: string; actor: string; role: string; action: string; target?: string;
}

export interface SentEmail {
  id: number; to: string; candidateName: string; subject: string;
  body: string; sentAt: string; trigger: string; jobTitle: string;
}

export interface AnalyticsSummary {
  events: unknown[]; summary: Record<string, number>;
  topJobs: unknown[]; topSearches: unknown[];
  dailyCounts: { date: string; count: number }[];
}

export interface JobCriteria {
  jobId: number; minCgpa?: number; requiredKeywords: string[];
  notes?: string; screeningQuestions?: unknown[]; minExperienceYears?: number;
  requiredQualLevel?: string; disqualifyingUniversities?: string[];
}

export interface PermissionOverride {
  email: string; role: string;
  canViewApplications: boolean; canShortlist: boolean; canScreenInterns: boolean;
  canSendNotifications: boolean; canManageJobs: boolean; canManageCriteria: boolean;
  canViewStaff: boolean; canExport: boolean; canViewAudit: boolean;
  canManageSettings: boolean; canGrantPermissions: boolean;
}

export interface StaffMember {
  id: number; employeeNumber: string; firstName: string; lastName: string;
  department: string | null; jobTitle: string | null; email: string | null; isActive: boolean;
}

export interface UploadResult {
  url: string; publicId: string; format: string; bytes: number;
}
