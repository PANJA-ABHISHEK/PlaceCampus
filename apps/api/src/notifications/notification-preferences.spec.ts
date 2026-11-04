import { NotificationType } from '@placecampus/shared-types';
import { NotificationsService } from './notifications.service.js';
import { resolvePreferences } from '../students/student-preferences.js';

const event = (type: NotificationType) => ({
  recipientId: 'student-1', type, title: 'T', message: 'M', actionUrl: '/student/interviews',
  entityType: 'mock-interview', entityId: 'i1', idempotencyKey: `k:${type}`,
});

describe('NotificationsService preference filtering', () => {
  const muted = resolvePreferences({ notifications: { interviewUpdates: false, driveAnnouncements: false } });

  it('skips categories the student switched off and delivers the rest', async () => {
    const model = { findOneAndUpdate: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({}) }) };
    const students = { getPreferencesIfStudent: vi.fn().mockResolvedValue(muted) };
    const service = new NotificationsService(model as any, students as any);

    expect(await service.createFromEvent(event(NotificationType.INTERVIEW_SCHEDULED))).toBeNull();
    await service.createFromEvent(event(NotificationType.APPLICATION_STATUS_CHANGED));
    // Evidence decisions have no opt-out.
    await service.createFromEvent(event(NotificationType.EVIDENCE_VERIFIED));
    expect(model.findOneAndUpdate).toHaveBeenCalledTimes(2);
  });

  it('announces drives only to students who have not opted out', async () => {
    const model = { insertMany: vi.fn().mockImplementation(async (docs: any[]) => docs) };
    const students = {
      getPreferencesForUsers: vi.fn().mockResolvedValue(new Map([['s1', muted], ['s2', resolvePreferences(null)]])),
    };
    const service = new NotificationsService(model as any, students as any);
    const count = await service.createForRecipients(['s1', 's2', 's3'], {
      type: NotificationType.DRIVE_PUBLISHED, title: 'New drive', message: 'M',
      actionUrl: '/student/drives/d1', entityType: 'placement-drive', entityId: 'd1', idempotencyKeyPrefix: 'drive:d1',
    });
    expect(count).toBe(2);
    const docs = model.insertMany.mock.calls[0][0];
    expect(docs.map((d: any) => d.recipientId)).toEqual(['s2', 's3']);
    expect(docs[0].idempotencyKey).toBe('drive:d1:s2');
  });
});
