import { EvidenceStatus, EvidenceType } from '@placecampus/shared-types';
import { ExtractionResult } from './document-extractor.service.js';
import { VerificationEngineService } from './verification-engine.service.js';
import { EXTRACTED_FIELDS, type DocumentAnalysisResult } from '../ai/document-analysis.schema.js';
import type { AiOutcome } from '../ai/ai-analysis.service.js';

const TEXT =
  'Certificate of Completion. This certifies that Asha Verma has completed the advanced software engineering certification program.';

function extraction(overrides: Partial<ExtractionResult> = {}): ExtractionResult {
  return {
    text: TEXT,
    method: 'PDF_TEXT',
    status: 'COMPLETED',
    hasText: true,
    wordCount: TEXT.split(/\s+/).length,
    charCount: TEXT.length,
    ocrConfidence: null,
    pageCount: 1,
    pages: [{ page: 1, source: 'TEXT_LAYER', chars: TEXT.length }],
    fileSha256: 'a'.repeat(64),
    textFingerprint: 'b'.repeat(64),
    engineVersions: {},
    durationMs: 10,
    ...overrides,
  };
}

function analysisResult(overrides: Partial<DocumentAnalysisResult> = {}): DocumentAnalysisResult {
  return {
    documentType: 'CERTIFICATE',
    documentTypeConfidence: 0.95,
    readability: 'GOOD',
    extracted: Object.fromEntries(EXTRACTED_FIELDS.map((f) => [f, null])) as DocumentAnalysisResult['extracted'],
    fieldEvidence: [],
    skillMentions: [
      { text: 'software engineering', suggestedSkillId: 'skl_se', matchType: 'EXACT', relevance: 0.9, suggestedLevelCap: 2, rationale: 'Course title' },
    ],
    consistencyFlags: [],
    summary: 'A course completion certificate.',
    uncertainty: [],
    ...overrides,
  };
}

function succeeded(overrides: Partial<DocumentAnalysisResult> = {}, unconfirmedFields: string[] = []) {
  return {
    status: 'SUCCEEDED' as const,
    result: analysisResult(overrides),
    postValidation: { droppedSkillIds: [], unconfirmedFields: unconfirmedFields as any, invalidDates: [] },
  } satisfies Pick<AiOutcome, 'status' | 'result' | 'postValidation'>;
}

