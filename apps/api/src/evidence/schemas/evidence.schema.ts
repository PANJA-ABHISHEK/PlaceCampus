import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
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
  implements
    Omit<
      EvidenceItem,
      | 'id'
      | 'createdAt'
      | 'updatedAt'
      // Stored as Dates; serialised to ISO strings in API responses.
      | 'reviewAssignedAt'
      | 'reviewDueAt'
      | 'reviewLockExpiresAt'
    >
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

  /* Review routing (set when the item needs a human reviewer). */

  /** Faculty user this item is routed to. */
  @Prop({ type: String, index: true })
  reviewerId?: string;

  @Prop({ type: Date })
  reviewAssignedAt?: Date;

  /** Service level: 3 working days from assignment. */
  @Prop({ type: Date })
  reviewDueAt?: Date;

  /** Reviewer currently holding the soft lock. */
  @Prop({ type: String })
  reviewClaimedBy?: string;

  /** Renewable 30-minute soft lock. */
  @Prop({ type: Date })
  reviewLockExpiresAt?: Date;

  /** COORDINATOR when no reviewer could be routed, or after an escalation. */
  @Prop({ type: String, enum: ['COORDINATOR'] })
  reviewQueue?: 'COORDINATOR';

  /** Latest escalation by a reviewer (Master Plan §12.8 reason codes). */
  @Prop(
    raw({ reasonCode: String, comment: String, by: String, at: Date, previousReviewerId: String }),
  )
  reviewEscalation?: { reasonCode: string; comment?: string; by: string; at: Date; previousReviewerId?: string };
}

export const EvidenceSchema = SchemaFactory.createForClass(Evidence);
