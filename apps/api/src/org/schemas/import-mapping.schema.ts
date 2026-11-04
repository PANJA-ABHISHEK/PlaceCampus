import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { LookupType } from './org-lookup.schema.js';

export type MappingStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ImportMappingDocument = HydratedDocument<ImportMapping>;

export interface MappingHistoryEntry {
  action: 'SUGGESTED' | 'AUTO_EXACT' | 'APPROVED' | 'REJECTED' | 'RESET';
  code?: string;
  by?: string;
  at: Date;
  reason?: string;
}

/**
 * How a free-text source value (a School or Program cell) maps to an approved
 * lookup code. Only APPROVED mappings are used; the source text is never lost.
 */
@Schema({ timestamps: true, collection: 'import_mappings' })
export class ImportMapping {
  @Prop({ type: String, enum: ['DEPARTMENT', 'PROGRAMME'], required: true })
  type: LookupType;

  /** Exactly as written in the source file. */
  @Prop({ required: true })
  sourceValue: string;

  /** Lower-cased, whitespace-collapsed key for matching. */
  @Prop({ required: true })
  normalizedSource: string;

  @Prop({ type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' })
  status: MappingStatus;

  /** Approved target code (APPROVED only). */
  @Prop({ type: String })
  code?: string;

  /** A hint for the reviewer; never applied without approval. */
  @Prop(raw({ code: String, reason: String }))
  suggestion?: { code: string; reason: string };

  @Prop({
    type: [raw({ action: String, code: String, by: String, at: Date, reason: String })],
    default: [],
  })
  history: MappingHistoryEntry[];
}

export const ImportMappingSchema = SchemaFactory.createForClass(ImportMapping);
ImportMappingSchema.index({ type: 1, normalizedSource: 1 }, { unique: true });
