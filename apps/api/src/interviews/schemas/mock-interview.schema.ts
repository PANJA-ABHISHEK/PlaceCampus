import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  MockInterview as IMockInterview,
  MockInterviewStatus,
  InterviewRubric,
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
}

const InterviewRubricSchema = SchemaFactory.createForClass(
  InterviewRubricSchemaClass,
);

@Schema({ timestamps: true })
export class MockInterview implements Omit<IMockInterview, 'id'> {
  @Prop({ type: Types.ObjectId, required: true, ref: 'StudentProfile' })
  studentId: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  interviewerId?: string;

  @Prop({ required: true })
  type: string; // e.g., 'Technical', 'HR', 'System Design'

  @Prop({ required: true })
  scheduledAt: string;

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

  createdAt: string;
  updatedAt: string;
}

export const MockInterviewSchema = SchemaFactory.createForClass(MockInterview);

MockInterviewSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    const r = ret as any;
    r.id = r._id.toString();
    delete (ret as any)._id;
  },
});