describe('VerificationEngineService', () => {
  const service = new VerificationEngineService();
  const context = {
    evidenceId: 'evidence-1',
    type: EvidenceType.CERTIFICATION,
    title: 'Software Engineering Certificate',
  };

  it('keeps a clean AI analysis pending faculty review (AI never decides)', () => {
    const result = service.evaluate(context, extraction(), succeeded());
    expect(result.finalDecision).toBe(EvidenceStatus.NEEDS_REVIEW);
    expect(result.ruleResults.checks.awaitingFacultyReview).toBe(true);
    expect(result.ruleResults.checks.passed).toBe(true);
    expect(result.reasons).toEqual(['Automated checks passed; faculty review is required.']);
  });

  it('turns consistency flags into templated reasons, never raw model text', () => {
    const result = service.evaluate(
      context,
      extraction(),
      succeeded({
        consistencyFlags: [
          { code: 'DATE_IN_FUTURE', detail: 'Issued 2099 to Asha Verma' },
          { code: 'DECLARED_MISMATCH', detail: 'Issuer differs' },
        ],
      }),
    );
    expect(result.ruleResults.checks.consistencyFlags).toEqual(['DATE_IN_FUTURE', 'DECLARED_MISMATCH']);
    expect(result.ruleResults.checks.passed).toBeUndefined();
    expect(result.reasons.join(' ')).not.toContain('Asha');
    expect(result.reasons).toContain('A date on the document appears to be in the future.');
  });

  it('flags unconfirmed fields, poor readability and irrelevance', () => {
    const result = service.evaluate(
      context,
      extraction(),
      succeeded({ readability: 'POOR', skillMentions: [] }, ['credentialId']),
    );
    expect(result.ruleResults.checks.lowReadability).toBe(true);
    expect(result.ruleResults.checks.unconfirmedFields).toEqual(['credentialId']);
    expect(result.ruleResults.checks.irrelevant).toBe(true);
  });

  it('ignores skill mentions without a catalogue ID or with low relevance', () => {
    const result = service.evaluate(
      context,
      extraction(),
      succeeded({
        skillMentions: [
          { text: 'teamwork', suggestedSkillId: null, matchType: 'INFERRED', relevance: 0.9, suggestedLevelCap: null, rationale: '' },
          { text: 'Java', suggestedSkillId: 'skl_java', matchType: 'INFERRED', relevance: 0.2, suggestedLevelCap: 1, rationale: '' },
        ],
      }),
    );
    expect(result.ruleResults.checks.irrelevant).toBe(true);
  });

  it.each(['FAILED', 'INVALID_OUTPUT', 'REFUSED'] as const)('treats AI %s as unavailable', (status) => {
    const result = service.evaluate(context, extraction(), { status });
    expect(result.ruleResults.checks.aiFailed).toBe(true);
    expect(result.ruleResults.checks.aiStatus).toBe(status);
    expect(result.finalDecision).toBe(EvidenceStatus.NEEDS_REVIEW);
  });

  it('runs rules and OCR only when AI is disabled', () => {
    const result = service.evaluate(context, extraction(), { status: 'DISABLED' });
    expect(result.ruleResults.checks.aiDisabled).toBe(true);
    expect(result.ruleResults.checks.passed).toBe(true);
    expect(result.reasons[0]).toMatch(/rules and OCR only/);
  });

  it('sends insufficient extraction to faculty review', () => {
    const result = service.evaluate(
      context,
      extraction({ text: '', hasText: false, wordCount: 0, charCount: 0, method: 'NONE' }),
      null,
    );
    expect(result.finalDecision).toBe(EvidenceStatus.NEEDS_REVIEW);
    expect(result.ruleResults.checks.insufficientText).toBe(true);
  });

  it('applies R-02: fewer than 80 characters is unreadable even with five words', () => {
    const short = 'Course done by Asha in 2026';
    const result = service.evaluate(
      context,
      extraction({ text: short, charCount: short.length, wordCount: 6, method: 'OCR', ocrConfidence: 90 }),
      succeeded(),
    );
    expect(result.ruleResults.checks.insufficientText).toBe(true);
    expect(result.reasons[0]).toMatch(/scan/);
  });

  it('flags failed extraction', () => {
    const result = service.evaluate(
      context,
      extraction({ status: 'FAILED', text: '', hasText: false, charCount: 0, wordCount: 0, method: 'NONE' }),
      null,
    );
    expect(result.ruleResults.checks.extractionFailed).toBe(true);
  });

  it('flags low OCR confidence and withholds "passed"', () => {
    const result = service.evaluate(context, extraction({ method: 'OCR', ocrConfidence: 41.5 }), succeeded());
    expect(result.ruleResults.checks.lowOcrConfidence).toBe(true);
    expect(result.ruleResults.checks.passed).toBeUndefined();
    expect(result.reasons.some((r) => r.includes('42%'))).toBe(true);
  });

  it('does not flag OCR confidence when OCR did not run', () => {
    const result = service.evaluate(context, extraction(), succeeded());
    expect(result.ruleResults.checks.lowOcrConfidence).toBeUndefined();
  });

  it('notes partial extraction', () => {
    const result = service.evaluate(context, extraction({ status: 'PARTIAL', method: 'MIXED', ocrConfidence: 88 }), succeeded());
    expect(result.ruleResults.checks.partialExtraction).toBe(true);
    expect(result.ruleResults.checks.passed).toBeUndefined();
  });

  it('routes fingerprint duplicates to review, preferring the exact-file reason', () => {
    const exact = service.evaluate(context, extraction(), succeeded(), [
      { evidenceId: 'other-1', matchType: 'TEXT', sameStudent: false },
      { evidenceId: 'other-2', matchType: 'FILE', sameStudent: true },
    ]);
    expect(exact.ruleResults.checks.possibleDuplicate).toBe(true);
    expect(exact.ruleResults.checks.duplicateMatchType).toBe('FILE');
    expect(exact.reasons[0]).toMatch(/same file/);

    const text = service.evaluate(context, extraction(), succeeded(), [
      { evidenceId: 'other-1', matchType: 'TEXT', sameStudent: false },
    ]);
    expect(text.ruleResults.checks.duplicateMatchType).toBe('TEXT');
    expect(text.ruleResults.checks.passed).toBeUndefined();
  });
});
