import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Model, Types } from 'mongoose';
import { QueuesModule } from '../common/queues/queues.module.js';
import { ReadinessModule } from './readiness.module.js';
import { ReadinessBatchService } from './readiness-batch.service.js';
import { ReadinessService } from './readiness.service.js';
import { ReadinessSnapshot } from './schemas/readiness-snapshot.schema.js';
import { AuditService } from '../audit/audit.service.js';

/**
 * Batch readiness acceptance (Master Plan §33.5, AC-RDY-05): 5,000 synthetic
 * students through the real Bull queue must finish in under 15 minutes.
 *
 *   MONGO_TEST_URI=mongodb://localhost:27999/pc_batch_load REDIS_TEST_URL=redis://localhost:6399 \
 *   BATCH_LOAD_STUDENTS=5000 pnpm vitest run readiness-batch.load
 *
 * Skipped unless both URLs are set. The test drops its database: never point it at a shared one.
 */
const MONGO = process.env.MONGO_TEST_URI;
const REDIS = process.env.REDIS_TEST_URL;
const STUDENTS = Number(process.env.BATCH_LOAD_STUDENTS) || 5000;
const ACCEPTANCE_MS = 15 * 60_000;

(MONGO && REDIS ? describe : describe.skip)(`batch readiness load test (${STUDENTS} students)`, () => {
  let moduleRef: TestingModule;
  let batch: ReadinessBatchService;
  let snapshots: Model<any>;
  let studentIds: string[] = [];
  const timings: Record<string, number> = {};

  beforeAll(async () => {
    const redis = new URL(REDIS!);
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        EventEmitterModule.forRoot(),
        MongooseModule.forRoot(MONGO!),
        BullModule.forRoot({ redis: { host: redis.hostname, port: Number(redis.port) || 6379 } }),
        QueuesModule,
        ReadinessModule,
      ],
    })
      .overrideProvider(AuditService)
      .useValue({ logAction: vi.fn() })
      .compile();
    await moduleRef.init();
    batch = moduleRef.get(ReadinessBatchService);
    snapshots = moduleRef.get(getModelToken(ReadinessSnapshot.name));
    const db = snapshots.db;
    await db.dropDatabase();
    await snapshots.syncIndexes();

    // Synthetic cohort (all flagged isDemoData): ~30 skills, 6 assessment attempts,
    // 0-3 verified projects and 0-2 interviews per student.
    const t0 = Date.now();
    const rand = mulberry32(42);
    const depts = ['SCSE', 'SECE', 'SEEE', 'SME', 'SCE', 'MSOB'];
    const assessmentIds = Array.from({ length: 12 }, () => new Types.ObjectId());
    const profiles: any[] = [], skillProfiles: any[] = [], attempts: any[] = [], evidence: any[] = [], interviews: any[] = [];
    for (let i = 0; i < STUDENTS; i++) {
      const id = new Types.ObjectId();
      studentIds.push(String(id));
      profiles.push({
        userId: String(id), registrationNumber: `SYN${String(i).padStart(5, '0')}`, isDemoData: true,
        department: depts[i % depts.length], graduationYear: 2026 + (i % 3), cgpa: Math.round((5 + rand() * 5) * 100) / 100,
      });
      skillProfiles.push({
        studentId: id, isDemoData: true,
        skills: Array.from({ length: 30 }, () => ({
          skillId: new Types.ObjectId(), level: 1 + Math.floor(rand() * 5),
          verificationStatus: rand() < 0.6 ? 'VERIFIED' : 'UNVERIFIED', sourceEvidenceIds: [],
        })),
      });
      for (let a = 0; a < 6; a++) {
        attempts.push({ studentId: id, assessmentId: assessmentIds[Math.floor(rand() * 12)], status: 'EVALUATED', percentage: Math.round(rand() * 100), isDemoData: true });
      }
      for (let p = 0, n = Math.floor(rand() * 4); p < n; p++) {
        evidence.push({ studentId: String(id), title: `Project ${p}`, type: 'PROJECT', status: 'VERIFIED', isDemoData: true });
      }
      for (let v = 0, n = Math.floor(rand() * 3); v < n; v++) {
        interviews.push({ studentId: id, status: 'COMPLETED', rubricScores: { technical: 1 + rand() * 9, communication: 1 + rand() * 9 }, isDemoData: true });
      }
    }
    const insert = (name: string, docs: any[]) => db.collection(name).insertMany(docs, { ordered: false });
    await Promise.all([
      insert(moduleRef.get(getModelToken('StudentProfile')).collection.collectionName, profiles),
      insert(moduleRef.get(getModelToken('StudentSkillProfile')).collection.collectionName, skillProfiles),
      insert(moduleRef.get(getModelToken('AssessmentAttempt')).collection.collectionName, attempts),
      insert(moduleRef.get(getModelToken('Evidence')).collection.collectionName, evidence),
      insert(moduleRef.get(getModelToken('MockInterview')).collection.collectionName, interviews),
    ]);
    // Indexes the per-collection lookups rely on (as in production).
    await Promise.all(['AssessmentAttempt', 'Evidence', 'MockInterview', 'StudentSkillProfile', 'StudentProfile'].map((n) => moduleRef.get<Model<any>>(getModelToken(n)).syncIndexes()));
    timings.seedMs = Date.now() - t0;
    console.log(`[load] seeded ${STUDENTS} students: ${skillProfiles.length * 30} skills, ${attempts.length} attempts, ${evidence.length} projects, ${interviews.length} interviews in ${timings.seedMs} ms`);
  }, 10 * 60_000);

  afterAll(async () => {
    if (!moduleRef) return;
    await snapshots.db.dropDatabase();
    await moduleRef.close();
    console.log('[load] timings', JSON.stringify(timings));
  });

  async function waitForRun(id: string) {
    const deadline = Date.now() + ACCEPTANCE_MS + 60_000;
    for (;;) {
      const run = await batch.getRun(id);
      if (!['QUEUED', 'RUNNING'].includes(run.status)) return run;
      if (Date.now() > deadline) throw new Error(`Run ${id} still ${run.status} after the acceptance window`);
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  it(`computes readiness for all ${STUDENTS} students on the queue in under 15 minutes`, async () => {
    const started = await batch.start({}, { role: 'admin' }, 'LOAD_TEST');
    expect(started.executor).toBe('BULL');
    expect(started.totalChunks).toBe(Math.ceil(STUDENTS / 250));

    const run = await waitForRun(started.id);
    timings.firstRunMs = run.durationMs;
    const chunkMs = run.chunkTimings.map((c: any) => c.ms).sort((a: number, b: number) => a - b);
    timings.chunkMedianMs = chunkMs[Math.floor(chunkMs.length / 2)];
    timings.chunkMaxMs = chunkMs[chunkMs.length - 1];
    console.log(`[load] first run: ${run.status} in ${run.durationMs} ms; chunk median ${timings.chunkMedianMs} ms, max ${timings.chunkMaxMs} ms`);

    expect(run.status).toBe('COMPLETED');
    expect(run).toMatchObject({ total: STUDENTS, processed: STUDENTS, updated: STUDENTS, unchanged: 0, failed: 0 });
    expect(run.durationMs).toBeLessThan(ACCEPTANCE_MS);
    expect(await snapshots.countDocuments()).toBe(STUDENTS);
  }, ACCEPTANCE_MS + 120_000);

  it('matches the per-student readiness formula exactly', async () => {
    const single = moduleRef.get(ReadinessService);
    const sample = Array.from({ length: 25 }, (_, i) => studentIds[Math.floor((i / 25) * studentIds.length)]);
    for (const id of sample) {
      const fromBatch: any = await snapshots.findOne({ studentId: id }).sort({ calculatedAt: -1 }).lean();
      // The per-student path recomputes from scratch; identical scores mean it writes nothing new.
      const recomputed: any = await single.calculateAndSaveReadiness(id);
      expect(recomputed.overallScore).toBe(fromBatch.overallScore);
      expect(recomputed.status).toBe(fromBatch.status);
      expect(String(recomputed._id ?? recomputed.id)).toBe(String(fromBatch._id));
    }
    expect(await snapshots.countDocuments()).toBe(STUDENTS);
  }, 120_000);

  it('a re-run with no input changes writes no new snapshots', async () => {
    const started = await batch.start({}, { role: 'admin' }, 'LOAD_TEST_RERUN');
    const run = await waitForRun(started.id);
    timings.rerunMs = run.durationMs;
    console.log(`[load] re-run: ${run.status} in ${run.durationMs} ms (${run.unchanged} unchanged)`);
    expect(run).toMatchObject({ status: 'COMPLETED', updated: 0, unchanged: STUDENTS, failed: 0 });
    expect(await snapshots.countDocuments()).toBe(STUDENTS);
  }, ACCEPTANCE_MS + 120_000);

  it('can be scoped to one cohort', async () => {
    const started = await batch.start({ graduationYear: 2027 }, { role: 'admin' }, 'LOAD_TEST_COHORT');
    const run = await waitForRun(started.id);
    expect(run.total).toBe(Math.floor(STUDENTS / 3) + (STUDENTS % 3 > 1 ? 1 : 0));
    expect(run.status).toBe('COMPLETED');
  }, 5 * 60_000);

  it('baseline: the old one-student-at-a-time path, for comparison', async () => {
    const single = moduleRef.get(ReadinessService);
    const n = 250;
    const t0 = Date.now();
    for (const id of studentIds.slice(0, n)) await single.calculateAndSaveReadiness(id);
    timings.sequentialPerStudentMs = (Date.now() - t0) / n;
    timings.sequentialProjectedMs = Math.round(timings.sequentialPerStudentMs * STUDENTS);
    console.log(`[load] sequential baseline: ${timings.sequentialPerStudentMs.toFixed(2)} ms/student -> ~${timings.sequentialProjectedMs} ms projected for ${STUDENTS}`);
  }, 5 * 60_000);
});

/** Small deterministic PRNG so every run generates the same cohort. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
