import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';

export type SkillClusterDocument = HydratedDocument<SkillCluster>;

@Schema({ timestamps: true })
export class SkillCluster {
  declare _id: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  name!: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Skill' }], default: [] })
  skillIds!: Types.ObjectId[];

  @Prop({ type: [String], default: [] })
  roleMappings!: string[];

  declare createdAt: Date;
  declare updatedAt: Date;
}

export const SkillClusterSchema = SchemaFactory.createForClass(SkillCluster);

// Indexes
SkillClusterSchema.index({ name: 1 }, { unique: true });
