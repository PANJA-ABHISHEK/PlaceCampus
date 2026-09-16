// ============================================
// Placement Drive Types
// ============================================

import { type Branch } from './user';
import { type SkillLevel } from './skill';

/**
 * Placement drive lifecycle status.
 */
export enum DriveStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  REGISTRATION_OPEN = 'REGISTRATION_OPEN',
  REGISTRATION_CLOSED = 'REGISTRATION_CLOSED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * Placement drive definition.
 */
export interface IPlacementDrive {
  _id: string;
  companyId: string;
  title: string;
  jobRole: string;
  description: string;
  location: string;
  packageLpa: number;
  applicationDeadline: string;
  driveDate: string;
  status: DriveStatus;
  eligibilityCriteria: IEligibilityCriteria;
  requiredSkills: IDriveSkillRequirement[];
  preferredSkills: IDriveSkillRequirement[];
  maxSelections?: number;
  registeredStudentIds: string[];
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Eligibility criteria for a placement drive.
 * These are hard requirements (deterministic pass/fail).
 */
export interface IEligibilityCriteria {
  minimumCgpa: number;
  maximumActiveBacklogs: number;
  eligibleBranches: Branch[];
  minimumTenthPercentage?: number;
  minimumTwelfthPercentage?: number;
  graduationYears?: number[];
}

/**
 * Skill requirement for a placement drive.
 */
export interface IDriveSkillRequirement {
  skillId: string;
  skillName: string;
  minimumLevel: SkillLevel;
  weight: number;
  isRequired: boolean;
}
