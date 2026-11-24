import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveAiProvider } from '../../common/ai/ai-provider.config.js';
import {
  StructuredCompletionClient,
  type StructuredCompletionRequest,
  type StructuredCompletionResult,
} from '../../common/ai/structured-completion.client.js';

/**
 * Server-side AI access for the resume analyzer, configured from the same
 * AI_* variables as evidence analysis (plus RESUME_ANALYZER_ENABLED). The
 * API key never leaves the server.
 */
@Injectable()
export class ResumeAiClient {
  private readonly logger = new Logger(ResumeAiClient.name);
  private readonly client: StructuredCompletionClient | null;
  readonly provider: string;

  constructor(config: ConfigService) {
    const resolved = resolveAiProvider(config, this.logger);
    const featureEnabled = config.get<string>('RESUME_ANALYZER_ENABLED', 'true') !== 'false';
    if (resolved.enabled && featureEnabled) {
      this.client = new StructuredCompletionClient(resolved, {
        maxOutputTokens: Number(config.get('RESUME_ANALYZER_MAX_OUTPUT_TOKENS')) || 8_000,
      });
      this.provider = resolved.provider;
      this.logger.log(`Resume analyzer AI: ${resolved.provider}/${resolved.model}`);
    } else {
      this.client = null;
      this.provider = 'none';
      this.logger.warn('Resume analyzer AI is not configured; analysis requests will be refused.');
    }
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  get model(): string {
    return this.client?.model ?? 'none';
  }

  complete<T>(request: StructuredCompletionRequest<T>): Promise<StructuredCompletionResult<T>> {
    if (!this.client) throw new Error('Resume analyzer AI is not configured');
    return this.client.complete(request);
  }
}
