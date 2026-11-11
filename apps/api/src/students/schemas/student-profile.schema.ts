import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import type {
  StudentProfile as IStudentProfile,
  StudentNotificationPreferences,
  StudentPrivacyPreferences,
  ThemePreference,
} from '@placecampus/shared-types';

export type StudentProfileDocument = StudentProfile & Document;

@Schema({ timestamps: true, collection: 'student_profiles' })
export class StudentProfile implements Omit<
  IStudentProfile,
  'id' | 'createdAt' | 'updatedAt'
> {
  @Prop({ type: String, required: true, unique: true, index: true })
  userId: string;

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: String })
  bio?: string;

  @Prop({ type: String })
  university?: string;

  /** Institution registration number (institution-controlled, not student-editable). */
  @Prop({ type: String, trim: true })
  registrationNumber?: string;

  @Prop({ type: String })
  department?: string;

  @Prop({ type: String })
  program?: string;

  @Prop({ type: String })
  batch?: string;

  @Prop({ type: Number })
  graduationYear?: number;

  @Prop({ type: Number, min: 0, max: 10 })
  cgpa?: number;

  @Prop({ type: Number, min: 0 })
  backlogs?: number;

  @Prop({ type: String })
  linkedinUrl?: string;

  @Prop({ type: String })
  githubUrl?: string;

  @Prop({ type: String })
  portfolioUrl?: string;

  @Prop({ type: String })
  leetcodeUrl?: string;

  @Prop({ type: String })
  otherUrl?: string;

  @Prop({ type: String })
  resumeUrl?: string;

  /** Approved programme lookup code (`program` keeps the display name). */
  @Prop({ type: String })
  programmeCode?: string;

  /** Authoritative current semester (set only after institutional confirmation). */
  @Prop({ type: Number, min: 1, max: 12 })
  currentSemester?: number;

  /** Values exactly as supplied by the source file, kept for mapping and audit. */
  @Prop(raw({ school: String, program: String, importJobId: String }))
  source?: { school?: string; program?: string; importJobId?: string };

  /**
   * Derived values (computed by the source, not confirmed by the institution).
   * They are not authoritative until approved: then they move to `batch` and
   * `currentSemester`.
   */
  @Prop(
    raw({
      graduationBatch: String,
      currentSemester: Number,
      derivation: [String],
      status: { type: String, enum: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'] },
      importJobId: String,
      reviewedBy: String,
      reviewedAt: Date,
    }),
  )
  derived?: {
    graduationBatch?: string;
    currentSemester?: number;
    derivation?: string[];
    status?: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
    importJobId?: string;
    reviewedBy?: string;
    reviewedAt?: Date;
  };

  /**
   * Student-controlled settings. Absent values fall back to the defaults in
   * `student-preferences.ts` (all notifications on, links shared, light theme).
   */
  @Prop(
    raw({
      notifications: {
        email: Boolean,
        driveAnnouncements: Boolean,
        applicationUpdates: Boolean,
        assessmentUpdates: Boolean,
        interviewUpdates: Boolean,
      },
      privacy: {
        shareProfileLinks: Boolean,
        showLinkedin: Boolean,
        showGithub: Boolean,
        showPortfolio: Boolean,
      },
      theme: { type: String, enum: ['light', 'dark', 'system'] },
    }),
  )
  preferences?: {
    notifications?: Partial<StudentNotificationPreferences>;
    privacy?: Partial<StudentPrivacyPreferences>;
    theme?: ThemePreference;
  };

  /** Synthetic/sample record: never paired with real faculty or records. */
  @Prop({ default: false, index: true })
  isDemoData: boolean;
}

export const StudentProfileSchema =
  SchemaFactory.createForClass(StudentProfile);

/** Registration number is the natural key: unique when present. */
StudentProfileSchema.index(
  { registrationNumber: 1 },
  { unique: true, partialFilterExpression: { registrationNumber: { $type: 'string' } }, name: 'registrationNumber_unique' },
);

StudentProfileSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret: any) => {
    const r = ret as any;
    r.id = r._id.toString();
    delete (ret as any)._id;
  },
});
