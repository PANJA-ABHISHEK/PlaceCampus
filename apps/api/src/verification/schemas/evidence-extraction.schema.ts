import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EvidenceExtractionDocument = EvidenceExtraction & Document;

/**
 * One text-extraction run per evidence version (Master Plan §12 / data model
 * `evidence_extractions`). Holds the extracted text for reviewers and the
 * fingerprints used for duplicate detection.
 */
@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'evidence_extractions' })
export class EvidenceExtraction extends Document {
  @Prop({ required: true, index: true })
  evidenceId: string;

  @Prop({ required: true, index: true })
  studentId: string;

  /** Matches the verification record's attemptNumber. */
  @Prop({ required: true, default: 1 })
  version: number;

  @Prop()
  fileId?: string;

  @Prop({ required: true, enum: ['PDF_TEXT', 'OCR', 'MIXED', 'NONE'] })
  method: string;

  @Prop({ required: true, enum: ['COMPLETED', 'PARTIAL', 'FAILED'] })
  status: string;

  /** Extracted text, truncated to MAX_STORED_TEXT characters. */
  @Prop({ default: '' })
  text: string;

  @Prop({ default: false })
  textTruncated: boolean;

  @Prop({ default: 0 })
  charCount: number;

  @Prop({ default: 0 })
  wordCount: number;

  @Prop({ type: Number, default: null })
  ocrConfidence: number | null;

  @Prop({ default: 0 })
  pageCount: number;

  @Prop({ type: [Object], default: [] })
  pages: { page: number; source: string; chars: number; ocrConfidence?: number; error?: string }[];

  @Prop({ index: true })
  fileSha256?: string;

  @Prop({ index: true })
  textFingerprint?: string;

  @Prop({ type: Object, default: {} })
  engineVersions: { pdfParse?: string; tesseract?: string };

  @Prop()
  durationMs: number;

  @Prop()
  error?: string;
}

export const EvidenceExtractionSchema = SchemaFactory.createForClass(EvidenceExtraction);
EvidenceExtractionSchema.index({ evidenceId: 1, version: -1 });
