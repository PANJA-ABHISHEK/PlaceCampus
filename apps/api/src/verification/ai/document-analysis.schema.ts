import { z } from 'zod';

/**
 * Master Plan §12.6 structured result. The JSON Schema below is sent to the
 * provider (strict structured outputs); the Zod schema validates the reply on
 * receipt. Keep the two in step.
 */
export const DOCUMENT_TYPES = [
  'CERTIFICATE',
  'INTERNSHIP_LETTER',
  'MARKSHEET',
  'PROJECT_REPORT',
  'ACHIEVEMENT',
  'CODING_PROFILE',
  'OTHER',
  'UNREADABLE',
] as const;

export const READABILITY = ['GOOD', 'FAIR', 'POOR'] as const;
export const MATCH_TYPES = ['EXACT', 'SYNONYM', 'INFERRED'] as const;
export const CONSISTENCY_CODES = [
  'DATE_IN_FUTURE',
  'ISSUER_UNCLEAR',
  'POSSIBLE_EDIT',
  'LOW_QUALITY',
  'MISSING_KEY_FIELD',
  'CLAIM_NOT_SUPPORTED',
  'DECLARED_MISMATCH',
] as const;

export const EXTRACTED_FIELDS = [
  'holderName',
  'issuerName',
  'issuerDomain',
  'title',
  'issueDate',
  'expiryDate',
  'credentialId',
  'verificationUrl',
  'score',
  'scoreMax',
  'grade',
  'organisation',
  'roleTitle',
  'startDate',
  'endDate',
  'semester',
  'sgpa',
  'cgpa',
] as const;
export type ExtractedField = (typeof EXTRACTED_FIELDS)[number];
export const DATE_FIELDS: ExtractedField[] = ['issueDate', 'expiryDate', 'startDate', 'endDate'];

const nullableString = z.string().nullable();

export const DocumentAnalysisSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES),
  documentTypeConfidence: z.number().min(0).max(1),
  readability: z.enum(READABILITY),
  extracted: z.object(
    Object.fromEntries(EXTRACTED_FIELDS.map((f) => [f, nullableString])) as Record<
      ExtractedField,
      typeof nullableString
    >,
  ),
  fieldEvidence: z.array(
    z.object({ field: z.string(), quote: z.string(), page: z.number().int().nullable() }),
  ),
  skillMentions: z.array(
    z.object({
      text: z.string(),
      suggestedSkillId: z.string().nullable(),
      matchType: z.enum(MATCH_TYPES),
      relevance: z.number().min(0).max(1),
      suggestedLevelCap: z.number().int().min(1).max(5).nullable(),
      rationale: z.string(),
    }),
  ),
  consistencyFlags: z.array(z.object({ code: z.enum(CONSISTENCY_CODES), detail: z.string() })),
  summary: z.string(),
  uncertainty: z.array(z.string()),
});

export type DocumentAnalysisResult = z.infer<typeof DocumentAnalysisSchema>;

const str = { type: ['string', 'null'] };

/** JSON Schema for strict structured outputs (every property required, no extras). */
export const DOCUMENT_ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'documentType',
    'documentTypeConfidence',
    'readability',
    'extracted',
    'fieldEvidence',
    'skillMentions',
    'consistencyFlags',
    'summary',
    'uncertainty',
  ],
  properties: {
    documentType: { type: 'string', enum: [...DOCUMENT_TYPES] },
    documentTypeConfidence: { type: 'number' },
    readability: { type: 'string', enum: [...READABILITY] },
    extracted: {
      type: 'object',
      additionalProperties: false,
      required: [...EXTRACTED_FIELDS],
      properties: Object.fromEntries(EXTRACTED_FIELDS.map((f) => [f, str])),
    },
    fieldEvidence: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['field', 'quote', 'page'],
        properties: { field: { type: 'string' }, quote: { type: 'string' }, page: { type: ['integer', 'null'] } },
      },
    },
    skillMentions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'suggestedSkillId', 'matchType', 'relevance', 'suggestedLevelCap', 'rationale'],
        properties: {
          text: { type: 'string' },
          suggestedSkillId: str,
          matchType: { type: 'string', enum: [...MATCH_TYPES] },
          relevance: { type: 'number' },
          suggestedLevelCap: { type: ['integer', 'null'] },
          rationale: { type: 'string' },
        },
      },
    },
    consistencyFlags: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['code', 'detail'],
        properties: { code: { type: 'string', enum: [...CONSISTENCY_CODES] }, detail: { type: 'string' } },
      },
    },
    summary: { type: 'string' },
    uncertainty: { type: 'array', items: { type: 'string' } },
  },
} as const;
