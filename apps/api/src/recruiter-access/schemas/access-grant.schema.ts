import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { GrantStatus } from '@placecampus/shared-types';

export type RecruiterAccessGrantDocument = RecruiterAccessGrant & Document;

@Schema({ timestamps: true, collection: 'recruiter_access_grants' })
export class RecruiterAccessGrant {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  recruiterId: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'PlacementDrive' })
  driveId: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  grantedBy: string;

  @Prop({ required: true, default: Date.now })
  grantedAt: Date;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({
    required: true,
    type: String,
    enum: ['ACTIVE', 'EXPIRED', 'REVOKED'],
    default: 'ACTIVE',
  })
  status: GrantStatus;

  @Prop({ type: [String], default: [] })
  releasedFields: string[];
}

export const RecruiterAccessGrantSchema = SchemaFactory.createForClass(RecruiterAccessGrant);

RecruiterAccessGrantSchema.index({ recruiterId: 1, driveId: 1 });
RecruiterAccessGrantSchema.index({ driveId: 1 });
RecruiterAccessGrantSchema.index({ expiresAt: 1 });

RecruiterAccessGrantSchema.set('toJSON', {
  transform: (doc, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
