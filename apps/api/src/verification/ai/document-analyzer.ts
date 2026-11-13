import type { DocumentAnalysisResult } from './document-analysis.schema.js';
import type { PromptInput } from './prompts/document-analysis.v1.js';

/** Master Plan §12.6 adapter. Providers are interchangeable behind this interface. */
export type AnalyzerProvider = 'groq' | 'openai' | 'none';

export type AnalysisStatus = 'SUCCEEDED' | 'INVALID_OUTPUT' | 'REFUSED' | 'FAILED' | 'DISABLED';

/** Error classes recorded instead of raw messages (logs never contain document content). */
export type AnalysisErrorClass =
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
  | 'REFUSAL'
  | 'NOT_CONFIGURED';

export interface DocumentAnalysisInput extends PromptInput {
  promptVersion: string;
}

export interface AnalyzerResponse {
  status: AnalysisStatus;
  result?: DocumentAnalysisResult;
  model?: string;
  usage?: { inputTokens?: number; outputTokens?: number; cacheReadTokens?: number };
  latencyMs?: number;
  providerRequestId?: string;
  errorClass?: AnalysisErrorClass;
  /** Short operator-facing note (never document content). */
  errorDetail?: string;
}

export interface DocumentAnalyzer {
  readonly provider: AnalyzerProvider;
  readonly model?: string;
  analyze(input: DocumentAnalysisInput): Promise<AnalyzerResponse>;
}

/** Returned when AI is not configured or switched off: every environment works without a key. */
export class NoneAnalyzer implements DocumentAnalyzer {
  readonly provider = 'none' as const;
  constructor(private readonly reason: AnalysisErrorClass | undefined = undefined) {}
  async analyze(): Promise<AnalyzerResponse> {
    return { status: 'DISABLED', errorClass: this.reason };
  }
}
