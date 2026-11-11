import { ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { BATCH_CHUNK_SIZE, ReadinessBatchService } from './readiness-batch.service.js';

const chain = (value: unknown) => {
  const q: any = {};
  for (const m of ['select', 'sort', 'limit', 'lean']) q[m] = vi.fn(() => q);
  q.exec = vi.fn(async () => value);
  q.allowDiskUse = vi.fn(() => q);
  return q;
};

function setup({ active = null as unknown, studentCount = 0, queue = undefined as any } = {}) {
  const ids = Array.from({ length: studentCount }, () => String(new Types.ObjectId()));
  const created: any[] = [];
  const runModel: any = {
    updateMany: vi.fn(() => chain({})),
    findOne: vi.fn(() => chain(active)),
    create: vi.fn(async (doc: any) => {
      const run = { _id: new Types.ObjectId(), createdAt: new Date(), ...doc };
      created.push(run);
      return { ...run, toObject: () => run };
    }),
    updateOne: vi.fn(() => chain({ modifiedCount: 1 })),
    findOneAndUpdate: vi.fn(),
  };
  const profileModel: any = { find: vi.fn(() => chain(ids.map((userId) => ({ userId })))) };
  const service = new ReadinessBatchService(runModel, {} as any, profileModel, {} as any, {} as any, {} as any, {} as any, undefined, undefined, queue);
  return { service, runModel, created, ids };
}

describe('ReadinessBatchService', () => {
  it('refuses to start while another run is in progress', async () => {
    const { service } = setup({ active: { _id: new Types.ObjectId(), status: 'RUNNING' } });
    await expect(service.start({}, { role: 'admin' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('completes immediately when the cohort has no students', async () => {
    const { service } = setup({ studentCount: 0 });
    const run = await service.start({ graduationYear: 2031 }, { role: 'admin' });
    expect(run).toMatchObject({ status: 'COMPLETED', total: 0, totalChunks: 0, durationMs: 0 });
  });

  it('splits the cohort into 250-student chunks on the queue', async () => {
    const queue = { addBulk: vi.fn(async () => []) };
    const { service } = setup({ studentCount: 5_000, queue });
    const run = await service.start({}, { role: 'admin' });
    expect(run).toMatchObject({ status: 'RUNNING', total: 5_000, totalChunks: 20, executor: 'BULL' });
    const jobs = (queue.addBulk.mock.calls[0] as any)[0];
    expect(jobs).toHaveLength(20);
    expect(jobs.every((j: any) => j.data.studentIds.length === BATCH_CHUNK_SIZE)).toBe(true);
    expect(jobs[0].opts.attempts).toBe(3);
  });

  it('falls back to in-process execution when Redis is unavailable', async () => {
    const queue = { addBulk: vi.fn(async () => { throw new Error('ECONNREFUSED'); }) };
    const { service } = setup({ studentCount: 10, queue });
    const runInProcess = vi.spyOn(service as any, 'runInProcess').mockResolvedValue(undefined);
    const run = await service.start({}, { role: 'admin' });
    expect(run.executor).toBe('IN_PROCESS');
    await new Promise((r) => setImmediate(r));
    expect(runInProcess).toHaveBeenCalled();
  });

  it('counts a retried chunk only once and closes the run on the last chunk', async () => {
    const { service, runModel } = setup();
    const runId = String(new Types.ObjectId());
    // First report: counted, and it is the last of 2 chunks.
    runModel.findOneAndUpdate.mockReturnValueOnce(chain({ _id: runId, chunksDone: [0, 1], totalChunks: 2, processed: 500, updated: 480, unchanged: 20, failed: 0, total: 500, startedAt: new Date(Date.now() - 1234) }));
    // Retry of the same chunk: the `$ne` guard matches nothing.
    runModel.findOneAndUpdate.mockReturnValueOnce(chain(null));
    const report = { runId, index: 1, studentIds: ['a', 'b'] };
    await service.recordChunkFailure(report, new Error('boom'));
    await service.recordChunkFailure(report, new Error('boom'));

    expect(runModel.findOneAndUpdate.mock.calls[0][0]).toEqual({ _id: runId, chunksDone: { $ne: 1 } });
    expect(runModel.updateOne).toHaveBeenCalledTimes(1);
    const [, update] = runModel.updateOne.mock.calls[0];
    expect(update.$set.status).toBe('COMPLETED');
    expect(update.$set.durationMs).toBeGreaterThanOrEqual(1234);
  });
});
