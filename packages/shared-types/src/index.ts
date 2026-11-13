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
  /** The role the current session acts as. */
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date;
  /** Every role assignment the user holds (from `/auth/me`). */
  roles?: UserRole[];
  activeRole?: UserRole | null;
  /** True until a multi-role user picks an active role. */
  requiresRoleSelection?: boolean;
  /** Staff designation and department (faculty and other staff). */
  designation?: string;
  department?: string;
}

/** Response of `POST /auth/login` and `POST /recruiter/auth/login`. */
export interface LoginResponse {
  message: string;
  accessToken: string;
  user: UserReference;
  roles: UserRole[];
  activeRole: UserRole | null;
  requiresRoleSelection: boolean;
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
  leetcodeUrl?: string;
  otherUrl?: string;
  resumeUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Payload to update student profile. `null` clears a field. */
export interface UpdateStudentProfileDto {
  phone?: string | null;
  bio?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  leetcodeUrl?: string | null;
  otherUrl?: string | null;
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
  /** Faculty member this item is routed to for review. */
  reviewerId?: string;
  reviewAssignedAt?: string;
  /** Review service level: 3 working days from assignment. */
  reviewDueAt?: string;
  reviewClaimedBy?: string;
  /** Renewable 30-minute soft lock while a reviewer works on the item. */
  reviewLockExpiresAt?: string;
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
  /** `null` clears the link. */
  externalUrl?: string | null;
}

/** Text extraction (Master Plan §12): PDF text layer, OCR, or both. */
export type ExtractionMethod = 'PDF_TEXT' | 'OCR' | 'MIXED' | 'NONE';
export type ExtractionStatus = 'COMPLETED' | 'PARTIAL' | 'FAILED';

/** Reviewer view of one extraction run, including the extracted text. */
export interface EvidenceExtractionSummary {
  id: string;
  version: number;
  method: ExtractionMethod;
  status: ExtractionStatus;
  text: string;
  textTruncated: boolean;
  charCount: number;
  wordCount: number;
  ocrConfidence: number | null;
  pageCount: number;
  pages: { page: number; source: 'TEXT_LAYER' | 'OCR' | 'NONE'; chars: number; ocrConfidence?: number; error?: string }[];
  durationMs?: number;
  error?: string;
}

/** AI document analysis (Master Plan §12.6). Advisory only; reviewer-facing. */
export type AiAnalysisStatus = 'SUCCEEDED' | 'INVALID_OUTPUT' | 'REFUSED' | 'FAILED' | 'DISABLED';

export interface DocumentAnalysisResult {
  documentType: 'CERTIFICATE' | 'INTERNSHIP_LETTER' | 'MARKSHEET' | 'PROJECT_REPORT' | 'ACHIEVEMENT' | 'CODING_PROFILE' | 'OTHER' | 'UNREADABLE';
  documentTypeConfidence: number;
  readability: 'GOOD' | 'FAIR' | 'POOR';
  extracted: Record<string, string | null>;
  fieldEvidence: { field: string; quote: string; page: number | null }[];
  skillMentions: {
    text: string;
    suggestedSkillId: string | null;
    matchType: 'EXACT' | 'SYNONYM' | 'INFERRED';
    relevance: number;
    suggestedLevelCap: number | null;
    rationale: string;
  }[];
  consistencyFlags: { code: string; detail: string }[];
  summary: string;
  uncertainty: string[];
}

export interface AiAnalysisSummary {
  id: string;
  version: number;
  provider: 'groq' | 'openai' | 'none';
  model?: string;
  promptVersion: string;
  status: AiAnalysisStatus;
  result: DocumentAnalysisResult | null;
  postValidation: { droppedSkillIds: string[]; unconfirmedFields: string[]; invalidDates: string[] };
  latencyMs?: number;
  skippedReason?: string;
  createdAt?: string;
}

/** Verification Record */
export interface VerificationRecord {
  id: string;
  evidenceId: string;
  studentId: string;
  attemptNumber: number;
  /** IMAGE_OCR is the legacy value for image OCR before PDF page OCR existed. */
  extractionMethod?: ExtractionMethod | 'IMAGE_OCR';
  extractionStatus?: ExtractionStatus;
  extractedTextMetadata?: {
    wordCount: number;
    hasText: boolean;
    charCount?: number;
    pageCount?: number;
    /** 0-100; null when OCR did not run. */
    ocrConfidence?: number | null;
  };
  /** Reviewer-only: other evidence with the same file or text. */
  duplicateMatches?: { evidenceId: string; matchType: 'FILE' | 'TEXT'; sameStudent: boolean }[];
  aiProvider?: string;
  modelVersion?: string;
  aiStatus?: AiAnalysisStatus;
  /** Student view only: neutral one-paragraph AI summary. */
  aiSummary?: string | null;
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
  /** Evidence types (CERTIFICATION, PROJECT, …) behind this skill. */
  sourceTypes?: string[];
  lastVerifiedAt?: string;
}

export interface StudentSkillProfile {
  id: string;
  studentId: string;
  skills: StudentSkillEntry[];
  /** Distinct evidence types that contributed verified skills. */
  evidenceTypes?: string[];
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
  /** Populated summary, included in attempt history responses. */
  assessment?: {
    id: string;
    title: string;
    type: AssessmentType;
    difficulty: number;
  } | null;
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

/** Rubric scores on a 0–10 scale (used by readiness). */
export interface InterviewRubric {
  technicalKnowledge?: number;
  problemSolving?: number;
  communication?: number;
  projectDepth?: number;
  conceptualUnderstanding?: number;
  confidence?: number;
}

/** Interview formats faculty can offer. */
export const INTERVIEW_TYPES = [
  'Technical',
  'HR',
  'DSA',
  'Project Discussion',
  'Behavioral',
  'System Design',
] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

/** Types offered when faculty schedule an interview directly. */
export const SCHEDULABLE_INTERVIEW_TYPES = [
  'Technical',
  'HR',
  'DSA',
  'Project Discussion',
  'Behavioral',
] as const satisfies readonly InterviewType[];

export const INTERVIEW_DURATIONS = [15, 30, 45, 60] as const;

export const INTERVIEW_QUESTION_CATEGORIES = [
  'DSA',
  'Data Structures',
  'Algorithms',
  'DBMS',
  'Operating Systems',
  'Computer Networks',
  'OOP',
  'Java',
  'React',
  'Node.js',
  'Projects',
  'HR and Behavioral',
] as const;
export type InterviewQuestionCategory = (typeof INTERVIEW_QUESTION_CATEGORIES)[number];

/** A question attached to one interview. `feedback` is only returned to the faculty member. */
export interface InterviewQuestion {
  id: string;
  text: string;
  category: InterviewQuestionCategory;
  asked: boolean;
  askedAt?: string;
  feedback?: string;
}

export interface InterviewQuestionInput {
  text: string;
  category: InterviewQuestionCategory;
}

export interface QuestionBankEntry {
  text: string;
  category: InterviewQuestionCategory;
}

export const INTERVIEW_ASSESSMENTS = ['EXCELLENT', 'GOOD', 'AVERAGE', 'NEEDS_IMPROVEMENT'] as const;
export type InterviewAssessment = (typeof INTERVIEW_ASSESSMENTS)[number];

/** The five 1–5 criteria of a post-interview evaluation. */
export const EVALUATION_CRITERIA = [
  'technicalKnowledge',
  'problemSolving',
  'communication',
  'conceptualUnderstanding',
  'confidence',
] as const;
export type EvaluationCriterion = (typeof EVALUATION_CRITERIA)[number];

export interface EvaluateInterviewDto {
  technicalKnowledge: number;
  problemSolving: number;
  communication: number;
  conceptualUnderstanding: number;
  confidence: number;
  strengths: string;
  improvements: string;
  facultyComments?: string;
  recommendedTopics?: string[];
  assessment: InterviewAssessment;
}

/** Structured evaluation saved when the faculty member scores an interview. */
export interface InterviewFeedback extends EvaluateInterviewDto {
  id: string;
  interviewId: string;
  facultyId: string;
  studentId: string;
  /** Mean of the five criteria (1–5), rounded to one decimal place on the server. */
  overallScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleInterviewDto {
  studentId: string;
  title: string;
  type: InterviewType;
  scheduledAt: string;
  durationMinutes: number;
  instructions?: string;
  questions?: InterviewQuestionInput[];
}

export interface RescheduleInterviewDto {
  scheduledAt: string;
  durationMinutes?: number;
  reason?: string;
}

export interface FacultyInterviewSummary {
  total: number;
  upcoming: number;
  inProgress: number;
  completed: number;
  pendingEvaluations: number;
}

/** ICE servers for the in-app interview room; TURN credentials are short-lived. */
export interface RtcConfigResponse {
  iceServers: { urls: string | string[]; username?: string; credential?: string }[];
  /** When the TURN credentials stop working (ISO time), if TURN is configured. */
  expiresAt?: string;
}

/* ---- Interview room signaling (Socket.IO namespace `/interviews`) ---- */

export type InterviewRoomRole = 'FACULTY' | 'STUDENT';

export interface RoomParticipantInfo {
  userId: string;
  role: InterviewRoomRole;
  fullName: string;
}

export interface RoomMediaState {
  audio: boolean;
  video: boolean;
  screen: boolean;
}

/** Sent to a client after `interview:join` succeeds, and whenever the room changes. */
export interface RoomState {
  interviewId: string;
  you: RoomParticipantInfo;
  /** The other participant, when connected. */
  peer: (RoomParticipantInfo & { media: RoomMediaState; waiting: boolean }) | null;
  /** True once the faculty member has admitted the student into the call. */
  admitted: boolean;
  status: MockInterviewStatus;
  startedAt?: string;
}

export interface RoomChatMessage {
  id: string;
  fromUserId: string;
  fromName: string;
  role: InterviewRoomRole;
  text: string;
  sentAt: string;
}

/** Public summary of a user attached to an interview or slot. */
export interface InterviewParticipant {
  id: string;
  fullName: string;
  email?: string;
}

export interface MockInterview {
  id: string;
  studentId: string;
  interviewerId?: string;
  type: string;
  scheduledAt: string;
  durationMinutes?: number;
  meetingUrl?: string;
  slotId?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelledBy?: 'STUDENT' | 'FACULTY';
  cancellationReason?: string;
  status: MockInterviewStatus;
  notes?: string;
  rubricScores?: InterviewRubric;
  feedback?: string;
  /** Set by faculty when scheduling directly (slot bookings have none). */
  title?: string;
  instructions?: string;
  /** Faculty see every question; students only see questions already asked. */
  questions?: InterviewQuestion[];
  /** Private faculty notes. Never returned to students. */
  facultyNotes?: string;
  /** Set when the faculty member ends the live call; evaluation may still be pending. */
  endedAt?: string;
  rescheduledAt?: string;
  /** Unguessable id of the built-in video room; only sent to the two participants. */
  roomId?: string;
  /** True when the interview uses the built-in PlaceCampus video room. */
  inAppRoom?: boolean;
  /** Live: the student is connected to the waiting room right now (faculty view only). */
  studentWaiting?: boolean;
  /** Included in detail responses once evaluated. */
  evaluation?: InterviewFeedback | null;
  /** Included in list/detail responses. */
  interviewer?: InterviewParticipant | null;
  student?: (InterviewParticipant & { registrationNumber?: string }) | null;
  createdAt: string;
  updatedAt: string;
}

export const InterviewSlotStatus = {
  OPEN: 'OPEN',
  BOOKED: 'BOOKED',
  CANCELLED: 'CANCELLED',
} as const;
export type InterviewSlotStatus =
  (typeof InterviewSlotStatus)[keyof typeof InterviewSlotStatus];

/** A time faculty make available for a live mock interview. */
export interface InterviewSlot {
  id: string;
  interviewerId: string;
  type: InterviewType;
  startsAt: string;
  durationMinutes: number;
  /** Only returned to the slot owner and the student who booked it. */
  meetingUrl?: string;
  notes?: string;
  status: InterviewSlotStatus;
  bookedBy?: string;
  interviewId?: string;
  interviewer?: InterviewParticipant | null;
  student?: InterviewParticipant | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInterviewSlotDto {
  type: InterviewType;
  startsAt: string;
  durationMinutes: number;
  meetingUrl: string;
  notes?: string;
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
  /** 1 = most urgent. Set on every unmet requirement; satisfied skills have none. */
  rank?: number;
  /** The concrete next step that closes this gap. */
  recommendedAction?: string;
  /** Evidence claiming this skill is waiting for faculty review. */
  pendingVerification?: boolean;
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
 * SKILL GAP ANALYSIS (student-wide, aggregated over all published drives)
 */

/** MISSING: not verified at all; BELOW_LEVEL: verified under the required level; OPTIONAL: only optional drives ask for more. */
export type SkillGapStatus = 'MISSING' | 'BELOW_LEVEL' | 'OPTIONAL';

export interface SkillGapDriveRef {
  driveId: string;
  companyName: string;
  roleTitle: string;
  requiredLevel: number;
  isOptional: boolean;
  applicationDeadline?: string;
}

export interface SkillGapItem {
  skillId: string;
  skillName: string;
  /** Skill cluster name from the taxonomy, when the skill belongs to one. */
  category?: string;
  status: SkillGapStatus;
  priority: GapPriority;
  /** Verified level, absent when the skill is not verified. */
  currentLevel?: number;
  /** Highest level any drive asks for. */
  requiredLevel: number;
  gapLevel: number;
  drives: SkillGapDriveRef[];
}

export interface SkillGapDriveCoverage {
  driveId: string;
  companyName: string;
  roleTitle: string;
  requiredSkillCoverage: number;
  requiredCount: number;
  satisfiedCount: number;
}

export interface SkillGapAnalysis {
  /** False when the student has no verified skills yet: gaps would just be every requirement. */
  sufficientData: boolean;
  verifiedSkillCount: number;
  drivesAnalyzed: number;
  /** Required skill requirements across drives, and how many are met. */
  requirementsTotal: number;
  requirementsMet: number;
  gaps: SkillGapItem[];
  driveCoverage: SkillGapDriveCoverage[];
  calculatedAt: string;
}

/**
 * STUDENT SETTINGS
 */
export interface StudentNotificationPreferences {
  email: boolean;
  driveAnnouncements: boolean;
  applicationUpdates: boolean;
  assessmentUpdates: boolean;
  interviewUpdates: boolean;
}

export interface StudentPrivacyPreferences {
  /** Master switch: when off, no personal links are shared with recruiters. */
  shareProfileLinks: boolean;
  showLinkedin: boolean;
  showGithub: boolean;
  showPortfolio: boolean;
}

export type ThemePreference = 'light' | 'dark' | 'system';

export interface StudentPreferences {
  notifications: StudentNotificationPreferences;
  privacy: StudentPrivacyPreferences;
  theme: ThemePreference;
}

export interface StudentSettings {
  account: {
    fullName: string;
    email: string;
    registrationNumber?: string;
    university?: string;
    department?: string;
    program?: string;
    batch?: string;
    graduationYear?: number;
    lastLoginAt?: string;
    createdAt?: string;
  };
  preferences: StudentPreferences;
  /** Email delivery is not configured on the server; the email preference is stored for when it is. */
  emailDeliveryAvailable: boolean;
}

export interface UpdateStudentPreferencesDto {
  notifications?: Partial<StudentNotificationPreferences>;
  privacy?: Partial<StudentPrivacyPreferences>;
  theme?: ThemePreference;
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
  /** Checkpoint date: this item should be complete by then. */
  dueDate?: string;
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
  /** Date the whole plan should be finished (the drive's deadline when it allows). */
  targetDate?: string;
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
  byDepartment: Array<{ group: string; count: number; average: number }>;
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
  INTERVIEW_SCHEDULED: 'INTERVIEW_SCHEDULED',
  INTERVIEW_CANCELLED: 'INTERVIEW_CANCELLED',
  APPLICATION_SUBMITTED: 'APPLICATION_SUBMITTED',
  APPLICATION_STATUS_CHANGED: 'APPLICATION_STATUS_CHANGED',
  PREPARATION_PLAN_CREATED: 'PREPARATION_PLAN_CREATED',
  PREPARATION_PLAN_COMPLETED: 'PREPARATION_PLAN_COMPLETED',
  REVIEW_ASSIGNED: 'REVIEW_ASSIGNED',
  MENTOR_ASSIGNED: 'MENTOR_ASSIGNED',
  DRIVE_PUBLISHED: 'DRIVE_PUBLISHED',
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

/* ------------------------------------------------------------------ */
/* Faculty assignments and faculty portal                              */
/* ------------------------------------------------------------------ */

export const FacultyAssignmentPurpose = {
  MENTOR: 'MENTOR',
  EVIDENCE_REVIEWER: 'EVIDENCE_REVIEWER',
  INTERVIEWER: 'INTERVIEWER',
  PROJECT_GUIDE: 'PROJECT_GUIDE',
} as const;
export type FacultyAssignmentPurpose = typeof FacultyAssignmentPurpose[keyof typeof FacultyAssignmentPurpose];

/** ASSIGNED until the reviewer opens it; CLAIMED while their 30-minute lock is active. */
export type ReviewState = 'ASSIGNED' | 'CLAIMED';

export interface FacultyStudentRef {
  id: string;
  fullName: string;
  registrationNumber?: string;
}

export interface FacultyReviewQueueItem {
  id: string;
  title: string;
  type: EvidenceType;
  status: EvidenceStatus;
  student: FacultyStudentRef | null;
  reviewDueAt?: string;
  reviewState: ReviewState;
  overdue: boolean;
  createdAt: string;
}

export interface FacultyUpcomingInterview {
  id: string;
  type: string;
  status: MockInterviewStatus;
  scheduledAt: string;
  durationMinutes?: number;
  meetingUrl?: string;
  student: FacultyStudentRef | null;
}

export interface FacultyStudentSummary extends FacultyStudentRef {
  email?: string;
  department?: string;
  program?: string;
  batch?: string;
  purposes: FacultyAssignmentPurpose[];
  /** Latest readiness score (0–100), or null when not calculated yet. */
  readinessScore: number | null;
  verifiedSkills: number;
  pendingReviews: number;
  assignedAt: string;
}

export interface FacultyDashboard {
  faculty: { id: string; fullName: string; designation?: string; department?: string };
  stats: {
    assignedStudents: number;
    pendingReviews: number;
    upcomingInterviews: number;
    overdueReviews: number;
    /** Items returned to the student and not yet resubmitted. */
    awaitingResubmission: number;
    /** Decisions this reviewer recorded since the start of the month. */
    reviewedThisMonth: number;
  };
  reviewQueue: FacultyReviewQueueItem[];
  upcomingInterviews: FacultyUpcomingInterview[];
  students: FacultyStudentSummary[];
}

export interface FacultyStudentDetail {
  student: FacultyStudentSummary & { cgpa?: number; phone?: string };
  readiness: { overallScore: number; calculatedAt?: string; strengths: string[]; areasToImprove: string[] } | null;
  skills: { name: string; level: number }[];
  evidence: { id: string; title: string; type: EvidenceType; status: EvidenceStatus; createdAt: string; reviewedByMe: boolean }[];
  interviews: { id: string; type: string; status: MockInterviewStatus; scheduledAt: string }[];
}

/**
 * DRIVE SKILL SUPPLY AGAINST DEMAND
 * Demand is the drive's skill requirements; supply is the verified skills of
 * the students the drive is open to (its eligible pool) and of its applicants.
 */
export interface DriveSkillSupplyRow {
  skillId: string;
  skillName: string;
  requiredLevel: number;
  isOptional: boolean;
  /** Students verified at or above the required level. */
  meetsLevel: number;
  /** Students verified, but below the required level. */
  belowLevel: number;
  /** Students with no verified evidence of the skill. */
  missing: number;
  /** Students whose evidence for the skill is still under review. */
  pendingReview: number;
  /** meetsLevel as a percentage of the pool. */
  supplyRate: number;
  /** Required skills only: SHORTAGE under 25%, LIMITED under 60%, otherwise ADEQUATE. */
  supplyStatus: 'SHORTAGE' | 'LIMITED' | 'ADEQUATE';
  /** Applicants (of those who applied) meeting the level. */
  applicantsMeetingLevel: number;
}

export interface DriveSkillSupplyReport {
  drive: {
    id: string;
    companyName: string;
    roleTitle: string;
    status: string;
    applicationDeadline?: string;
  };
  /** Students considered: active students who pass the drive's eligibility rules except skills. */
  poolSize: number;
  /** Students who pass every eligibility rule, skills included. */
  fullyEligible: number;
  applicants: number;
  /** Students meeting every required skill at its level. */
  meetingAllRequired: number;
  skills: DriveSkillSupplyRow[];
  /** Required skills sorted by lowest supply first. */
  shortages: string[];
  generatedAt: string;
}

/**
 * RECRUITER ACCESS LOG (every recruiter read of student data, allowed or denied)
 */
export interface RecruiterAccessLogEntry {
  id: string;
  action: string;
  success: boolean;
  recruiter: { id: string; name: string; email?: string } | null;
  drive: { id: string; companyName: string; roleTitle: string } | null;
  student: { id: string; name: string } | null;
  resourceType: string;
  resourceId?: string;
  createdAt: string;
}

export interface RecruiterAccessLogPage {
  entries: RecruiterAccessLogEntry[];
  total: number;
  page: number;
  limit: number;
  /** Counts over the same filter: allowed reads and denied attempts. */
  allowed: number;
  denied: number;
}
