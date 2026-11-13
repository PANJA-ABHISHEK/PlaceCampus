import { OpenAiCompatibleAnalyzer } from './openai-compatible.analyzer.js';
import { EXTRACTED_FIELDS, type DocumentAnalysisResult } from './document-analysis.schema.js';
import { PROMPT_VERSION } from './prompts/document-analysis.v1.js';
import type { DocumentAnalysisInput } from './document-analyzer.js';

const input: DocumentAnalysisInput = {
  promptVersion: PROMPT_VERSION,
  today: '2026-11-08',
  evidenceType: 'CERTIFICATION',
  declared: { title: 'React', claimedSkills: [] },
  candidateSkills: [{ id: 'skl_react', name: 'React', synonyms: [] }],
  extractedText: 'Certificate of Completion — React — Coursera',
  extraction: { method: 'PDF_TEXT', ocrConfidence: null, pageCount: 1 },
};

const valid: DocumentAnalysisResult = {
  documentType: 'CERTIFICATE',
  documentTypeConfidence: 0.9,
  readability: 'GOOD',
  extracted: Object.fromEntries(EXTRACTED_FIELDS.map((f) => [f, null])) as DocumentAnalysisResult['extracted'],
  fieldEvidence: [],
  skillMentions: [],
  consistencyFlags: [],
  summary: 'ok',
  uncertainty: [],
};

function reply(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'x-request-id': 'req_1', ...headers },
  });
}
const completion = (content: unknown, finish = 'stop', extra: Record<string, unknown> = {}) =>
  reply(200, {
    model: 'openai/gpt-oss-120b',
    choices: [{ finish_reason: finish, message: { content: typeof content === 'string' ? content : JSON.stringify(content), ...extra } }],
    usage: { prompt_tokens: 100, completion_tokens: 50 },
  });

function analyzer(responses: Array<Response | Error>) {
  const fetchImpl = vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error('no more responses');
    if (next instanceof Error) throw next;
    return next;
  });
  const sleep = vi.fn(async () => undefined);
  const a = new OpenAiCompatibleAnalyzer({ provider: 'groq', apiKey: 'gsk_test', model: 'openai/gpt-oss-120b', fetchImpl: fetchImpl as any, sleep });
  return { a, fetchImpl, sleep };
}

describe('OpenAiCompatibleAnalyzer', () => {
  it('sends a strict JSON-schema request to the Groq endpoint and validates the reply', async () => {
    const { a, fetchImpl } = analyzer([completion(valid)]);
    const res = await a.analyze(input);

    expect(res.status).toBe('SUCCEEDED');
    expect(res.result).toEqual(valid);
    expect(res.providerRequestId).toBe('req_1');
    expect(res.usage).toMatchObject({ inputTokens: 100, outputTokens: 50 });

    const [url, init] = fetchImpl.mock.calls[0] as any;
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer gsk_test');
    const body = JSON.parse(init.body);
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1].content).toContain('<document_text>');
    // §12.6: no sampling parameters.
    expect(body.temperature).toBeUndefined();
  });

  it('retries rate limits honouring retry-after, then succeeds', async () => {
    const { a, sleep } = analyzer([reply(429, { error: {} }, { 'retry-after': '3' }), completion(valid)]);
    const res = await a.analyze(input);
    expect(res.status).toBe('SUCCEEDED');
    expect(sleep).toHaveBeenCalledWith(3000);
  });

  it('retries 5xx and connection errors up to the limit, then FAILED', async () => {
    const { a, fetchImpl } = analyzer([reply(503, {}), new TypeError('fetch failed'), reply(500, {})]);
    const res = await a.analyze(input);
    expect(res.status).toBe('FAILED');
    expect(res.errorClass).toBe('SERVER_ERROR');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it.each([
    [401, 'AUTHENTICATION'],
    [403, 'PERMISSION_DENIED'],
    [400, 'BAD_REQUEST'],
  ])('does not retry HTTP %s (%s)', async (status, errorClass) => {
    const { a, fetchImpl } = analyzer([reply(status, { error: { message: 'secret detail' } })]);
    const res = await a.analyze(input);
    expect(res.status).toBe('FAILED');
    expect(res.errorClass).toBe(errorClass);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries once with a larger budget when output is truncated', async () => {
    const { a, fetchImpl } = analyzer([completion('{"documentType":', 'length'), completion(valid)]);
    const res = await a.analyze(input);
    expect(res.status).toBe('SUCCEEDED');
    const budgets = fetchImpl.mock.calls.map((c: any) => JSON.parse(c[1].body).max_completion_tokens);
    expect(budgets).toEqual([8000, 16000]);
  });

  it('marks repeated truncation as INVALID_OUTPUT', async () => {
    const { a } = analyzer([completion('{', 'length'), completion('{', 'length')]);
    const res = await a.analyze(input);
    expect(res).toMatchObject({ status: 'INVALID_OUTPUT', errorClass: 'TRUNCATED' });
  });

  it('rejects malformed JSON and schema mismatches', async () => {
    const bad = analyzer([completion('not json')]);
    expect(await bad.a.analyze(input)).toMatchObject({ status: 'INVALID_OUTPUT', errorClass: 'INVALID_JSON' });

    const mismatch = analyzer([completion({ ...valid, documentType: 'PASSPORT' })]);
    const res = await mismatch.a.analyze(input);
    expect(res).toMatchObject({ status: 'INVALID_OUTPUT', errorClass: 'SCHEMA_MISMATCH' });
    expect(res.errorDetail).toContain('documentType');
  });

  it('reports refusals', async () => {
    const { a } = analyzer([completion('', 'stop', { refusal: 'I cannot help with that.' })]);
    expect(await a.analyze(input)).toMatchObject({ status: 'REFUSED', errorClass: 'REFUSAL' });
  });

  it('classifies timeouts as retryable', async () => {
    const timeout = Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    const { a, fetchImpl } = analyzer([timeout, completion(valid)]);
    expect((await a.analyze(input)).status).toBe('SUCCEEDED');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
