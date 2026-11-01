import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  StudentSkillProfile as IStudentSkillProfile,
  StudentSkillEntry as IStudentSkillEntry,
} from '@placecampus/shared-types';

export type StudentSkillProfileDocument = StudentSkillProfile & Document;

@Schema({ _id: false })
class StudentSkillEntry implements Omit<IStudentSkillEntry, 'id'> {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Skill' })
  skillId: string;

  @Prop({ required: true })
  canonicalName: string;

  @Prop({ required: true, default: 1 })
  level: number;

  @Prop({
    required: true,
    enum: ['VERIFIED', 'UNVERIFIED'],
    default: 'UNVERIFIED',
  })
  verificationStatus: 'VERIFIED' | 'UNVERIFIED';

  @Prop({ type: [Types.ObjectId], ref: 'Evidence', default: [] })
  sourceEvidenceIds: string[];

  @Prop()
  lastVerifiedAt: string;
}

const StudentSkillEntrySchema = SchemaFactory.createForClass(StudentSkillEntry);

@Schema({ timestamps: true })
export class StudentSkillProfile implements Omit<
  IStudentSkillProfile,
  'id' | 'updatedAt'
> {
  @Prop({
    type: Types.ObjectId,
    required: true,
    ref: 'StudentProfile',
    unique: true,
  })
  studentId: string;

  @Prop({ type: [StudentSkillEntrySchema], default: [] })
  skills: StudentSkillEntry[];
}

export const StudentSkillProfileSchema =
  SchemaFactory.createForClass(StudentSkillProfile);

StudentSkillProfileSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    const r = ret as any;
    r.id = r._id.toString();
    delete (ret as any)._id;
  },
});
