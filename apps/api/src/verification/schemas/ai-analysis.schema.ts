import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AiAnalysisDocument = HydratedDocument<AiAnalysis>;

/**
 * Master Plan data model `ai_analyses`: one AI document-analysis run per
 * evidence version. Reviewer-only; students see a summary at most.
 */
@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'ai_analyses' })
// Not `extends Document`: the `model` field would shadow Document#model().
export class AiAnalysis {
  @Prop({ required: true, index: true })
  evidenceId: string;

  @Prop({ required: true, index: true })
  studentId: string;

  @Prop({ required: true, default: 1 })
  version: number;

  @Prop({ required: true, enum: ['groq', 'openai', 'none'] })
  provider: string;

  @Prop()
  model?: string;

  @Prop({ required: true })
  promptVersion: string;

  @Prop({ required: true, enum: ['SUCCEEDED', 'INVALID_OUTPUT', 'REFUSED', 'FAILED', 'DISABLED'] })
  status: string;

  /** Post-validated DocumentAnalysisResult. */
  @Prop({ type: Object })
  result?: Record<string, unknown>;

  @Prop({ type: Object, default: { droppedSkillIds: [], unconfirmedFields: [], invalidDates: [] } })
  postValidation: { droppedSkillIds: string[]; unconfirmedFields: string[]; invalidDates: string[] };

  @Prop({ type: Object })
  usage?: { inputTokens?: number; outputTokens?: number; cacheReadTokens?: number };

  @Prop()
  latencyMs?: number;

  @Prop()
  providerRequestId?: string;

  @Prop()
  errorClass?: string;

  @Prop()
  errorDetail?: string;
}

export const AiAnalysisSchema = SchemaFactory.createForClass(AiAnalysis);
AiAnalysisSchema.index({ evidenceId: 1, version: -1, createdAt: -1 });
