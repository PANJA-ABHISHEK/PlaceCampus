import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

export const AIOutputSchema = z.object({
  documentType: z.string(),
  issuer: z.string().optional(),
  claimedSkills: z.array(z.string()),
  skillRelevant: z.boolean(),
  possibleDuplicate: z.boolean(),
  readable: z.boolean(),
  decision: z.enum(['VERIFIED', 'REJECTED', 'NEEDS_REVIEW']),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string()),
  modelVersion: z.string(),
});

export type VerificationAIResult = z.infer<typeof AIOutputSchema>;

@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);
  private provider: string;
  private apiKey: string;
  private model: string;

  constructor(private configService: ConfigService) {
    this.provider = this.configService.get<string>('AI_PROVIDER') || 'openai';
    this.apiKey = this.configService.get<string>('AI_API_KEY') || '';
    this.model = this.configService.get<string>('AI_MODEL') || 'gpt-4o-mini';
  }

  async analyzeEvidence(
    text: string,
    title: string,
    type: string,
  ): Promise<VerificationAIResult> {
    if (!this.apiKey) {
      this.logger.warn('AI_API_KEY is not set. Using mock AI response.');
      return this.mockAnalysis(text, title, type);
    }

    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: `You are an AI assistant for PlaceCampus. Analyze the extracted text of a student's evidence document.
Expected JSON output schema:
{
  "documentType": "string (e.g. Certificate, Resume)",
  "issuer": "string (who issued it)",
  "claimedSkills": ["string"],
  "skillRelevant": boolean,
  "possibleDuplicate": boolean,
  "readable": boolean,
  "decision": "VERIFIED" | "REJECTED" | "NEEDS_REVIEW",
  "confidence": number (0-1),
  "reasons": ["string (why this decision)"],
  "modelVersion": "${this.model}"
}
Only output JSON.`,
              },
              {
                role: 'user',
                content: `Title: ${title}\nType: ${type}\n\nExtracted Text:\n${text.substring(0, 4000)}`,
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`AI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      const parsed = JSON.parse(content);

      // Validate structure using Zod
      return AIOutputSchema.parse(parsed);
    } catch (error: any) {
      this.logger.error(`AI analysis failed: ${error.message}`);
      throw error;
    }
  }

  private mockAnalysis(
    text: string,
    title: string,
    type: string,
  ): VerificationAIResult {
    const wordCount = text.split(/\s+/).length;
    let decision: 'VERIFIED' | 'REJECTED' | 'NEEDS_REVIEW' = 'NEEDS_REVIEW';
    const reasons = ['Mock AI verification used.'];

    if (wordCount < 10) {
      decision = 'NEEDS_REVIEW';
      reasons.push('Insufficient text for automatic verification.');
    } else if (
      text.toLowerCase().includes('certificate') ||
      text.toLowerCase().includes('completed')
    ) {
      decision = 'VERIFIED';
      reasons.push('Document contains strong completion keywords.');
    } else {
      decision = 'NEEDS_REVIEW';
      reasons.push('Requires manual review to confirm validity.');
    }

    return {
      documentType: type,
      issuer: 'Unknown Mock Issuer',
      claimedSkills: ['Mock Skill'],
      skillRelevant: true,
      possibleDuplicate: false,
      readable: wordCount > 0,
      decision,
      confidence: 0.8,
      reasons,
      modelVersion: 'mock-1.0',
    };
  }
}
