import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { VerificationProcessor, VERIFICATION_QUEUE } from './verification.processor.js';
import { VerificationService } from './verification.service.js';
import { EvidenceModule } from '../evidence/evidence.module.js';
import { AIModule } from '../ai/ai.module.js';

@Module({
  imports: [
    BullModule.registerQueue({ name: VERIFICATION_QUEUE }),
    EvidenceModule,
    AIModule,
  ],
  providers: [VerificationProcessor, VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
