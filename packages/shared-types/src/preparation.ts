// ============================================
// Preparation Planner Types
// ============================================

import { type SkillLevel } from './skill';

/**
 * Preparation task status.
 */
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

/**
 * Individual preparation task.
 */
export interface IPreparationTask {
  _id: string;
  skillId: string;
  skillName: string;
  task: string;
  resource?: string;
  resourceUrl?: string;
  currentLevel: SkillLevel | null;
  targetLevel: SkillLevel;
  priority: string;
  estimatedHours: number;
  deadline?: string;
  status: TaskStatus;
  startedAt?: string;
  completedAt?: string;
}

/**
 * Complete preparation plan for a student-drive pair.
 */
export interface IPreparationPlan {
  _id: string;
  studentId: string;
  driveId: string;
  tasks: IPreparationTask[];
  totalEstimatedHours: number;
  completedTasks: number;
  totalTasks: number;
  progressPercentage: number;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
}
