import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VerificationRecord } from './schemas/verification-record.schema.js';
import { EvidenceService } from '../evidence/evidence.service.js';
import { StorageService } from '../storage/storage.service.js';
import { DocumentExtractorService } from './providers/document-extractor.service.js';
import { AiAnalysisService } from './ai/ai-analysis.service.js';
import { VerificationEngineService } from './providers/verification-engine.service.js';
import { ExtractionStoreService } from './extraction-store.service.js';
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
    private readonly aiService: AiAnalysisService,
    private readonly engineService: VerificationEngineService,
    private readonly extractionStore: ExtractionStoreService,
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

      // 4. Extract Text (PDF text layer, OCR for scanned pages and images)
      const extraction = await this.extractorService.extractText(
        absolutePath,
        evidence.document?.mimeType || 'application/octet-stream',
      );
      const extractionDoc = await this.extractionStore.save({
        evidenceId,
        studentId,
        version: attemptCount + 1,
        fileId: evidence.document?.id,
        result: extraction,
      });

      // 4b. Fingerprint duplicate detection
      const duplicates = await this.extractionStore.findDuplicates(evidenceId, studentId, extraction);

      // 5. AI document analysis (advisory; adapter returns DISABLED when off or unconfigured)
      let ai: Awaited<ReturnType<AiAnalysisService['analyze']>> | null = null;
      try {
        ai = await this.aiService.analyze(
          {
            evidenceId,
            studentId,
            version: attemptCount + 1,
            type: evidence.type,
            title: evidence.title,
            issuer: evidence.issuer,
            issuedDate: evidence.issuedDate,
          },
          extraction,
        );
      } catch (error: any) {
        // Persistence problems must not block review; the engine treats this as "AI unavailable".
        this.logger.error(`AI analysis step failed for ${evidenceId}: ${error.message}`);
      }

      // 6. Deterministic Rules Engine
      const { finalDecision, reasons, ruleResults } =
        this.engineService.evaluate(
          { evidenceId, title: evidence.title, type: evidence.type },
          extraction,
          ai ? ai.outcome : { status: 'FAILED' },
          duplicates,
        );

      // 7. Save Verification Record
      const record = new this.recordModel({
        evidenceId,
        studentId,
        attemptNumber: attemptCount + 1,
        extractionMethod: extraction.method,
        extractionStatus: extraction.status,
        extractionId: extractionDoc.id,
        extractedTextMetadata: {
          wordCount: extraction.wordCount,
          hasText: extraction.hasText,
          charCount: extraction.charCount,
          pageCount: extraction.pageCount,
          ocrConfidence: extraction.ocrConfidence,
        },
        duplicateMatches: duplicates.length ? duplicates : undefined,
        aiProvider: ai?.outcome.provider ?? 'none',
        modelVersion: ai?.outcome.model ?? 'none',
        aiStatus: ai?.outcome.status ?? 'FAILED',
        aiAnalysisId: ai?.analysisId,
        aiResult: ai?.legacy ?? undefined,
        ruleResults,
        finalDecision,
        reasons,
        processingDurationMs: Date.now() - startTime,
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
