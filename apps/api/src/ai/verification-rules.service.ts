import { Injectable, Logger } from '@nestjs/common';
import { EvidenceStatus } from '../evidence/schemas/evidence.schema.js';

export interface RuleCheckResult {
  passed: boolean;
  failedRules: string[];
}

/**
 * Deterministic verification rules applied before/after AI analysis.
 */
@Injectable()
export class VerificationRulesService {
  private readonly logger = new Logger(VerificationRulesService.name);

  checkRules(params: {
    fileSize?: number;
    mimeType?: string;
    extractedText: string;
    evidenceType: string;
  }): RuleCheckResult {
    const failedRules: string[] = [];

    // Rule 1: File must be under size limit
    if (params.fileSize && params.fileSize > 10 * 1024 * 1024) {
      failedRules.push('File exceeds 10MB size limit');
    }

    // Rule 2: Must be a supported file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (params.mimeType && !allowedTypes.includes(params.mimeType)) {
      failedRules.push(`Unsupported file type: ${params.mimeType}`);
    }

    // Rule 3: Extracted text must be non-empty for verification
    if (!params.extractedText || params.extractedText.length < 10) {
      failedRules.push('Document text could not be extracted or is too short');
    }

    return {
      passed: failedRules.length === 0,
      failedRules,
    };
  }

  determineStatus(
    ruleResult: RuleCheckResult,
    aiDecision?: string,
  ): EvidenceStatus {
    // If rules fail, reject
    if (!ruleResult.passed) {
      return EvidenceStatus.REJECTED;
    }

    // Map AI decision to status
    switch (aiDecision) {
      case 'VERIFIED':
        return EvidenceStatus.VERIFIED;
      case 'REJECTED':
        return EvidenceStatus.REJECTED;
      case 'NEEDS_REVIEW':
      default:
        return EvidenceStatus.NEEDS_REVIEW;
    }
  }
}
