// ============================================
// Skill Taxonomy Types
// ============================================

/**
 * Skill proficiency levels.
 * Used for both student claims and drive requirements.
 */
export enum SkillLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT',
}

/**
 * Numeric mapping for skill levels (used in gap calculations).
 */
export const SKILL_LEVEL_NUMERIC: Record<SkillLevel, number> = {
  [SkillLevel.BEGINNER]: 1,
  [SkillLevel.INTERMEDIATE]: 2,
  [SkillLevel.ADVANCED]: 3,
  [SkillLevel.EXPERT]: 4,
};

/**
 * Skill category for taxonomy organization.
 */
export enum SkillCategory {
  PROGRAMMING_LANGUAGE = 'PROGRAMMING_LANGUAGE',
  FRAMEWORK = 'FRAMEWORK',
  DATABASE = 'DATABASE',
  DEVOPS = 'DEVOPS',
  DATA_STRUCTURE = 'DATA_STRUCTURE',
  ALGORITHM = 'ALGORITHM',
  SOFT_SKILL = 'SOFT_SKILL',
  TOOL = 'TOOL',
  DOMAIN = 'DOMAIN',
  METHODOLOGY = 'METHODOLOGY',
  CLOUD = 'CLOUD',
  SECURITY = 'SECURITY',
  OTHER = 'OTHER',
}

/**
 * Skill definition in the taxonomy.
 */
export interface ISkill {
  _id: string;
  name: string;
  category: SkillCategory;
  description?: string;
  synonyms: string[];
  parentSkillId?: string;
  childSkillIds: string[];
  relatedSkillIds: string[];
  clusterIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Skill cluster for grouping related skills.
 */
export interface ISkillCluster {
  _id: string;
  name: string;
  description?: string;
  skillIds: string[];
  roleMappings: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Student's claimed skill with evidence and verification.
 */
export interface ISkillClaim {
  _id: string;
  studentId: string;
  skillId: string;
  level: SkillLevel;
  confidence: number;
  evidenceCount: number;
  verifiedEvidenceCount: number;
  isVerified: boolean;
  lastVerifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * AI-extracted skill suggestion (before verification).
 */
export interface IAISkillSuggestion {
  skillName: string;
  confidence: number;
  estimatedLevel: SkillLevel;
  evidence: string;
  matchedSkillId?: string;
}
