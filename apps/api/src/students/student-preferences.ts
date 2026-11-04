import {
  NotificationType,
  type StudentPreferences,
} from '@placecampus/shared-types';

export const DEFAULT_STUDENT_PREFERENCES: StudentPreferences = {
  notifications: {
    email: true,
    driveAnnouncements: true,
    applicationUpdates: true,
    assessmentUpdates: true,
    interviewUpdates: true,
  },
  privacy: {
    shareProfileLinks: true,
    showLinkedin: true,
    showGithub: true,
    showPortfolio: true,
  },
  theme: 'light',
};

/** Stored (possibly partial) preferences merged over the defaults. */
export function resolvePreferences(stored?: {
  notifications?: Partial<StudentPreferences['notifications']>;
  privacy?: Partial<StudentPreferences['privacy']>;
  theme?: StudentPreferences['theme'];
} | null): StudentPreferences {
  const strip = <T extends object>(value?: T) =>
    Object.fromEntries(
      Object.entries(value ?? {}).filter(([, v]) => typeof v === 'boolean'),
    ) as Partial<T>;
  return {
    notifications: { ...DEFAULT_STUDENT_PREFERENCES.notifications, ...strip(stored?.notifications) },
    privacy: { ...DEFAULT_STUDENT_PREFERENCES.privacy, ...strip(stored?.privacy) },
    theme: stored?.theme ?? DEFAULT_STUDENT_PREFERENCES.theme,
  };
}

/** The preference that controls an in-app notification type, if any. */
const PREFERENCE_BY_TYPE: Partial<
  Record<NotificationType, keyof StudentPreferences['notifications']>
> = {
  [NotificationType.DRIVE_PUBLISHED]: 'driveAnnouncements',
  [NotificationType.APPLICATION_SUBMITTED]: 'applicationUpdates',
  [NotificationType.APPLICATION_STATUS_CHANGED]: 'applicationUpdates',
  [NotificationType.ASSESSMENT_EVALUATED]: 'assessmentUpdates',
  [NotificationType.INTERVIEW_SCHEDULED]: 'interviewUpdates',
  [NotificationType.INTERVIEW_CANCELLED]: 'interviewUpdates',
  [NotificationType.INTERVIEW_FEEDBACK]: 'interviewUpdates',
};

export function preferenceForType(type: NotificationType) {
  return PREFERENCE_BY_TYPE[type];
}
