import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Skill as ISkill } from '@placecampus/shared-types';

export type SkillDocument = Skill & Document;

@Schema({ timestamps: true })
export class Skill implements Omit<ISkill, 'id'> {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, unique: true })
  normalizedName: string;

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'SkillCluster' })
  clusterId?: string;

  @Prop({ default: true })
  active: boolean;

  @Prop({ type: [String], default: [] })
  synonyms: string[];
}

export const SkillSchema = SchemaFactory.createForClass(Skill);

// To normalize virtuals
SkillSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    const r = ret as any;
    r.id = r._id.toString();
    delete (ret as any)._id;
  },
});
