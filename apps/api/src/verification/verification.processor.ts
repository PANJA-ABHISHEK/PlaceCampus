import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EvidenceService } from '../evidence/evidence.service.js';
import { AIVerificationService } from '../ai/ai-verification.service.js';
import { DocumentExtractionService } from '../ai/document-extraction.service.js';
import { VerificationRulesService } from '../ai/verification-rules.service.js';
import { EvidenceStatus } from '../evidence/schemas/evidence.schema.js';

export interface VerificationJobData {
  evidenceId: string;
  fileUrl: string;
  mimeType?: string;
  fileSize?: number;
  claimedSkills: string[];
  evidenceType: string;
  studentName?: string;
}

export const VERIFICATION_QUEUE = 'evidence-verification';

@Processor(VERIFICATION_QUEUE)
export class VerificationProcessor extends WorkerHost {
  private readonly logger = new Logger(VerificationProcessor.name);

  constructor(
    private readonly evidenceService: EvidenceService,
    private readonly aiService: AIVerificationService,
    private readonly extractionService: DocumentExtractionService,
    private readonly rulesService: VerificationRulesService,
  ) {
    super();
  }

  async process(job: Job<VerificationJobData>): Promise<void> {
    const { evidenceId, fileUrl, mimeType, fileSize, claimedSkills, evidenceType, studentName } =
      job.data;

    this.logger.log(`Processing verification for evidence: ${evidenceId}`);

    try {
      // Step 1: Update status to PROCESSING
      await this.evidenceService.updateStatus(evidenceId, EvidenceStatus.PROCESSING);

      // Step 2: Extract text from document
      const extractedText = await this.extractionService.extractText(
        fileUrl,
        mimeType,
      );

      // Step 3: Run deterministic rules
      const ruleResult = this.rulesService.checkRules({
        fileSize,
        mimeType,
        extractedText,
        evidenceType,
      });

      // Step 4: AI analysis (skip if rules already failed)
      let aiAnalysis;
      if (ruleResult.passed) {
        aiAnalysis = await this.aiService.analyzeDocument({
          extractedText,
          claimedSkills,
          evidenceType,
          studentName,
        });
      }

      // Step 5: Determine final status
      const finalStatus = this.rulesService.determineStatus(
        ruleResult,
        aiAnalysis?.decision,
      );

      // Step 6: Update evidence with results
      const allReasons = [
        ...ruleResult.failedRules,
        ...(aiAnalysis?.reasons ?? []),
      ];

      // Sanitize AI analysis to avoid null vs undefined TS errors
      const sanitizedAiAnalysis = aiAnalysis
        ? {
            ...aiAnalysis,
            extractedName: aiAnalysis.extractedName ?? undefined,
            issuer: aiAnalysis.issuer ?? undefined,
            claimedSkill: aiAnalysis.claimedSkill ?? undefined,
            processedAt: new Date(),
          }
        : {
            decision: finalStatus,
            reasons: allReasons,
            modelVersion: 'rules-only',
            processedAt: new Date(),
          };

      await this.evidenceService.updateStatus(evidenceId, finalStatus, {
        aiAnalysis: sanitizedAiAnalysis,
        rejectionReason:
          finalStatus === EvidenceStatus.REJECTED
            ? allReasons.join('; ')
            : undefined,
      });

      this.logger.log(
        `Verification complete for ${evidenceId}: ${finalStatus}`,
      );
    } catch (error) {
      this.logger.error(
        `Verification failed for ${evidenceId}`,
        error instanceof Error ? error.stack : String(error),
      );

      // On failure, route to faculty review
      await this.evidenceService.updateStatus(
        evidenceId,
        EvidenceStatus.NEEDS_REVIEW,
        {
          aiAnalysis: {
            decision: 'NEEDS_REVIEW',
            reasons: ['Automated verification failed – requires manual review'],
            modelVersion: 'error-fallback',
            processedAt: new Date(),
          },
        },
      );
    }
  }
}
