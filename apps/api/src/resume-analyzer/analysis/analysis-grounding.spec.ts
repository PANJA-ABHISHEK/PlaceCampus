import type { ResumeAnalysisOutput, JobMatchOutput } from '../ai/resume-analysis.schemas.js';
import { CATEGORY_KEYS, CATEGORY_META } from '../ai/resume-analysis.schemas.js';
import { finalizeJobMatch, finalizeResumeAnalysis, InsufficientAnalysisError, placeholderUnseenNumbers } from './finalize-analysis.js';
import { computeResumeSignals, contactEssentialsCap } from './resume-signals.js';
import { TokenIndex, containsPhrase, dropRestatements, normalizeText, quoteAppears } from './text-matching.js';

const RESUME = `Asha Rao
asha.rao@example.com | +91 98765 43210 | linkedin.com/in/asharao | github.com/asharao

EDUCATION
B.Tech Computer Science, Example University, 2022 - 2026, CGPA 8.4

PROJECTS
• Built a RESTful API in Node.js and Express for campus event booking used by 1200 students
• Worked on the frontend of the app
• Developed a React dashboard with Redux for tracking expenses

SKILLS
JavaScript, TypeScript, React, Node.js, MongoDB, Git, C++`;

function output(overrides: Partial<ResumeAnalysisOutput> = {}): ResumeAnalysisOutput {
  return {
    targetRole: 'Full Stack Developer',
    summary: 'Solid project-based resume.',
    categories: Object.fromEntries(CATEGORY_KEYS.map((k) => [k, { score: 80, rationale: `About ${k}` }])) as ResumeAnalysisOutput['categories'],
    strengths: [{ title: 'Quantified impact', detail: 'The booking API cites 1200 students.' }],
    weaknesses: [{ title: 'Vague bullet', detail: 'One project bullet lacks detail.' }],
    missingSkills: ['Docker', 'React', 'AWS', 'docker'],
    missingKeywords: ['CI/CD', 'node.js', 'unit testing'],
    formattingIssues: ['  No summary section  ', ''],
    grammarIssues: [],
    weakBullets: [
      { quote: 'Worked on the frontend of the app', issue: 'Vague', suggestion: 'Built the React frontend for [X] users' },
      { quote: 'Led a team of 10 engineers at Google', issue: 'Invented', suggestion: 'n/a' },
    ],
    sectionFeedback: [
      { area: 'PROJECTS', feedback: 'Good', suggestions: ['Add links'] },
      { area: 'PROJECTS', feedback: 'Duplicate', suggestions: [] },
    ],
    recommendations: [
      { priority: 'LOW', area: 'FORMATTING', title: 'Add a summary', detail: 'Two lines at the top.' },
      { priority: 'HIGH', area: 'PROJECTS', title: 'Quantify the React dashboard', detail: 'Add users or savings.' },
    ],
    ...overrides,
  };
}

describe('text matching', () => {
  it('matches technical terms on word boundaries', () => {
    const text = normalizeText(RESUME);
    expect(containsPhrase(text, 'C++')).toBe(true);
    expect(containsPhrase(text, 'node.js')).toBe(true);
    expect(containsPhrase(text, 'Java')).toBe(false); // only "JavaScript"
    expect(containsPhrase(text, 'Docker')).toBe(false);
  });

  it('loosely matches morphological variants', () => {
    const index = new TokenIndex(RESUME);
    expect(index.hasLoose('REST APIs')).toBe(true);
    expect(index.hasLoose('Kubernetes')).toBe(false);
  });

  it('verifies quotes against the resume, tolerating punctuation', () => {
    expect(quoteAppears(RESUME, 'Worked on the frontend of the app.')).toBe(true);
    expect(quoteAppears(RESUME, 'Led a team of 10 engineers at Google')).toBe(false);
  });
});

describe('resume signals', () => {
  it('measures contact details, sections and bullets', () => {
    const s = computeResumeSignals(RESUME, 1);
    expect(s).toMatchObject({ hasEmail: true, hasPhone: true, hasLinkedIn: true, hasGithubOrPortfolio: true, bulletCount: 3 });
    expect(s.sectionsFound).toEqual(expect.arrayContaining(['EDUCATION', 'PROJECTS', 'SKILLS']));
    expect(s.essentialSectionsMissing).toEqual([]);
    expect(s.quantifiedBulletCount).toBe(1);
    expect(s.actionVerbBulletCount).toBe(2);
  });

  it('does not mistake a year range for a phone number', () => {
    expect(computeResumeSignals('Education 2021 - 2025\nSkills', null).hasPhone).toBe(false);
  });

  it('caps the contact score when essentials are missing', () => {
    const s = computeResumeSignals('Projects\n• Built things\nSkills\nJava', null);
    expect(s.hasEmail).toBe(false);
    expect(contactEssentialsCap(s)).toBeLessThan(40);
  });
});

