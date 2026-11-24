import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type RecruiterInterviewDocument = RecruiterInterview & Document;

export const RECRUITER_INTERVIEW_STATUS = ['SCHEDULED', 'COMPLETED', 'CANCELLED'] as const;
export const RECRUITER_INTERVIEW_RECOMMENDATION = ['ADVANCE', 'HOLD', 'DO_NOT_ADVANCE'] as const;

@Schema({ timestamps: true, collection: 'recruiter_interviews' })
export class RecruiterInterview {
  @Prop({ default: false, index: true })
  isDemoData: boolean;

  @Prop({ type: String, index: true })
  demoDatasetId?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'PlacementDrive', required: true, index: true })
  driveId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'PlacementApplication', required: true, index: true })
  applicationId: string;

  @Prop({ type: String, required: true, index: true })
  studentId: string;

  @Prop({ type: String, required: true, index: true })
  recruiterId: string;

  @Prop({ type: String, required: true })
  interviewerId: string;

  @Prop({ type: Date, required: true, index: true })
  startsAt: Date;

  @Prop({ type: String, required: true, trim: true, maxlength: 60 })
  round: string;

  @Prop({ type: String, trim: true, maxlength: 1000, default: '' })
  instructions: string;

  @Prop({ type: String, trim: true, maxlength: 500 })
  meetingUrl?: string;

  @Prop({ type: String, enum: RECRUITER_INTERVIEW_STATUS, default: 'SCHEDULED', index: true })
  status: (typeof RECRUITER_INTERVIEW_STATUS)[number];

  @Prop({ type: String, trim: true, maxlength: 500 })
  cancellationReason?: string;

  @Prop(raw({
    technicalKnowledge: { type: Number, min: 1, max: 5 },
    problemSolving: { type: Number, min: 1, max: 5 },
    communication: { type: Number, min: 1, max: 5 },
    projectUnderstanding: { type: Number, min: 1, max: 5 },
    comments: { type: String, maxlength: 2000 },
    recommendation: { type: String, enum: RECRUITER_INTERVIEW_RECOMMENDATION },
    submittedAt: Date,
  }))
  feedback?: {
    technicalKnowledge?: number;
    problemSolving?: number;
    communication?: number;
    projectUnderstanding?: number;
    comments?: string;
    recommendation?: (typeof RECRUITER_INTERVIEW_RECOMMENDATION)[number];
    submittedAt?: Date;
  };
}

export const RecruiterInterviewSchema = SchemaFactory.createForClass(RecruiterInterview);
RecruiterInterviewSchema.index({ driveId: 1, startsAt: 1 });
RecruiterInterviewSchema.index({ recruiterId: 1, startsAt: -1 });
RecruiterInterviewSchema.index({ interviewerId: 1, startsAt: -1 });
RecruiterInterviewSchema.index(
  { applicationId: 1, round: 1 },
  { unique: true, partialFilterExpression: { status: 'SCHEDULED' }, name: 'one_scheduled_round_per_application' },
);
