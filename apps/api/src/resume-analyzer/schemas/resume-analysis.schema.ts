import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import type {
  ResumeCategoryScore,
  ResumeFileType,
  ResumeInsight,
  ResumeJobMatch,
  ResumeRecommendation,
  ResumeSectionFeedback,
  ResumeSignals,
  ResumeTextIssue,
} from '@placecampus/shared-types';

/**
 * One saved analysis. Only validated, grounded results are stored (see
 * finalize-analysis.ts). Snapshots the file name so history survives the
 * resume being replaced or removed. Nested results are stored as plain
 * objects: their shape is enforced by Zod before saving.
 */
@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'resume_analyses' })
export class ResumeAnalysisRecord extends Document {
  @Prop({ type: String, required: true })
  studentId: string;

  @Prop({ type: String, required: true })
  resumeId: string;

  @Prop({ type: String, required: true })
  fileName: string;

  @Prop({ type: String, enum: ['PDF', 'DOCX'], required: true })
  fileType: ResumeFileType;

  @Prop({ type: String, required: true })
  resumeSha256: string;

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  overallScore: number;

  @Prop({ type: String, required: true })
  targetRole: string;

  @Prop({ type: Boolean, default: false })
  targetRoleInferred: boolean;

  @Prop({ type: String, required: true })
  summary: string;

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  categories: ResumeCategoryScore[];

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  strengths: ResumeInsight[];

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  weaknesses: ResumeInsight[];

  @Prop({ type: [String], default: [] })
  missingSkills: string[];

  @Prop({ type: [String], default: [] })
  missingKeywords: string[];

  @Prop({ type: [String], default: [] })
  formattingIssues: string[];

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  grammarIssues: ResumeTextIssue[];

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  weakBullets: ResumeTextIssue[];

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  sectionFeedback: ResumeSectionFeedback[];

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  recommendations: ResumeRecommendation[];

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  signals: ResumeSignals;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  jobMatch: ResumeJobMatch | null;

  @Prop({ type: String, default: null })
  jobDescriptionExcerpt: string | null;

  /** SHA-256 of the full job description (the full text is not kept). */
  @Prop({ type: String, default: null })
  jobDescriptionSha256: string | null;

  @Prop({ type: String, required: true })
  provider: string;

  @Prop({ type: String, required: true })
  aiModel: string;

  @Prop({ type: String, required: true })
  promptVersion: string;

  @Prop({ type: Number })
  latencyMs?: number;

  createdAt: Date;
}

export const ResumeAnalysisRecordSchema = SchemaFactory.createForClass(ResumeAnalysisRecord);
ResumeAnalysisRecordSchema.index({ studentId: 1, createdAt: -1 });
