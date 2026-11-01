import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SkillClaim as ISkillClaim } from '@placecampus/shared-types';

export type SkillClaimDocument = SkillClaim & Document;

@Schema({ timestamps: true })
export class SkillClaim implements Omit<ISkillClaim, 'id'> {
  @Prop({ type: Types.ObjectId, required: true, ref: 'StudentProfile' })
  studentId: string;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Evidence' })
  evidenceId: string;

  @Prop({ type: Types.ObjectId, ref: 'VerificationRecord' })
  verificationRecordId?: string;

  @Prop({ required: true })
  rawClaim: string;

  @Prop({ type: Types.ObjectId, ref: 'Skill' })
  canonicalSkillId?: string;

  @Prop({
    required: true,
    enum: ['UNRESOLVED', 'NORMALIZED', 'VERIFIED', 'REJECTED'],
    default: 'UNRESOLVED',
  })
  status: 'UNRESOLVED' | 'NORMALIZED' | 'VERIFIED' | 'REJECTED';

  @Prop({ required: true, default: 1 })
  level: number;

  @Prop({ required: true })
  source: string;

  @Prop()
  verifiedAt?: string;
}

export const SkillClaimSchema = SchemaFactory.createForClass(SkillClaim);

// Compound index to prevent duplicate claims per evidence and raw claim
SkillClaimSchema.index(
  { studentId: 1, evidenceId: 1, rawClaim: 1 },
  { unique: true },
);

SkillClaimSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    const r = ret as any;
    r.id = r._id.toString();
    delete (ret as any)._id;
  },
});
