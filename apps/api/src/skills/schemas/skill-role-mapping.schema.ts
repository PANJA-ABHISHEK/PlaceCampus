import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SkillRoleMapping as ISkillRoleMapping } from '@placecampus/shared-types';

export type SkillRoleMappingDocument = SkillRoleMapping & Document;

@Schema({ timestamps: true })
export class SkillRoleMapping implements Omit<ISkillRoleMapping, 'id'> {
  @Prop({ required: true })
  roleName: string;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Skill' })
  skillId: string;

  @Prop({ required: true, default: 1 })
  recommendedLevel: number;

  @Prop({
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM',
  })
  importance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @Prop({ default: true })
  active: boolean;
}

export const SkillRoleMappingSchema =
  SchemaFactory.createForClass(SkillRoleMapping);

// Prevent duplicate skill mappings for the same role
SkillRoleMappingSchema.index({ roleName: 1, skillId: 1 }, { unique: true });

SkillRoleMappingSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    const r = ret as any;
    r.id = r._id.toString();
    delete (ret as any)._id;
  },
});
