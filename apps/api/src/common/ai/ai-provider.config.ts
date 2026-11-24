import type { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

/**
 * Shared reading of the AI_* environment variables. Every AI feature (evidence
 * document analysis, the resume analyzer) resolves its provider here, so one
 * key, one model and one kill switch govern them all. Keys stay server-side.
 */
export type AiProviderName = 'groq' | 'openai';

export const AI_PROVIDER_BASE_URLS: Record<AiProviderName, string> = {
  groq: 'https://api.groq.com/openai/v1',
  openai: 'https://api.openai.com/v1',
};

export const AI_DEFAULT_MODELS: Record<AiProviderName, string> = {
  groq: 'openai/gpt-oss-120b',
  openai: 'gpt-4o-mini',
};

export interface ResolvedAiProvider {
  enabled: true;
  provider: AiProviderName;
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeoutMs: number;
  maxRetries: number;
}

export interface DisabledAiProvider {
  enabled: false;
  /** NOT_CONFIGURED when a setting is missing or wrong; undefined when switched off on purpose. */
  reason?: 'NOT_CONFIGURED';
}

/** Selects the provider from configuration; anything incomplete resolves to disabled. */
export function resolveAiProvider(
  config: ConfigService,
  logger?: Logger,
): ResolvedAiProvider | DisabledAiProvider {
  if (config.get<string>('AI_ENABLED', 'true') === 'false') return { enabled: false };
  const raw = (config.get<string>('AI_PROVIDER') || '').trim().toLowerCase();
  const provider: AiProviderName | 'none' | null = raw.startsWith('groq')
    ? 'groq'
    : raw.startsWith('openai')
      ? 'openai'
      : raw === 'none' || raw === ''
        ? 'none'
        : null;
  if (provider === null) {
    logger?.warn(`Unknown AI_PROVIDER "${raw}"; AI analysis is off. Use groq, openai or none.`);
    return { enabled: false, reason: 'NOT_CONFIGURED' };
  }
  if (provider === 'none') return { enabled: false };
  const apiKey = (config.get<string>('AI_API_KEY') || '').trim();
  if (!apiKey || apiKey.startsWith('your-')) {
    logger?.warn('AI_API_KEY is not set; AI analysis is off.');
    return { enabled: false, reason: 'NOT_CONFIGURED' };
  }
  let model = (config.get<string>('AI_MODEL') || '').trim();
  if (!model || (provider === 'groq' && /^gpt-\d/.test(model))) {
    if (model) logger?.warn(`AI_MODEL "${model}" is not a ${provider} model; using ${AI_DEFAULT_MODELS[provider]}.`);
    model = AI_DEFAULT_MODELS[provider];
  }
  return {
    enabled: true,
    provider,
    apiKey,
    model,
    baseUrl: config.get<string>('AI_BASE_URL') || undefined,
    timeoutMs: Number(config.get('AI_TIMEOUT_MS')) || 120_000,
    maxRetries: Number(config.get('AI_MAX_RETRIES') ?? 2),
  };
}
