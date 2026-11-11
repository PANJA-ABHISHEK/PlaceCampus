import { Injectable } from '@nestjs/common';
import { SKILL_RELEVANCE_THRESHOLD, type AiOutcome } from '../ai/ai-analysis.service.js';
import type { CONSISTENCY_CODES } from '../ai/document-analysis.schema.js';

type ConsistencyCode = (typeof CONSISTENCY_CODES)[number];
import { ExtractionResult } from './document-extractor.service.js';
import { EvidenceStatus, EvidenceType } from '@placecampus/shared-types';
import type { DuplicateMatch } from '../extraction-store.service.js';

export interface VerificationContext {
  evidenceId: string;
  type: EvidenceType;
  title: string;
}

/** R-02 readability: below this many characters the document is unreadable. */
export const MIN_READABLE_CHARS = 80;
/** OCR confidence (0-100) below which the scan is flagged as unclear. */
export const LOW_OCR_CONFIDENCE = 60;

/**
 * Deterministic rules over the extraction, fingerprint matches and the
 * (advisory) AI result. Every outcome routes to faculty review; the rules
 * decide *why*, which the reviewer sees as reasons and check flags.
 */
@Injectable()
export class VerificationEngineService {
  evaluate(
    context: VerificationContext,
    extraction: ExtractionResult,
    analysis: Pick<AiOutcome, 'status' | 'result' | 'postValidation'> | null,
    duplicates: DuplicateMatch[] = [],
  ): { finalDecision: EvidenceStatus; reasons: string[]; ruleResults: any } {
    const reasons: string[] = [];
    const ruleResults: any = { checks: {} };
    const review = () => ({ finalDecision: EvidenceStatus.NEEDS_REVIEW, reasons, ruleResults });

    // R-01 Extraction failure: the file could not be opened or parsed at all.
    if (extraction.status === 'FAILED') {
      reasons.push('The document could not be processed automatically; a reviewer will inspect the file.');
      ruleResults.checks.extractionFailed = true;
      ruleResults.checks.insufficientText = true;
      return review();
    }

    // Duplicate detection from file and text fingerprints (works without text for FILE matches).
    if (duplicates.length) {
      const exact = duplicates.some((d) => d.matchType === 'FILE');
      reasons.push(
        exact
          ? 'The same file has already been submitted as another evidence item.'
          : 'The document text matches another evidence submission.',
      );
      ruleResults.checks.possibleDuplicate = true;
      ruleResults.checks.duplicateMatchType = exact ? 'FILE' : 'TEXT';
      return review();
    }

    // Partial extraction: some pages could not be OCR'd. Continue with what was read.
    if (extraction.status === 'PARTIAL') {
      reasons.push('Some pages could not be read automatically; the reviewer should check the full document.');
      ruleResults.checks.partialExtraction = true;
    }

    // R-02 Readability.
    if (!extraction.hasText || extraction.charCount < MIN_READABLE_CHARS || extraction.wordCount < 5) {
      reasons.push(
        extraction.method === 'OCR' || extraction.method === 'MIXED'
          ? 'Too little text could be read from the scan; it may be blurred, low-resolution or blank.'
          : 'Insufficient text extracted from document.',
      );
      ruleResults.checks.insufficientText = true;
      return review();
    }

    if (extraction.ocrConfidence !== null && extraction.ocrConfidence < LOW_OCR_CONFIDENCE) {
      reasons.push(
        `OCR confidence is low (${Math.round(extraction.ocrConfidence)}%); extracted details may be inaccurate.`,
      );
      ruleResults.checks.lowOcrConfidence = true;
    }

    ruleResults.checks.awaitingFacultyReview = true;

    // AI is advisory (§12.5): it adds templated warnings, never an outcome.
    if (!analysis || analysis.status === 'DISABLED') {
      reasons.push('AI analysis was not used; automated checks are based on rules and OCR only.');
      ruleResults.checks.aiDisabled = true;
      if (!ruleResults.checks.partialExtraction && !ruleResults.checks.lowOcrConfidence) {
        ruleResults.checks.passed = true;
      }
      return review();
    }
    if (analysis.status !== 'SUCCEEDED' || !analysis.result) {
      reasons.push('AI analysis was unavailable for this document; it will be reviewed without AI findings.');
      ruleResults.checks.aiFailed = true;
      ruleResults.checks.aiStatus = analysis.status;
      return review();
    }

    const result = analysis.result;
    let warnings = 0;

    if (result.readability === 'POOR' || result.documentType === 'UNREADABLE') {
      reasons.push('AI found the document hard to read; check the original carefully.');
      ruleResults.checks.lowReadability = true;
      warnings += 1;
    }

    const codes = [...new Set(result.consistencyFlags.map((f) => f.code))];
    if (codes.length) {
      for (const code of codes) reasons.push(CONSISTENCY_REASONS[code]);
      ruleResults.checks.consistencyFlags = codes;
      warnings += codes.length;
    }

    const unconfirmed = analysis.postValidation?.unconfirmedFields ?? [];
    if (unconfirmed.length) {
      reasons.push(`Some AI-extracted details could not be matched to the document text (${unconfirmed.join(', ')}).`);
      ruleResults.checks.unconfirmedFields = unconfirmed;
      warnings += 1;
    }

    const relevantSkills = result.skillMentions.filter(
      (m) => m.suggestedSkillId && m.relevance >= SKILL_RELEVANCE_THRESHOLD,
    );
    if (!relevantSkills.length) {
      reasons.push('Document does not appear relevant to any skill in the catalogue.');
      ruleResults.checks.irrelevant = true;
      warnings += 1;
    }

    if (!warnings && !ruleResults.checks.partialExtraction && !ruleResults.checks.lowOcrConfidence) {
      reasons.push('Automated checks passed; faculty review is required.');
      ruleResults.checks.passed = true;
    }
    return review();
  }
}

/** Templated wording (§12.7): reviewers and students read the same text, never raw model output. */
const CONSISTENCY_REASONS: Record<ConsistencyCode, string> = {
  DATE_IN_FUTURE: 'A date on the document appears to be in the future.',
  ISSUER_UNCLEAR: 'The issuing organisation is not clearly identifiable.',
  POSSIBLE_EDIT: 'The document may have been edited or contains unusual content.',
  LOW_QUALITY: 'Parts of the document text are garbled or incomplete.',
  MISSING_KEY_FIELD: 'A key detail (such as the title or date) is missing from the document.',
  CLAIM_NOT_SUPPORTED: 'The document does not clearly support the declared achievement or skills.',
  DECLARED_MISMATCH: 'The declared title, issuer or date does not match the document.',
};
