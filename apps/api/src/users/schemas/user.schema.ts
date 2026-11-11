import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from '@placecampus/shared-types';

export type UserDocument = User & Document;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.STUDENT })
  role: UserRole;

  /**
   * Further campus role assignments held by the same person (e.g. a faculty
   * member who is also a placement officer). `role` stays the primary role.
   */
  @Prop({ type: [String], enum: UserRole, default: undefined })
  roles?: UserRole[];

  /** Staff designation, e.g. "Assistant Professor" (institution-managed). */
  @Prop({ trim: true })
  designation?: string;

  /** Staff home department, e.g. "CSE"; used for the department review pool. */
  @Prop({ trim: true })
  department?: string;

  /** Company or organization for externally registered recruiter accounts. */
  @Prop({ trim: true, maxlength: 120 })
  companyName?: string;

  @Prop({ default: true })
  isActive: boolean;

  /**
   * Account lifecycle (Master Plan §8.4). Imported people start INVITED and
   * cannot sign in (isActive false) until they activate. Absent = legacy ACTIVE.
   */
  @Prop({ type: String, enum: ['INVITED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'] })
  accountStatus?: 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

  /** UNVERIFIED for assumed institutional emails; PLACEHOLDER when none was supplied. */
  @Prop({ type: String, enum: ['UNVERIFIED', 'VERIFIED', 'PLACEHOLDER'] })
  emailStatus?: 'UNVERIFIED' | 'VERIFIED' | 'PLACEHOLDER';

  /** Staff employee ID (unique when present). */
  @Prop({ type: String, trim: true })
  employeeId?: string;

  /** UNCONFIRMED until the institution confirms the identifier is real. */
  @Prop({ type: String, enum: ['UNCONFIRMED', 'CONFIRMED'] })
  identityStatus?: 'UNCONFIRMED' | 'CONFIRMED';

  /** Staff employment (separate from sign-in): RELIEVED staff get no new work. */
  @Prop({ type: String, enum: ['ACTIVE', 'ON_LEAVE', 'RELIEVED'] })
  employmentStatus?: 'ACTIVE' | 'ON_LEAVE' | 'RELIEVED';

  /** Synthetic/sample identity: never paired with real records, never invited. */
  @Prop({ default: false, index: true })
  isDemoData: boolean;

  /** Set when an administrator issues a temporary password; cleared on change. */
  @Prop({ default: false })
  mustChangePassword: boolean;

  @Prop({ type: Date })
  temporaryPasswordIssuedAt?: Date;

  /** Values exactly as supplied by an import file (department/designation text). */
  @Prop(raw({ department: String, designation: String, importJobId: String }))
  source?: { department?: string; designation?: string; importJobId?: string };

  /** Import batch that created this account (for revert). */
  @Prop({ type: String, index: true })
  importJobId?: string;

  @Prop()
  lastLoginAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index(
  { employeeId: 1 },
  { unique: true, partialFilterExpression: { employeeId: { $type: 'string' } } },
);
