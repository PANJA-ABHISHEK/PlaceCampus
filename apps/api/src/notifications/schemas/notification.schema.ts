import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { NotificationType } from '@placecampus/shared-types';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ type: String, required: true, index: true })
  recipientId: string;

  @Prop({ type: String, enum: Object.values(NotificationType), required: true })
  type: NotificationType;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true, maxlength: 500 })
  message: string;

  @Prop({ type: String, required: true })
  actionUrl: string;

  @Prop({ type: String, required: true })
  entityType: string;

  @Prop({ type: String, required: true })
  entityId: string;

  @Prop({ type: Date, default: null })
  readAt?: Date;

  @Prop({ type: String, unique: true, sparse: true })
  idempotencyKey?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ recipientId: 1, createdAt: -1, _id: -1 });
NotificationSchema.index({ recipientId: 1, readAt: 1 });
NotificationSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const output = ret as any;
    output.id = output._id.toString();
    delete output._id;
    delete output.updatedAt;
    delete output.idempotencyKey;
  },
});
