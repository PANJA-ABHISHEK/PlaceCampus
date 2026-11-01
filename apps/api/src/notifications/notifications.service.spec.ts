import { NotificationType } from '@placecampus/shared-types';
import { NotificationsService } from './notifications.service.js';

const chain = (value: unknown) => ({ exec: vi.fn().mockResolvedValue(value) });

describe('NotificationsService', () => {
  it('lists and counts only the authenticated recipient scope', async () => {
    const model = {
      find: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ skip: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockReturnValue(chain([{ _id: 'n1', recipientId: 'u1', type: NotificationType.APPLICATION_SUBMITTED, title: 'Title', message: 'Message', actionUrl: '/student/applications/a1', entityType: 'application', entityId: 'a1', readAt: null, createdAt: new Date() }])) }) }) }) }),
      countDocuments: vi.fn().mockReturnValue(chain(1)),
    };
    const service = new NotificationsService(model as any);
    const result = await service.listForUser('u1', { page: 1, limit: 20, unread: true });
    expect(model.find).toHaveBeenCalledWith({ recipientId: 'u1', readAt: null });
    expect(result.items).toHaveLength(1);
    expect((await service.unreadCount('u1')).count).toBe(1);
    expect(model.countDocuments).toHaveBeenCalledWith({ recipientId: 'u1', readAt: null });
  });

  it('marks read and mark-all with recipient ownership in the database filter', async () => {
    const model = {
      findOneAndUpdate: vi.fn().mockReturnValue({ lean: vi.fn().mockReturnValue(chain({ _id: 'n1', recipientId: 'u1' })) }),
      updateMany: vi.fn().mockReturnValue(chain({ modifiedCount: 2 })),
    };
    const service = new NotificationsService(model as any);
    await service.markRead('n1', 'u1');
    await service.markAllRead('u1');
    expect(model.findOneAndUpdate).toHaveBeenCalledWith({ _id: 'n1', recipientId: 'u1', readAt: null }, expect.anything(), expect.anything());
    expect(model.updateMany).toHaveBeenCalledWith({ recipientId: 'u1', readAt: null }, expect.anything());
  });

  it('deduplicates successful events and rejects unsafe destinations', async () => {
    const model = { findOneAndUpdate: vi.fn().mockReturnValue(chain({ _id: 'n1' })) };
    const service = new NotificationsService(model as any);
    const event = { recipientId: 'u1', type: NotificationType.APPLICATION_SUBMITTED, title: 'Title', message: 'Message', actionUrl: '/student/applications/a1', entityType: 'application', entityId: 'a1', idempotencyKey: 'event-1' };
    await service.createFromEvent(event);
    await service.createFromEvent(event);
    expect(model.findOneAndUpdate).toHaveBeenCalledTimes(2);
    await service.createFromEvent({ ...event, actionUrl: 'https://example.com' });
    expect(model.findOneAndUpdate).toHaveBeenCalledTimes(2);
  });

  it('contains persistence failures without reversing the successful domain operation', async () => {
    const model = { findOneAndUpdate: vi.fn().mockReturnValue(chain(Promise.reject(new Error('database unavailable')))) };
    const service = new NotificationsService(model as any);
    await expect(service.createFromEvent({
      recipientId: 'u1', type: NotificationType.APPLICATION_SUBMITTED, title: 'Title', message: 'Message',
      actionUrl: '/student/applications/a1', entityType: 'application', entityId: 'a1', idempotencyKey: 'event-failure',
    })).resolves.toBeNull();
  });

  it('does not expose recipient IDs or internal metadata in public responses', async () => {
    const model = {
      find: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ skip: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockReturnValue(chain([{ _id: 'n1', recipientId: 'u1', idempotencyKey: 'secret', title: 'Title', message: 'Message', actionUrl: '/student/notifications', entityType: 'system', entityId: 'n1', createdAt: new Date() }])) }) }) }) }),
      countDocuments: vi.fn().mockReturnValue(chain(1)),
    };
    const result = await new NotificationsService(model as any).listForUser('u1');
    expect(result.items[0]).not.toHaveProperty('recipientId');
    expect(result.items[0]).not.toHaveProperty('idempotencyKey');
  });
});
