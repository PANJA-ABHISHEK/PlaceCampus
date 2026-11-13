import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import {
  INTERVIEW_ASSESSMENTS,
  type InterviewAssessment,
} from '@placecampus/shared-types';

export type InterviewFeedbackDocument = InterviewFeedbackRecord & Document;

const score = { type: Number, required: true, min: 1, max: 5 } as const;

/** Structured post-interview evaluation (one per interview). */
@Schema({ timestamps: true, collection: 'interviewfeedbacks' })
export class InterviewFeedbackRecord {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'MockInterview' })
  interviewId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'User', index: true })
  facultyId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'User', index: true })
  studentId: Types.ObjectId;

  @Prop(score) technicalKnowledge: number;
  @Prop(score) problemSolving: number;
  @Prop(score) communication: number;
  @Prop(score) conceptualUnderstanding: number;
  @Prop(score) confidence: number;

  /** Mean of the five criteria, rounded to one decimal place. Computed by the server. */
  @Prop({ required: true, min: 1, max: 5 })
  overallScore: number;

  @Prop({ required: true, maxlength: 2000 })
  strengths: string;

  @Prop({ required: true, maxlength: 2000 })
  improvements: string;

  @Prop({ maxlength: 3000 })
  facultyComments?: string;

  @Prop({ type: [String], default: [] })
  recommendedTopics: string[];

  @Prop({ type: String, required: true, enum: INTERVIEW_ASSESSMENTS })
  assessment: InterviewAssessment;

  createdAt: Date;
  updatedAt: Date;
}

export const InterviewFeedbackSchema = SchemaFactory.createForClass(
  InterviewFeedbackRecord,
);
InterviewFeedbackSchema.index({ interviewId: 1 }, { unique: true });
