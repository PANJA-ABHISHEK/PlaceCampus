import { Logger } from '@nestjs/common';
import {
  DOCUMENT_ANALYSIS_JSON_SCHEMA,
  DocumentAnalysisSchema,
} from './document-analysis.schema.js';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompts/document-analysis.v1.js';
import type {
  AnalysisErrorClass,
  AnalyzerProvider,
  AnalyzerResponse,
  DocumentAnalysisInput,
  DocumentAnalyzer,
} from './document-analyzer.js';

export const PROVIDER_BASE_URLS: Record<Exclude<AnalyzerProvider, 'none'>, string> = {
  groq: 'https://api.groq.com/openai/v1',
  openai: 'https://api.openai.com/v1',
};

export interface OpenAiCompatibleOptions {
  provider: Exclude<AnalyzerProvider, 'none'>;
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  maxOutputTokens?: number;
  /** Injected for tests. */
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

class AnalyzerHttpError extends Error {
  constructor(
    readonly errorClass: AnalysisErrorClass,
    readonly retryable: boolean,
    readonly retryAfterMs?: number,
    readonly requestId?: string,
  ) {
    super(errorClass);
  }
}

/**
 * Groq and OpenAI both expose the Chat Completions API with strict JSON-schema
 * structured outputs, so one adapter serves both. Behaviour follows §12.6:
 * per-request timeout, bounded retries on 408/409/429/5xx/connection errors
 * honouring retry-after, unrecoverable 400/401/403, a single retry with a
 * larger token budget on truncation, Zod validation on receipt, and logs that
 * record request IDs, usage, latency and outcome only.
 */
export class OpenAiCompatibleAnalyzer implements DocumentAnalyzer {
  readonly provider: Exclude<AnalyzerProvider, 'none'>;
  readonly model: string;
  private readonly logger = new Logger(OpenAiCompatibleAnalyzer.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly maxOutputTokens: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(private readonly options: OpenAiCompatibleOptions) {
    this.provider = options.provider;
    this.model = options.model;
    this.baseUrl = (options.baseUrl || PROVIDER_BASE_URLS[options.provider]).replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? 120_000;
    this.maxRetries = options.maxRetries ?? 2;
    this.maxOutputTokens = options.maxOutputTokens ?? 8_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  async analyze(input: DocumentAnalysisInput): Promise<AnalyzerResponse> {
    const startedAt = Date.now();
    let maxTokens = this.maxOutputTokens;
    let truncatedOnce = false;

    for (let attempt = 0; ; attempt += 1) {
      try {
        const { body, requestId } = await this.post(input, maxTokens);
        const choice = body?.choices?.[0];
        const usage = {
          inputTokens: body?.usage?.prompt_tokens,
          outputTokens: body?.usage?.completion_tokens,
          cacheReadTokens: body?.usage?.prompt_tokens_details?.cached_tokens,
        };
        const base = { model: body?.model ?? this.model, usage, providerRequestId: requestId };

        if (choice?.message?.refusal) {
          return this.done(startedAt, { ...base, status: 'REFUSED', errorClass: 'REFUSAL' });
        }
        if (choice?.finish_reason === 'length') {
          if (!truncatedOnce) {
            truncatedOnce = true;
            maxTokens *= 2;
            continue;
          }
          return this.done(startedAt, { ...base, status: 'INVALID_OUTPUT', errorClass: 'TRUNCATED' });
        }

        let json: unknown;
        try {
          json = JSON.parse(choice?.message?.content ?? '');
        } catch {
          return this.done(startedAt, { ...base, status: 'INVALID_OUTPUT', errorClass: 'INVALID_JSON' });
        }
        const parsed = DocumentAnalysisSchema.safeParse(json);
        if (!parsed.success) {
          return this.done(startedAt, {
            ...base,
            status: 'INVALID_OUTPUT',
            errorClass: 'SCHEMA_MISMATCH',
            errorDetail: parsed.error.issues
              .slice(0, 3)
              .map((i) => `${i.path.join('.')}: ${i.code}`)
              .join('; '),
          });
        }
        return this.done(startedAt, { ...base, status: 'SUCCEEDED', result: parsed.data });
      } catch (error) {
        const err =
          error instanceof AnalyzerHttpError
            ? error
            : new AnalyzerHttpError(
                (error as Error)?.name === 'TimeoutError' || (error as Error)?.name === 'AbortError'
                  ? 'TIMEOUT'
                  : 'CONNECTION',
                true,
              );
        if (err.retryable && attempt < this.maxRetries) {
          const backoff = err.retryAfterMs ?? Math.min(1_000 * 2 ** attempt, 20_000);
          this.logger.warn(`${this.provider} ${err.errorClass}; retrying in ${backoff}ms (attempt ${attempt + 1})`);
          await this.sleep(backoff);
          continue;
        }
        return this.done(startedAt, {
          status: 'FAILED',
          model: this.model,
          errorClass: err.errorClass,
          providerRequestId: err.requestId,
        });
      }
    }
  }

  private async post(input: DocumentAnalysisInput, maxTokens: number) {
    let response: Response;
    response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.options.apiKey}` },
      signal: AbortSignal.timeout(this.timeoutMs),
      body: JSON.stringify({
        model: this.model,
        max_completion_tokens: maxTokens,
        // Stable system prompt first so providers with prefix caching can reuse it.
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(input) },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'document_analysis', strict: true, schema: DOCUMENT_ANALYSIS_JSON_SCHEMA },
        },
      }),
    });

    const requestId = response.headers.get('x-request-id') ?? undefined;
    if (!response.ok) {
      const status = response.status;
      const retryAfter = Number(response.headers.get('retry-after'));
      const retryAfterMs = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 60_000) : undefined;
      // Drain the body without logging it.
      await response.text().catch(() => undefined);
      if (status === 401) throw new AnalyzerHttpError('AUTHENTICATION', false, undefined, requestId);
      if (status === 403) throw new AnalyzerHttpError('PERMISSION_DENIED', false, undefined, requestId);
      if (status === 429) throw new AnalyzerHttpError('RATE_LIMITED', true, retryAfterMs, requestId);
      if (status === 408 || status === 409 || status >= 500) {
        throw new AnalyzerHttpError('SERVER_ERROR', true, retryAfterMs, requestId);
      }
      throw new AnalyzerHttpError('BAD_REQUEST', false, undefined, requestId);
    }
    return { body: (await response.json()) as any, requestId };
  }

  private done(startedAt: number, response: AnalyzerResponse): AnalyzerResponse {
    const out = { ...response, latencyMs: Date.now() - startedAt };
    const tokens = out.usage ? ` in=${out.usage.inputTokens ?? '?'} out=${out.usage.outputTokens ?? '?'}` : '';
    const line = `${this.provider}/${out.model ?? this.model} ${out.status}${out.errorClass ? ` (${out.errorClass})` : ''} ${out.latencyMs}ms${tokens} req=${out.providerRequestId ?? '-'}`;
    if (out.status === 'SUCCEEDED') this.logger.log(line);
    else this.logger.warn(line);
    return out;
  }
}
