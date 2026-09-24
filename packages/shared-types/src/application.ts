// ============================================
// Application Types
// ============================================

export enum ApplicationStatus {
  APPLIED = 'APPLIED',
  SHORTLISTED = 'SHORTLISTED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
  INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
  SELECTED = 'SELECTED',
}

export interface IApplication {
  _id: string;
  studentId: string;
  driveId: string;
  status: ApplicationStatus;
  appliedAt: string;
  statusUpdatedAt: string;
  notes?: string;
}
