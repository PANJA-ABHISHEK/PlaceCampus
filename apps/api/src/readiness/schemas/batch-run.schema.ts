import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BatchRunDocument = HydratedDocument<BatchRun>;
export type BatchRunStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED';

/**
 * One batch readiness run (Master Plan §15.11 `batch_runs`): which students,
 * who started it, live progress counters and the measured duration.
 */
@Schema({ timestamps: true, collection: 'batch_runs' })
export class BatchRun {
  @Prop({ required: true, default: 'READINESS' })
  kind: 'READINESS';

  /** Cohort filter; empty means every student. */
  @Prop(raw({ graduationYear: Number, department: String }))
  scope: { graduationYear?: number; department?: string };

  @Prop({ required: true })
  trigger: string;

  @Prop()
  requestedBy?: string;

  @Prop({ type: String, enum: ['QUEUED', 'RUNNING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED'], default: 'QUEUED', index: true })
  status: BatchRunStatus;

  /** BULL when chunks ran on the Redis queue; IN_PROCESS when Redis was unavailable. */
  @Prop({ type: String, enum: ['BULL', 'IN_PROCESS'] })
  executor?: 'BULL' | 'IN_PROCESS';

  @Prop({ required: true, default: 250 })
  chunkSize: number;

  @Prop({ required: true, default: 0 })
  total: number;

  @Prop({ required: true, default: 0 })
  totalChunks: number;

  /** Chunk indexes already counted (makes chunk completion idempotent under retries). */
  @Prop({ type: [Number], default: [] })
  chunksDone: number[];

  @Prop({ default: 0 })
  processed: number;

  /** New snapshots written (scores changed). */
  @Prop({ default: 0 })
  updated: number;

  /** Scores identical to the latest snapshot; nothing written. */
  @Prop({ default: 0 })
  unchanged: number;

  @Prop({ default: 0 })
  failed: number;

  @Prop({ type: [raw({ studentId: String, error: String })], default: [] })
  failures: { studentId: string; error: string }[];

  @Prop({ type: [raw({ index: Number, size: Number, ms: Number })], default: [] })
  chunkTimings: { index: number; size: number; ms: number }[];

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  finishedAt?: Date;

  @Prop()
  durationMs?: number;

  @Prop()
  error?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const BatchRunSchema = SchemaFactory.createForClass(BatchRun);
BatchRunSchema.index({ kind: 1, createdAt: -1 });
