// ============================================
// Matching Engine Types
// ============================================

import { type SkillLevel } from './skill';

/**
 * Priority level for a skill gap.
 */
export enum GapPriority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/**
 * Status of skill match against a requirement.
 */
export enum GapStatus {
  MISSING = 'MISSING',
  BELOW = 'BELOW',
  MEETS = 'MEETS',
  EXCEEDS = 'EXCEEDS',
}

/**
 * Individual skill gap analysis.
 */
export interface ISkillGap {
  skillId: string;
  skillName: string;
  requiredLevel: SkillLevel;
  studentLevel: SkillLevel | null;
  gap: number;
  priority: GapPriority;
  status: GapStatus;
  readinessImpact: number;
}

/**
 * Complete matching result for a student-drive pair.
 */
export interface IMatchingResult {
  studentId: string;
  driveId: string;
  overallMatchPercentage: number;
  gaps: ISkillGap[];
  strengths: ISkillGap[];
  evaluatedAt: string;
}
