import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RefreshSessionDocument = RefreshSession & Document;

@Schema({ timestamps: true, collection: 'refresh_sessions' })
export class RefreshSession {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  tokenHash: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  revokedAt?: Date;

  @Prop()
  rotatedFrom?: string;

  /** Which login issued the session: campus (/auth/login) or recruiter (/recruiter/auth/login). */
  @Prop({ type: String, enum: ['CAMPUS', 'RECRUITER'], default: 'CAMPUS' })
  audience: 'CAMPUS' | 'RECRUITER';

  /** The role this session acts as; unset until a multi-role user chooses one. */
  @Prop({ type: String })
  activeRole?: string;
}

export const RefreshSessionSchema =
  SchemaFactory.createForClass(RefreshSession);
