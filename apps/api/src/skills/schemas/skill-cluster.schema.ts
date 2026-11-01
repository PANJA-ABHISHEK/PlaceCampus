import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { SkillCluster as ISkillCluster } from '@placecampus/shared-types';

export type SkillClusterDocument = SkillCluster & Document;

@Schema({ timestamps: true })
export class SkillCluster implements Omit<ISkillCluster, 'id'> {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  description?: string;
}

export const SkillClusterSchema = SchemaFactory.createForClass(SkillCluster);

// To normalize virtuals
SkillClusterSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    const r = ret as any;
    r.id = r._id.toString();
    delete (ret as any)._id;
  },
});
