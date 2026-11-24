/**
 * Text comparison used to ground AI output in the actual resume and job
 * description: quotes must exist in the resume, "missing" keywords must be
 * absent from it, and "matching" keywords must be present in both texts.
 */

/** Lowercases and unifies punctuation variants that PDF/DOCX extraction produces. */
export function normalizeText(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/[•●▪◦►▶✓✔➢➤■□◆◇*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Letters and digits only, for punctuation-insensitive quote comparison. */
function alnumWords(text: string): string[] {
  return normalizeText(text)
    .replace(/[^\p{L}\p{N}+#]+/gu, ' ')
    .split(' ')
    .filter(Boolean);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Whole-phrase match with boundaries that treat "c++", "node.js" and ".net"
 * as words: the characters on either side must not be letters or digits.
 */
export function containsPhrase(normalizedHaystack: string, phrase: string): boolean {
  const needle = normalizeText(phrase);
  if (!needle) return false;
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(needle)}(?![\\p{L}\\p{N}])`, 'u').test(normalizedHaystack);
}

const STOP_WORDS = new Set(['and', 'or', 'of', 'the', 'a', 'an', 'in', 'on', 'for', 'to', 'with', 'using', 'skills', 'skill', 'experience']);

function stem(token: string): string {
  if (token.length > 4 && token.endsWith('ies')) return token.slice(0, -3) + 'y';
  if (token.length > 3 && token.endsWith('es') && !token.endsWith('ses')) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

export class TokenIndex {
  private readonly tokens: string[];
  constructor(text: string) {
    this.tokens = [...new Set(alnumWords(text).map(stem))];
  }
  /**
   * Lenient match for synonyms of form: every significant token of the phrase
   * must start some token of the text ("REST APIs" matches "RESTful API").
   */
  hasLoose(phrase: string): boolean {
    const words = alnumWords(phrase).map(stem).filter((w) => !STOP_WORDS.has(w));
    if (!words.length) return false;
    return words.every((word) =>
      this.tokens.some((token) => token === word || (word.length >= 3 && token.startsWith(word))),
    );
  }
}

/**
 * True when a quote the model attributes to the resume is really in it.
 * Exact (punctuation-insensitive) containment passes; otherwise most of the
 * quote's six-word windows must appear, tolerating small extraction noise.
 */
export function quoteAppears(resumeText: string, quote: string): boolean {
  const quoteWords = alnumWords(quote);
  if (quoteWords.length < 3) return false;
  const haystack = ` ${alnumWords(resumeText).join(' ')} `;
  if (haystack.includes(` ${quoteWords.join(' ')} `)) return true;
  const size = 6;
  if (quoteWords.length < size) return false;
  let windows = 0;
  let found = 0;
  for (let i = 0; i + size <= quoteWords.length; i += 2) {
    windows += 1;
    if (haystack.includes(` ${quoteWords.slice(i, i + size).join(' ')} `)) found += 1;
  }
  return windows > 0 && found / windows >= 0.7;
}

/** Trims, drops empties and case-insensitive duplicates, and caps the list. */
export function cleanList(items: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const item = raw.replace(/\s+/g, ' ').trim();
    const key = item.toLowerCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Removes descriptive phrases that only restate a shorter entry of the same
 * list ("Jest" and "unit testing with Jest" keep "Jest"). Two-word names are
 * kept, because "React Native" is not a restatement of "React".
 */
export function dropRestatements(items: string[]): string[] {
  return items.filter(
    (item, index) =>
      item.trim().split(/\s+/).length < 3 ||
      !items.some((other, j) => j !== index && other.length < item.length && containsPhrase(normalizeText(item), other)),
  );
}
