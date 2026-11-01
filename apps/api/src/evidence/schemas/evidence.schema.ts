import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  EvidenceItem,
  EvidenceType,
  EvidenceStatus,
  EvidenceDocument as SharedEvidenceDocument,
} from '@placecampus/shared-types';
export type EvidenceDocument = Evidence & Document;

@Schema({ timestamps: true })
export class Evidence
  extends Document
  implements Omit<EvidenceItem, 'id' | 'createdAt' | 'updatedAt'>
{
  @Prop({ type: String, required: true, index: true })
  studentId: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String, enum: Object.values(EvidenceType), required: true })
  type: EvidenceType;

  @Prop({
    type: String,
    enum: Object.values(EvidenceStatus),
    default: EvidenceStatus.UNVERIFIED,
  })
  status: EvidenceStatus;

  @Prop({ type: String })
  issuer?: string;

  @Prop({ type: String })
  issuedDate?: string;

  @Prop({ type: String })
  externalUrl?: string;

  @Prop({
    type: {
      id: String,
      originalName: String,
      mimeType: String,
      size: Number,
      key: String, // Note: internal key, not exposed to frontend usually, or exposed as url via controller
    },
    _id: false, // Prevents generating an _id for this subdocument
  })
  document?: SharedEvidenceDocument & { key?: string };
  @Prop({ type: String })
  rejectionReason?: string;

  @Prop({ type: String })
  verifiedAt?: string;
}

export const EvidenceSchema = SchemaFactory.createForClass(Evidence);
