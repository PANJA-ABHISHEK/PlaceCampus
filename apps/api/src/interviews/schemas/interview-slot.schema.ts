import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  INTERVIEW_TYPES,
  InterviewSlotStatus,
  type InterviewType,
} from '@placecampus/shared-types';

export type InterviewSlotDocument = InterviewSlot & Document;

/** A time a faculty member offers for a live mock interview. */
@Schema({ timestamps: true })
export class InterviewSlot {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true })
  interviewerId: string;

  @Prop({ type: String, required: true, enum: INTERVIEW_TYPES })
  type: InterviewType;

  @Prop({ type: Date, required: true, index: true })
  startsAt: Date;

  @Prop({ required: true, min: 15, max: 120 })
  durationMinutes: number;

  @Prop({ required: true })
  meetingUrl: string;

  @Prop({ maxlength: 500 })
  notes?: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(InterviewSlotStatus),
    default: InterviewSlotStatus.OPEN,
    index: true,
  })
  status: InterviewSlotStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  bookedBy?: string;

  @Prop({ type: Types.ObjectId, ref: 'MockInterview' })
  interviewId?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const InterviewSlotSchema = SchemaFactory.createForClass(InterviewSlot);
InterviewSlotSchema.index({ status: 1, startsAt: 1 });
