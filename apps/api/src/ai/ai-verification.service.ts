import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AIVerificationResult {
  documentType: string;
  extractedName: string | null;
  issuer: string | null;
  claimedSkill: string | null;
  skillRelevant: boolean;
  isReadable: boolean;
  possibleDuplicate: boolean;
  decision: 'VERIFIED' | 'REJECTED' | 'NEEDS_REVIEW';
  reasons: string[];
  modelVersion: string;
}

@Injectable()
export class AIVerificationService {
  private readonly logger = new Logger(AIVerificationService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ai.apiKey', '');
    this.model = this.configService.get<string>('ai.model', 'gpt-4o');
    this.baseUrl = this.configService.get<string>(
      'ai.baseUrl',
      'https://api.openai.com/v1',
    );
  }

  async analyzeDocument(params: {
    extractedText: string;
    claimedSkills: string[];
    evidenceType: string;
    studentName?: string;
  }): Promise<AIVerificationResult> {
    if (!this.apiKey) {
      this.logger.warn('AI API key not configured – using rule-based fallback');
      return this.ruleBasedFallback(params);
    }

    try {
      const prompt = this.buildPrompt(params);
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `You are a document verification assistant for a university placement platform called PlaceCampus. Analyze documents and return structured JSON results. You must NOT treat AI analysis as definitive certificate authentication. Flag uncertain cases for human review.`,
            },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      const content = data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty AI response');
      }

      const result = JSON.parse(content) as AIVerificationResult;
      result.modelVersion = this.model;
      return result;
    } catch (error) {
      this.logger.error('AI analysis failed, falling back to rules', error);
      return this.ruleBasedFallback(params);
    }
  }

  private buildPrompt(params: {
    extractedText: string;
    claimedSkills: string[];
    evidenceType: string;
    studentName?: string;
  }): string {
    return `Analyze this document for verification:

Document Type: ${params.evidenceType}
${params.studentName ? `Student Name: ${params.studentName}` : ''}
Claimed Skills: ${params.claimedSkills.join(', ') || 'None specified'}

--- Extracted Text ---
${params.extractedText.slice(0, 4000)}
--- End ---

Return a JSON object with these fields:
{
  "documentType": "string (CERTIFICATE, PROJECT, INTERNSHIP, etc.)",
  "extractedName": "string or null",
  "issuer": "string or null",
  "claimedSkill": "primary skill found or null",
  "skillRelevant": boolean,
  "isReadable": boolean,
  "possibleDuplicate": false,
  "decision": "VERIFIED | REJECTED | NEEDS_REVIEW",
  "reasons": ["array of specific reasons for the decision"]
}

Rules:
- If the document is unreadable, decision = "REJECTED"
- If the issuer cannot be verified, decision = "NEEDS_REVIEW"
- If claimed skills don't match document content, decision = "NEEDS_REVIEW"
- Only use "VERIFIED" when the document clearly supports the skill claim
- Always explain your reasoning`;
  }

  private ruleBasedFallback(params: {
    extractedText: string;
    claimedSkills: string[];
    evidenceType: string;
  }): AIVerificationResult {
    const text = params.extractedText.toLowerCase();
    const reasons: string[] = [];
    let decision: 'VERIFIED' | 'REJECTED' | 'NEEDS_REVIEW' = 'NEEDS_REVIEW';

    if (!text || text.length < 20) {
      decision = 'REJECTED';
      reasons.push('Document text is too short or unreadable');
    } else {
      reasons.push('AI service unavailable – routed to faculty review');

      // Basic skill relevance check
      const hasSkillMention = params.claimedSkills.some((skill) =>
        text.includes(skill.toLowerCase()),
      );
      if (hasSkillMention) {
        reasons.push('Claimed skill found in document text');
      } else if (params.claimedSkills.length > 0) {
        reasons.push('Claimed skills not found in document text');
      }
    }

    return {
      documentType: params.evidenceType,
      extractedName: null,
      issuer: null,
      claimedSkill: params.claimedSkills[0] ?? null,
      skillRelevant: false,
      isReadable: text.length >= 20,
      possibleDuplicate: false,
      decision,
      reasons,
      modelVersion: 'rule-based-fallback-v1',
    };
  }
}
