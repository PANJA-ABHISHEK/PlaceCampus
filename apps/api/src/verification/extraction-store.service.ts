import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EvidenceExtraction } from './schemas/evidence-extraction.schema.js';
import { Evidence } from '../evidence/schemas/evidence.schema.js';
import type { ExtractionResult } from './providers/document-extractor.service.js';

/** Stored text is capped; reviewers see the document itself for anything longer. */
export const MAX_STORED_TEXT = 20_000;

export interface DuplicateMatch {
  evidenceId: string;
  /** FILE = byte-identical upload; TEXT = same normalised text (re-saved or re-scanned copy). */
  matchType: 'FILE' | 'TEXT';
  sameStudent: boolean;
}

@Injectable()
export class ExtractionStoreService {
  constructor(
    @InjectModel(EvidenceExtraction.name)
    private readonly extractionModel: Model<EvidenceExtraction>,
    @InjectModel(Evidence.name)
    private readonly evidenceModel: Model<Evidence>,
  ) {}

  async save(input: {
    evidenceId: string;
    studentId: string;
    version: number;
    fileId?: string;
    result: ExtractionResult;
  }) {
    const { result } = input;
    return this.extractionModel.create({
      evidenceId: input.evidenceId,
      studentId: input.studentId,
      version: input.version,
      fileId: input.fileId,
      method: result.method,
      status: result.status,
      text: result.text.slice(0, MAX_STORED_TEXT),
      textTruncated: result.text.length > MAX_STORED_TEXT,
      charCount: result.charCount,
      wordCount: result.wordCount,
      ocrConfidence: result.ocrConfidence,
      pageCount: result.pageCount,
      pages: result.pages,
      fileSha256: result.fileSha256 ?? undefined,
      textFingerprint: result.textFingerprint ?? undefined,
      engineVersions: result.engineVersions,
      durationMs: result.durationMs,
      error: result.error,
    });
  }

  /**
   * Other evidence items (any student) whose file bytes or normalised text
   * match this extraction. Re-runs of the same evidence and deleted evidence
   * are ignored.
   */
  async findDuplicates(evidenceId: string, studentId: string, result: ExtractionResult): Promise<DuplicateMatch[]> {
    const or: Record<string, string>[] = [];
    if (result.fileSha256) or.push({ fileSha256: result.fileSha256 });
    if (result.textFingerprint) or.push({ textFingerprint: result.textFingerprint });
    if (!or.length) return [];

    const candidates = await this.extractionModel
      .find({ evidenceId: { $ne: evidenceId }, $or: or })
      .select('evidenceId studentId fileSha256 textFingerprint')
      .lean()
      .exec();
    if (!candidates.length) return [];

    const ids = [...new Set(candidates.map((c) => c.evidenceId))];
    const existing = await this.evidenceModel
      .find({ _id: { $in: ids } })
      .select('_id')
      .lean()
      .exec();
    const alive = new Set(existing.map((e) => String(e._id)));

    const matches = new Map<string, DuplicateMatch>();
    for (const c of candidates) {
      if (!alive.has(c.evidenceId)) continue;
      const matchType = result.fileSha256 && c.fileSha256 === result.fileSha256 ? 'FILE' : 'TEXT';
      const previous = matches.get(c.evidenceId);
      if (previous?.matchType === 'FILE') continue;
      matches.set(c.evidenceId, { evidenceId: c.evidenceId, matchType, sameStudent: c.studentId === studentId });
    }
    return [...matches.values()];
  }

  latestFor(evidenceId: string) {
    return this.extractionModel.findOne({ evidenceId }).sort({ version: -1, createdAt: -1 }).lean().exec();
  }
}
