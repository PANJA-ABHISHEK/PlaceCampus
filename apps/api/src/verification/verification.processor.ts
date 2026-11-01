import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VerificationRecord } from './schemas/verification-record.schema.js';
import { EvidenceService } from '../evidence/evidence.service.js';
import { StorageService } from '../storage/storage.service.js';
import { DocumentExtractorService } from './providers/document-extractor.service.js';
import {
  AiProviderService,
  VerificationAIResult,
} from './providers/ai-provider.service.js';
import { VerificationEngineService } from './providers/verification-engine.service.js';
import { EvidenceStatus } from '@placecampus/shared-types';

export interface VerifyEvidenceJob {
  evidenceId: string;
  studentId: string;
  documentKey: string;
}

@Processor('verification')
export class VerificationProcessor {
  private readonly logger = new Logger(VerificationProcessor.name);

  constructor(
    @InjectModel(VerificationRecord.name)
    private recordModel: Model<VerificationRecord>,
    private readonly evidenceService: EvidenceService,
    private readonly storageService: StorageService,
    private readonly extractorService: DocumentExtractorService,
    private readonly aiService: AiProviderService,
    private readonly engineService: VerificationEngineService,
  ) {}

  @Process('verify-evidence')
  async handleVerification(job: Job<VerifyEvidenceJob>) {
    const { evidenceId, studentId, documentKey } = job.data;
    const startTime = Date.now();
    this.logger.log(`Processing verification job for evidence ${evidenceId}`);

    try {
      // 1. Get Evidence Metadata (ensure it still exists and is processing)
      const evidence = await this.evidenceService.findOne(
        evidenceId,
        studentId,
      );
      if (!evidence || evidence.status !== EvidenceStatus.PROCESSING) {
        this.logger.warn(
          `Evidence ${evidenceId} is not in PROCESSING state. Aborting job.`,
        );
        return;
      }

      // 2. Determine previous attempt count
      const attemptCount = await this.recordModel.countDocuments({
        evidenceId,
      });

      // 3. Get Document Path
      const absolutePath = await this.storageService.getFilePath(documentKey);

      // 4. Extract Text
      const extraction = await this.extractorService.extractText(
        absolutePath,
        evidence.document?.mimeType || 'application/octet-stream',
      );

      // 5. AI Analysis
      let aiResult: VerificationAIResult | null = null;
      let aiError: Error | null = null;

      if (extraction.hasText) {
        try {
          aiResult = await this.aiService.analyzeEvidence(
            extraction.text,
            evidence.title,
            evidence.type,
          );
        } catch (error: any) {
          aiError = error;
          this.logger.error(
            `AI analysis error for ${evidenceId}: ${error.message}`,
          );
        }
      }

      // 6. Deterministic Rules Engine
      const { finalDecision, reasons, ruleResults } =
        this.engineService.evaluate(
          { evidenceId, title: evidence.title, type: evidence.type },
          extraction,
          aiResult,
          aiError,
        );

      // 7. Save Verification Record
      const record = new this.recordModel({
        evidenceId,
        studentId,
        attemptNumber: attemptCount + 1,
        extractionMethod: extraction.method,
        extractedTextMetadata: {
          wordCount: extraction.wordCount,
          hasText: extraction.hasText,
        },
        aiProvider: 'configured-provider',
        modelVersion: aiResult?.modelVersion || 'unknown',
        aiResult,
        ruleResults,
        finalDecision,
        reasons,
        processingDurationMs: Date.now() - startTime,
        errorInformation: aiError?.message,
      });
      await record.save();

      // 8. Update Evidence Status via direct DB update to bypass the service's "no manual status change" rule
      // We do this using EvidenceService to update it but we need a backdoor method or just inject Evidence model here.
      // Since EvidenceService only blocks controller updates (via UpdateEvidenceDto), wait, does it block all?
      // `evidence.service.update` only takes `UpdateEvidenceDto` which includes title, description... not status.
      // So I will add a secure internal method in EvidenceService for the worker, or do it directly.
      // Doing it cleanly via EvidenceService internal method:
      await this.evidenceService.updateVerificationResult(
        evidenceId,
        studentId,
        finalDecision,
        reasons.join('; '),
      );

      this.logger.log(
        `Finished verification for ${evidenceId}. Result: ${finalDecision}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to process verification job for ${evidenceId}: ${error.message}`,
        error.stack,
      );

      // Fallback update to NEEDS_REVIEW on catastrophic job failure to avoid hanging in PROCESSING
      await this.evidenceService.updateVerificationResult(
        evidenceId,
        studentId,
        EvidenceStatus.NEEDS_REVIEW,
        `Internal processing error: ${error.message}`,
      );

      // Record the failure
      const attemptCount = await this.recordModel.countDocuments({
        evidenceId,
      });
      await new this.recordModel({
        evidenceId,
        studentId,
        attemptNumber: attemptCount + 1,
        finalDecision: EvidenceStatus.NEEDS_REVIEW,
        reasons: ['Internal system error during processing.'],
        processingDurationMs: Date.now() - startTime,
        errorInformation: error.message,
      }).save();
    }
  }
}
