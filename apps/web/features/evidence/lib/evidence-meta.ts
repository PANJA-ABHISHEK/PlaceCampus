import {
  Award,
  BriefcaseBusiness,
  Clock,
  Code2,
  FileText,
  FolderGit2,
  GraduationCap,
  LoaderCircle,
  ShieldCheck,
  Trophy,
  TriangleAlert,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import {
  EvidenceItem,
  EvidenceStatus,
  EvidenceType,
} from "@placecampus/shared-types";

/* ---------------------------------------------------------------------------
 * Status groups
 * Pending      = waiting on the system or faculty (nothing for the student to do)
 * Needs action = the student must update or resubmit
 * ------------------------------------------------------------------------- */

export type StatusGroup = "VERIFIED" | "PENDING" | "NEEDS_ACTION";

export const STATUS_GROUPS: Record<StatusGroup, EvidenceStatus[]> = {
  VERIFIED: [EvidenceStatus.VERIFIED],
  PENDING: [
    EvidenceStatus.UNVERIFIED,
    EvidenceStatus.PROCESSING,
    EvidenceStatus.NEEDS_REVIEW,
  ],
  NEEDS_ACTION: [
    EvidenceStatus.REJECTED,
    EvidenceStatus.RESUBMISSION_REQUESTED,
  ],
};

export function getStatusGroup(status: EvidenceStatus): StatusGroup {
  if (STATUS_GROUPS.VERIFIED.includes(status)) return "VERIFIED";
  if (STATUS_GROUPS.NEEDS_ACTION.includes(status)) return "NEEDS_ACTION";
  return "PENDING";
}

const GROUP_STYLES: Record<StatusGroup, string> = {
  VERIFIED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  NEEDS_ACTION: "bg-red-50 text-red-700 ring-red-200",
};

export function getStatusBadge(status: EvidenceStatus): {
  label: string;
  icon: LucideIcon;
  className: string;
  spin?: boolean;
  description: string;
} {
  const className = GROUP_STYLES[getStatusGroup(status)];
  switch (status) {
    case EvidenceStatus.VERIFIED:
      return {
        label: "Verified",
        icon: ShieldCheck,
        className,
        description:
          "Verified and added to your skill profile.",
      };
    case EvidenceStatus.PROCESSING:
      return {
        label: "Verifying",
        icon: LoaderCircle,
        spin: true,
        className,
        description: "Your document is being checked automatically.",
      };
    case EvidenceStatus.NEEDS_REVIEW:
      return {
        label: "In Review",
        icon: Clock,
        className,
        description: "Waiting for a faculty member to review this evidence.",
      };
    case EvidenceStatus.REJECTED:
      return {
        label: "Rejected",
        icon: TriangleAlert,
        className,
        description:
          "This evidence was rejected. Review the feedback, update it and resubmit.",
      };
    case EvidenceStatus.RESUBMISSION_REQUESTED:
      return {
        label: "Update Required",
        icon: TriangleAlert,
        className,
        description:
          "Faculty asked for changes. Update this evidence based on the feedback.",
      };
    case EvidenceStatus.UNVERIFIED:
    default:
      return {
        label: "Pending",
        icon: Clock,
        className,
        description: "Submitted and awaiting verification.",
      };
  }
}

/** Mirrors the API rule: verified or processing evidence is locked. */
export function canModifyEvidence(status: EvidenceStatus) {
  return (
    status !== EvidenceStatus.VERIFIED && status !== EvidenceStatus.PROCESSING
  );
}

/* ---------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------- */

export const TYPE_META: Record<
  EvidenceType,
  { label: string; plural: string; icon: LucideIcon; hint: string }
> = {
  CERTIFICATION: {
    label: "Certification",
    plural: "Certifications",
    icon: Award,
    hint: "Courses and professional certificates",
  },
  PROJECT: {
    label: "Project",
    plural: "Projects",
    icon: FolderGit2,
    hint: "Academic or personal builds",
  },
  INTERNSHIP: {
    label: "Internship",
    plural: "Internships",
    icon: BriefcaseBusiness,
    hint: "Work experience and offer letters",
  },
  ACHIEVEMENT: {
    label: "Achievement",
    plural: "Achievements",
    icon: Trophy,
    hint: "Awards, ranks and recognitions",
  },
  HACKATHON: {
    label: "Hackathon",
    plural: "Hackathons",
    icon: Zap,
    hint: "Hackathons and coding contests",
  },
  ACADEMIC: {
    label: "Academic",
    plural: "Academic",
    icon: GraduationCap,
    hint: "Transcripts and academic records",
  },
  CODING_PROFILE: {
    label: "Coding Profile",
    plural: "Coding Profiles",
    icon: Code2,
    hint: "LeetCode, Codeforces and similar",
  },
  OTHER: {
    label: "Other",
    plural: "Other",
    icon: FileText,
    hint: "Anything else that shows your skills",
  },
};

/** Types shown as category tabs on the evidence page. */
export const CATEGORY_TYPES: EvidenceType[] = [
  EvidenceType.CERTIFICATION,
  EvidenceType.PROJECT,
  EvidenceType.INTERNSHIP,
  EvidenceType.ACHIEVEMENT,
  EvidenceType.HACKATHON,
];

/* ---------------------------------------------------------------------------
 * Portfolio strength
 * One point for each recommended evidence type the student has submitted and
 * that has not been rejected. Score = covered / recommended.
 * ------------------------------------------------------------------------- */

export const RECOMMENDED_TYPES = CATEGORY_TYPES;

export function getPortfolioStrength(evidence: EvidenceItem[]) {
  const covered = RECOMMENDED_TYPES.filter((type) =>
    evidence.some(
      (item) =>
        item.type === type && item.status !== EvidenceStatus.REJECTED,
    ),
  );
  const missing = RECOMMENDED_TYPES.filter((type) => !covered.includes(type));
  return {
    covered: covered.length,
    total: RECOMMENDED_TYPES.length,
    percentage: Math.round((covered.length / RECOMMENDED_TYPES.length) * 100),
    missing,
  };
}

/* ---------------------------------------------------------------------------
 * Dates
 * ------------------------------------------------------------------------- */

/** Parses date-only strings ("2026-04-01") as local dates, not UTC. */
export function formatEvidenceDate(value: string | undefined, pattern: string) {
  if (!value) return null;
  const date = parseISO(value);
  return isValid(date) ? format(date, pattern) : null;
}
