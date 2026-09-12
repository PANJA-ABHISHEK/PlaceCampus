// ============================================
// Readiness Engine Types
// ============================================

/**
 * Readiness dimension categories.
 */
export enum ReadinessDimension {
  TECHNICAL = 'TECHNICAL',
  APTITUDE = 'APTITUDE',
  COMMUNICATION = 'COMMUNICATION',
  PROJECTS = 'PROJECTS',
  ROLE_SKILLS = 'ROLE_SKILLS',
  ASSESSMENT = 'ASSESSMENT',
  INTERVIEW = 'INTERVIEW',
}

/**
 * Individual readiness dimension score.
 */
export interface IReadinessScore {
  dimension: ReadinessDimension;
  score: number;
  maxScore: number;
  percentage: number;
  explanation: string;
}

/**
 * Complete readiness result for a student-drive pair.
 * This is INDEPENDENT from eligibility.
 */
export interface IReadinessResult {
  _id: string;
  studentId: string;
  driveId: string;
  overallPercentage: number;
  dimensions: IReadinessScore[];
  explanation: string;
  scoringVersion: string;
  weightsUsed: Record<ReadinessDimension, number>;
  evaluatedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Configurable weights for readiness calculation.
 * Weights must sum to 1.0.
 */
export interface IReadinessConfig {
  _id: string;
  version: string;
  weights: Record<ReadinessDimension, number>;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
