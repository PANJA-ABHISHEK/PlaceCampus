import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type RowAction =
  | 'CREATE'
  | 'UPDATE'
  | 'UNCHANGED'
  | 'SKIP_EXISTING'
  | 'INVALID'
  | 'DUPLICATE_IN_FILE'
  | 'SKIPPED_IDENTICAL'
  | 'CONFLICT';

export interface RowIssue {
  field?: string;
  code: string;
  message: string;
}

export interface FieldDiff {
  field: string;
  current: unknown;
  proposed: unknown;
  /** Whether the commit will write this change. */
  apply: boolean;
  note?: string;
}

export type ImportRowDocument = HydratedDocument<ImportRow>;

/** One data row of an import batch, its validation result and commit outcome. */
@Schema({ timestamps: true, collection: 'import_rows' })
export class ImportRow {
  @Prop({ required: true, index: true })
  jobId: string;

  /** Spreadsheet row number (header = 1). */
  @Prop({ required: true })
  rowNumber: number;

  /** Hash of the normalised row: (jobId, rowNumber, rowHash) makes commits idempotent. */
  @Prop({ required: true })
  rowHash: string;

  /** Cells exactly as read, keyed by source header (includes excluded demo-only columns). */
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  raw: Record<string, unknown>;

  /** Validated values keyed by template field. */
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  normalized: Record<string, unknown>;

  @Prop({ type: String, required: true, index: true })
  action: RowAction;

  /** Natural key: registration number (students) or employee ID (faculty). */
  @Prop({ index: true })
  naturalKey?: string;

  @Prop({ type: String, enum: ['registration_number', 'employee_id', 'email'] })
  matchedBy?: 'registration_number' | 'employee_id' | 'email';

  @Prop()
  matchedUserId?: string;

  @Prop({ type: [raw({ field: String, current: MongooseSchema.Types.Mixed, proposed: MongooseSchema.Types.Mixed, apply: Boolean, note: String })], default: [] })
  diff: FieldDiff[];

  @Prop({ type: [raw({ field: String, code: String, message: String })], default: [] })
  rowErrors: RowIssue[];

  @Prop({ type: [raw({ field: String, code: String, message: String })], default: [] })
  warnings: RowIssue[];

  @Prop(
    raw({
      status: { type: String, enum: ['PENDING', 'APPLIED', 'FAILED', 'REVERTED', 'KEPT'] },
      userId: String,
      error: String,
      appliedAt: Date,
      before: MongooseSchema.Types.Mixed,
    }),
  )
  result?: { status: 'PENDING' | 'APPLIED' | 'FAILED' | 'REVERTED' | 'KEPT'; userId?: string; error?: string; appliedAt?: Date; before?: Record<string, unknown> };
}

export const ImportRowSchema = SchemaFactory.createForClass(ImportRow);
ImportRowSchema.index({ jobId: 1, rowNumber: 1 }, { unique: true });
ImportRowSchema.index({ jobId: 1, action: 1 });
