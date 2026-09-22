import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';
import { SkillCategory } from '@placecampus/shared-types';

export type SkillDocument = HydratedDocument<Skill>;

@Schema({ timestamps: true })
export class Skill {
  declare _id: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  name!: string;

  @Prop({ required: true, enum: SkillCategory, type: String })
  category!: SkillCategory;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: [String], default: [] })
  synonyms!: string[];

  @Prop({ type: Types.ObjectId, ref: 'Skill' })
  parentSkillId?: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Skill' }], default: [] })
  childSkillIds!: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Skill' }], default: [] })
  relatedSkillIds!: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'SkillCluster' }], default: [] })
  clusterIds!: Types.ObjectId[];

  @Prop({ default: true })
  isActive!: boolean;

  declare createdAt: Date;
  declare updatedAt: Date;
}

export const SkillSchema = SchemaFactory.createForClass(Skill);

// Indexes for typical queries
SkillSchema.index({ name: 1 }, { unique: true });
SkillSchema.index({ category: 1 });
SkillSchema.index({ isActive: 1 });
