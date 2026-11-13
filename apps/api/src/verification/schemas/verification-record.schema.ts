import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { EvidenceStatus } from '@placecampus/shared-types';

export type VerificationRecordDocument = VerificationRecord & Document;

@Schema({ timestamps: true, collection: 'verification_records' })
export class VerificationRecord extends Document {
  @Prop({ required: true, index: true })
  evidenceId: string;

  @Prop({ required: true, index: true })
  studentId: string;

  @Prop({ required: true, default: 1 })
  attemptNumber: number;

  /** IMAGE_OCR is the legacy value written before PDF page OCR existed. */
  @Prop({ enum: ['PDF_TEXT', 'OCR', 'MIXED', 'IMAGE_OCR', 'NONE'] })
  extractionMethod: string;

  @Prop({ enum: ['COMPLETED', 'PARTIAL', 'FAILED'] })
  extractionStatus?: string;

  /** The evidence_extractions document holding the text for this attempt. */
  @Prop()
  extractionId?: string;

  @Prop({ type: Object })
  extractedTextMetadata: {
    wordCount: number;
    hasText: boolean;
    charCount?: number;
    pageCount?: number;
    ocrConfidence?: number | null;
  };

  /** Other evidence with the same file or text (reviewer-only). */
  @Prop({ type: [Object], default: undefined })
  duplicateMatches?: { evidenceId: string; matchType: 'FILE' | 'TEXT'; sameStudent: boolean }[];

  @Prop()
  aiProvider: string;

  @Prop()
  modelVersion: string;

  /** Compatibility view of the AI analysis (read by skill aggregation and the review UI). */
  @Prop({ type: Object })
  aiResult: any;

  @Prop({ enum: ['SUCCEEDED', 'INVALID_OUTPUT', 'REFUSED', 'FAILED', 'DISABLED'] })
  aiStatus?: string;

  /** The ai_analyses document for this attempt. */
  @Prop()
  aiAnalysisId?: string;

  @Prop({ type: Object })
  ruleResults: any;

  @Prop({ required: true, type: String, enum: EvidenceStatus })
  finalDecision: EvidenceStatus;

  @Prop({ type: [String] })
  reasons: string[];

  @Prop()
  processingDurationMs: number;

  @Prop()
  errorInformation: string;

  @Prop()
  reviewedBy?: string;

  @Prop()
  reviewedAt?: string;

  @Prop()
  reviewerComments?: string;
}

export const VerificationRecordSchema =
  SchemaFactory.createForClass(VerificationRecord);
