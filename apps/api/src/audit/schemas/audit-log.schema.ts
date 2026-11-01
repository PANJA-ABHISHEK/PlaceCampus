import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'audit_logs' })
export class AuditLog {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  actorId: string;

  @Prop({ required: true })
  actorRole: string;

  @Prop({ required: true })
  action: string;

  @Prop({ required: true })
  resourceType: string;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  resourceId?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'PlacementDrive' })
  driveId?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  applicationId?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  studentId?: string;

  @Prop({ required: true, default: true })
  success: boolean;

  @Prop()
  reason?: string;

  @Prop({ type: Object })
  metadata?: any;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ driveId: 1 });
AuditLogSchema.index({ actorId: 1 });
AuditLogSchema.index({ resourceType: 1, action: 1 });

AuditLogSchema.set('toJSON', {
  transform: (doc, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
