import { z } from 'zod';
import { StructuredCompletionClient } from './structured-completion.client.js';

const schema = z.object({ score: z.number().int() });
const request = { name: 'test', system: 's', user: 'u', jsonSchema: {}, validator: schema };

function reply(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'x-request-id': 'req_1', ...headers },
  });
}
const completion = (content: unknown, finish = 'stop') =>
  reply(200, {
    model: 'm',
    choices: [{ finish_reason: finish, message: { content: typeof content === 'string' ? content : JSON.stringify(content) } }],
    usage: { prompt_tokens: 10, completion_tokens: 5 },
  });

function client(responses: Array<Response | Error>) {
  const fetchImpl = vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error('no more responses');
    if (next instanceof Error) throw next;
    return next;
  });
  const sleep = vi.fn(async () => undefined);
  const c = new StructuredCompletionClient(
    { enabled: true, provider: 'groq', apiKey: 'gsk_test', model: 'm', timeoutMs: 1000, maxRetries: 2 },
    { fetchImpl: fetchImpl as any, sleep },
  );
  return { c, fetchImpl, sleep };
}

describe('StructuredCompletionClient', () => {
  it('returns validated data and sends a strict JSON schema with the key server-side', async () => {
    const { c, fetchImpl } = client([completion({ score: 7 })]);
    const result = await c.complete({ ...request, temperature: 0.2 });
    expect(result).toMatchObject({ ok: true, data: { score: 7 } });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    const body = JSON.parse(String(init.body));
    expect(body.response_format.json_schema).toMatchObject({ name: 'test', strict: true });
    expect(body.temperature).toBe(0.2);
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer gsk_test');
  });

  it('retries once when the reply fails validation, then gives up', async () => {
    const ok = client([completion({ score: 'high' }), completion({ score: 3 })]);
    expect(await ok.c.complete(request)).toMatchObject({ ok: true, data: { score: 3 } });
    const bad = client([completion('not json'), completion({ score: 'x' })]);
    expect(await bad.c.complete(request)).toMatchObject({ ok: false, errorClass: 'SCHEMA_MISMATCH' });
  });

  it('retries rate limits with retry-after and stops on authentication errors', async () => {
    const limited = client([reply(429, {}, { 'retry-after': '2' }), completion({ score: 1 })]);
    expect(await limited.c.complete(request)).toMatchObject({ ok: true });
    expect(limited.sleep).toHaveBeenCalledWith(2000);
    const auth = client([reply(401, {})]);
    expect(await auth.c.complete(request)).toMatchObject({ ok: false, errorClass: 'AUTHENTICATION' });
    expect(auth.fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('doubles the token budget once on truncation', async () => {
    const { c, fetchImpl } = client([completion('{"sc', 'length'), completion({ score: 2 })]);
    expect(await c.complete(request)).toMatchObject({ ok: true });
    const budgets = fetchImpl.mock.calls.map((call) => JSON.parse(String((call as any)[1].body)).max_completion_tokens);
    expect(budgets).toEqual([8000, 16000]);
  });
});
