import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';

export enum Branch {
  CSE = 'CSE',
  IT = 'IT',
  ECE = 'ECE',
  EEE = 'EEE',
  ME = 'ME',
  CE = 'CE',
  OTHER = 'OTHER',
}

export type StudentProfileDocument = HydratedDocument<StudentProfile>;

@Schema({ timestamps: true })
export class StudentProfile {
  declare _id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', unique: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  rollNumber!: string;

  @Prop({ required: true, enum: Branch, type: String })
  branch!: Branch;

  @Prop({ type: String, trim: true })
  department?: string;

  @Prop({ type: String, trim: true })
  program?: string;

  @Prop({ required: true })
  graduationYear!: number;

  @Prop({ required: true, min: 0, max: 10 })
  cgpa!: number;

  @Prop({ default: 0, min: 0 })
  activeBacklogs!: number;

  @Prop({ default: 0, min: 0 })
  totalBacklogs!: number;

  @Prop({ min: 0, max: 100 })
  tenthPercentage?: number;

  @Prop({ min: 0, max: 100 })
  twelfthPercentage?: number;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ type: String })
  resumeUrl?: string;

  @Prop({ type: String })
  linkedinUrl?: string;

  @Prop({ type: String })
  githubUrl?: string;

  @Prop({ type: String })
  portfolioUrl?: string;

  @Prop({ type: String })
  bio?: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Skill' }], default: [] })
  skillIds!: Types.ObjectId[];

  @Prop({ type: [String], default: [] })
  projects!: string[];

  @Prop({ type: [String], default: [] })
  certifications!: string[];

  @Prop({ type: Object })
  placementPreferences?: {
    preferredRoles?: string[];
    preferredLocations?: string[];
    minimumPackageLpa?: number;
  };

  declare createdAt: Date;
  declare updatedAt: Date;
}

export const StudentProfileSchema = SchemaFactory.createForClass(StudentProfile);

// Indexes
StudentProfileSchema.index({ userId: 1 }, { unique: true });
StudentProfileSchema.index({ rollNumber: 1 }, { unique: true });
StudentProfileSchema.index({ branch: 1, graduationYear: 1 });
StudentProfileSchema.index({ cgpa: -1 });
