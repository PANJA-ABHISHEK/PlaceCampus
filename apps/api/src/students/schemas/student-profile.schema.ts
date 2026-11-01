import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { StudentProfile as IStudentProfile } from '@placecampus/shared-types';

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
  resumeUrl?: string;
}

export const StudentProfileSchema =
  SchemaFactory.createForClass(StudentProfile);

StudentProfileSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret: any) => {
    const r = ret as any;
    r.id = r._id.toString();
    delete (ret as any)._id;
  },
});
