import type {
  ResumeCategoryScore,
  ResumeInsight,
  ResumeJobMatch,
  ResumeRecommendation,
  ResumeSectionFeedback,
  ResumeSignals,
  ResumeTextIssue,
} from '@placecampus/shared-types';
import {
  CATEGORY_KEYS,
  CATEGORY_META,
  type JobMatchOutput,
  type ResumeAnalysisOutput,
} from '../ai/resume-analysis.schemas.js';
import { contactEssentialsCap } from './resume-signals.js';
import { TokenIndex, cleanList, containsPhrase, dropRestatements, normalizeText, quoteAppears } from './text-matching.js';

/**
 * Post-validation of AI output (after Zod has checked its shape). Scores are
 * clamped and combined on the server, and everything the model attributes to
 * the resume is checked against the resume text, so nothing is saved that the
 * uploaded document does not support.
 */

export interface FinalizedResumeAnalysis {
  overallScore: number;
  targetRole: string;
  summary: string;
  categories: ResumeCategoryScore[];
  strengths: ResumeInsight[];
  weaknesses: ResumeInsight[];
  missingSkills: string[];
  missingKeywords: string[];
  formattingIssues: string[];
  grammarIssues: ResumeTextIssue[];
  weakBullets: ResumeTextIssue[];
  sectionFeedback: ResumeSectionFeedback[];
  recommendations: ResumeRecommendation[];
  /** What post-validation removed or changed, for logs and tests. */
  adjustments: string[];
}

export class InsufficientAnalysisError extends Error {}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function cleanInsights(items: ResumeInsight[], max: number): ResumeInsight[] {
  const seen = new Set<string>();
  return items
    .map((item) => ({ title: item.title.trim(), detail: item.detail.trim() }))
    .filter((item) => item.title && item.detail && !seen.has(item.title.toLowerCase()) && seen.add(item.title.toLowerCase()))
    .slice(0, max);
}

/**
 * Rewrites must not invent achievements: any number in a suggested rewrite
 * that does not occur in the resume becomes an [X] placeholder for the
 * student to fill in ("resolved 15+ bugs" → "resolved [X]+ bugs").
 */
export function placeholderUnseenNumbers(suggestion: string, resumeText: string): string {
  const resumeNumbers = new Set((resumeText.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(',', '.')));
  return suggestion.replace(/(?<![\p{L}\d[])\d+(?:[.,]\d+)?(?![\d\]])/gu, (num) =>
    resumeNumbers.has(num.replace(',', '.')) ? num : '[X]',
  );
}

/** Drops a leading list marker copied from the resume ("- Built X" → "Built X"). */
const stripBullet = (text: string) => text.replace(/^[\s•●▪◦►▶✓✔➢➤■◆*–-]+/, '').trim();

function groundIssues(
  items: ResumeTextIssue[],
  resumeText: string,
  max: number,
  dropped: { count: number },
  options: { placeholderNumbers: boolean },
) {
  const seen = new Set<string>();
  const out: ResumeTextIssue[] = [];
  for (const item of items) {
    const quote = stripBullet(item.quote.replace(/\s+/g, ' '));
    const key = quote.toLowerCase();
    if (!quote || seen.has(key)) continue;
    if (!quoteAppears(resumeText, quote)) {
      dropped.count += 1;
      continue;
    }
    if (normalizeText(item.suggestion) === normalizeText(quote)) continue;
    seen.add(key);
    const suggestion = options.placeholderNumbers
      ? placeholderUnseenNumbers(stripBullet(item.suggestion), resumeText)
      : stripBullet(item.suggestion);
    out.push({ quote, issue: item.issue.trim(), suggestion });
    if (out.length >= max) break;
  }
  return out;
}

const PRIORITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;

