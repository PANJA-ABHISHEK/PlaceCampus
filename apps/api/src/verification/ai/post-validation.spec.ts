import { postValidate, quoteFound } from './post-validation.js';
import { EXTRACTED_FIELDS, type DocumentAnalysisResult } from './document-analysis.schema.js';

const TEXT = `Certificate of Completion
This certifies that Asha Verma has successfully completed the course
Advanced React and TypeScript
Issued by Coursera on 12 March 2026
Credential ID 7QX2-KD91-REACT`;

function result(overrides: Partial<DocumentAnalysisResult> = {}): DocumentAnalysisResult {
  return {
    documentType: 'CERTIFICATE',
    documentTypeConfidence: 0.9,
    readability: 'GOOD',
    extracted: Object.fromEntries(EXTRACTED_FIELDS.map((f) => [f, null])) as DocumentAnalysisResult['extracted'],
    fieldEvidence: [],
    skillMentions: [],
    consistencyFlags: [],
    summary: '',
    uncertainty: [],
    ...overrides,
  };
}

describe('quoteFound', () => {
  it('matches ignoring case, spacing and punctuation', () => {
    expect(quoteFound('credential id: 7qx2 kd91 react', TEXT)).toBe(true);
  });
  it('tolerates small OCR errors in longer quotes', () => {
    expect(quoteFound('Advanced Reacl and TypeScripl', TEXT)).toBe(true);
  });
  it('rejects text that is not present', () => {
    expect(quoteFound('Google Cloud Professional Architect', TEXT)).toBe(false);
    expect(quoteFound('', TEXT)).toBe(false);
  });
});

describe('postValidate', () => {
  it('drops skill IDs outside the candidate list but keeps the mention', () => {
    const { result: out, postValidation } = postValidate(
      result({
        skillMentions: [
          { text: 'React', suggestedSkillId: 'skl_react', matchType: 'EXACT', relevance: 0.9, suggestedLevelCap: 2, rationale: '' },
          { text: 'Vue', suggestedSkillId: 'skl_invented', matchType: 'INFERRED', relevance: 0.6, suggestedLevelCap: 1, rationale: '' },
        ],
      }),
      new Set(['skl_react']),
      TEXT,
    );
    expect(postValidation.droppedSkillIds).toEqual(['skl_invented']);
    expect(out.skillMentions.map((m) => m.suggestedSkillId)).toEqual(['skl_react', null]);
  });

  it('nulls unparseable dates', () => {
    const { result: out, postValidation } = postValidate(
      result({ extracted: { ...result().extracted, issueDate: 'sometime soon', endDate: '12 March 2026' } }),
      new Set(),
      TEXT,
    );
    expect(postValidation.invalidDates).toEqual(['issueDate']);
    expect(out.extracted.issueDate).toBeNull();
    expect(out.extracted.endDate).toBe('12 March 2026');
  });

  it('marks fields unconfirmed when neither quote nor value is in the text', () => {
    const { postValidation } = postValidate(
      result({
        extracted: { ...result().extracted, credentialId: '7QX2-KD91-REACT', issuerName: 'Coursera', grade: 'A+' },
        fieldEvidence: [
          { field: 'credentialId', quote: 'Credential ID 7QX2-KD91-REACT', page: 1 },
          { field: 'grade', quote: 'Grade: A+', page: 1 },
        ],
      }),
      new Set(),
      TEXT,
    );
    expect(postValidation.unconfirmedFields).toEqual(['grade']);
  });

  it('skips quote checks when there is no text', () => {
    const { postValidation } = postValidate(
      result({ extracted: { ...result().extracted, grade: 'A+' } }),
      new Set(),
      '',
    );
    expect(postValidation.unconfirmedFields).toEqual([]);
  });
});
