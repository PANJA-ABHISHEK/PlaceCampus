import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  GapPriority,
  PreparationItemStatus,
  PreparationPlanStatus,
} from '@placecampus/shared-types';

export type PreparationPlanDocument = PreparationPlan & Document;

@Schema({ _id: false })
export class PreparationAssessmentCheckpoint {
  @Prop({ required: true })
  assessmentId: string;

  @Prop({ required: true })
  title: string;
}

export const PreparationAssessmentCheckpointSchema =
  SchemaFactory.createForClass(PreparationAssessmentCheckpoint);

@Schema({ _id: false })
export class PreparationItem {
  @Prop({ required: true })
  itemId: string;

  @Prop({ required: true })
  skillId: string;

  @Prop({ required: true })
  skillName: string;

  @Prop({ required: true, min: 0, max: 5 })
  currentLevel: number;

  @Prop({ required: true, min: 1, max: 5 })
  requiredLevel: number;

  @Prop({ required: true, min: 1 })
  gapAmount: number;

  @Prop({ required: true, type: String, enum: ['HIGH', 'MEDIUM', 'LOW'] })
  priority: GapPriority;

  @Prop({ required: true })
  isOptional: boolean;

  @Prop({ required: true })
  explanation: string;

  @Prop({ required: true, type: String, enum: ['TODO', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'] })
  status: PreparationItemStatus;

  @Prop({ required: true, type: [String] })
  recommendedActions: string[];

  @Prop({ type: PreparationAssessmentCheckpointSchema })
  assessmentCheckpoint?: PreparationAssessmentCheckpoint;

  @Prop()
  completedAt?: Date;
}

export const PreparationItemSchema = SchemaFactory.createForClass(PreparationItem);

@Schema({ timestamps: true })
export class PreparationPlan {
  @Prop({ required: true, type: String })
  studentId: string;

  @Prop({ required: true, type: String })
  driveId: string;

  @Prop({ required: true, default: 'DRIVE_MATCH' })
  source: string;

  @Prop({ required: true, type: String, enum: ['ACTIVE', 'COMPLETED', 'ARCHIVED'] })
  status: PreparationPlanStatus;

  @Prop({ required: true, type: [PreparationItemSchema], default: [] })
  items: PreparationItem[];

  @Prop({ required: true, min: 0, max: 100, default: 0 })
  completionPercentage: number;

  @Prop({ type: String })
  previousPlanId?: string;
}

export const PreparationPlanSchema = SchemaFactory.createForClass(PreparationPlan);
PreparationPlanSchema.index(
  { studentId: 1, driveId: 1 },
  { unique: true, partialFilterExpression: { status: PreparationPlanStatus.ACTIVE } },
);
PreparationPlanSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});