describe('finalizeResumeAnalysis', () => {
  const signals = computeResumeSignals(RESUME, 1);

  it('computes the overall score from weighted categories, not from the model', () => {
    const scores = { SKILLS_KEYWORDS: 90, EXPERIENCE: 30, PROJECTS: 85, EDUCATION: 80, STRUCTURE_FORMATTING: 70, GRAMMAR_READABILITY: 75, CONTACT_ESSENTIALS: 95 };
    const categories = Object.fromEntries(Object.entries(scores).map(([k, score]) => [k, { score, rationale: 'r' }]));
    const result = finalizeResumeAnalysis(output({ categories: categories as any }), { resumeText: RESUME, signals, targetRole: null });
    const expected = Math.round(Object.entries(scores).reduce((sum, [k, v]) => sum + v * CATEGORY_META[k as keyof typeof scores].weight, 0) / 100);
    expect(result.overallScore).toBe(expected);
    expect(Object.values(CATEGORY_META).reduce((s, m) => s + m.weight, 0)).toBe(100);
  });

  it('drops missing items the resume already contains and quotes it does not contain', () => {
    const result = finalizeResumeAnalysis(output(), { resumeText: RESUME, signals, targetRole: null });
    expect(result.missingSkills).toEqual(['Docker', 'AWS']);
    expect(result.missingKeywords).toEqual(['CI/CD', 'unit testing']);
    expect(result.weakBullets.map((b) => b.quote)).toEqual(['Worked on the frontend of the app']);
    expect(result.formattingIssues).toEqual(['No summary section']);
    expect(result.sectionFeedback).toHaveLength(1);
    expect(result.recommendations[0].priority).toBe('HIGH');
  });

  it('caps the contact score by measured signals', () => {
    const bare = 'Projects\n• Built a website\nSkills\nHTML';
    const result = finalizeResumeAnalysis(output(), { resumeText: bare, signals: computeResumeSignals(bare, 1), targetRole: 'Web Developer' });
    const contact = result.categories.find((c) => c.key === 'CONTACT_ESSENTIALS')!;
    expect(contact.score).toBeLessThan(80);
    expect(result.targetRole).toBe('Web Developer');
    expect(result.adjustments.join(' ')).toContain('CONTACT_ESSENTIALS capped');
  });

  it('refuses output without usable feedback', () => {
    expect(() =>
      finalizeResumeAnalysis(output({ recommendations: [] }), { resumeText: RESUME, signals, targetRole: null }),
    ).toThrow(InsufficientAnalysisError);
  });
});

describe('grounding helpers', () => {
  it('replaces numbers a rewrite invented with placeholders, keeping real ones', () => {
    expect(placeholderUnseenNumbers('Resolved 15+ bugs for 1200 students, cutting load time by 30%', RESUME)).toBe(
      'Resolved [X]+ bugs for 1200 students, cutting load time by [X]%',
    );
    expect(placeholderUnseenNumbers('Improved load time by [X%] using S3', RESUME)).toBe('Improved load time by [X%] using S3');
  });

  it('drops descriptive restatements but keeps distinct two-word skills', () => {
    expect(dropRestatements(['Jest', 'unit testing with Jest', 'React', 'React Native', 'deployment using Docker on AWS', 'Docker'])).toEqual([
      'Jest',
      'React',
      'React Native',
      'Docker',
    ]);
  });

  it('applies the number guard to weak-bullet rewrites in a full analysis', () => {
    const result = finalizeResumeAnalysis(
      output({
        weakBullets: [{ quote: '• Worked on the frontend of the app', issue: 'Vague', suggestion: '- Built the React frontend used by 500 students' }],
      }),
      { resumeText: RESUME, signals: computeResumeSignals(RESUME, 1), targetRole: null },
    );
    expect(result.weakBullets[0].quote).toBe('Worked on the frontend of the app');
    expect(result.weakBullets[0].suggestion).toBe('Built the React frontend used by [X] students');
  });
});

describe('finalizeJobMatch', () => {
  const JD = 'We need a Software Engineer Intern with React, Node.js, Docker, AWS and REST APIs. Experience with CI/CD pipelines is a plus.';
  const base: JobMatchOutput = {
    jobTitle: 'Software Engineer Intern',
    score: 70,
    scoreRationale: 'Good stack overlap.',
    matchingSkills: ['React', 'Docker'],
    missingSkills: ['AWS', 'Node.js'],
    jobKeywords: ['React', 'Node.js', 'Docker', 'AWS', 'REST APIs', 'CI/CD', 'Blockchain'],
    experienceAnalysis: 'Projects map to the role.',
    relevantExperience: ['Campus event booking API'],
    tailoringSuggestions: ['Mention Docker if used'],
  };

  it('splits job keywords by what the resume contains and ignores keywords not in the job', () => {
    const match = finalizeJobMatch(base, { resumeText: RESUME, jobDescription: JD, jobTitle: null });
    expect(match.matchingKeywords).toEqual(['React', 'Node.js', 'REST APIs']);
    expect(match.missingKeywords).toEqual(['Docker', 'AWS', 'CI/CD']);
    expect(match.keywordCoverage).toBe(50);
    expect(match.score).toBe(Math.round(70 * 0.7 + 50 * 0.3));
  });

  it('corrects skills the model put on the wrong side', () => {
    const match = finalizeJobMatch(base, { resumeText: RESUME, jobDescription: JD, jobTitle: 'SWE Intern' });
    expect(match.matchingSkills).toEqual(['React', 'Node.js']);
    expect(match.missingSkills).toEqual(['Docker', 'AWS']);
    expect(match.jobTitle).toBe('SWE Intern');
  });
});
