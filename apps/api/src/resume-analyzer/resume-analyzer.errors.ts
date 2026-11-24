import type { CompletionErrorClass } from '../common/ai/structured-completion.client.js';

/** The AI call did not produce a usable result. Mapped to a student-facing message by the service. */
export class AnalysisFailedError extends Error {
  constructor(readonly errorClass: CompletionErrorClass | 'INSUFFICIENT_OUTPUT') {
    super(errorClass);
  }
}

export function analysisFailureMessage(errorClass: AnalysisFailedError['errorClass']): string {
  switch (errorClass) {
    case 'RATE_LIMITED':
      return 'The AI service is busy right now. Please try again in a minute.';
    case 'TIMEOUT':
    case 'CONNECTION':
    case 'SERVER_ERROR':
      return 'The AI service could not be reached. Please try again shortly.';
    case 'AUTHENTICATION':
    case 'PERMISSION_DENIED':
    case 'BAD_REQUEST':
      return 'Resume analysis is temporarily unavailable. Please contact the placement cell if this continues.';
    default:
      return 'The analysis could not be completed reliably. Please try again.';
  }
}
