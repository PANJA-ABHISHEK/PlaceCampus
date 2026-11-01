import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  VerificationRecord,
  VerificationRecordSchema,
} from './schemas/verification-record.schema.js';
import { VerificationController } from './verification.controller.js';
import { VerificationService } from './verification.service.js';
import { VerificationProcessor } from './verification.processor.js';
import { DocumentExtractorService } from './providers/document-extractor.service.js';
import { AiProviderService } from './providers/ai-provider.service.js';
import { VerificationEngineService } from './providers/verification-engine.service.js';
import { EvidenceModule } from '../evidence/evidence.module.js';
import { StorageModule } from '../storage/storage.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VerificationRecord.name, schema: VerificationRecordSchema },
    ]),
    EvidenceModule,
    StorageModule,
  ],
  controllers: [VerificationController],
  providers: [
    VerificationService,
    VerificationProcessor,
    DocumentExtractorService,
    AiProviderService,
    VerificationEngineService,
  ],
  exports: [VerificationService],
})
export class VerificationModule {}
