// ============================================
// Audit Logging Types
// ============================================

import { type UserRole } from './auth';

/**
 * Auditable actions in the system.
 */
export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  EVIDENCE_SUBMITTED = 'EVIDENCE_SUBMITTED',
  EVIDENCE_VERIFIED = 'EVIDENCE_VERIFIED',
  EVIDENCE_REJECTED = 'EVIDENCE_REJECTED',
  CANDIDATE_ACCESSED = 'CANDIDATE_ACCESSED',
  CANDIDATE_SHORTLISTED = 'CANDIDATE_SHORTLISTED',
  PERMISSION_CHANGED = 'PERMISSION_CHANGED',
  DRIVE_PUBLISHED = 'DRIVE_PUBLISHED',
  DRIVE_CREATED = 'DRIVE_CREATED',
  RECRUITER_ACCESS_GRANTED = 'RECRUITER_ACCESS_GRANTED',
  RECRUITER_ACCESS_REVOKED = 'RECRUITER_ACCESS_REVOKED',
  ADMIN_CONFIG_CHANGED = 'ADMIN_CONFIG_CHANGED',
  USER_CREATED = 'USER_CREATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  SKILL_TAXONOMY_UPDATED = 'SKILL_TAXONOMY_UPDATED',
}

/**
 * Audit log entry.
 */
export interface IAuditLog {
  _id: string;
  actorId: string;
  actorRole: UserRole;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}
