import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationType } from '@placecampus/shared-types';
import { Notification, NotificationDocument } from './schemas/notification.schema.js';
import { StudentsService } from '../students/students.service.js';
import { preferenceForType } from '../students/student-preferences.js';

type NotificationEvent = {
  recipientId?: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl: string;
  entityType: string;
  entityId: string;
  idempotencyKey: string;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
    @Optional() private readonly studentsService?: StudentsService,
  ) {}

  /** True when the recipient is a student who switched this notification category off. */
  private async isMuted(recipientId: string, type: NotificationType) {
    const key = preferenceForType(type);
    if (!key || !this.studentsService) return false;
    const prefs = await this.studentsService.getPreferencesIfStudent(recipientId).catch(() => null);
    return prefs ? prefs.notifications[key] === false : false;
  }

  /**
   * One notification per recipient (e.g. a drive announcement), skipping those
   * who opted out. Duplicate idempotency keys are ignored.
   */
  async createForRecipients(recipientIds: string[], event: Omit<NotificationEvent, 'recipientId' | 'idempotencyKey'> & { idempotencyKeyPrefix: string }) {
    if (!recipientIds.length || !this.isSafeRoute(event.actionUrl)) return 0;
    const key = preferenceForType(event.type);
    const prefs = key && this.studentsService ? await this.studentsService.getPreferencesForUsers(recipientIds) : new Map();
    const { idempotencyKeyPrefix, ...rest } = event;
    const docs = recipientIds
      .filter((id) => !key || prefs.get(id)?.notifications[key] !== false)
      .map((recipientId) => ({ ...rest, recipientId, idempotencyKey: `${idempotencyKeyPrefix}:${recipientId}` }));
    if (!docs.length) return 0;
    try {
      const inserted = await this.notificationModel.insertMany(docs, { ordered: false });
      return inserted.length;
    } catch (error: any) {
      if (error?.code === 11000 || error?.writeErrors) return error?.insertedDocs?.length ?? 0;
      this.logger.warn(`Bulk notification delivery failed: ${error?.message || 'unknown error'}`);
      return 0;
    }
  }

  async createFromEvent(event: NotificationEvent) {
    if (!event.recipientId || !this.isSafeRoute(event.actionUrl)) return null;
    if (await this.isMuted(event.recipientId, event.type)) return null;
    try {
      return await this.notificationModel.findOneAndUpdate(
        { idempotencyKey: event.idempotencyKey },
        { $setOnInsert: { ...event } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).exec();
    } catch (error: any) {
      if (error?.code === 11000) return this.notificationModel.findOne({ idempotencyKey: event.idempotencyKey }).exec();
      this.logger.warn(`Notification delivery failed: ${error?.message || 'unknown error'}`);
      return null;
    }
  }

  async listForUser(recipientId: string, query: { page?: number; limit?: number; unread?: boolean; type?: NotificationType } = {}) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const filter: Record<string, unknown> = { recipientId };
    if (query.unread) filter.readAt = null;
    if (query.type) filter.type = query.type;
    const [items, total] = await Promise.all([
      this.notificationModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
      this.notificationModel.countDocuments(filter).exec(),
    ]);
    return { items: items.map((item: any) => this.toPublic(item)), page, limit, total, hasMore: page * limit < total };
  }

  async unreadCount(recipientId: string) {
    return { count: await this.notificationModel.countDocuments({ recipientId, readAt: null }).exec() };
  }

  async markRead(id: string, recipientId: string) {
    const item = await this.notificationModel.findOneAndUpdate({ _id: id, recipientId, readAt: null }, { $set: { readAt: new Date() } }, { new: true }).lean().exec();
    return item ? this.toPublic(item) : null;
  }

  async markAllRead(recipientId: string) {
    const result = await this.notificationModel.updateMany({ recipientId, readAt: null }, { $set: { readAt: new Date() } }).exec();
    return { updated: result.modifiedCount };
  }

  private isSafeRoute(url: string) {
    return /^\/(student|faculty|placement|placement-head|recruiter|admin)(?:\/[A-Za-z0-9_/?=&.-]+)?$/.test(url);
  }

  private toPublic(item: any) {
    return { id: String(item._id), type: item.type, title: item.title, message: item.message, actionUrl: item.actionUrl, entityType: item.entityType, entityId: item.entityId, readAt: item.readAt, createdAt: item.createdAt };
  }
}
