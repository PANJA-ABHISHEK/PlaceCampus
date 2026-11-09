import { ConflictException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Queue } from 'bull';
import { Model, Types } from 'mongoose';
import { ReadinessSnapshot, ReadinessSnapshotDocument } from './schemas/readiness-snapshot.schema.js';
import { BatchRun, BatchRunDocument } from './schemas/batch-run.schema.js';
import { StudentProfile } from '../students/schemas/student-profile.schema.js';
import { StudentSkillProfile } from '../skills/schemas/student-skill-profile.schema.js';
import { AssessmentAttempt } from '../assessments/schemas/assessment-attempt.schema.js';
import { Evidence } from '../evidence/schemas/evidence.schema.js';
import { MockInterview } from '../interviews/schemas/mock-interview.schema.js';
import { AuditService } from '../audit/audit.service.js';
import { sameScores, scoreReadiness } from './readiness.service.js';

/** Master Plan §15.11: chunk jobs of 250 student IDs (20 chunks for 5,000 students). */
export const BATCH_CHUNK_SIZE = 250;
export const BATCH_JOB = 'batch-chunk';
export const CHUNK_ATTEMPTS = 3;
/** Parallel chunks per worker process (Bull concurrency and the in-process fallback). */
export const BATCH_CONCURRENCY = 4;
/** A run with no progress for this long is considered dead (worker crash) and no longer blocks new runs. */
const STALE_RUN_MS = 30 * 60_000;
const ENQUEUE_TIMEOUT_MS = 3_000;
const MAX_STORED_FAILURES = 200;

export interface BatchScope {
  graduationYear?: number;
  department?: string;
}

export interface ChunkJob {
  runId: string;
  index: number;
  studentIds: string[];
}

const groupBy = <T>(rows: T[], key: (row: T) => unknown) => {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = String(key(row));
    const list = map.get(k);
    if (list) list.push(row);
    else map.set(k, [row]);
  }
  return map;
};

@Injectable()
export class ReadinessBatchService {
  private readonly logger = new Logger(ReadinessBatchService.name);

  constructor(
    @InjectModel(BatchRun.name) private runModel: Model<BatchRunDocument>,
    @InjectModel(ReadinessSnapshot.name) private snapshotModel: Model<ReadinessSnapshotDocument>,
    @InjectModel(StudentProfile.name) private profileModel: Model<any>,
    @InjectModel(StudentSkillProfile.name) private skillProfileModel: Model<any>,
    @InjectModel(AssessmentAttempt.name) private attemptModel: Model<any>,
    @InjectModel(Evidence.name) private evidenceModel: Model<any>,
    @InjectModel(MockInterview.name) private interviewModel: Model<any>,
    @Optional() private audit?: AuditService,
    @Optional() private events?: EventEmitter2,
    @Optional() @InjectQueue('readiness') private queue?: Queue,
  ) {}

  /* ------------------------------------------------------------------ */
  /* Starting a run                                                      */
  /* ------------------------------------------------------------------ */

  async start(scope: BatchScope, actor: { userId?: string; role: string }, trigger = 'MANUAL') {
    await this.expireStaleRuns();
    const active = await this.runModel.findOne({ kind: 'READINESS', status: { $in: ['QUEUED', 'RUNNING'] } }).lean().exec();
    if (active) {
      throw new ConflictException({ message: 'A batch readiness run is already in progress.', runId: String(active._id) });
    }

    const filter: Record<string, unknown> = {};
    if (scope.graduationYear) filter.graduationYear = Number(scope.graduationYear);
    if (scope.department) filter.department = scope.department;
    const profiles = await this.profileModel.find(filter).select('userId').lean().exec();
    const studentIds = [...new Set(profiles.map((p: any) => String(p.userId)).filter((id) => Types.ObjectId.isValid(id)))];

    const chunks: string[][] = [];
    for (let i = 0; i < studentIds.length; i += BATCH_CHUNK_SIZE) chunks.push(studentIds.slice(i, i + BATCH_CHUNK_SIZE));

    const now = new Date();
    const run = await this.runModel.create({
      kind: 'READINESS',
      scope: { graduationYear: filter.graduationYear, department: filter.department },
      trigger,
      requestedBy: actor.userId,
      status: chunks.length ? 'RUNNING' : 'COMPLETED',
      chunkSize: BATCH_CHUNK_SIZE,
      total: studentIds.length,
      totalChunks: chunks.length,
      startedAt: now,
      ...(chunks.length ? {} : { finishedAt: now, durationMs: 0 }),
    });
    const runId = String(run._id);

    await this.audit?.logAction({
      actorId: actor.userId && Types.ObjectId.isValid(actor.userId) ? actor.userId : undefined,
      actorRole: actor.role,
      action: 'READINESS_BATCH_STARTED',
      resourceType: 'BATCH_RUN',
      resourceId: runId,
      metadata: { scope: run.scope, total: studentIds.length, chunks: chunks.length, trigger },
    });

    let executor: 'BULL' | 'IN_PROCESS' | undefined;
    if (chunks.length) {
      executor = await this.dispatch(chunks.map((studentIds, index) => ({ runId, index, studentIds })));
      await this.runModel.updateOne({ _id: run._id }, { $set: { executor } }).exec();
    }
    this.logger.log(`Batch readiness run ${runId}: ${studentIds.length} students in ${chunks.length} chunk(s)`);
    return this.serialize({ ...run.toObject(), ...(executor ? { executor } : {}) });
  }

