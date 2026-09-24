import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { DriveStatus } from '@placecampus/shared-types';

@Schema({ _id: false })
export class EligibilityCriteria {
  @Prop({ required: true, default: 0 })
  minimumCgpa: number;

  @Prop({ required: true, default: 0 })
  maximumActiveBacklogs: number;

  @Prop({ type: [String], required: true, default: [] })
  eligibleBranches: string[];

  @Prop({ required: false })
  minimumTenthPercentage?: number;

  @Prop({ required: false })
  minimumTwelfthPercentage?: number;

  @Prop({ type: [Number], required: false })
  graduationYears?: number[];
}

export const EligibilityCriteriaSchema = SchemaFactory.createForClass(EligibilityCriteria);

@Schema({ _id: false })
export class DriveSkillRequirement {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Skill', required: true })
  skillId: string;

  @Prop({ required: true })
  skillName: string;

  @Prop({ required: true })
  minimumLevel: string;

  @Prop({ required: true, default: 1 })
  weight: number;

  @Prop({ required: true, default: true })
  isRequired: boolean;
}

export const DriveSkillRequirementSchema = SchemaFactory.createForClass(DriveSkillRequirement);

@Schema({ timestamps: true })
export class PlacementDrive extends Document {
  @Prop({ required: true })
  companyId: string; // Could be a ref if we had a Company collection, keeping simple string for now

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  jobRole: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  location: string;

  @Prop({ required: true })
  packageLpa: number;

  @Prop({ required: true })
  applicationDeadline: Date;

  @Prop({ required: true })
  driveDate: Date;

  @Prop({ type: String, enum: DriveStatus, default: DriveStatus.DRAFT })
  status: DriveStatus;

  @Prop({ type: EligibilityCriteriaSchema, required: true })
  eligibilityCriteria: EligibilityCriteria;

  @Prop({ type: [DriveSkillRequirementSchema], default: [] })
  requiredSkills: DriveSkillRequirement[];

  @Prop({ type: [DriveSkillRequirementSchema], default: [] })
  preferredSkills: DriveSkillRequirement[];

  @Prop({ required: false })
  maxSelections?: number;

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'StudentProfile', default: [] })
  registeredStudentIds: string[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  approvedBy?: string;

  @Prop({ required: false })
  approvedAt?: Date;
}

export const PlacementDriveSchema = SchemaFactory.createForClass(PlacementDrive);
