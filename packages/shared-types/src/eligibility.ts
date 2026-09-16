// ============================================
// Eligibility Engine Types
// ============================================

/**
 * Status of a single eligibility criterion check.
 */
export enum CriterionStatus {
  MET = 'MET',
  NOT_MET = 'NOT_MET',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

/**
 * Individual eligibility criterion evaluation result.
 */
export interface IEligibilityCriterion {
  name: string;
  required: number | string | string[];
  actual: number | string | string[];
  status: CriterionStatus;
  message?: string;
}

/**
 * Complete eligibility result for a student-drive pair.
 * This is INDEPENDENT from readiness.
 */
export interface IEligibilityResult {
  _id: string;
  studentId: string;
  driveId: string;
  eligible: boolean;
  criteria: IEligibilityCriterion[];
  evaluatedAt: string;
  createdAt: string;
  updatedAt: string;
}
