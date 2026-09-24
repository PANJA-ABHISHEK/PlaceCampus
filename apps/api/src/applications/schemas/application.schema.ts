import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ApplicationStatus } from '@placecampus/shared-types';

@Schema({ timestamps: true })
export class Application extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  studentId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'PlacementDrive', required: true })
  driveId: string;

  @Prop({ type: String, enum: ApplicationStatus, default: ApplicationStatus.APPLIED })
  status: ApplicationStatus;

  @Prop({ required: false })
  notes?: string;
}

export const ApplicationSchema = SchemaFactory.createForClass(Application);
