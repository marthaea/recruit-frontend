export const UGANDAN_UNIVERSITIES = [
  "Makerere University",
  "Kyambogo University",
  "Makerere University Business School (MUBS)",
  "Uganda Christian University (UCU)",
  "Mbarara University of Science & Technology (MUST)",
  "Gulu University",
  "Busitema University",
  "Muni University",
  "Kabale University",
  "Mountains of the Moon University",
  "Islamic University in Uganda (IUIU)",
  "Uganda Martyrs University (UMU)",
  "Nkumba University",
  "Kampala International University (KIU)",
  "Uganda Management Institute (UMI)",
  "Civil Aviation Training College (CATC)",
  "Uganda Technical College",
  "St. Lawrence University",
];

export const COMMON_COURSES = [
  "Bachelor of Science in Aeronautical Engineering",
  "Bachelor of Science in Aviation Management",
  "Air Traffic Control (ATC) Programme",
  "Diploma in Aviation Studies",
  "Bachelor of Science in Electrical Engineering",
  "Bachelor of Science in Civil Engineering",
  "Bachelor of Science in Mechanical Engineering",
  "Bachelor of Science in Computer Engineering",
  "Bachelor of Science in Computer Science",
  "Bachelor of Science in Information Technology",
  "Bachelor of Science in Software Engineering",
  "Bachelor of Commerce",
  "Bachelor of Business Administration (BBA)",
  "Bachelor of Science in Accounting & Finance",
  "Bachelor of Laws (LLB)",
  "Master of Laws (LLM)",
  "Bachelor of Science",
  "Master of Science",
  "Bachelor of Arts",
  "Master of Arts",
  "Master of Business Administration (MBA)",
  "Master of Public Administration (MPA)",
  "Postgraduate Diploma in Management",
  "Certificate in Aviation Security",
  "Certificate in Air Navigation Services",
  "Diploma in Information Technology",
  "Diploma in Business Studies",
];

export const O_LEVEL_SUBJECTS = [
  "English Language", "Mathematics", "Physics", "Chemistry", "Biology",
  "Geography", "History", "Christian Religious Education", "Islamic Religious Education",
  "Literature in English", "Luganda", "Kiswahili", "Commerce", "Entrepreneurship",
  "Agriculture", "Fine Art", "Computer Studies", "Technical Drawing", "Foods & Nutrition",
];
export const A_LEVEL_SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "Economics",
  "Geography", "History", "Literature", "Entrepreneurship", "Computer Studies",
  "Christian Religious Education", "Islamic Religious Education", "General Paper", "ICT", "Subsidiary Math",
];
export const O_LEVEL_GRADES = ["D1", "D2", "C3", "C4", "C5", "C6", "P7", "P8", "F9"];
export const A_LEVEL_GRADES = ["A", "B", "C", "D", "E", "O", "F"];
export const QUAL_LEVELS = ["O-Level", "A-Level", "Certificate", "Diploma", "Degree", "Masters", "PhD"] as const;
export const SALARY_BANDS = ["UG1", "UG2", "UG3", "UG4", "UG5", "UG6", "UG7"];
export const EMPLOYMENT_TYPES = ["Full-time", "Contract", "Fixed Term Contract"] as const;
export const DEPARTMENTS = [
  { key: "atm", label: "Air Traffic Mgmt" },
  { key: "safety", label: "Aviation Safety" },
  { key: "ict", label: "ICT & Systems" },
  { key: "finance", label: "Finance & Admin" },
  { key: "legal", label: "Legal" },
  { key: "ops", label: "Operations" },
  { key: "hr", label: "Human Resources" },
];

export const LOCATIONS = [
  "Entebbe International Airport",
  "CAA Head Office — Entebbe",
  "Kampala HQ",
  "Gulu Aerodrome",
  "Jinja Aerodrome",
  "Mbarara Aerodrome",
  "Fort Portal (Kasese) Aerodrome",
  "Arua Aerodrome",
  "Soroti Aerodrome",
  "Kidepo Aerodrome",
];

// ─── Structured requirement builder metadata ───────────────────────────────────
// One entry per RequirementKind (see AppContext.tsx), describing how the
// requirement-builder UI should collect its value and phrase the auto-generated
// candidate-facing label/question.
export type RequirementValueType = "number" | "text" | "grade" | "subjectGrade" | "none";
export const REQUIREMENT_KIND_META: Record<string, { label: string; valueType: RequirementValueType; unit?: string }> = {
  minAge:             { label: "Minimum age",             valueType: "number", unit: "years" },
  maxAge:              { label: "Maximum age",             valueType: "number", unit: "years" },
  flyingHours:         { label: "Minimum flying hours",    valueType: "number", unit: "hours" },
  experienceYears:     { label: "Minimum years of experience", valueType: "number", unit: "years" },
  sex:                 { label: "Sex",                     valueType: "text" },
  qualificationLevel:  { label: "Qualification level",     valueType: "grade" },
  specificDegree:      { label: "Specific degree (free text)", valueType: "text" },
  oLevelSubject:       { label: "O-Level subject & grade",  valueType: "subjectGrade" },
  aLevelSubject:       { label: "A-Level subject & grade",  valueType: "subjectGrade" },
  custom:              { label: "Custom requirement",      valueType: "text" },
};