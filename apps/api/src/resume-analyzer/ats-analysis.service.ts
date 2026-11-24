import { Injectable } from '@nestjs/common';
import type { ResumeSignals } from '@placecampus/shared-types';
import { ResumeAiClient } from './ai/resume-ai.client.js';
import { RESUME_ANALYSIS_JSON_SCHEMA, ResumeAnalysisOutputSchema } from './ai/resume-analysis.schemas.js';
import { buildResumeUserPrompt, RESUME_PROMPT_VERSION, RESUME_SYSTEM_PROMPT } from './ai/prompts/resume-analysis.v1.js';
import { finalizeResumeAnalysis, type FinalizedResumeAnalysis } from './analysis/finalize-analysis.js';
import { AnalysisFailedError } from './resume-analyzer.errors.js';

export interface AtsAnalysisInput {
  resumeText: string;
  truncated: boolean;
  extractionMethod: string;
  signals: ResumeSignals;
  targetRole: string | null;
  profile: { department?: string; program?: string; graduationYear?: number };
}

/** General (job-independent) estimated ATS compatibility analysis. */
@Injectable()
export class AtsAnalysisService {
  readonly promptVersion = RESUME_PROMPT_VERSION;

  constructor(private readonly ai: ResumeAiClient) {}

  async analyze(input: AtsAnalysisInput): Promise<FinalizedResumeAnalysis & { latencyMs: number; model: string }> {
    const result = await this.ai.complete({
      name: 'resume_analysis',
      system: RESUME_SYSTEM_PROMPT,
      user: buildResumeUserPrompt(input),
      jsonSchema: RESUME_ANALYSIS_JSON_SCHEMA,
      validator: ResumeAnalysisOutputSchema,
      // Low temperature keeps scores stable across re-analyses of the same resume.
      temperature: 0.2,
    });
    if (!result.ok) throw new AnalysisFailedError(result.errorClass);
    const finalized = finalizeResumeAnalysis(result.data, {
      resumeText: input.resumeText,
      signals: input.signals,
      targetRole: input.targetRole,
    });
    return { ...finalized, latencyMs: result.latencyMs, model: result.model };
  }
}
