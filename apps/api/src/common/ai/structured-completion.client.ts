import { Logger } from '@nestjs/common';
import type { ZodType } from 'zod';
import { AI_PROVIDER_BASE_URLS, type ResolvedAiProvider } from './ai-provider.config.js';

/**
 * Error classes recorded instead of raw messages. Logs never carry prompt or
 * document content: only provider, model, outcome, latency, usage and request id.
 */
export type CompletionErrorClass =
  | 'AUTHENTICATION'
  | 'PERMISSION_DENIED'
  | 'BAD_REQUEST'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'CONNECTION'
  | 'TIMEOUT'
  | 'INVALID_JSON'
  | 'SCHEMA_MISMATCH'
  | 'TRUNCATED'
  | 'REFUSAL';

export interface StructuredCompletionRequest<T> {
  /** Short name for the JSON schema and the logs, e.g. "resume_analysis". */
  name: string;
  system: string;
  user: string;
  jsonSchema: Record<string, unknown>;
  validator: ZodType<T>;
  temperature?: number;
}

export type StructuredCompletionResult<T> =
  | { ok: true; data: T; model: string; latencyMs: number; usage?: { inputTokens?: number; outputTokens?: number } }
  | { ok: false; errorClass: CompletionErrorClass; model: string; latencyMs: number; detail?: string };

export interface StructuredCompletionOptions {
  maxOutputTokens?: number;
  /** Injected for tests. */
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

class CompletionHttpError extends Error {
  constructor(
    readonly errorClass: CompletionErrorClass,
    readonly retryable: boolean,
    readonly retryAfterMs?: number,
    readonly requestId?: string,
  ) {
    super(errorClass);
  }
}

/**
 * Chat Completions client for OpenAI-compatible providers (Groq, OpenAI) with
 * strict JSON-schema structured outputs. Retries transient failures
 * (408/409/429/5xx, timeouts, connection errors) with backoff, retries once
 * with a larger token budget on truncation, and retries once when the reply
 * is not valid JSON or fails schema validation.
 */
export class StructuredCompletionClient {
  private readonly logger = new Logger(StructuredCompletionClient.name);
  private readonly baseUrl: string;
  private readonly maxOutputTokens: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    private readonly provider: ResolvedAiProvider,
    options: StructuredCompletionOptions = {},
  ) {
    this.baseUrl = (provider.baseUrl || AI_PROVIDER_BASE_URLS[provider.provider]).replace(/\/$/, '');
    this.maxOutputTokens = options.maxOutputTokens ?? 8_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  get model() {
    return this.provider.model;
  }

  async complete<T>(request: StructuredCompletionRequest<T>): Promise<StructuredCompletionResult<T>> {
    const startedAt = Date.now();
    let maxTokens = this.maxOutputTokens;
    let truncationRetried = false;
    let invalidOutputRetried = false;
    let transientRetries = 0;

    for (;;) {
      try {
        const { body, requestId } = await this.post(request, maxTokens);
        const choice = body?.choices?.[0];
        const model: string = body?.model ?? this.provider.model;
        const usage = {
          inputTokens: body?.usage?.prompt_tokens,
          outputTokens: body?.usage?.completion_tokens,
        };

        if (choice?.message?.refusal) {
          return this.fail(request.name, startedAt, model, 'REFUSAL', requestId);
        }
        if (choice?.finish_reason === 'length') {
          if (!truncationRetried) {
            truncationRetried = true;
            maxTokens *= 2;
            continue;
          }
          return this.fail(request.name, startedAt, model, 'TRUNCATED', requestId);
        }

        let json: unknown;
        try {
          json = JSON.parse(choice?.message?.content ?? '');
        } catch {
          if (!invalidOutputRetried) {
            invalidOutputRetried = true;
            continue;
          }
          return this.fail(request.name, startedAt, model, 'INVALID_JSON', requestId);
        }

        const parsed = request.validator.safeParse(json);
        if (!parsed.success) {
          const detail = parsed.error.issues
            .slice(0, 3)
            .map((issue) => `${issue.path.join('.')}: ${issue.code}`)
            .join('; ');
          if (!invalidOutputRetried) {
            invalidOutputRetried = true;
            this.logger.warn(`${request.name}: reply failed validation (${detail}); retrying once`);
            continue;
          }
          return this.fail(request.name, startedAt, model, 'SCHEMA_MISMATCH', requestId, detail);
        }

        const latencyMs = Date.now() - startedAt;
        this.logger.log(
          `${request.name} ${this.provider.provider}/${model} SUCCEEDED ${latencyMs}ms in=${usage.inputTokens ?? '?'} out=${usage.outputTokens ?? '?'} req=${requestId ?? '-'}`,
        );
        return { ok: true, data: parsed.data, model, latencyMs, usage };
      } catch (error) {
        const err =
          error instanceof CompletionHttpError
            ? error
            : new CompletionHttpError(
                (error as Error)?.name === 'TimeoutError' || (error as Error)?.name === 'AbortError'
                  ? 'TIMEOUT'
                  : 'CONNECTION',
                true,
              );
        if (err.retryable && transientRetries < this.provider.maxRetries) {
          const backoff = err.retryAfterMs ?? Math.min(1_000 * 2 ** transientRetries, 20_000);
          transientRetries += 1;
          this.logger.warn(`${request.name} ${err.errorClass}; retrying in ${backoff}ms (attempt ${transientRetries})`);
          await this.sleep(backoff);
          continue;
        }
        return this.fail(request.name, startedAt, this.provider.model, err.errorClass, err.requestId);
      }
    }
  }

  private async post<T>(request: StructuredCompletionRequest<T>, maxTokens: number) {
    const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.provider.apiKey}` },
      signal: AbortSignal.timeout(this.provider.timeoutMs),
      body: JSON.stringify({
        model: this.provider.model,
        max_completion_tokens: maxTokens,
        ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
        // Stable system prompt first so providers with prefix caching can reuse it.
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.user },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: request.name, strict: true, schema: request.jsonSchema },
        },
      }),
    });

    const requestId = response.headers.get('x-request-id') ?? undefined;
    if (!response.ok) {
      const status = response.status;
      const retryAfter = Number(response.headers.get('retry-after'));
      const retryAfterMs =
        Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 60_000) : undefined;
      // Drain the body without logging it.
      await response.text().catch(() => undefined);
      if (status === 401) throw new CompletionHttpError('AUTHENTICATION', false, undefined, requestId);
      if (status === 403) throw new CompletionHttpError('PERMISSION_DENIED', false, undefined, requestId);
      if (status === 429) throw new CompletionHttpError('RATE_LIMITED', true, retryAfterMs, requestId);
      if (status === 408 || status === 409 || status >= 500) {
        throw new CompletionHttpError('SERVER_ERROR', true, retryAfterMs, requestId);
      }
      throw new CompletionHttpError('BAD_REQUEST', false, undefined, requestId);
    }
    return { body: (await response.json()) as any, requestId };
  }

  private fail(
    name: string,
    startedAt: number,
    model: string,
    errorClass: CompletionErrorClass,
    requestId?: string,
    detail?: string,
  ): StructuredCompletionResult<never> {
    const latencyMs = Date.now() - startedAt;
    this.logger.warn(
      `${name} ${this.provider.provider}/${model} FAILED (${errorClass}) ${latencyMs}ms req=${requestId ?? '-'}${detail ? ` ${detail}` : ''}`,
    );
    return { ok: false, errorClass, model, latencyMs, detail };
  }
}
