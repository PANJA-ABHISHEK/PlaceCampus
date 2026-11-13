import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  INTERVIEW_QUESTION_CATEGORIES,
  MockInterviewStatus,
  InterviewRubric,
  type InterviewQuestionCategory,
} from '@placecampus/shared-types';

export type MockInterviewDocument = MockInterview & Document;

@Schema({ _id: false })
class InterviewRubricSchemaClass implements InterviewRubric {
  @Prop({ type: Number, min: 0, max: 10 })
  technicalKnowledge?: number;

  @Prop({ type: Number, min: 0, max: 10 })
  problemSolving?: number;

  @Prop({ type: Number, min: 0, max: 10 })
  communication?: number;

  @Prop({ type: Number, min: 0, max: 10 })
  projectDepth?: number;

  @Prop({ type: Number, min: 0, max: 10 })
  conceptualUnderstanding?: number;

  @Prop({ type: Number, min: 0, max: 10 })
  confidence?: number;
}

const InterviewRubricSchema = SchemaFactory.createForClass(
  InterviewRubricSchemaClass,
);

/** A question on one interview; `feedback` is private to the faculty member. */
@Schema({ _id: true })
export class InterviewQuestionItem {
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 500 })
  text: string;

  @Prop({ type: String, required: true, enum: INTERVIEW_QUESTION_CATEGORIES })
  category: InterviewQuestionCategory;

  @Prop({ default: false })
  asked: boolean;

  @Prop()
  askedAt?: string;

  @Prop({ maxlength: 1000 })
  feedback?: string;
}

export const InterviewQuestionItemSchema = SchemaFactory.createForClass(
  InterviewQuestionItem,
);

@Schema({ timestamps: true })
export class MockInterview {
  @Prop({ type: Types.ObjectId, required: true, ref: 'StudentProfile' })
  studentId: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  interviewerId?: string;

  @Prop({ required: true })
  type: string; // e.g., 'Technical', 'HR', 'System Design'

  @Prop({ required: true })
  scheduledAt: string;

  @Prop()
  durationMinutes?: number;

  @Prop()
  meetingUrl?: string;

  /** The faculty slot this interview was booked from, if any. */
  @Prop({ type: Types.ObjectId, ref: 'InterviewSlot' })
  slotId?: string;

  @Prop()
  cancelledAt?: string;

  @Prop({ type: String, enum: ['STUDENT', 'FACULTY'] })
  cancelledBy?: 'STUDENT' | 'FACULTY';

  @Prop({ maxlength: 300 })
  cancellationReason?: string;

  @Prop()
  startedAt?: string;

  @Prop()
  completedAt?: string;

  @Prop({
    type: String,
    required: true,
    enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
    default: 'SCHEDULED',
  })
  status: MockInterviewStatus;

  @Prop()
  notes?: string;

  @Prop({ type: InterviewRubricSchema })
  rubricScores?: InterviewRubricSchemaClass;

  @Prop()
  feedback?: string;

  /* ---- Direct scheduling and the in-app video room ---- */

  @Prop({ trim: true, maxlength: 120 })
  title?: string;

  @Prop({ maxlength: 2000 })
  instructions?: string;

  @Prop({ type: [InterviewQuestionItemSchema], default: undefined })
  questions?: InterviewQuestionItem[];

  /** Private to the interviewer; never sent to the student. */
  @Prop({ maxlength: 5000 })
  facultyNotes?: string;

  /**
   * Unguessable identifier of the in-app video room (crypto random). Set when the
   * interview is scheduled directly, or the first time a slot booking is started.
   */
  @Prop()
  roomId?: string;

  /** When the faculty member ended the live call; evaluation may still be pending. */
  @Prop()
  endedAt?: string;

  @Prop()
  rescheduledAt?: string;

  createdAt: string;
  updatedAt: string;
}

export const MockInterviewSchema = SchemaFactory.createForClass(MockInterview);
MockInterviewSchema.index({ interviewerId: 1, scheduledAt: -1 });
MockInterviewSchema.index({ studentId: 1, scheduledAt: -1 });
MockInterviewSchema.index({ roomId: 1 }, { unique: true, sparse: true });

MockInterviewSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    const r = ret as any;
    r.id = r._id.toString();
    delete (ret as any)._id;
  },
});
