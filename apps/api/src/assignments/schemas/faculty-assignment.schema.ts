import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { FacultyAssignmentPurpose } from '@placecampus/shared-types';

export type FacultyAssignmentDocument = HydratedDocument<FacultyAssignment>;
export type AssignmentSource = 'ALLOCATION' | 'MANUAL' | 'REASSIGNMENT' | 'SEED';

/**
 * Links one faculty member to one student for one or more purposes
 * (Master Plan §24 `faculty_assignments`). Assignments are never edited away:
 * ending one keeps it as history (status ENDED, who, when, why, replacement).
 */
@Schema({ timestamps: true, collection: 'faculty_assignments' })
export class FacultyAssignment {
  @Prop({ type: String, required: true, index: true })
  facultyUserId: string;

  @Prop({ type: String, required: true, index: true })
  studentId: string;

  @Prop({
    type: [String],
    enum: Object.values(FacultyAssignmentPurpose),
    required: true,
  })
  purposes: FacultyAssignmentPurpose[];

  @Prop({ type: String, enum: ['ACTIVE', 'ENDED'], default: 'ACTIVE', index: true })
  status: 'ACTIVE' | 'ENDED';

  /** A declared conflict blocks this faculty member from reviewing the student's work. */
  @Prop({ default: false })
  conflictOfInterest: boolean;

  @Prop({ type: Date, default: () => new Date() })
  validFrom: Date;

  @Prop({ type: Date })
  validTo?: Date;

  @Prop({ type: String })
  assignedBy?: string;

  @Prop({ type: String, enum: ['ALLOCATION', 'MANUAL', 'REASSIGNMENT', 'SEED'] })
  source?: AssignmentSource;

  @Prop({ type: String })
  reason?: string;

  /** Allocation run that created it (for the preview/commit report). */
  @Prop({ type: String, index: true })
  allocationRunId?: string;

  @Prop({ type: String })
  endedBy?: string;

  @Prop({ type: String })
  endReason?: string;

  /** Reassignment chain. */
  @Prop({ type: String })
  replacedById?: string;

  @Prop({ type: String })
  replacesId?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const FacultyAssignmentSchema =
  SchemaFactory.createForClass(FacultyAssignment);

/** One active link per faculty–student pair (ended ones stay as history). */
FacultyAssignmentSchema.index(
  { facultyUserId: 1, studentId: 1 },
  { unique: true, partialFilterExpression: { status: 'ACTIVE' }, name: 'active_pair_unique' },
);
/** Exactly one active primary mentor per student. */
FacultyAssignmentSchema.index(
  { studentId: 1 },
  { unique: true, partialFilterExpression: { status: 'ACTIVE', purposes: 'MENTOR' }, name: 'one_active_mentor' },
);
