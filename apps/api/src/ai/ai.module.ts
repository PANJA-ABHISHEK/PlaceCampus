import { Module } from '@nestjs/common';
import { AIVerificationService } from './ai-verification.service.js';
import { DocumentExtractionService } from './document-extraction.service.js';
import { VerificationRulesService } from './verification-rules.service.js';

@Module({
  providers: [
    AIVerificationService,
    DocumentExtractionService,
    VerificationRulesService,
  ],
  exports: [
    AIVerificationService,
    DocumentExtractionService,
    VerificationRulesService,
  ],
})
export class AIModule {}
