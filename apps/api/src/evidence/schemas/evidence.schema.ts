import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';

export enum EvidenceType {
  CERTIFICATE = 'CERTIFICATE',
  PROJECT = 'PROJECT',
  INTERNSHIP = 'INTERNSHIP',
  HACKATHON = 'HACKATHON',
  CODING_PROFILE = 'CODING_PROFILE',
  ACADEMIC = 'ACADEMIC',
  RESUME = 'RESUME',
  TRAINING = 'TRAINING',
  OTHER = 'OTHER',
}

export enum EvidenceStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
}

export type EvidenceDocument = HydratedDocument<Evidence>;

@Schema({ timestamps: true })
export class Evidence {
  declare _id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  studentId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, enum: EvidenceType, type: String })
  type!: EvidenceType;

  @Prop({ required: true })
  fileUrl!: string;

  @Prop({ type: String })
  originalFileName?: string;

  @Prop({ type: String })
  mimeType?: string;

  @Prop({ type: Number })
  fileSize?: number;

  @Prop({ type: [String], default: [] })
  claimedSkills!: string[];

  @Prop({
    required: true,
    enum: EvidenceStatus,
    type: String,
    default: EvidenceStatus.UPLOADED,
  })
  status!: EvidenceStatus;

  @Prop({ type: Object })
  aiAnalysis?: {
    documentType?: string;
    extractedName?: string;
    issuer?: string;
    claimedSkill?: string;
    skillRelevant?: boolean;
    isReadable?: boolean;
    possibleDuplicate?: boolean;
    decision?: string;
    reasons?: string[];
    modelVersion?: string;
    processedAt?: Date;
  };

  @Prop({ type: Types.ObjectId, ref: 'User' })
  verifiedBy?: Types.ObjectId;

  @Prop({ type: Date })
  verifiedAt?: Date;

  @Prop({ type: String })
  rejectionReason?: string;

  @Prop({ type: String })
  reviewNotes?: string;

  declare createdAt: Date;
  declare updatedAt: Date;
}

export const EvidenceSchema = SchemaFactory.createForClass(Evidence);

// Indexes
EvidenceSchema.index({ studentId: 1, status: 1 });
EvidenceSchema.index({ status: 1 });
EvidenceSchema.index({ createdAt: -1 });
EvidenceSchema.index({ studentId: 1, title: 1, type: 1 });
