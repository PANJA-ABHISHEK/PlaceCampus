import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import {
  BATCH_CONCURRENCY,
  BATCH_JOB,
  CHUNK_ATTEMPTS,
  ReadinessBatchService,
  type ChunkJob,
} from './readiness-batch.service.js';

/** `readiness` queue worker: batch chunks run in parallel, outside HTTP requests. */
@Processor('readiness')
export class ReadinessBatchProcessor {
  constructor(private readonly batch: ReadinessBatchService) {}

  @Process({ name: BATCH_JOB, concurrency: BATCH_CONCURRENCY })
  async chunk(job: Job<ChunkJob>) {
    try {
      await this.batch.processChunk(job.data);
    } catch (error: any) {
      // On the last attempt, count the chunk's students as failed so the run still finishes.
      if (job.attemptsMade + 1 >= (job.opts.attempts ?? CHUNK_ATTEMPTS)) {
        await this.batch.recordChunkFailure(job.data, error);
      }
      throw error;
    }
  }
}
