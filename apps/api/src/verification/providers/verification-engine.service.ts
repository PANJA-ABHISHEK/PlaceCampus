import { Injectable, Logger } from '@nestjs/common';
import { VerificationAIResult } from './ai-provider.service.js';
import { ExtractionResult } from './document-extractor.service.js';
import { EvidenceStatus, EvidenceType } from '@placecampus/shared-types';

export interface VerificationContext {
  evidenceId: string;
  type: EvidenceType;
  title: string;
}

@Injectable()
export class VerificationEngineService {
  private readonly logger = new Logger(VerificationEngineService.name);

  evaluate(
    context: VerificationContext,
    extraction: ExtractionResult,
    aiResult: VerificationAIResult | null,
    aiError: Error | null,
  ): { finalDecision: EvidenceStatus; reasons: string[]; ruleResults: any } {
    const reasons: string[] = [];
    const ruleResults: any = { checks: {} };

    // 1. Extraction Failure Rule
    if (!extraction.hasText || extraction.wordCount < 5) {
      reasons.push('Insufficient text extracted from document.');
      ruleResults.checks.insufficientText = true;
      return {
        finalDecision: EvidenceStatus.NEEDS_REVIEW,
        reasons,
        ruleResults,
      };
    }

    // 2. AI Failure Rule
    if (aiError || !aiResult) {
      reasons.push(
        `AI Analysis failed: ${aiError?.message || 'Unknown error'}`,
      );
      ruleResults.checks.aiFailed = true;
      return {
        finalDecision: EvidenceStatus.NEEDS_REVIEW,
        reasons,
        ruleResults,
      };
    }

    // Combine reasons from AI
    if (aiResult.reasons && aiResult.reasons.length > 0) {
      reasons.push(...aiResult.reasons);
    }

    // 3. Duplicate Detection Rule (mocked for now as per instructions)
    if (aiResult.possibleDuplicate) {
      reasons.push('Document flagged as possible duplicate.');
      ruleResults.checks.possibleDuplicate = true;
      return {
        finalDecision: EvidenceStatus.NEEDS_REVIEW,
        reasons,
        ruleResults,
      };
    }

    // 4. Low Confidence Rule
    if (aiResult.confidence < 0.7) {
      reasons.push('AI confidence is too low.');
      ruleResults.checks.lowConfidence = true;
      return {
        finalDecision: EvidenceStatus.NEEDS_REVIEW,
        reasons,
        ruleResults,
      };
    }

    // 5. Explicit Reject from AI
    if (aiResult.decision === 'REJECTED') {
      ruleResults.checks.aiRejected = true;
      return { finalDecision: EvidenceStatus.REJECTED, reasons, ruleResults };
    }

    // 6. Explicit Needs Review from AI
    if (aiResult.decision === 'NEEDS_REVIEW') {
      ruleResults.checks.aiNeedsReview = true;
      return {
        finalDecision: EvidenceStatus.NEEDS_REVIEW,
        reasons,
        ruleResults,
      };
    }

    // 7. Relevance Check
    if (!aiResult.skillRelevant) {
      reasons.push(
        'Document does not appear relevant to any technical skills.',
      );
      ruleResults.checks.irrelevant = true;
      return {
        finalDecision: EvidenceStatus.NEEDS_REVIEW,
        reasons,
        ruleResults,
      };
    }

    // If it passed all deterministic filters and AI says VERIFIED, then verify it
    ruleResults.checks.passed = true;
    return { finalDecision: EvidenceStatus.VERIFIED, reasons, ruleResults };
  }
}
