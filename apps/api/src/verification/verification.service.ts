import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  VERIFICATION_QUEUE,
  type VerificationJobData,
} from './verification.processor.js';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    @InjectQueue(VERIFICATION_QUEUE) private readonly verificationQueue: Queue,
  ) {}

  async queueVerification(data: VerificationJobData): Promise<string> {
    const job = await this.verificationQueue.add('verify-evidence', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    this.logger.log(
      `Queued verification job ${job.id} for evidence ${data.evidenceId}`,
    );
    return job.id ?? data.evidenceId;
  }
}
