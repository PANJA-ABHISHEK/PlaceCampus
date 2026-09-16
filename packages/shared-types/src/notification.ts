// ============================================
// Notification Types
// ============================================

/**
 * Notification categories.
 */
export enum NotificationType {
  DRIVE_RECOMMENDATION = 'DRIVE_RECOMMENDATION',
  EVIDENCE_VERIFIED = 'EVIDENCE_VERIFIED',
  EVIDENCE_REJECTED = 'EVIDENCE_REJECTED',
  ELIGIBILITY_RESULT = 'ELIGIBILITY_RESULT',
  READINESS_UPDATE = 'READINESS_UPDATE',
  PREPARATION_DEADLINE = 'PREPARATION_DEADLINE',
  SHORTLIST_NOTIFICATION = 'SHORTLIST_NOTIFICATION',
  MENTOR_NOTIFICATION = 'MENTOR_NOTIFICATION',
  DRIVE_PUBLISHED = 'DRIVE_PUBLISHED',
  SYSTEM = 'SYSTEM',
}

/**
 * Notification entity.
 */
export interface INotification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  readAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
