import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { DriveStatus } from '@placecampus/shared-types';

export type PlacementDriveDocument = PlacementDrive & Document;

@Schema({ _id: false })
export class DriveSkillRequirement {
  @Prop({ required: true })
  skillId: string;

  @Prop()
  skillName?: string;

  @Prop({ required: true, min: 1, max: 5 })
  minimumLevel: number;

  @Prop({ required: true, default: false })
  isOptional: boolean;
}
export const DriveSkillRequirementSchema = SchemaFactory.createForClass(
  DriveSkillRequirement,
);

@Schema({ _id: false })
export class DriveRequirement {
  @Prop({ min: 0, max: 10 })
  minimumCGPA?: number;

  @Prop({ min: 0 })
  maximumBacklogs?: number;

  @Prop()
  graduationYear?: number;

  @Prop({ type: [String] })
  allowedDepartments?: string[];

  @Prop({ type: [DriveSkillRequirementSchema], default: [] })
  skills: DriveSkillRequirement[];
}
export const DriveRequirementSchema =
  SchemaFactory.createForClass(DriveRequirement);

@Schema({ timestamps: true })
export class PlacementDrive {
  @Prop({ required: true })
  companyName: string;

  @Prop({ required: true })
  roleTitle: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  location?: string;

  @Prop()
  workMode?: string;

  @Prop()
  package?: string;

  @Prop()
  applicationStart?: string;

  @Prop()
  applicationDeadline?: string;

  @Prop()
  driveDate?: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(DriveStatus),
    default: DriveStatus.DRAFT,
  })
  status: DriveStatus;

  @Prop({
    type: DriveRequirementSchema,
    required: true,
    default: () => ({ skills: [] }),
  })
  requirements: DriveRequirement;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy: string;
}

export const PlacementDriveSchema =
  SchemaFactory.createForClass(PlacementDrive);

PlacementDriveSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});
