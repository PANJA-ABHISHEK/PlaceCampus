import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  ReadinessSnapshot as IReadinessSnapshot,
  ReadinessStatus,
  ReadinessExplanation,
} from '@placecampus/shared-types';

export type ReadinessSnapshotDocument = ReadinessSnapshot & Document;

@Schema({ _id: false })
class ReadinessFactorSchema {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  score: number;

  @Prop({ required: true })
  weight: number;

  @Prop({ required: true })
  contribution: number;

  @Prop({ required: true })
  coverage: boolean;
}

@Schema({ _id: false })
class ReadinessExplanationSchema implements ReadinessExplanation {
  @Prop({ type: [ReadinessFactorSchema], default: [] })
  factors: ReadinessFactorSchema[];

  @Prop({ type: [String], default: [] })
  strengths: string[];

  @Prop({ type: [String], default: [] })
  areasToImprove: string[];
}

@Schema({ timestamps: true })
export class ReadinessSnapshot implements Omit<IReadinessSnapshot, 'id'> {
  @Prop({ type: Types.ObjectId, required: true, ref: 'StudentProfile' })
  studentId: string;

  @Prop({ required: true })
  overallScore: number;

  @Prop({
    type: String,
    required: true,
    enum: ['READY', 'DEVELOPING', 'NEEDS_PREPARATION'],
  })
  status: ReadinessStatus;

  @Prop({ required: true })
  verifiedSkillsScore: number;

  @Prop({ required: true })
  assessmentsScore: number;

  @Prop({ required: true })
  academicsScore: number;

  @Prop({ required: true })
  projectsScore: number;

  @Prop({ required: true })
  interviewsScore: number;

  @Prop({ type: Object, required: true })
  factorWeights: Record<string, number>;

  @Prop({ type: ReadinessExplanationSchema, required: true })
  explanation: ReadinessExplanationSchema;

  @Prop({ required: true })
  coverageCount: number;

  @Prop({ required: true, default: () => new Date().toISOString() })
  calculatedAt: string;

  @Prop({ required: true, default: 1 })
  version: number;
}

export const ReadinessSnapshotSchema =
  SchemaFactory.createForClass(ReadinessSnapshot);

ReadinessSnapshotSchema.index({ studentId: 1, calculatedAt: -1 });

ReadinessSnapshotSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    const r = ret as any;
    r.id = r._id.toString();
    delete (ret as any)._id;
  },
});
