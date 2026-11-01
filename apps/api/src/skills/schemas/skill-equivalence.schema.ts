import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SkillEquivalence as ISkillEquivalence } from '@placecampus/shared-types';

export type SkillEquivalenceDocument = SkillEquivalence & Document;

@Schema({ timestamps: true })
export class SkillEquivalence implements Omit<ISkillEquivalence, 'id'> {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Skill' })
  skillId1: string;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Skill' })
  skillId2: string;

  @Prop({
    required: true,
    enum: ['EXACT_ALIAS', 'EQUIVALENT', 'RELATED'],
    default: 'EQUIVALENT',
  })
  relationshipType: 'EXACT_ALIAS' | 'EQUIVALENT' | 'RELATED';

  @Prop({ default: true })
  active: boolean;
}

export const SkillEquivalenceSchema =
  SchemaFactory.createForClass(SkillEquivalence);

// Prevent duplicate undirected pairs
SkillEquivalenceSchema.index({ skillId1: 1, skillId2: 1 }, { unique: true });

SkillEquivalenceSchema.pre('save', function (next) {
  if (this.skillId1.toString() === this.skillId2.toString()) {
    return next(new Error('A skill cannot be equivalent to itself.'));
  }
  // Ensure order to prevent duplicates like (A, B) and (B, A)
  if (this.skillId1 > this.skillId2) {
    const temp = this.skillId1;
    this.skillId1 = this.skillId2;
    this.skillId2 = temp;
  }
  next();
});

SkillEquivalenceSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    const r = ret as any;
    r.id = r._id.toString();
    delete (ret as any)._id;
  },
});
