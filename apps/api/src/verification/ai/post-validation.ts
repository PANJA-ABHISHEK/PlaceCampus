import {
  DATE_FIELDS,
  EXTRACTED_FIELDS,
  type DocumentAnalysisResult,
  type ExtractedField,
} from './document-analysis.schema.js';

/**
 * Master Plan §12.6 post-validation:
 * - suggested skill IDs must belong to the supplied candidate list (others are dropped,
 *   and the mention stays as an unresolved term);
 * - dates must parse;
 * - every non-null extracted field needs a quote that is found (fuzzily) in the
 *   extracted text; otherwise the field is shown as "unconfirmed".
 * Model confidence is never used to drive an outcome.
 */
export interface PostValidation {
  droppedSkillIds: string[];
  unconfirmedFields: ExtractedField[];
  invalidDates: ExtractedField[];
}

/** Lowercase alphanumerics only: tolerant of OCR spacing, punctuation and case. */
export function squash(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
}

/** True when `quote` appears in `text`, allowing a small edit distance for OCR noise. */
export function quoteFound(quote: string, text: string): boolean {
  const q = squash(quote);
  const t = squash(text);
  if (!q || !t) return false;
  if (t.includes(q)) return true;
  if (q.length < 8) return false;
  // Sliding window with Levenshtein distance up to ~15% of the quote length.
  const maxEdits = Math.max(1, Math.floor(q.length * 0.15));
  for (let start = 0; start + q.length - maxEdits <= t.length; start += 1) {
    const window = t.slice(start, start + q.length + maxEdits);
    if (boundedDistance(q, window, maxEdits) <= maxEdits) return true;
  }
  return false;
}

/** Edit distance between `a` and the best prefix of `b`, stopping early above `limit`. */
function boundedDistance(a: string, b: string, limit: number): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j += 1) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > limit) return limit + 1;
    prev = cur;
  }
  return Math.min(...prev);
}

function parsesAsDate(value: string): boolean {
  if (!Number.isNaN(Date.parse(value))) return true;
  // "12 March 2026", "March 2026", "03/2026", "2026"
  return /\b(19|20)\d{2}\b/.test(value);
}

export function postValidate(
  result: DocumentAnalysisResult,
  candidateSkillIds: Set<string>,
  extractedText: string,
): { result: DocumentAnalysisResult; postValidation: PostValidation } {
  const droppedSkillIds: string[] = [];
  const skillMentions = result.skillMentions.map((mention) => {
    if (mention.suggestedSkillId && !candidateSkillIds.has(mention.suggestedSkillId)) {
      droppedSkillIds.push(mention.suggestedSkillId);
      return { ...mention, suggestedSkillId: null };
    }
    return mention;
  });

  const invalidDates: ExtractedField[] = [];
  const extracted = { ...result.extracted };
  for (const field of DATE_FIELDS) {
    const value = extracted[field];
    if (value && !parsesAsDate(value)) {
      invalidDates.push(field);
      extracted[field] = null;
    }
  }

  const unconfirmedFields: ExtractedField[] = [];
  const hasText = extractedText.trim().length > 0;
  if (hasText) {
    for (const field of EXTRACTED_FIELDS) {
      const value = extracted[field];
      if (!value) continue;
      const quotes = result.fieldEvidence.filter((e) => e.field === field).map((e) => e.quote);
      const v = squash(value);
      const confirmed =
        quotes.some((q) => quoteFound(q, extractedText) && squash(q).includes(v.slice(0, 4))) ||
        // Short values ("A+", "8") match almost any text, so they need a quote.
        (v.length >= 4 && quoteFound(value, extractedText));
      if (!confirmed) unconfirmedFields.push(field);
    }
  }

  return {
    result: { ...result, extracted, skillMentions },
    postValidation: { droppedSkillIds: [...new Set(droppedSkillIds)], unconfirmedFields, invalidDates },
  };
}
