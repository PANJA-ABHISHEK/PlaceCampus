import { Injectable } from '@nestjs/common';
import type { ResumeJobMatch } from '@placecampus/shared-types';
import { ResumeAiClient } from './ai/resume-ai.client.js';
import { JOB_MATCH_JSON_SCHEMA, JobMatchOutputSchema } from './ai/resume-analysis.schemas.js';
import { buildJobMatchUserPrompt, JOB_MATCH_PROMPT_VERSION, JOB_MATCH_SYSTEM_PROMPT } from './ai/prompts/job-match.v1.js';
import { finalizeJobMatch } from './analysis/finalize-analysis.js';
import { AnalysisFailedError } from './resume-analyzer.errors.js';

/** Job-description match, run separately so it never influences the general score. */
@Injectable()
export class JobMatchService {
  readonly promptVersion = JOB_MATCH_PROMPT_VERSION;

  constructor(private readonly ai: ResumeAiClient) {}

  async match(input: { resumeText: string; jobDescription: string; jobTitle: string | null }): Promise<ResumeJobMatch> {
    const result = await this.ai.complete({
      name: 'job_match',
      system: JOB_MATCH_SYSTEM_PROMPT,
      user: buildJobMatchUserPrompt(input),
      jsonSchema: JOB_MATCH_JSON_SCHEMA,
      validator: JobMatchOutputSchema,
      temperature: 0.2,
    });
    if (!result.ok) throw new AnalysisFailedError(result.errorClass);
    const { adjustments: _adjustments, ...match } = finalizeJobMatch(result.data, input);
    return match;
  }
}