  /** Chunks go to the `readiness` queue; without Redis they run in-process, still off the request. */
  private async dispatch(jobs: ChunkJob[]): Promise<'BULL' | 'IN_PROCESS'> {
    if (this.queue) {
      let timer: NodeJS.Timeout | undefined;
      try {
        await Promise.race([
          this.queue.addBulk(
            jobs.map((data) => ({
              name: BATCH_JOB,
              data,
              opts: { attempts: CHUNK_ATTEMPTS, backoff: { type: 'exponential', delay: 2_000 }, removeOnComplete: true, removeOnFail: 100 },
            })),
          ),
          new Promise((_, reject) => (timer = setTimeout(() => reject(new Error('queue unavailable')), ENQUEUE_TIMEOUT_MS))),
        ]);
        return 'BULL';
      } catch (error: any) {
        this.logger.warn(`Readiness queue unavailable (${error.message}); running batch in-process.`);
      } finally {
        clearTimeout(timer);
      }
    }
    setImmediate(() => void this.runInProcess(jobs));
    return 'IN_PROCESS';
  }

  private async runInProcess(jobs: ChunkJob[]) {
    const queue = [...jobs];
    const worker = async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        try {
          await this.processChunk(job);
        } catch (error: any) {
          await this.recordChunkFailure(job, error);
        }
      }
    };
    await Promise.all(Array.from({ length: BATCH_CONCURRENCY }, worker));
  }

  /* ------------------------------------------------------------------ */
  /* Chunk worker                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * One chunk: a single `$in` read per input collection, scoring in memory with
   * the same formula as the per-student path, one `insertMany` for changed
   * snapshots, then an atomic, idempotent progress update.
   */
  async processChunk({ runId, index, studentIds }: ChunkJob) {
    const startedAt = Date.now();
    const objectIds = studentIds.map((id) => new Types.ObjectId(id));
    const [profiles, skillProfiles, attempts, projects, interviews, latest] = await Promise.all([
      this.profileModel.find({ userId: { $in: studentIds } }).select('userId cgpa').lean().exec(),
      this.skillProfileModel.find({ studentId: { $in: studentIds } }).select('studentId skills.level skills.verificationStatus').lean().exec(),
      this.attemptModel.find({ studentId: { $in: studentIds }, status: 'EVALUATED' }).select('studentId assessmentId percentage').lean().exec(),
      this.evidenceModel.find({ studentId: { $in: studentIds }, type: 'PROJECT', status: 'VERIFIED' }).select('studentId').lean().exec(),
      this.interviewModel.find({ studentId: { $in: studentIds }, status: 'COMPLETED' }).select('studentId rubricScores').lean().exec(),
      this.snapshotModel
        .aggregate<{ _id: Types.ObjectId; s: any }>([
          // Snapshots store studentId as a string in practice (the schema's ObjectId hint is not applied);
          // aggregation does not cast, so match both forms.
          { $match: { studentId: { $in: [...studentIds, ...objectIds] } } },
          { $sort: { calculatedAt: -1 } },
          {
            $group: {
              _id: '$studentId',
              s: { $first: { overallScore: '$overallScore', verifiedSkillsScore: '$verifiedSkillsScore', assessmentsScore: '$assessmentsScore', academicsScore: '$academicsScore', projectsScore: '$projectsScore', interviewsScore: '$interviewsScore' } },
            },
          },
        ])
        .allowDiskUse(true)
        .exec(),
    ]);

    const profileBy = new Map(profiles.map((p: any) => [String(p.userId), p]));
    const skillsBy = new Map(skillProfiles.map((p: any) => [String(p.studentId), p]));
    const attemptsBy = groupBy(attempts, (a: any) => a.studentId);
    const projectsBy = groupBy(projects, (e: any) => e.studentId);
    const interviewsBy = groupBy(interviews, (i: any) => i.studentId);
    const latestBy = new Map(latest.map((l) => [String(l._id), l.s]));

    const calculatedAt = new Date().toISOString();
    const docs: Record<string, unknown>[] = [];
    const failures: { studentId: string; error: string }[] = [];
    let unchanged = 0;
    for (const studentId of studentIds) {
      try {
        const scored = scoreReadiness({
          profile: profileBy.get(studentId) ?? null,
          skillProfile: skillsBy.get(studentId) ?? null,
          attempts: attemptsBy.get(studentId) ?? [],
          projects: projectsBy.get(studentId) ?? [],
          interviews: interviewsBy.get(studentId) ?? [],
        });
        const previous = latestBy.get(studentId);
        if (previous && sameScores(previous, scored)) unchanged++;
        else docs.push({ studentId, ...scored, calculatedAt });
      } catch (error: any) {
        failures.push({ studentId, error: String(error?.message ?? error).slice(0, 300) });
      }
    }
    if (docs.length) await this.snapshotModel.insertMany(docs, { ordered: false });

    await this.recordChunk(runId, index, {
      size: studentIds.length,
      ms: Date.now() - startedAt,
      updated: docs.length,
      unchanged,
      failures,
    });
  }

  /** Called when a chunk fails on its final attempt: its students count as failed. */
  async recordChunkFailure({ runId, index, studentIds }: ChunkJob, error: Error) {
    this.logger.error(`Batch run ${runId} chunk ${index} failed: ${error?.message}`);
    await this.recordChunk(runId, index, {
      size: studentIds.length,
      ms: 0,
      updated: 0,
      unchanged: 0,
      failures: studentIds.map((studentId) => ({ studentId, error: `Chunk failed: ${String(error?.message ?? error).slice(0, 200)}` })),
    });
  }

  private async recordChunk(
    runId: string,
    index: number,
    r: { size: number; ms: number; updated: number; unchanged: number; failures: { studentId: string; error: string }[] },
  ) {
    // `chunksDone: { $ne: index }` makes this a no-op if a retried chunk was already counted.
    const run = await this.runModel
      .findOneAndUpdate(
        { _id: runId, chunksDone: { $ne: index } },
        {
          $addToSet: { chunksDone: index },
          $inc: { processed: r.size, updated: r.updated, unchanged: r.unchanged, failed: r.failures.length },
          $push: {
            failures: { $each: r.failures.slice(0, MAX_STORED_FAILURES), $slice: MAX_STORED_FAILURES },
            chunkTimings: { index, size: r.size, ms: r.ms },
          },
        },
        { new: true },
      )
      .lean()
      .exec();
    if (!run || run.chunksDone.length < run.totalChunks) return;

    // Last chunk: close the run exactly once.
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - new Date(run.startedAt ?? run.createdAt).getTime();
    const status = run.failed ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED';
    const closed = await this.runModel
      .updateOne({ _id: runId, status: 'RUNNING' }, { $set: { status, finishedAt, durationMs } })
      .exec();
    if (closed.modifiedCount) {
      this.logger.log(
        `Batch run ${runId} ${status}: ${run.processed} students (${run.updated} updated, ${run.unchanged} unchanged, ${run.failed} failed) in ${durationMs} ms`,
      );
      this.events?.emit('readiness.batch_completed', { runId, status, durationMs, total: run.total });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Reads                                                               */
  /* ------------------------------------------------------------------ */

  async getRun(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Batch run not found');
    const run = await this.runModel.findById(id).lean().exec();
    if (!run) throw new NotFoundException('Batch run not found');
    return this.serialize(run);
  }

  async listRuns(limit = 10) {
    await this.expireStaleRuns();
    const runs = await this.runModel
      .find({ kind: 'READINESS' })
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(limit, 1), 50))
      .select('-failures -chunksDone')
      .lean()
      .exec();
    return runs.map((r) => this.serialize(r));
  }

  private async expireStaleRuns() {
    await this.runModel
      .updateMany(
        { kind: 'READINESS', status: { $in: ['QUEUED', 'RUNNING'] }, updatedAt: { $lt: new Date(Date.now() - STALE_RUN_MS) } },
        { $set: { status: 'FAILED', error: 'No progress for 30 minutes (worker stopped); marked as failed.', finishedAt: new Date() } },
      )
      .exec();
  }

  private serialize(run: any) {
    const { _id, __v, chunksDone, ...rest } = run;
    const elapsedMs =
      rest.durationMs ?? (rest.startedAt ? Date.now() - new Date(rest.startedAt).getTime() : 0);
    return {
      id: String(_id),
      ...rest,
      // Empty scope ("all students") is not persisted by MongoDB; always return an object.
      scope: rest.scope ?? {},
      chunksCompleted: chunksDone?.length ?? rest.chunkTimings?.length ?? 0,
      elapsedMs,
      progress: rest.total ? Math.min(1, (rest.processed ?? 0) / rest.total) : 1,
    };
  }
}
