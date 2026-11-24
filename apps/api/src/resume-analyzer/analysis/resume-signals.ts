import type { ResumeSectionKey, ResumeSignals } from '@placecampus/shared-types';
import { countResumeWords } from '../parsing/resume-parser.service.js';

/**
 * Facts measured directly from the resume text, without AI. They are shown to
 * the student, given to the model as ground truth, and used to cap the
 * contact/essentials score so it can never exceed what the text supports.
 */

const SECTION_HEADINGS: Record<ResumeSectionKey, RegExp> = {
  SUMMARY: /^(professional |career )?(summary|objective|profile|about me|career objective)\b/,
  EDUCATION: /^(education|academic(s| background| qualifications| details)?|qualifications)\b/,
  EXPERIENCE: /^((work|professional|industry|relevant) )?(experience|employment|internships?|work history)\b/,
  PROJECTS: /^((academic|personal|key|major|technical) )?projects?\b/,
  SKILLS: /^((technical|core|key|relevant) )?(skills|competencies|technologies|tech stack|tools)\b/,
  CERTIFICATIONS: /^(certifications?|certificates?|licenses|courses|courses ?& ?certifications)\b/,
  ACHIEVEMENTS: /^(achievements?|awards?|honou?rs|accomplishments)\b/,
  ACTIVITIES: /^(extra[- ]?curricular|activities|leadership|positions? of responsibility|volunteer(ing)?)\b/,
};

/** Sections every student resume is expected to have. Experience may be covered by projects. */
const ESSENTIAL_SECTIONS: ResumeSectionKey[] = ['EDUCATION', 'SKILLS', 'PROJECTS'];

const BULLET_LINE = /^\s*(?:[•●▪◦►▶✓✔➢➤■◆\-–*]|\d{1,2}[.)])\s+\S/;
const QUANTIFIED = /(\d+(?:[.,]\d+)?\s*(?:%|\+|x\b|k\b|lpa|users|ms|hrs?|hours|days|weeks|months|people|members|students|clients|projects)|[₹$€£]\s?\d|\b\d{2,}\b)/i;
const ACTION_VERBS = new Set(
  'achieved analysed analyzed architected automated built collaborated conducted created debugged deployed designed developed drove engineered enhanced established executed implemented improved increased integrated launched led maintained managed mentored migrated optimised optimized organised organized orchestrated presented programmed published reduced refactored researched resolved scaled shipped spearheaded streamlined tested trained won wrote'.split(' '),
);

export function computeResumeSignals(text: string, pageCount: number | null): ResumeSignals {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);

  const sectionsFound = new Set<ResumeSectionKey>();
  for (const line of lines) {
    if (line.length > 48) continue;
    const heading = line.toLowerCase().replace(/[^a-z& -]/g, '').trim();
    for (const [key, pattern] of Object.entries(SECTION_HEADINGS) as [ResumeSectionKey, RegExp][]) {
      if (pattern.test(heading)) sectionsFound.add(key);
    }
  }

  const bullets = lines.filter((line) => BULLET_LINE.test(line));
  const bulletBodies = bullets.map((line) => line.replace(BULLET_LINE, (m) => m.slice(-1)).trim());
  const quantifiedBulletCount = bulletBodies.filter((line) => QUANTIFIED.test(line)).length;
  const actionVerbBulletCount = bulletBodies.filter((line) =>
    ACTION_VERBS.has(line.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') ?? ''),
  ).length;

  const lower = text.toLowerCase();
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text);
  // 10-13 digits in one run of digits/separators; year ranges ("2021 - 2025") stay below 10.
  const hasPhone = (text.match(/\+?\d[\d\s().-]{8,}\d/g) ?? []).some((match) => {
    const digits = match.replace(/\D/g, '').length;
    return digits >= 10 && digits <= 13 && !/^(19|20)\d{2}\D+(19|20)\d{2}$/.test(match.trim());
  });
  const hasLinkedIn = /linkedin\.com\/(in|pub)\//.test(lower) || /\blinkedin\b/.test(lower);
  const hasGithub = /github\.com\/[a-z0-9-]+/.test(lower) || /\bgithub\b/.test(lower);
  const hasPortfolio = /\b(portfolio|behance\.net|dribbble\.com|[a-z0-9-]+\.(dev|io|me|vercel\.app|netlify\.app|github\.io))\b/.test(lower);

  const wordCount = countResumeWords(text);
  const essentialsMissing = ESSENTIAL_SECTIONS.filter((key) => !sectionsFound.has(key));
  if (essentialsMissing.includes('PROJECTS') && sectionsFound.has('EXPERIENCE')) {
    essentialsMissing.splice(essentialsMissing.indexOf('PROJECTS'), 1);
  }

  return {
    hasEmail,
    hasPhone,
    hasLinkedIn,
    hasGithubOrPortfolio: hasGithub || hasPortfolio,
    sectionsFound: [...sectionsFound],
    essentialSectionsMissing: essentialsMissing,
    wordCount,
    pageCount,
    bulletCount: bullets.length,
    quantifiedBulletCount,
    actionVerbBulletCount,
  };
}

/**
 * Upper bound for the contact & essential sections score from measured facts.
 * The model's score is kept when it is lower; it can never be higher.
 */
export function contactEssentialsCap(signals: ResumeSignals): number {
  let cap = 100;
  if (!signals.hasEmail) cap -= 35;
  if (!signals.hasPhone) cap -= 20;
  if (!signals.hasLinkedIn) cap -= 10;
  cap -= 12 * signals.essentialSectionsMissing.length;
  return Math.max(10, cap);
}
