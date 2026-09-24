import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class ReadinessDimension {
  @Prop({ required: true })
  name: string; // e.g., 'Technical', 'Aptitude', 'Soft Skills'

  @Prop({ required: true })
  score: number; // 0-100

  @Prop([String])
  strengths: string[];

  @Prop([String])
  weaknesses: string[];
}

@Schema({ timestamps: true })
export class ReadinessScore extends Document {
  @Prop({ type: Types.ObjectId, ref: 'StudentProfile', required: true, index: true })
  studentId: string;

  @Prop({ required: true })
  overallScore: number;

  @Prop({ type: [ReadinessDimension], default: [] })
  dimensions: ReadinessDimension[];

  @Prop()
  aiFeedback: string;

  @Prop()
  lastCalculatedAt: Date;
}

export const ReadinessScoreSchema = SchemaFactory.createForClass(ReadinessScore);

@Schema({ timestamps: true })
export class PreparationPlan extends Document {
  @Prop({ type: Types.ObjectId, ref: 'StudentProfile', required: true, index: true })
  studentId: string;

  @Prop({ required: true })
  targetRole: string; // e.g., 'Software Engineer'

  @Prop([
    {
      title: { type: String, required: true },
      description: { type: String },
      type: { type: String, enum: ['COURSE', 'PROJECT', 'MOCK_INTERVIEW', 'PRACTICE'], required: true },
      isCompleted: { type: Boolean, default: false },
      dueDate: { type: Date },
    }
  ])
  tasks: Array<{
    title: string;
    description: string;
    type: string;
    isCompleted: boolean;
    dueDate?: Date;
  }>;
}

export const PreparationPlanSchema = SchemaFactory.createForClass(PreparationPlan);
