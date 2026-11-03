import { EvidenceStatus, EvidenceType } from '@placecampus/shared-types';
import { VerificationAIResult } from './ai-provider.service.js';
import { ExtractionResult } from './document-extractor.service.js';
import { VerificationEngineService } from './verification-engine.service.js';

const sufficientExtraction: ExtractionResult = {
  text: 'Completed an advanced software engineering certification program.',
  hasText: true,
  wordCount: 7,
  method: 'PDF_TEXT',
};

function aiResult(decision: VerificationAIResult['decision']): VerificationAIResult {
  return {
    documentType: 'Certificate',
    issuer: 'Example Institute',
    claimedSkills: ['Software Engineering'],
    skillRelevant: true,
    possibleDuplicate: false,
    readable: true,
    decision,
    confidence: 0.95,
    reasons: [],
    modelVersion: 'test-model',
  };
}

describe('VerificationEngineService', () => {
  const service = new VerificationEngineService();
  const context = {
    evidenceId: 'evidence-1',
    type: EvidenceType.CERTIFICATION,
    title: 'Software Engineering Certificate',
  };

  it.each(['VERIFIED', 'REJECTED'] as const)(
    'keeps AI %s recommendations pending faculty review',
    (decision) => {
      const result = service.evaluate(
        context,
        sufficientExtraction,
        aiResult(decision),
        null,
      );

      expect(result.finalDecision).toBe(EvidenceStatus.NEEDS_REVIEW);
      expect(result.ruleResults.checks.awaitingFacultyReview).toBe(true);
      if (decision === 'REJECTED') {
        expect(result.ruleResults.checks.aiRecommendedRejection).toBe(true);
      }
    },
  );

  it('sends insufficient extraction to faculty review', () => {
    const result = service.evaluate(
      context,
      { text: '', hasText: false, wordCount: 0, method: 'NONE' },
      null,
      null,
    );

    expect(result.finalDecision).toBe(EvidenceStatus.NEEDS_REVIEW);
  });
});
