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
import { VerificationEngineService } from './providers/verification-engine.service.js';
import { EvidenceModule } from '../evidence/evidence.module.js';
import {
  EvidenceExtraction,
  EvidenceExtractionSchema,
} from './schemas/evidence-extraction.schema.js';
import { AiAnalysis, AiAnalysisSchema } from './schemas/ai-analysis.schema.js';
import { Evidence, EvidenceSchema } from '../evidence/schemas/evidence.schema.js';
import { Skill, SkillSchema } from '../skills/schemas/skill.schema.js';
import { ExtractionStoreService } from './extraction-store.service.js';
import { AiAnalysisService } from './ai/ai-analysis.service.js';
import { StorageModule } from '../storage/storage.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VerificationRecord.name, schema: VerificationRecordSchema },
      { name: EvidenceExtraction.name, schema: EvidenceExtractionSchema },
      { name: AiAnalysis.name, schema: AiAnalysisSchema },
      { name: Evidence.name, schema: EvidenceSchema },
      { name: Skill.name, schema: SkillSchema },
    ]),
    EvidenceModule,
    StorageModule,
  ],
  controllers: [VerificationController],
  providers: [
    VerificationService,
    VerificationProcessor,
    DocumentExtractorService,
    AiAnalysisService,
    VerificationEngineService,
    ExtractionStoreService,
  ],
  exports: [
    VerificationService,
    DocumentExtractorService,
    VerificationEngineService,
    ExtractionStoreService,
    AiAnalysisService,
  ],
})
export class VerificationModule {}
