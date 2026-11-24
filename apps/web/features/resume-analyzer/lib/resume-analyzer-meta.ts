import { CircleAlert, CircleCheck, CircleDashed, TriangleAlert, type LucideIcon } from "lucide-react";
import {
  RESUME_ANALYZER_LIMITS,
  type ResumeFeedbackArea,
  type ResumeSectionKey,
} from "@placecampus/shared-types";

/** Score bands. Status colour always ships with its label and icon, never alone. */
export interface ScoreBand {
  label: string;
  description: string;
  icon: LucideIcon;
  /** Stroke/fill colour of the meter (HSL token). */
  color: string;
  /** Lighter step of the same hue for the meter track. */
  track: string;
  /** Text + background classes for the status pill. */
  pillClassName: string;
}

export function getScoreBand(score: number): ScoreBand {
  if (score >= 85)
    return {
      label: "Excellent",
      description: "Well optimised for ATS screening.",
      icon: CircleCheck,
      color: "hsl(var(--color-success))",
      track: "hsl(var(--color-success) / 0.14)",
      pillClassName: "bg-[hsl(var(--color-success-light))] text-[hsl(152_60%_28%)]",
    };
  if (score >= 70)
    return {
      label: "Good",
      description: "Likely to parse well, with room to improve.",
      icon: CircleCheck,
      color: "hsl(var(--color-success))",
      track: "hsl(var(--color-success) / 0.14)",
      pillClassName: "bg-[hsl(var(--color-success-light))] text-[hsl(152_60%_28%)]",
    };
  if (score >= 50)
    return {
      label: "Fair",
      description: "Some gaps may cost you shortlists.",
      icon: TriangleAlert,
      color: "hsl(var(--color-warning))",
      track: "hsl(var(--color-warning) / 0.16)",
      pillClassName: "bg-[hsl(var(--color-warning-light))] text-[hsl(32_90%_32%)]",
    };
  return {
    label: "Needs work",
    description: "Address the high-priority items first.",
    icon: CircleAlert,
    color: "hsl(var(--color-error))",
    track: "hsl(var(--color-error) / 0.13)",
    pillClassName: "bg-[hsl(var(--color-error-light))] text-[hsl(0_72%_40%)]",
  };
}

export const PENDING_BAND: Pick<ScoreBand, "label" | "icon"> = { label: "Not analysed", icon: CircleDashed };

export const AREA_LABELS: Record<ResumeFeedbackArea, string> = {
  CONTACT: "Contact details",
  SUMMARY: "Summary",
  EDUCATION: "Education",
  EXPERIENCE: "Experience",
  PROJECTS: "Projects",
  SKILLS: "Skills",
  CERTIFICATIONS: "Certifications",
  ACHIEVEMENTS: "Achievements",
  FORMATTING: "Formatting",
  GENERAL: "Overall",
};

export const SECTION_LABELS: Record<ResumeSectionKey, string> = {
  SUMMARY: "Summary",
  EDUCATION: "Education",
  EXPERIENCE: "Experience",
  PROJECTS: "Projects",
  SKILLS: "Skills",
  CERTIFICATIONS: "Certifications",
  ACHIEVEMENTS: "Achievements",
  ACTIVITIES: "Activities",
};

export const EXTRACTION_LABELS: Record<string, string> = {
  PDF_TEXT: "PDF text",
  OCR: "Scanned PDF (OCR)",
  MIXED: "PDF text + OCR",
  DOCX: "Word document",
};

/* Same rules the API enforces (resume-file.validation.ts). */
const ALLOWED: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

/** Returns an error message, or null when the file can be uploaded. */
export function validateResumeFile(file: File, maxBytes: number = RESUME_ANALYZER_LIMITS.maxFileBytes): string | null {
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const mimes = ALLOWED[ext];
  if (!mimes) return "Upload your resume as a PDF or DOCX file.";
  // Some browsers report an empty type for .docx; the server re-checks the content.
  if (file.type && !mimes.includes(file.type)) return "This file's type doesn't match its extension. Save it again as PDF or DOCX.";
  if (file.size === 0) return "This file is empty.";
  if (file.size > maxBytes) return `This file is ${formatBytes(file.size)}. The limit is ${formatBytes(maxBytes)}.`;
  return null;
}

/** Browsers sometimes send .docx without a type; give the server the right one. */
export function withResumeMime(file: File): File {
  if (file.type) return file;
  const isDocx = file.name.toLowerCase().endsWith(".docx");
  return new File([file], file.name, {
    type: isDocx ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf",
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatAnalysisDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** Short label that stays unambiguous: adds the time when another date in the set falls on the same day. */
export function formatDistinctDate(iso: string, all: string[]): string {
  const day = new Date(iso).toDateString();
  const sameDay = all.filter((other) => new Date(other).toDateString() === day).length > 1;
  return sameDay
    ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
    : formatShortDate(iso);
}
