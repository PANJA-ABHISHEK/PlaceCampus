import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LookupType = 'DEPARTMENT' | 'PROGRAMME';
export type OrgLookupDocument = HydratedDocument<OrgLookup>;

/**
 * Institution-approved canonical values (Master Plan "Lookups"): departments
 * and programmes. Only Administrators create them; imports map to their codes.
 */
@Schema({ timestamps: true, collection: 'org_lookups' })
export class OrgLookup {
  @Prop({ type: String, enum: ['DEPARTMENT', 'PROGRAMME'], required: true })
  type: LookupType;

  /** Stable code, e.g. "SCSE" or "BTECH-CSE". */
  @Prop({ required: true, uppercase: true, trim: true })
  code: string;

  @Prop({ required: true, trim: true })
  name: string;

  /** Programmes: owning department code. */
  @Prop({ type: String, uppercase: true, trim: true })
  departmentCode?: string;

  /** Programmes: standard duration, used to check derived graduation batches. */
  @Prop({ type: Number, min: 1, max: 7 })
  durationYears?: number;

  /** Programmes: lateral-entry variant (joins in semester 3, one year shorter). */
  @Prop({ default: false })
  lateralEntry: boolean;

  @Prop({ default: true })
  active: boolean;

  @Prop({ type: String })
  createdBy?: string;
}

export const OrgLookupSchema = SchemaFactory.createForClass(OrgLookup);
OrgLookupSchema.index({ type: 1, code: 1 }, { unique: true });
