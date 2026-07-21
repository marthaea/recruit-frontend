import type { CvProfile } from "@/context/AppContext";

export type CompletionItem = { label: string; done: boolean };

const filled = (s?: string) => !!s && s.trim() !== "";

/**
 * Single source of truth for "how complete is this CV" — used by the
 * candidate dashboard's Profile Completion meter AND by the application
 * snapshot's `completion` field on submit, so the two numbers can't drift
 * apart (previously the dashboard computed this live while submissions
 * always hardcoded 100).
 */
export function computeCvChecklist(cv: Partial<CvProfile> | null | undefined, photoUrl?: string): CompletionItem[] {
  return [
    { label: "Personal information", done: !!cv && filled(cv.personal?.dob) && filled(cv.personal?.nin) },
    { label: "Contact details", done: !!cv && filled(cv.personal?.phone) && filled(cv.personal?.address) },
    { label: "Profile photo", done: !!photoUrl || filled(cv?.photoFile) },
    { label: "Education history", done: (cv?.qualifications?.length ?? 0) > 0 },
    { label: "Work experience", done: (cv?.experience?.length ?? 0) > 0 },
    { label: "Skills", done: (cv?.skills?.length ?? 0) > 0 },
    { label: "Referee contacts", done: (cv?.referees ?? []).filter((r) => filled(r?.name)).length >= 2 },
  ];
}

export function computeCvCompletion(cv: Partial<CvProfile> | null | undefined, photoUrl?: string): number {
  const checklist = computeCvChecklist(cv, photoUrl);
  return Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);
}
