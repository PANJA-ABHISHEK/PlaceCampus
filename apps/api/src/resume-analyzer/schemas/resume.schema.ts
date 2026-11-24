import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import type { ResumeExtractionMethod, ResumeFileType } from '@placecampus/shared-types';

/**
 * A student's current resume. One per student: a new upload replaces the
 * previous file. The file lives in private storage (authenticated Cloudinary
 * or the local uploads directory) and is never served publicly; its storage
 * key and extracted text are excluded from queries unless asked for.
 */
@Schema({ timestamps: true, collection: 'resumes' })
export class Resume extends Document {
  @Prop({ type: String, required: true, unique: true, index: true })
  studentId: string;

  @Prop({ type: String, required: true })
  fileName: string;

  @Prop({ type: String, enum: ['PDF', 'DOCX'], required: true })
  fileType: ResumeFileType;

  @Prop({ type: String, required: true })
  mimeType: string;

  @Prop({ type: Number, required: true })
  size: number;

  @Prop({ type: String, required: true, select: false })
  storageKey: string;

  @Prop({ type: String, required: true })
  sha256: string;

  @Prop({ type: String, required: true, select: false })
  text: string;

  @Prop({ type: Number, default: null })
  pageCount: number | null;

  @Prop({ type: Number, required: true })
  wordCount: number;

  @Prop({ type: String, enum: ['PDF_TEXT', 'OCR', 'MIXED', 'DOCX'], required: true })
  extractionMethod: ResumeExtractionMethod;

  @Prop({ type: Number, default: null })
  ocrConfidence: number | null;

  createdAt: Date;
  updatedAt: Date;
}

export const ResumeSchema = SchemaFactory.createForClass(Resume);
