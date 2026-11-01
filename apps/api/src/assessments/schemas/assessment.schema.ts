import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  Assessment as IAssessment,
  AssessmentType,
  AssessmentQuestion,
} from '@placecampus/shared-types';

export type AssessmentDocument = Assessment & Document;

@Schema({ _id: false })
class AssessmentQuestionSchemaClass implements Omit<AssessmentQuestion, 'id'> {
  @Prop({ type: String, default: () => new Types.ObjectId().toString() })
  id: string; // Add explicit string id for questions within the assessment document

  @Prop({ required: true })
  questionText: string;

  @Prop({ type: String, required: true, enum: ['MCQ', 'CODING', 'SUBJECTIVE'] })
  type: AssessmentType;

  @Prop({ type: [String] })
  options?: string[];

  @Prop()
  correctAnswer?: string;

  @Prop({ required: true, default: 1 })
  difficulty: number;

  @Prop({ type: Types.ObjectId, ref: 'Skill' })
  skillId?: string;

  @Prop()
  explanation?: string;

  @Prop({ default: true })
  active: boolean;
}

const AssessmentQuestionSchema = SchemaFactory.createForClass(
  AssessmentQuestionSchemaClass,
);

@Schema({ timestamps: true })
export class Assessment implements Omit<IAssessment, 'id'> {
  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ type: String, required: true, enum: ['MCQ', 'CODING', 'SUBJECTIVE'] })
  type: AssessmentType;

  @Prop({ type: Types.ObjectId, ref: 'Skill' })
  targetSkillId?: string;

  @Prop({ required: true, default: 30 })
  durationMinutes: number;

  @Prop({ required: true, default: 60 })
  passingScore: number;

  @Prop({ required: true, default: 1 })
  difficulty: number;

  @Prop({ default: true })
  active: boolean;

  @Prop({ type: [AssessmentQuestionSchema], default: [] })
  questions: AssessmentQuestionSchemaClass[];

  createdAt: string;
  updatedAt: string;
}

export const AssessmentSchema = SchemaFactory.createForClass(Assessment);

AssessmentSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    const r = ret as any;
    r.id = r._id.toString();
    delete (ret as any)._id;
    // Don't leak correct answers in standard JSON response!
    if (ret.questions) {
      ret.questions.forEach((q: any) => {
        delete q.correctAnswer;
        delete q.explanation;
      });
    }
  },
});
