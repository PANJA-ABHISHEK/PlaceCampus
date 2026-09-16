// ============================================
// Evidence Management Types
// ============================================

import { type IAISkillSuggestion } from './skill';

/**
 * Types of evidence a student can submit.
 */
export enum EvidenceType {
  RESUME = 'RESUME',
  PROJECT = 'PROJECT',
  CERTIFICATION = 'CERTIFICATION',
  ACADEMIC_RESULT = 'ACADEMIC_RESULT',
  CODING_ACHIEVEMENT = 'CODING_ACHIEVEMENT',
  ASSESSMENT = 'ASSESSMENT',
  MOCK_INTERVIEW = 'MOCK_INTERVIEW',
  INTERNSHIP = 'INTERNSHIP',
  TRAINING = 'TRAINING',
  EXTERNAL = 'EXTERNAL',
}

/**
 * Verification status of submitted evidence.
 */
export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

/**
 * Evidence submitted by a student for skill claims.
 */
export interface IEvidence {
  _id: string;
  studentId: string;
  type: EvidenceType;
  title: string;
  description?: string;
  source?: string;
  fileUrl?: string;
  extractedSkills: IAISkillSuggestion[];
  aiConfidence?: number;
  verificationStatus: VerificationStatus;
  submittedAt: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Evidence verification request by faculty.
 */
export interface IEvidenceVerification {
  evidenceId: string;
  status: VerificationStatus.VERIFIED | VerificationStatus.REJECTED;
  comments?: string;
  rejectionReason?: string;
  verifiedSkills?: Array<{
    skillId: string;
    confirmedLevel: string;
  }>;
}
