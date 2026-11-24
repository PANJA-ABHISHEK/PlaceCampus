import { DriveStatus } from '@placecampus/shared-types';

export type DriveLifecycle = 'ACTIVE' | 'UPCOMING' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';

/**
 * Single source of truth for how a recruiter sees a drive. Dates win over stored labels so a
 * drive moves from Active to Expired on its own once the deadline passes. A closed drive is
 * Completed unless its seeded demo label says the deadline lapsed without a hiring outcome.
 */
export function driveLifecycle(drive: any, now = Date.now()): DriveLifecycle {
  if (!drive) return 'EXPIRED';
  if (drive.status === DriveStatus.CANCELLED) return 'CANCELLED';
  const start = drive.applicationStart ? new Date(drive.applicationStart).getTime() : NaN;
  const deadline = drive.applicationDeadline ? new Date(drive.applicationDeadline).getTime() : NaN;
  if (drive.status === DriveStatus.DRAFT || (Number.isFinite(start) && start > now)) return 'UPCOMING';
  if (drive.status === DriveStatus.CLOSED) return drive.demoLifecycleStatus === 'EXPIRED' ? 'EXPIRED' : 'COMPLETED';
  if (Number.isFinite(deadline) && deadline < now) return drive.demoLifecycleStatus === 'COMPLETED' ? 'COMPLETED' : 'EXPIRED';
  return 'ACTIVE';
}
