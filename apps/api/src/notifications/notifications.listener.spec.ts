import { NotificationType } from '@placecampus/shared-types';
import { NotificationsListener } from './notifications.listener.js';

describe('NotificationsListener', () => {
  it('creates recipient-scoped notifications with valid event destinations', async () => {
    const createFromEvent = vi.fn().mockResolvedValue({});
    const listener = new NotificationsListener({ createFromEvent } as any);

    await listener.evidenceDecision({ evidence: { _id: 'ev-1', studentId: 'student-1', title: 'Certificate', status: 'VERIFIED' } });
    await listener.applicationCreated({ application: { _id: 'app-1', studentId: 'student-1' } });
    await listener.applicationStatusChanged({ application: { _id: 'app-1', studentId: 'student-1', status: 'SHORTLISTED' }, previousStatus: 'UNDER_REVIEW' });
    await listener.assessmentEvaluated({ attempt: { _id: 'attempt-1', assessmentId: 'assessment-1', studentId: 'student-1', percentage: 80 } });
    await listener.interviewEvaluated({ interview: { _id: 'interview-1', studentId: 'student-1' } });
    await listener.preparationCreated({ plan: { _id: 'plan-1', studentId: 'student-1' } });
    await listener.preparationCompleted({ plan: { _id: 'plan-1', studentId: 'student-1' } });

    expect(createFromEvent).toHaveBeenCalledTimes(7);
    const events = createFromEvent.mock.calls.map(([event]) => event);
    expect(events.map((event) => event.recipientId)).toEqual(Array(7).fill('student-1'));
    expect(events.find((event) => event.type === NotificationType.ASSESSMENT_EVALUATED).actionUrl).toBe('/student/assessments/assessment-1/attempt');
    expect(events.find((event) => event.type === NotificationType.INTERVIEW_FEEDBACK).actionUrl).toBe('/student/interviews');
    for (const event of events) {
      expect(event.actionUrl).toMatch(/^\/student\//);
      expect(event).not.toHaveProperty('password');
      expect(event).not.toHaveProperty('token');
      expect(event).not.toHaveProperty('document');
      expect(event).not.toHaveProperty('reviewerComments');
    }
  });

  it('uses the assessment inbox route safely when an evaluated attempt lacks assessmentId', async () => {
    const createFromEvent = vi.fn().mockResolvedValue({});
    const listener = new NotificationsListener({ createFromEvent } as any);
    await listener.assessmentEvaluated({ attempt: { _id: 'attempt-1', studentId: 'student-1' } });
    expect(createFromEvent.mock.calls[0][0].actionUrl).toBe('/student/assessments');
  });

  it('does not invent a notification recipient when the event has no recipient ID', async () => {
    const createFromEvent = vi.fn().mockResolvedValue(null);
    const listener = new NotificationsListener({ createFromEvent } as any);
    await listener.applicationCreated({ application: { _id: 'app-1' } });
    expect(createFromEvent).toHaveBeenCalledWith(expect.objectContaining({ recipientId: undefined }));
  });
});
