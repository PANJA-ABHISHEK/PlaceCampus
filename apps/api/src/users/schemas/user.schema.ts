import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';

export enum UserRole {
  STUDENT = 'STUDENT',
  FACULTY = 'FACULTY',
  PLACEMENT_OFFICER = 'PLACEMENT_OFFICER',
  PLACEMENT_HEAD = 'PLACEMENT_HEAD',
  RECRUITER = 'RECRUITER',
  ADMIN = 'ADMIN',
}

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  declare _id: Types.ObjectId;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, select: false })
  password!: string;

  @Prop({ required: true, trim: true })
  firstName!: string;

  @Prop({ required: true, trim: true })
  lastName!: string;

  @Prop({ required: true, enum: UserRole, type: String })
  role!: UserRole;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: false })
  isEmailVerified!: boolean;

  @Prop({ type: Date })
  lastLoginAt?: Date;

  @Prop({ type: String, select: false })
  refreshToken?: string;

  @Prop({ type: String })
  passwordResetToken?: string;

  @Prop({ type: Date })
  passwordResetExpires?: Date;

  declare createdAt: Date;
  declare updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });

// Virtual for full name
UserSchema.virtual('fullName').get(function (this: User) {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are included in JSON
UserSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const obj = ret as unknown as Record<string, unknown>;
    delete obj['password'];
    delete obj['refreshToken'];
    delete obj['passwordResetToken'];
    delete obj['passwordResetExpires'];
    delete obj['__v'];
    return obj;
  },
});
