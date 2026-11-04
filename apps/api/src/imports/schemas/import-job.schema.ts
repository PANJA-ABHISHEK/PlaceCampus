import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const IMPORT_STATUSES = [
  'UPLOADED',
  'VALIDATING',
  'VALIDATION_FAILED',
  'AWAITING_CONFIRMATION',
  'COMMITTING',
  'COMMITTED',
  'PARTIALLY_COMMITTED',
  'COMMIT_FAILED',
  'CANCELLED',
  'EXPIRED',
  'REVERTING',
  'REVERTED',
  'REVERT_PARTIAL',
] as const;
export type ImportStatus = (typeof IMPORT_STATUSES)[number];
export type ImportKind = 'STUDENTS' | 'FACULTY';
export type ImportMode = 'CREATE_ONLY' | 'CREATE_AND_UPDATE_PROFILE';
export type ImportJobDocument = HydratedDocument<ImportJob>;

/** One uploaded bulk-import file and its lifecycle (Master Plan §8.9 `import_batches`). */
@Schema({ timestamps: true, collection: 'import_batches' })
export class ImportJob {
  @Prop({ type: String, enum: ['STUDENTS', 'FACULTY'], required: true })
  kind: ImportKind;

  @Prop({ type: String, enum: ['CREATE_ONLY', 'CREATE_AND_UPDATE_PROFILE'], default: 'CREATE_ONLY' })
  mode: ImportMode;

  @Prop({ type: String, enum: IMPORT_STATUSES, default: 'UPLOADED', index: true })
  status: ImportStatus;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true, index: true })
  fileSha256: string;

  @Prop()
  fileKey?: string;

  @Prop()
  fileSize?: number;

  @Prop()
  sheetName?: string;

  /** OFFICIAL = PlaceCampus template; MAPPED = free-form workbook mapped by header aliases. */
  @Prop({ type: String, enum: ['OFFICIAL', 'MAPPED'] })
  template?: 'OFFICIAL' | 'MAPPED';

  @Prop({ type: [raw({ source: String, target: String })], default: [] })
  columnMap: { source: string; target: string }[];

  @Prop({ type: [String], default: [] })
  ignoredColumns: string[];

  /** Assumptions/notes sheets, kept verbatim for the preview and audit metadata. */
  @Prop({ type: [raw({ sheet: String, text: String })], default: [] })
  sourceNotes: { sheet: string; text: string }[];

  /** File-level messages, e.g. excluded columns or synthetic-data declarations. */
  @Prop({ type: [raw({ code: String, message: String })], default: [] })
  fileWarnings: { code: string; message: string }[];

  @Prop()
  failureReason?: string;

  /** Synthetic/sample data: never invited, never paired with real records. */
  @Prop({ default: false })
  isDemoData: boolean;

  @Prop({ required: true })
  uploadedBy: string;

  @Prop()
  reimportReason?: string;

  @Prop(
    raw({
      total: Number, create: Number, update: Number, unchanged: Number, skipExisting: Number,
      invalid: Number, duplicate: Number, skippedIdentical: Number, conflict: Number, warnings: Number,
    }),
  )
  summary?: Record<string, number>;

  @Prop({ type: String, sparse: true, unique: true })
  idempotencyKey?: string;

  @Prop()
  confirmedBy?: string;

  @Prop()
  confirmedAt?: Date;

  @Prop(raw({ processed: Number, created: Number, updated: Number, failed: Number, chunks: Number }))
  progress?: { processed: number; created: number; updated: number; failed: number; chunks: number };

  @Prop()
  committedAt?: Date;

  @Prop()
  expiresAt?: Date;

  @Prop(raw({ by: String, at: Date, reason: String, deactivated: Number, kept: Number, restored: Number, conflicts: Number, purged: Boolean }))
  revert?: { by: string; at: Date; reason: string; deactivated: number; kept: number; restored: number; conflicts: number; purged?: boolean };

  /** Approval of derived batch/semester values for this batch. */
  @Prop(raw({ status: String, by: String, at: Date, reason: String, count: Number }))
  derivedReview?: { status: 'APPROVED' | 'REJECTED'; by: string; at: Date; reason?: string; count: number };

  createdAt: Date;
  updatedAt: Date;
}

export const ImportJobSchema = SchemaFactory.createForClass(ImportJob);
ImportJobSchema.index({ fileSha256: 1, kind: 1, mode: 1, createdAt: -1 });
