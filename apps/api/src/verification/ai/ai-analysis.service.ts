import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AiAnalysis } from '../schemas/ai-analysis.schema.js';
import { Skill } from '../../skills/schemas/skill.schema.js';
import type { ExtractionResult } from '../providers/document-extractor.service.js';
import type { DocumentAnalysisResult } from './document-analysis.schema.js';
import {
  NoneAnalyzer,
  type AnalysisStatus,
  type AnalyzerProvider,
  type DocumentAnalyzer,
} from './document-analyzer.js';
import { OpenAiCompatibleAnalyzer } from './openai-compatible.analyzer.js';
import { PROMPT_VERSION } from './prompts/document-analysis.v1.js';
import { postValidate, type PostValidation } from './post-validation.js';

const DEFAULT_MODELS: Record<Exclude<AnalyzerProvider, 'none'>, string> = {
  groq: 'openai/gpt-oss-120b',
  openai: 'gpt-4o-mini',
};

/** Relevance at or above this makes a mapped skill mention count as a claimed skill. */
export const SKILL_RELEVANCE_THRESHOLD = 0.5;

export interface AiOutcome {
  status: AnalysisStatus;
  result?: DocumentAnalysisResult;
  postValidation?: PostValidation;
  provider: AnalyzerProvider;
  model?: string;
  /** Set when AI did not run for a known reason (kill switch, no key, no text). */
  skippedReason?: string;
}

/** Compatibility view stored as `verification_records.aiResult` (skill aggregation and older UI read it). */
export interface LegacyAiResult {
  documentType: string;
  issuer: string | null;
  claimedSkills: string[];
  skillRelevant: boolean;
  readable: boolean;
  confidence: number;
  reasons: string[];
  modelVersion: string;
  summary: string;
  analysisId?: string;
}

export interface EvidenceForAnalysis {
  evidenceId: string;
  studentId: string;
  version: number;
  type: string;
  title?: string;
  issuer?: string;
  issuedDate?: string;
}

@Injectable()
export class AiAnalysisService {
  private readonly logger = new Logger(AiAnalysisService.name);
  readonly analyzer: DocumentAnalyzer;
  private readonly disabledTypes: Set<string>;
  private readonly maxTextChars: number;
  private readonly maxCandidateSkills: number;

