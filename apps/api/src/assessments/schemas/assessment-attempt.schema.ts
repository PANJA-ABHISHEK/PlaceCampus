import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  AssessmentAttempt as IAssessmentAttempt,
  AssessmentAttemptStatus,
} from '@placecampus/shared-types';

export type AssessmentAttemptDocument = AssessmentAttempt & Document;

@Schema({ timestamps: true })
export class AssessmentAttempt implements Omit<IAssessmentAttempt, 'id'> {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Assessment' })
  assessmentId: string;

  @Prop({ type: Types.ObjectId, required: true, ref: 'StudentProfile' })
  studentId: string;

  @Prop({
    type: String,
    required: true,
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'EVALUATED'],
    default: 'NOT_STARTED',
  })
  status: AssessmentAttemptStatus;

  @Prop()
  startedAt?: string;

  @Prop()
  submittedAt?: string;

  @Prop({ type: Object, default: {} })
  answers: Record<string, string>; // questionId -> selected answer

  @Prop()
  score?: number;

  @Prop()
  percentage?: number;

  @Prop()
  passed?: boolean;

  @Prop()
  durationSeconds?: number;

  createdAt: string;
  updatedAt: string;
}

export const AssessmentAttemptSchema =
  SchemaFactory.createForClass(AssessmentAttempt);

AssessmentAttemptSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    const r = ret as any;
    r.id = r._id.toString();
    delete (ret as any)._id;
  },
});
