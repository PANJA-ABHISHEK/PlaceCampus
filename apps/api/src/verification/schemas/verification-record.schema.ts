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

  @Prop({ enum: ['PDF_TEXT', 'IMAGE_OCR', 'NONE'] })
  extractionMethod: string;

  @Prop({ type: Object })
  extractedTextMetadata: {
    wordCount: number;
    hasText: boolean;
  };

  @Prop()
  aiProvider: string;

  @Prop()
  modelVersion: string;

  @Prop({ type: Object })
  aiResult: any;

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
