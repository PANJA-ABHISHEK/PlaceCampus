import { z } from 'zod';
import type { ResumeCategoryKey } from '@placecampus/shared-types';

/**
 * Structured outputs for the two AI calls. The JSON Schemas are sent to the
 * provider (strict mode: every property required, no extra properties); the
 * Zod schemas validate each reply before anything is saved. Keep them in step.
 */

export const CATEGORY_KEYS = [
  'SKILLS_KEYWORDS',
  'EXPERIENCE',
  'EDUCATION',
  'PROJECTS',
  'STRUCTURE_FORMATTING',
  'GRAMMAR_READABILITY',
  'CONTACT_ESSENTIALS',
] as const satisfies readonly ResumeCategoryKey[];

/** Weights of the overall estimated score (sum 100), tuned for student and early-career resumes. */
export const CATEGORY_META: Record<ResumeCategoryKey, { label: string; weight: number }> = {
  SKILLS_KEYWORDS: { label: 'Skills & keyword relevance', weight: 25 },
  EXPERIENCE: { label: 'Work experience', weight: 20 },
  PROJECTS: { label: 'Projects', weight: 15 },
  EDUCATION: { label: 'Education', weight: 10 },
  STRUCTURE_FORMATTING: { label: 'Structure & formatting', weight: 10 },
  GRAMMAR_READABILITY: { label: 'Grammar & readability', weight: 10 },
  CONTACT_ESSENTIALS: { label: 'Contact info & essential sections', weight: 10 },
};

export const FEEDBACK_AREAS = [
  'CONTACT',
  'SUMMARY',
  'EDUCATION',
  'EXPERIENCE',
  'PROJECTS',
  'SKILLS',
  'CERTIFICATIONS',
  'ACHIEVEMENTS',
  'FORMATTING',
  'GENERAL',
] as const;
export const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const;

const score = z.number().int().min(0).max(100);
const insight = z.object({ title: z.string().min(1), detail: z.string().min(1) });
const textIssue = z.object({ quote: z.string(), issue: z.string().min(1), suggestion: z.string().min(1) });

export const ResumeAnalysisOutputSchema = z.object({
  targetRole: z.string().min(1),
  summary: z.string().min(1),
  categories: z.object(
    Object.fromEntries(
      CATEGORY_KEYS.map((key) => [key, z.object({ score, rationale: z.string().min(1) })]),
    ) as Record<ResumeCategoryKey, z.ZodObject<{ score: typeof score; rationale: z.ZodString }>>,
  ),
  strengths: z.array(insight),
  weaknesses: z.array(insight),
  missingSkills: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  formattingIssues: z.array(z.string()),
  grammarIssues: z.array(textIssue),
  weakBullets: z.array(textIssue),
  sectionFeedback: z.array(
    z.object({ area: z.enum(FEEDBACK_AREAS), feedback: z.string().min(1), suggestions: z.array(z.string()) }),
  ),
  recommendations: z.array(
    z.object({
      priority: z.enum(PRIORITIES),
      area: z.enum(FEEDBACK_AREAS),
      title: z.string().min(1),
      detail: z.string().min(1),
    }),
  ),
});
export type ResumeAnalysisOutput = z.infer<typeof ResumeAnalysisOutputSchema>;

export const JobMatchOutputSchema = z.object({
  jobTitle: z.string().nullable(),
  score,
  scoreRationale: z.string().min(1),
  matchingSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  jobKeywords: z.array(z.string()),
  experienceAnalysis: z.string().min(1),
  relevantExperience: z.array(z.string()),
  tailoringSuggestions: z.array(z.string()),
});
export type JobMatchOutput = z.infer<typeof JobMatchOutputSchema>;

const str = { type: 'string' };
const strArray = { type: 'array', items: str };
const obj = (properties: Record<string, unknown>) => ({
  type: 'object',
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});
const textIssueJson = obj({ quote: str, issue: str, suggestion: str });

export const RESUME_ANALYSIS_JSON_SCHEMA = obj({
  targetRole: str,
  summary: str,
  categories: obj(
    Object.fromEntries(CATEGORY_KEYS.map((key) => [key, obj({ score: { type: 'integer' }, rationale: str })])),
  ),
  strengths: { type: 'array', items: obj({ title: str, detail: str }) },
  weaknesses: { type: 'array', items: obj({ title: str, detail: str }) },
  missingSkills: strArray,
  missingKeywords: strArray,
  formattingIssues: strArray,
  grammarIssues: { type: 'array', items: textIssueJson },
  weakBullets: { type: 'array', items: textIssueJson },
  sectionFeedback: {
    type: 'array',
    items: obj({ area: { type: 'string', enum: [...FEEDBACK_AREAS] }, feedback: str, suggestions: strArray }),
  },
  recommendations: {
    type: 'array',
    items: obj({
      priority: { type: 'string', enum: [...PRIORITIES] },
      area: { type: 'string', enum: [...FEEDBACK_AREAS] },
      title: str,
      detail: str,
    }),
  },
});

export const JOB_MATCH_JSON_SCHEMA = obj({
  jobTitle: { type: ['string', 'null'] },
  score: { type: 'integer' },
  scoreRationale: str,
  matchingSkills: strArray,
  missingSkills: strArray,
  jobKeywords: strArray,
  experienceAnalysis: str,
  relevantExperience: strArray,
  tailoringSuggestions: strArray,
});
