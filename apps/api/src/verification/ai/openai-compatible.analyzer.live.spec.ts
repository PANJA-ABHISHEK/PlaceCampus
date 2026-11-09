import * as fs from 'fs';
import * as path from 'path';
import { OpenAiCompatibleAnalyzer } from './openai-compatible.analyzer.js';
import { PROMPT_VERSION } from './prompts/document-analysis.v1.js';

/**
 * Calls the real provider configured in .env. Opt in with AI_LIVE_TEST=true:
 *   AI_LIVE_TEST=true pnpm vitest run openai-compatible.analyzer.live
 */
function readEnv(): Record<string, string> {
  const file = path.resolve(process.cwd(), '../../.env');
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]),
  );
}

const env = { ...readEnv(), ...process.env } as Record<string, string>;
const live = process.env.AI_LIVE_TEST === 'true' && !!env.AI_API_KEY;

(live ? describe : describe.skip)('OpenAiCompatibleAnalyzer (live provider)', () => {
  it('returns a schema-valid analysis for a certificate', async () => {
    const provider = (env.AI_PROVIDER || 'groq').toLowerCase() as 'groq' | 'openai';
    const analyzer = new OpenAiCompatibleAnalyzer({
      provider,
      apiKey: env.AI_API_KEY,
      model: env.AI_MODEL || 'openai/gpt-oss-120b',
    });
    const response = await analyzer.analyze({
      promptVersion: PROMPT_VERSION,
      today: '2026-11-08',
      evidenceType: 'CERTIFICATION',
      declared: { title: 'Advanced React and TypeScript', issuer: 'Coursera', issueDate: '2026-03-12', claimedSkills: ['React'] },
      candidateSkills: [
        { id: 'skl_react', name: 'React', synonyms: ['React.js', 'ReactJS'] },
        { id: 'skl_ts', name: 'TypeScript', synonyms: ['TS'] },
        { id: 'skl_java', name: 'Java', synonyms: [] },
      ],
      extractedText:
        'Certificate of Completion\nThis certifies that Asha Verma\nhas successfully completed the course\nAdvanced React and TypeScript\nIssued by Coursera on 12 March 2026\nCredential ID 7QX2-KD91-REACT',
      extraction: { method: 'OCR', ocrConfidence: 94, pageCount: 1 },
    });

    console.log(JSON.stringify({ ...response, result: response.result && { ...response.result, extracted: undefined } }, null, 2));
    expect(response.status).toBe('SUCCEEDED');
    expect(response.result!.documentType).toBe('CERTIFICATE');
    expect(response.result!.extracted.credentialId).toBe('7QX2-KD91-REACT');
    const ids = response.result!.skillMentions.map((m) => m.suggestedSkillId);
    expect(ids).toContain('skl_react');
    expect(ids).not.toContain('skl_java');
  }, 120_000);
});
