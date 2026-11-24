import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ApplicationStatus } from '@placecampus/shared-types';

export type ApplicationDocument = PlacementApplication & Document;

@Schema({ timestamps: true })
export class PlacementApplication {
  @Prop({ default: false, index: true })
  isDemoData: boolean;

  @Prop({ type: String, index: true })
  demoDatasetId?: string;

  @Prop({ type: String, maxlength: 2000 })
  recruiterNotes?: string;

  @Prop({ type: String, required: true })
  driveId: string;

  @Prop({ type: String, required: true })
  studentId: string;

  @Prop({
    type: String,
    enum: Object.values(ApplicationStatus),
    default: ApplicationStatus.APPLIED,
  })
  status: ApplicationStatus;

  @Prop({ type: Date, default: Date.now })
  appliedAt: Date;

  @Prop({ type: Object })
  eligibilitySnapshot: Record<string, any>;

  @Prop({ type: Object })
  matchSnapshot: Record<string, any>;

  @Prop({ type: Object })
  readinessSnapshot: any; // Storing as unstructured object to adapt to Readiness module updates

  @Prop({ type: String })
  reviewedBy?: string;

  @Prop({ type: Date })
  reviewedAt?: Date;

  @Prop({ type: String })
  reviewerComment?: string;

  @Prop({ type: String })
  rejectionReason?: string;
}

export const ApplicationSchema =
  SchemaFactory.createForClass(PlacementApplication);

// Enforce unique application per student per drive
ApplicationSchema.index({ studentId: 1, driveId: 1 }, { unique: true });
// Recruiter listings are scoped by assigned drive and sorted newest first.
ApplicationSchema.index({ driveId: 1, createdAt: -1 });
ApplicationSchema.index({ driveId: 1, status: 1, createdAt: -1 });

// Transform output
ApplicationSchema.set('toJSON', {
  transform: (doc, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