export function finalizeResumeAnalysis(
  output: ResumeAnalysisOutput,
  context: { resumeText: string; signals: ResumeSignals; targetRole: string | null },
): FinalizedResumeAnalysis {
  const adjustments: string[] = [];
  const normalizedResume = normalizeText(context.resumeText);

  const categories: ResumeCategoryScore[] = CATEGORY_KEYS.map((key) => {
    const raw = output.categories[key];
    let score = clamp(raw.score);
    if (key === 'CONTACT_ESSENTIALS') {
      const cap = contactEssentialsCap(context.signals);
      if (score > cap) {
        adjustments.push(`CONTACT_ESSENTIALS capped ${score}→${cap} by measured signals`);
        score = cap;
      }
    }
    return { key, label: CATEGORY_META[key].label, weight: CATEGORY_META[key].weight, score, rationale: raw.rationale.trim() };
  });
  const overallScore = clamp(categories.reduce((sum, c) => sum + c.score * c.weight, 0) / 100);

  const absentOnly = (items: string[], max: number, label: string) => {
    const cleaned = cleanList(items, 40);
    const kept = cleaned.filter((item) => !containsPhrase(normalizedResume, item));
    if (kept.length < cleaned.length) adjustments.push(`${label}: removed ${cleaned.length - kept.length} already in resume`);
    return kept.slice(0, max);
  };

  const droppedQuotes = { count: 0 };
  const grammarIssues = groundIssues(output.grammarIssues, context.resumeText, 10, droppedQuotes, { placeholderNumbers: false });
  const weakBullets = groundIssues(output.weakBullets, context.resumeText, 8, droppedQuotes, { placeholderNumbers: true });
  if (droppedQuotes.count) adjustments.push(`removed ${droppedQuotes.count} quote(s) not found in resume`);

  const sectionFeedback: ResumeSectionFeedback[] = [];
  for (const entry of output.sectionFeedback) {
    if (sectionFeedback.some((existing) => existing.area === entry.area)) continue;
    sectionFeedback.push({ area: entry.area, feedback: entry.feedback.trim(), suggestions: cleanList(entry.suggestions, 5) });
  }

  const seenRecommendations = new Set<string>();
  const recommendations = output.recommendations
    .map((r) => ({ ...r, title: r.title.trim(), detail: r.detail.trim() }))
    .filter((r) => r.title && r.detail && !seenRecommendations.has(r.title.toLowerCase()) && seenRecommendations.add(r.title.toLowerCase()))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    .slice(0, 8);

  const strengths = cleanInsights(output.strengths, 6);
  const weaknesses = cleanInsights(output.weaknesses, 6);
  if (!recommendations.length || (!strengths.length && !weaknesses.length) || !output.summary.trim()) {
    throw new InsufficientAnalysisError('The AI response did not contain usable feedback.');
  }

  return {
    overallScore,
    targetRole: (context.targetRole || output.targetRole).trim().slice(0, 80),
    summary: output.summary.trim(),
    categories,
    strengths,
    weaknesses,
    missingSkills: absentOnly(output.missingSkills, 15, 'missingSkills'),
    missingKeywords: absentOnly(output.missingKeywords, 20, 'missingKeywords'),
    formattingIssues: cleanList(output.formattingIssues, 10),
    grammarIssues,
    weakBullets,
    sectionFeedback,
    recommendations,
    adjustments,
  };
}

/** Weight of the measured keyword coverage in the job score; the rest is the model's assessment. */
export const KEYWORD_COVERAGE_WEIGHT = 0.3;

export function finalizeJobMatch(
  output: JobMatchOutput,
  context: { resumeText: string; jobDescription: string; jobTitle: string | null },
): ResumeJobMatch & { adjustments: string[] } {
  const adjustments: string[] = [];
  const resumeIndex = new TokenIndex(context.resumeText);
  const jobIndex = new TokenIndex(context.jobDescription);
  const normalizedResume = normalizeText(context.resumeText);

  // Keywords must come from the job description; the split into matching and
  // missing is measured against the resume text, not taken from the model.
  const keywords = cleanList(output.jobKeywords, 30);
  const jobKeywords = keywords.filter((keyword) => jobIndex.hasLoose(keyword)).slice(0, 25);
  if (jobKeywords.length < keywords.length) {
    adjustments.push(`jobKeywords: removed ${keywords.length - jobKeywords.length} not in job description`);
  }
  const matchingKeywords = jobKeywords.filter((keyword) => resumeIndex.hasLoose(keyword));
  const missingKeywords = jobKeywords.filter((keyword) => !resumeIndex.hasLoose(keyword));

  const matchingSkills: string[] = [];
  const missingSkills: string[] = [];
  for (const skill of cleanList(output.matchingSkills, 20)) {
    if (resumeIndex.hasLoose(skill)) matchingSkills.push(skill);
    else {
      missingSkills.push(skill);
      adjustments.push(`matching skill "${skill}" not found in resume; moved to missing`);
    }
  }
  for (const skill of cleanList(output.missingSkills, 20)) {
    if (containsPhrase(normalizedResume, skill)) {
      matchingSkills.push(skill);
      adjustments.push(`missing skill "${skill}" is in resume; moved to matching`);
    } else missingSkills.push(skill);
  }

  const keywordTotal = matchingKeywords.length + missingKeywords.length;
  const skillTotal = matchingSkills.length + missingSkills.length;
  const keywordCoverage = keywordTotal
    ? clamp((100 * matchingKeywords.length) / keywordTotal)
    : skillTotal
      ? clamp((100 * matchingSkills.length) / skillTotal)
      : clamp(output.score);
  const score = clamp(output.score * (1 - KEYWORD_COVERAGE_WEIGHT) + keywordCoverage * KEYWORD_COVERAGE_WEIGHT);

  return {
    score,
    keywordCoverage,
    jobTitle: (context.jobTitle || output.jobTitle || '').trim().slice(0, 120) || null,
    matchingSkills: dropRestatements(cleanList(matchingSkills, 20)),
    missingSkills: dropRestatements(cleanList(missingSkills, 20)),
    matchingKeywords,
    missingKeywords,
    scoreRationale: output.scoreRationale.trim(),
    experienceAnalysis: output.experienceAnalysis.trim(),
    relevantExperience: cleanList(output.relevantExperience, 5),
    tailoringSuggestions: cleanList(output.tailoringSuggestions, 8),
    adjustments,
  };
}
