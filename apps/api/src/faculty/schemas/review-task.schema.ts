import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';

export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RESUBMISSION_REQUESTED = 'RESUBMISSION_REQUESTED',
}

export type ReviewTaskDocument = HydratedDocument<ReviewTask>;

@Schema({ timestamps: true })
export class ReviewTask {
  declare _id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Evidence' })
  evidenceId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  studentId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedFacultyId?: Types.ObjectId;

  @Prop({
    required: true,
    enum: ReviewStatus,
    type: String,
    default: ReviewStatus.PENDING,
  })
  status!: ReviewStatus;

  @Prop({ type: Object })
  aiAnalysis?: Record<string, unknown>;

  @Prop({ type: [String], default: [] })
  aiReasons!: string[];

  @Prop({ type: String })
  facultyComments?: string;

  @Prop({ type: String })
  rejectionReason?: string;

  @Prop({ type: Date })
  reviewedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewedBy?: Types.ObjectId;

  declare createdAt: Date;
  declare updatedAt: Date;
}

export const ReviewTaskSchema = SchemaFactory.createForClass(ReviewTask);

// Indexes
ReviewTaskSchema.index({ status: 1, assignedFacultyId: 1 });
ReviewTaskSchema.index({ evidenceId: 1 }, { unique: true });
ReviewTaskSchema.index({ studentId: 1 });
ReviewTaskSchema.index({ createdAt: -1 });
