import { ConfigService } from '@nestjs/config';
import { AiAnalysisService } from './ai-analysis.service.js';
import { EXTRACTED_FIELDS, type DocumentAnalysisResult } from './document-analysis.schema.js';
import type { ExtractionResult } from '../providers/document-extractor.service.js';

const cfg = (env: Record<string, string>) => new ConfigService(env);

describe('AiAnalysisService.createAnalyzer', () => {
  it.each([
    [{ AI_PROVIDER: 'groq', AI_API_KEY: 'gsk_x' }, 'groq', 'openai/gpt-oss-120b'],
    [{ AI_PROVIDER: 'Groqai', AI_API_KEY: 'gsk_x', AI_MODEL: 'gpt-4' }, 'groq', 'openai/gpt-oss-120b'],
    [{ AI_PROVIDER: 'groq', AI_API_KEY: 'gsk_x', AI_MODEL: 'openai/gpt-oss-20b' }, 'groq', 'openai/gpt-oss-20b'],
    [{ AI_PROVIDER: 'openai', AI_API_KEY: 'sk_x' }, 'openai', 'gpt-4o-mini'],
  ])('%j -> %s/%s', (env, provider, model) => {
    const a = AiAnalysisService.createAnalyzer(cfg(env));
    expect(a.provider).toBe(provider);
    expect(a.model).toBe(model);
  });

  it.each<Record<string, string>>([
    { AI_PROVIDER: 'groq' },
    { AI_PROVIDER: 'groq', AI_API_KEY: 'your-ai-api-key' },
    { AI_PROVIDER: 'groq', AI_API_KEY: 'gsk_x', AI_ENABLED: 'false' },
    { AI_PROVIDER: 'none', AI_API_KEY: 'gsk_x' },
    { AI_PROVIDER: 'mystery', AI_API_KEY: 'gsk_x' },
    {},
  ])('falls back to the none provider for %j', (env) => {
    expect(AiAnalysisService.createAnalyzer(cfg(env)).provider).toBe('none');
  });
});

describe('AiAnalysisService.analyze', () => {
  const text =
    'Certificate of Completion. Asha Verma completed Advanced React and TypeScript, issued by Coursera on 12 March 2026.';
  const extraction: ExtractionResult = {
    text,
    method: 'PDF_TEXT',
    status: 'COMPLETED',
    hasText: true,
    wordCount: 16,
    charCount: text.length,
    ocrConfidence: null,
    pageCount: 1,
    pages: [],
    fileSha256: null,
    textFingerprint: null,
    engineVersions: {},
    durationMs: 1,
  };
  const evidence = { evidenceId: 'e1', studentId: 's1', version: 1, type: 'CERTIFICATION', title: 'React course', issuer: 'Coursera' };

  function setup(env: Record<string, string>, analyzerResult?: DocumentAnalysisResult) {
    const saved: any[] = [];
    const analysisModel: any = { create: vi.fn(async (doc) => (saved.push(doc), { ...doc, id: `a${saved.length}` })) };
    const skills = [
      { _id: 'skl_java', name: 'Java', synonyms: [] },
      { _id: 'skl_react', name: 'React', synonyms: ['ReactJS'] },
      { _id: 'skl_ts', name: 'TypeScript', synonyms: ['TS'] },
    ];
    const q: any = {};
    for (const m of ['select', 'sort', 'lean']) q[m] = vi.fn(() => q);
    q.exec = vi.fn(async () => skills);
    const skillModel: any = { find: vi.fn(() => q) };
    const service = new AiAnalysisService(cfg(env), analysisModel, skillModel);
    const analyze = vi.fn(async () => ({ status: 'SUCCEEDED' as const, result: analyzerResult, model: 'm', latencyMs: 5 }));
    (service as any).analyzer = { provider: 'groq', model: 'm', analyze };
    return { service, saved, analyze };
  }

  const analysis: DocumentAnalysisResult = {
    documentType: 'CERTIFICATE',
    documentTypeConfidence: 0.92,
    readability: 'GOOD',
    extracted: {
      ...(Object.fromEntries(EXTRACTED_FIELDS.map((f) => [f, null])) as DocumentAnalysisResult['extracted']),
      issuerName: 'Coursera',
      title: 'Advanced React and TypeScript',
    },
    fieldEvidence: [{ field: 'issuerName', quote: 'issued by Coursera', page: 1 }],
    skillMentions: [
      { text: 'React', suggestedSkillId: 'skl_react', matchType: 'EXACT', relevance: 0.95, suggestedLevelCap: 2, rationale: '' },
      { text: 'TypeScript', suggestedSkillId: 'skl_ts', matchType: 'EXACT', relevance: 0.4, suggestedLevelCap: 2, rationale: '' },
      { text: 'Rust', suggestedSkillId: 'skl_rust', matchType: 'INFERRED', relevance: 0.9, suggestedLevelCap: 1, rationale: '' },
    ],
    consistencyFlags: [],
    summary: 'Course certificate from Coursera.',
    uncertainty: [],
  };

  it('sends a minimised input with mentioned skills first, post-validates and saves the analysis', async () => {
    const { service, saved, analyze } = setup({}, analysis);
    const out = await service.analyze(evidence, extraction);

    const sent = (analyze.mock.calls[0] as any)[0];
    expect(sent.candidateSkills.map((s: any) => s.id)).toEqual(['skl_react', 'skl_ts', 'skl_java']);
    expect(sent.declared).toEqual({ title: 'React course', issuer: 'Coursera', issueDate: undefined, claimedSkills: [] });
    expect(JSON.stringify(sent)).not.toMatch(/studentId|s1/);

    expect(out.outcome.status).toBe('SUCCEEDED');
    expect(out.outcome.postValidation!.droppedSkillIds).toEqual(['skl_rust']);
    expect(saved[0]).toMatchObject({ evidenceId: 'e1', version: 1, provider: 'groq', status: 'SUCCEEDED', promptVersion: 'document-analysis/v1' });

    // Compatibility view: only catalogue skills at or above the relevance threshold.
    expect(out.legacy).toMatchObject({
      documentType: 'CERTIFICATE',
      issuer: 'Coursera',
      claimedSkills: ['React'],
      skillRelevant: true,
      modelVersion: 'groq/m',
      analysisId: 'a1',
    });
  });

  it('records DISABLED without calling the provider for switched-off evidence types', async () => {
    const { service, saved, analyze } = setup({ AI_DISABLED_EVIDENCE_TYPES: 'certification, academic' }, analysis);
    const out = await service.analyze(evidence, extraction);
    expect(analyze).not.toHaveBeenCalled();
    expect(out.outcome).toMatchObject({ status: 'DISABLED', skippedReason: expect.stringContaining('CERTIFICATION') });
    expect(saved[0].status).toBe('DISABLED');
    expect(out.legacy).toBeNull();
  });

  it('records DISABLED when there is no extracted text', async () => {
    const { service, analyze } = setup({}, analysis);
    const out = await service.analyze(evidence, { ...extraction, text: '', hasText: false });
    expect(analyze).not.toHaveBeenCalled();
    expect(out.outcome.skippedReason).toMatch(/No text/);
  });
});