  constructor(
    config: ConfigService,
    @InjectModel(AiAnalysis.name) private readonly analysisModel: Model<AiAnalysis>,
    @InjectModel(Skill.name) private readonly skillModel: Model<Skill>,
  ) {
    this.disabledTypes = new Set(
      (config.get<string>('AI_DISABLED_EVIDENCE_TYPES') || '')
        .split(',')
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean),
    );
    this.maxTextChars = Number(config.get('AI_MAX_TEXT_CHARS')) || 12_000;
    this.maxCandidateSkills = Number(config.get('AI_MAX_CANDIDATE_SKILLS')) || 200;
    this.analyzer = AiAnalysisService.createAnalyzer(config, this.logger);
    this.logger.log(
      this.analyzer.provider === 'none'
        ? 'AI document analysis is off (rules and OCR only).'
        : `AI document analysis: ${this.analyzer.provider}/${this.analyzer.model} (${PROMPT_VERSION})`,
    );
  }

  /** Selects the adapter from configuration; anything incomplete falls back to `none`. */
  static createAnalyzer(config: ConfigService, logger?: Logger): DocumentAnalyzer {
    if (config.get<string>('AI_ENABLED', 'true') === 'false') return new NoneAnalyzer();
    const raw = (config.get<string>('AI_PROVIDER') || '').trim().toLowerCase();
    const provider: AnalyzerProvider | null = raw.startsWith('groq')
      ? 'groq'
      : raw.startsWith('openai')
        ? 'openai'
        : raw === 'none' || raw === ''
          ? 'none'
          : null;
    if (provider === null) {
      logger?.warn(`Unknown AI_PROVIDER "${raw}"; AI analysis is off. Use groq, openai or none.`);
      return new NoneAnalyzer('NOT_CONFIGURED');
    }
    if (provider === 'none') return new NoneAnalyzer();
    const apiKey = (config.get<string>('AI_API_KEY') || '').trim();
    if (!apiKey || apiKey.startsWith('your-')) {
      logger?.warn('AI_API_KEY is not set; AI analysis is off.');
      return new NoneAnalyzer('NOT_CONFIGURED');
    }
    let model = (config.get<string>('AI_MODEL') || '').trim();
    if (!model || (provider === 'groq' && /^gpt-\d/.test(model))) {
      if (model) logger?.warn(`AI_MODEL "${model}" is not a ${provider} model; using ${DEFAULT_MODELS[provider]}.`);
      model = DEFAULT_MODELS[provider];
    }
    return new OpenAiCompatibleAnalyzer({
      provider,
      apiKey,
      model,
      baseUrl: config.get<string>('AI_BASE_URL') || undefined,
      timeoutMs: Number(config.get('AI_TIMEOUT_MS')) || 120_000,
      maxRetries: Number(config.get('AI_MAX_RETRIES') ?? 2),
    });
  }

  async analyze(evidence: EvidenceForAnalysis, extraction: ExtractionResult): Promise<{
    outcome: AiOutcome;
    analysisId: string;
    legacy: LegacyAiResult | null;
  }> {
    const provider = this.analyzer.provider;
    const model = this.analyzer.model;

    let skippedReason: string | undefined;
    if (provider === 'none') skippedReason = 'AI analysis is not configured.';
    else if (this.disabledTypes.has(evidence.type.toUpperCase())) skippedReason = `AI is turned off for ${evidence.type} evidence.`;
    else if (!extraction.hasText) skippedReason = 'No text was extracted to analyse.';

    if (skippedReason) {
      const doc = await this.save(evidence, {
        provider,
        model,
        status: 'DISABLED',
        errorDetail: skippedReason,
      });
      return { outcome: { status: 'DISABLED', provider, model, skippedReason }, analysisId: doc.id, legacy: null };
    }

    const text = extraction.text.slice(0, this.maxTextChars);
    const candidateSkills = await this.candidateSkills(text);
    const response = await this.analyzer.analyze({
      promptVersion: PROMPT_VERSION,
      today: new Date().toISOString().slice(0, 10),
      evidenceType: evidence.type,
      // Data minimisation: declared document fields only; never the student's profile.
      declared: {
        title: evidence.title,
        issuer: evidence.issuer,
        issueDate: evidence.issuedDate,
        claimedSkills: [],
      },
      candidateSkills,
      extractedText: text,
      extraction: { method: extraction.method, ocrConfidence: extraction.ocrConfidence, pageCount: extraction.pageCount },
    });

    let result: DocumentAnalysisResult | undefined;
    let postValidation: PostValidation | undefined;
    if (response.status === 'SUCCEEDED' && response.result) {
      ({ result, postValidation } = postValidate(response.result, new Set(candidateSkills.map((s) => s.id)), text));
    }

    const doc = await this.save(evidence, {
      provider,
      model: response.model ?? model,
      status: response.status,
      result,
      postValidation,
      usage: response.usage,
      latencyMs: response.latencyMs,
      providerRequestId: response.providerRequestId,
      errorClass: response.errorClass,
      errorDetail: response.errorDetail,
    });

    const outcome: AiOutcome = { status: response.status, result, postValidation, provider, model: response.model ?? model };
    const legacy = result ? this.toLegacy(outcome, candidateSkills, doc.id) : null;
    return { outcome, analysisId: doc.id, legacy };
  }

  latestFor(evidenceId: string) {
    return this.analysisModel.findOne({ evidenceId }).sort({ version: -1, createdAt: -1 }).lean().exec();
  }

  /**
   * Skills mentioned in the text (by name or synonym) first, then the rest of
   * the active catalogue, capped to keep requests small.
   */
  private async candidateSkills(text: string) {
    const skills = await this.skillModel
      .find({ active: { $ne: false } })
      .select('_id name synonyms')
      .sort({ name: 1 })
      .lean()
      .exec();
    const haystack = ` ${text.toLowerCase().replace(/\s+/g, ' ')} `;
    const mentioned = (s: { name: string; synonyms?: string[] }) =>
      [s.name, ...(s.synonyms ?? [])].some((term) => {
        const t = term.toLowerCase().trim();
        return t.length > 1 && haystack.includes(t);
      });
    const ordered = [...skills.filter(mentioned), ...skills.filter((s) => !mentioned(s))];
    return ordered.slice(0, this.maxCandidateSkills).map((s) => ({
      id: String(s._id),
      name: s.name,
      synonyms: (s.synonyms ?? []).slice(0, 5),
    }));
  }

  private toLegacy(
    outcome: AiOutcome,
    candidates: Array<{ id: string; name: string }>,
    analysisId: string,
  ): LegacyAiResult {
    const result = outcome.result!;
    const names = new Map(candidates.map((c) => [c.id, c.name]));
    const claimedSkills = [
      ...new Set(
        result.skillMentions
          .filter((m) => m.suggestedSkillId && m.relevance >= SKILL_RELEVANCE_THRESHOLD)
          .map((m) => names.get(m.suggestedSkillId!)!)
          .filter(Boolean),
      ),
    ];
    return {
      documentType: result.documentType,
      issuer: result.extracted.issuerName,
      claimedSkills,
      skillRelevant: claimedSkills.length > 0,
      readable: result.readability !== 'POOR' && result.documentType !== 'UNREADABLE',
      confidence: result.documentTypeConfidence,
      reasons: [result.summary],
      modelVersion: `${outcome.provider}/${outcome.model ?? 'unknown'}`,
      summary: result.summary,
      analysisId,
    };
  }

  private save(evidence: EvidenceForAnalysis, data: Partial<AiAnalysis> & { status: AnalysisStatus; provider: string }) {
    return this.analysisModel.create({
      evidenceId: evidence.evidenceId,
      studentId: evidence.studentId,
      version: evidence.version,
      promptVersion: PROMPT_VERSION,
      postValidation: { droppedSkillIds: [], unconfirmedFields: [], invalidDates: [] },
      ...data,
    });
  }
}
