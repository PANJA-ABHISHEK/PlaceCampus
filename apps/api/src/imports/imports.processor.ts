import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { ImportsService } from './imports.service.js';

/** `imports` queue worker: validation and chunked commits run outside HTTP requests. */
@Processor('imports')
export class ImportsProcessor {
  constructor(private readonly imports: ImportsService) {}

  @Process('validate')
  validate(job: Job<{ jobId: string }>) {
    return this.imports.runValidation(job.data.jobId);
  }

  @Process('commit')
  commit(job: Job<{ jobId: string }>) {
    return this.imports.runCommit(job.data.jobId);
  }
}
