// ============================================
// PlaceCampus — Shared Types
// ============================================
// This package contains type definitions shared
// between the frontend (web) and backend (api).
// Add domain types here as the project grows.
// ============================================

/** Common API response envelope */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

/** Pagination metadata */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Paginated API response */
export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

/** User roles — will expand as RBAC modules are built */
export const UserRole = {
  STUDENT: 'student',
  FACULTY: 'faculty',
  PLACEMENT_OFFICER: 'placement_officer',
  PLACEMENT_HEAD: 'placement_head',
  RECRUITER: 'recruiter',
  ADMIN: 'admin',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

/** Minimal user reference — expand when auth module is built */
export interface UserReference {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date;
}

/** Student Profile fields */
export interface StudentProfile {
  id: string;
  userId: string;
  phone?: string;
  bio?: string;
  university?: string;
  department?: string;
  program?: string;
  batch?: string;
  graduationYear?: number;
  cgpa?: number;
  backlogs?: number;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  resumeUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Payload to update student profile */
export interface UpdateStudentProfileDto {
  phone?: string;
  bio?: string;
  university?: string;
  department?: string;
  program?: string;
  batch?: string;
  graduationYear?: number;
  cgpa?: number;
  backlogs?: number;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
}

/** Evidence Types */
export const EvidenceType = {
  CERTIFICATION: 'CERTIFICATION',
  PROJECT: 'PROJECT',
  INTERNSHIP: 'INTERNSHIP',
  HACKATHON: 'HACKATHON',
  ACADEMIC: 'ACADEMIC',
  CODING_PROFILE: 'CODING_PROFILE',
  ACHIEVEMENT: 'ACHIEVEMENT',
  OTHER: 'OTHER',
} as const;

export type EvidenceType = typeof EvidenceType[keyof typeof EvidenceType];

/** Evidence Statuses */
export const EvidenceStatus = {
  UNVERIFIED: 'UNVERIFIED',
  PROCESSING: 'PROCESSING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  RESUBMISSION_REQUESTED: 'RESUBMISSION_REQUESTED',
} as const;

export type EvidenceStatus = typeof EvidenceStatus[keyof typeof EvidenceStatus];

/** Evidence Document Metadata */
export interface EvidenceDocument {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  url?: string; // Accessible URL path if available
}

/** Core Evidence Item */
export interface EvidenceItem {
  id: string;
  studentId: string;
  title: string;
  description?: string;
  type: EvidenceType;
  status: EvidenceStatus;
  issuer?: string;
  issuedDate?: string;
  externalUrl?: string;
  document?: EvidenceDocument;
  rejectionReason?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Payload to create evidence */
export interface CreateEvidenceDto {
  title: string;
  description?: string;
  type: EvidenceType;
  issuer?: string;
  issuedDate?: string;
  externalUrl?: string;
}

export interface UpdateEvidenceDto {
  title?: string;
  description?: string;
  type?: EvidenceType;
  issuer?: string;
  issuedDate?: string;
  externalUrl?: string;
}

/** Verification Record */
export interface VerificationRecord {
  id: string;
  evidenceId: string;
  studentId: string;
  attemptNumber: number;
  extractionMethod?: 'PDF_TEXT' | 'IMAGE_OCR' | 'NONE';
  extractedTextMetadata?: {
    wordCount: number;
    hasText: boolean;
  };
  aiProvider?: string;
  modelVersion?: string;
  aiResult?: any;
  ruleResults?: any;
  finalDecision: EvidenceStatus;
  reasons: string[];
  createdAt: string;
  processingDurationMs?: number;
  errorInformation?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewerComments?: string;
}

/** 
 * SKILL TAXONOMY 
 */
export interface SkillCluster {
  id: string;
  name: string;
  description?: string;
}

export interface Skill {
  id: string;
  name: string;
  normalizedName: string;
  description?: string;
  clusterId?: string;
  active: boolean;
  synonyms: string[];
}

export interface SkillEquivalence {
  id: string;
  skillId1: string;
  skillId2: string;
  relationshipType: 'EXACT_ALIAS' | 'EQUIVALENT' | 'RELATED';
  active: boolean;
}

export interface SkillRoleMapping {
  id: string;
  roleName: string;
  skillId: string;
  recommendedLevel: number;
  importance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  active: boolean;
}

export interface SkillClaim {
  id: string;
  studentId: string;
  evidenceId: string;
  verificationRecordId?: string;
  rawClaim: string;
  canonicalSkillId?: string;
  status: 'UNRESOLVED' | 'NORMALIZED' | 'VERIFIED' | 'REJECTED';
  level: number;
  source: string;
  verifiedAt?: string;
}

export interface StudentSkillEntry {
  skillId: string;
  canonicalName: string;
  level: number;
  verificationStatus: 'VERIFIED' | 'UNVERIFIED';
  sourceEvidenceIds: string[];
  lastVerifiedAt: string;
}

export interface StudentSkillProfile {
  id: string;
  studentId: string;
  skills: StudentSkillEntry[];
  updatedAt: string;
}

/** 
 * ASSESSMENTS 
 */
export const AssessmentType = {
  MCQ: 'MCQ',
  CODING: 'CODING',
  SUBJECTIVE: 'SUBJECTIVE',
} as const;
export type AssessmentType = typeof AssessmentType[keyof typeof AssessmentType];

export const AssessmentAttemptStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  EVALUATED: 'EVALUATED',
} as const;
export type AssessmentAttemptStatus = typeof AssessmentAttemptStatus[keyof typeof AssessmentAttemptStatus];

export interface AssessmentQuestion {
  id: string;
  questionText: string;
  type: AssessmentType;
  options?: string[];
  correctAnswer?: string;
  difficulty: number;
  skillId?: string;
  explanation?: string;
  active: boolean;
}

export interface Assessment {
  id: string;
  title: string;
  description?: string;
  type: AssessmentType;
  targetSkillId?: string;
  durationMinutes: number;
  passingScore: number;
  difficulty: number;
  active: boolean;
  questions: AssessmentQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentAttempt {
  id: string;
  assessmentId: string;
  studentId: string;
  status: AssessmentAttemptStatus;
  startedAt?: string;
  submittedAt?: string;
  answers: Record<string, string>; // questionId -> answer
  score?: number;
  percentage?: number;
  passed?: boolean;
  durationSeconds?: number;
  createdAt: string;
  updatedAt: string;
}

/** 
 * MOCK INTERVIEWS 
 */
export const MockInterviewStatus = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
} as const;
export type MockInterviewStatus = typeof MockInterviewStatus[keyof typeof MockInterviewStatus];

export interface InterviewRubric {
  technicalKnowledge?: number;
  problemSolving?: number;
  communication?: number;
  projectDepth?: number;
}

export interface MockInterview {
  id: string;
  studentId: string;
  interviewerId?: string;
  type: string;
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  status: MockInterviewStatus;
  notes?: string;
  rubricScores?: InterviewRubric;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
}

/** 
 * READINESS 
 */

export const ReadinessStatus = {
  READY: 'READY',
  DEVELOPING: 'DEVELOPING',
  NEEDS_PREPARATION: 'NEEDS_PREPARATION',
} as const;
export type ReadinessStatus = typeof ReadinessStatus[keyof typeof ReadinessStatus];

export interface ReadinessFactor {
  key: string;
  score: number;
  weight: number;
  contribution: number;
  coverage: boolean;
}

export interface ReadinessExplanation {
  factors: ReadinessFactor[];
  strengths: string[];
  areasToImprove: string[];
}

export interface ReadinessSnapshot {
  id: string;
  studentId: string;
  overallScore: number;
  status: ReadinessStatus;
  verifiedSkillsScore: number;
  assessmentsScore: number;
  academicsScore: number;
  projectsScore: number;
  interviewsScore: number;
  factorWeights: Record<string, number>;
  explanation: ReadinessExplanation;
  coverageCount: number;
  calculatedAt: string;
  version: number;
}

/** 
 * PLACEMENT DRIVES 
 */
export const DriveStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const;
export type DriveStatus = typeof DriveStatus[keyof typeof DriveStatus];

export interface DriveSkillRequirement {
  skillId: string;
  skillName?: string; // Included for convenience on the frontend
  minimumLevel: number;
  isOptional: boolean;
}

export interface DriveRequirement {
  minimumCGPA?: number;
  maximumBacklogs?: number;
  graduationYear?: number;
  allowedDepartments?: string[];
  skills: DriveSkillRequirement[];
}

export interface PlacementDrive {
  id: string;
  companyName: string;
  roleTitle: string;
  description: string;
  location?: string;
  workMode?: string;
  package?: string;
  applicationStart?: string;
  applicationDeadline?: string;
  driveDate?: string;
  status: DriveStatus;
  requirements: DriveRequirement;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlacementDriveDto {
  companyName: string;
  roleTitle: string;
  description: string;
  location?: string;
  workMode?: string;
  package?: string;
  applicationStart?: string;
  applicationDeadline?: string;
  driveDate?: string;
  requirements: DriveRequirement;
}

export interface UpdatePlacementDriveDto extends Partial<CreatePlacementDriveDto> {}

/** 
 * ELIGIBILITY 
 */

export const EligibilityCheckStatus = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  MISSING_DATA: 'MISSING_DATA',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
} as const;
export type EligibilityCheckStatus = typeof EligibilityCheckStatus[keyof typeof EligibilityCheckStatus];

export interface EligibilityCheckResult {
  type: 'CGPA' | 'BACKLOGS' | 'GRADUATION_YEAR' | 'DEPARTMENT' | 'SKILL';
  requirement?: string | number | string[];
  actual?: string | number;
  result: EligibilityCheckStatus;
  reason?: string;
  skill?: string;
  requiredLevel?: number;
  actualLevel?: number;
}

export interface EligibilityResult {
  eligible: boolean;
  checks: EligibilityCheckResult[];
  calculatedAt: string;
}

/** 
 * SKILL MATCHING 
 */

export const SkillMatchStatus = {
  SATISFIED: 'SATISFIED',
  GAP: 'GAP',
  MISSING: 'MISSING',
  OPTIONAL_GAP: 'OPTIONAL_GAP',
  OPTIONAL_MISSING: 'OPTIONAL_MISSING',
  NOT_EVALUABLE: 'NOT_EVALUABLE',
} as const;
export type SkillMatchStatus = typeof SkillMatchStatus[keyof typeof SkillMatchStatus];

export const GapPriority = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;
export type GapPriority = typeof GapPriority[keyof typeof GapPriority];

export interface SkillMatchItem {
  skillId: string;
  skillName: string;
  requiredLevel: number;
  studentLevel?: number;
  isOptional: boolean;
  status: SkillMatchStatus;
  gapLevel: number;
  priority?: GapPriority;
  explanation: string;
}

export interface SkillMatchResult {
  driveId: string;
  studentId: string;
  requiredSkillCoverage: number; // percentage
  satisfiedCount: number;
  gapCount: number;
  missingCount: number;
  optionalGapCount: number;
  skills: SkillMatchItem[];
  calculatedAt: string;
}

/** 
 * APPLICATIONS 
 */

export const ApplicationStatus = {
  APPLIED: 'APPLIED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  SHORTLISTED: 'SHORTLISTED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
} as const;
export type ApplicationStatus = typeof ApplicationStatus[keyof typeof ApplicationStatus];

export interface Application {
  id: string;
  driveId: string;
  studentId: string;
  status: ApplicationStatus;
  appliedAt: string;
  updatedAt: string;
  eligibilitySnapshot: EligibilityResult;
  matchSnapshot: SkillMatchResult;
  readinessSnapshot: any; // Using any for snapshot flexibility, or we can use ReadinessSnapshot if imported
  reviewedBy?: string;
  reviewedAt?: string;
  reviewerComment?: string;
  rejectionReason?: string;
}

export interface CreateApplicationDto {}

export interface ReviewApplicationDto {
  status: 'UNDER_REVIEW' | 'SHORTLISTED' | 'REJECTED';
  reviewerComment?: string;
  rejectionReason?: string;
}

export const GrantStatus = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
} as const;
export type GrantStatus = typeof GrantStatus[keyof typeof GrantStatus];

export interface RecruiterAccessGrant {
  id: string;
  recruiterId: string;
  driveId: string;
  grantedBy: string;
  grantedAt: string;
  expiresAt: string;
  status: GrantStatus;
  releasedFields: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecruiterAccessGrantDto {
  recruiterId: string;
  expiresAt: string;
  releasedFields: string[];
}

export interface ExtendAccessGrantDto {
  expiresAt: string;
}

/**
 * PERSONALIZED PREPARATION
 */

export const PreparationPlanStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type PreparationPlanStatus =
  (typeof PreparationPlanStatus)[keyof typeof PreparationPlanStatus];

export const PreparationItemStatus = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  SKIPPED: 'SKIPPED',
} as const;
export type PreparationItemStatus =
  (typeof PreparationItemStatus)[keyof typeof PreparationItemStatus];

export interface PreparationAssessmentCheckpoint {
  assessmentId: string;
  title: string;
}

export interface PreparationItem {
  itemId: string;
  skillId: string;
  skillName: string;
  currentLevel: number;
  requiredLevel: number;
  gapAmount: number;
  priority: GapPriority;
  isOptional: boolean;
  explanation: string;
  status: PreparationItemStatus;
  recommendedActions: string[];
  assessmentCheckpoint?: PreparationAssessmentCheckpoint;
  completedAt?: string;
}

export interface PreparationPlan {
  id: string;
  studentId: string;
  driveId: string;
  source: string;
  status: PreparationPlanStatus;
  items: PreparationItem[];
  completionPercentage: number;
  previousPlanId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * INSTITUTIONAL ANALYTICS
 */

export interface AnalyticsFilters {
  from?: string;
  to?: string;
  department?: string;
  graduationYear?: number;
  driveId?: string;
}

export interface AnalyticsOverview {
  definitions: Record<string, string>;
  students: {
    registered: number;
    usableProfiles: number;
    withReadinessSnapshots: number;
  };
  readiness: {
    average: number | null;
    byStatus: Record<string, number>;
  };
  drives: { published: number };
  applicationsByStatus: Record<string, number>;
  evidenceByStatus: Record<string, number>;
  activePreparationPlans: number;
}

export interface AnalyticsReadiness {
  filters: AnalyticsFilters;
  studentsWithSnapshots: number;
  mean: number | null;
  median: number | null;
  byStatus: Array<{ status: string; count: number }>;
  byDepartment: Array<{ department: string; count: number; average: number }>;
  byGraduationYear: Array<{ graduationYear: number | string; count: number; average: number }>;
  factorBreakdown: Array<{ key: string; averageScore: number; averageContribution: number; coverageCount: number }>;
  coverage: { averageFactorsPresent: number; studentsMissingFactors: number };
  limitations: string[];
}

export interface AnalyticsSkillRow {
  skillId: string;
  skillName: string;
  driveCount: number;
  requiredDemand: number;
  optionalDemand: number;
  averageRequiredLevel: number;
  verifiedStudents: number;
  studentsMeetingRequiredLevel: number;
  supplyGap: number;
}

export interface AnalyticsSkills {
  filters: AnalyticsFilters;
  scope: string;
  skills: AnalyticsSkillRow[];
  limitations: string[];
}

export interface AnalyticsPlacements {
  filters: AnalyticsFilters;
  byStatus: Array<{ status: string; count: number }>;
  byDrive: Array<{ driveId: string; count: number; statuses: Record<string, number> }>;
  byDepartment: Array<{ department: string; count: number }>;
  activity: Array<{ date: string; count: number }>;
  conversion: { appliedToUnderReview: number | null; underReviewToShortlisted: number | null };
  limitations: string[];
}

export interface AnalyticsEvidence {
  filters: AnalyticsFilters;
  total: number;
  verified: number;
  verifiedPercentage: number | null;
  byStatus: Array<{ status: string; count: number }>;
  byType: Array<{ type: string; statuses: Record<string, number> }>;
  limitations: string[];
}

export interface AnalyticsPreparation {
  filters: AnalyticsFilters;
  byStatus: Array<{ status: string; count: number }>;
  averageCompletionPercentage: number | null;
  completionByDepartment: Array<{ department: string; plans: number; averageCompletionPercentage: number }>;
  commonGaps: Array<{ skillId: string; skillName: string; count: number }>;
  observedReadinessChange: { available: boolean; sampleSize: number; averageChange: number | null; explanation: string };
  limitations: string[];
}

/**
 * IN-APP NOTIFICATIONS
 */
export const NotificationType = {
  EVIDENCE_VERIFIED: 'EVIDENCE_VERIFIED',
  EVIDENCE_REJECTED: 'EVIDENCE_REJECTED',
  EVIDENCE_RESUBMISSION_REQUESTED: 'EVIDENCE_RESUBMISSION_REQUESTED',
  ASSESSMENT_EVALUATED: 'ASSESSMENT_EVALUATED',
  INTERVIEW_FEEDBACK: 'INTERVIEW_FEEDBACK',
  APPLICATION_SUBMITTED: 'APPLICATION_SUBMITTED',
  APPLICATION_STATUS_CHANGED: 'APPLICATION_STATUS_CHANGED',
  PREPARATION_PLAN_CREATED: 'PREPARATION_PLAN_CREATED',
  PREPARATION_PLAN_COMPLETED: 'PREPARATION_PLAN_COMPLETED',
} as const;
export type NotificationType = typeof NotificationType[keyof typeof NotificationType];

export interface NotificationItem {
  id: string;
  recipientId?: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl: string;
  entityType: string;
  entityId: string;
  readAt?: string;
  createdAt: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface NotificationUnreadCountResponse {
  count: number;
}
