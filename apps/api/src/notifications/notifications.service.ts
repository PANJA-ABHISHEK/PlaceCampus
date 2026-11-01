import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationType } from '@placecampus/shared-types';
import { Notification, NotificationDocument } from './schemas/notification.schema.js';

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

  constructor(@InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>) {}

  async createFromEvent(event: NotificationEvent) {
    if (!event.recipientId || !this.isSafeRoute(event.actionUrl)) return null;
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
