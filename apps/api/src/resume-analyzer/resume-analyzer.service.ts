import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'crypto';
import { Model } from 'mongoose';
import type {
  AnalyzeResumeDto,
  ResumeAnalysis,
  ResumeAnalysisSummary,
  ResumeJobMatch,
  StoredResume,
} from '@placecampus/shared-types';
import { StorageService } from '../storage/storage.service.js';
import { StudentProfile } from '../students/schemas/student-profile.schema.js';
import { Resume } from './schemas/resume.schema.js';
import { ResumeAnalysisRecord } from './schemas/resume-analysis.schema.js';
import { ResumeParserService } from './parsing/resume-parser.service.js';
import {
  checkContent,
  checkDeclaredType,
  DEFAULT_MAX_RESUME_BYTES,
  ResumeFileError,
} from './parsing/resume-file.validation.js';
import { computeResumeSignals } from './analysis/resume-signals.js';
import { InsufficientAnalysisError } from './analysis/finalize-analysis.js';
import { ResumeAiClient } from './ai/resume-ai.client.js';
import { AtsAnalysisService } from './ats-analysis.service.js';
import { JobMatchService } from './job-match.service.js';
import { AnalysisFailedError, analysisFailureMessage } from './resume-analyzer.errors.js';

export interface UploadedResumeFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const EXCERPT_CHARS = 280;

/**
 * Resume upload, storage and analysis history for students. Every query is
 * scoped by the authenticated student's id, so one student can never read,
 * analyse or delete another student's resume or analyses.
 */
@Injectable()
export class ResumeAnalyzerService {
  private readonly logger = new Logger(ResumeAnalyzerService.name);
  readonly maxFileBytes: number;
  private readonly maxTextChars: number;
  private readonly hourlyLimit: number;
  /** Students with an analysis in progress: one at a time each. */
  private readonly inFlight = new Set<string>();
  /** Recent analysis start times per student (per API instance). */
  private readonly recentRuns = new Map<string, number[]>();

  constructor(
    config: ConfigService,
    @InjectModel(Resume.name) private readonly resumeModel: Model<Resume>,
    @InjectModel(ResumeAnalysisRecord.name) private readonly analysisModel: Model<ResumeAnalysisRecord>,
    @InjectModel(StudentProfile.name) private readonly profileModel: Model<StudentProfile>,
    private readonly storage: StorageService,
    private readonly parser: ResumeParserService,
    private readonly ai: ResumeAiClient,
    private readonly ats: AtsAnalysisService,
    private readonly jobMatch: JobMatchService,
  ) {
    const mb = Number(config.get('RESUME_MAX_FILE_MB'));
    this.maxFileBytes = Number.isFinite(mb) && mb > 0 ? Math.min(mb, 10) * 1024 * 1024 : DEFAULT_MAX_RESUME_BYTES;
    this.maxTextChars = Number(config.get('RESUME_MAX_TEXT_CHARS')) || 16_000;
    this.hourlyLimit = Number(config.get('RESUME_ANALYZER_HOURLY_LIMIT')) || 10;
  }

  /* ───────────── Resume ───────────── */

  async getResume(studentId: string): Promise<StoredResume | null> {
    const resume = await this.resumeModel.findOne({ studentId }).exec();
    return resume ? this.toStoredResume(resume) : null;
  }

  async uploadResume(studentId: string, file: UploadedResumeFile | undefined): Promise<StoredResume> {
    if (!file) throw new BadRequestException('Choose a PDF or DOCX resume to upload.');
    let parsed;
    let kind;
    try {
      kind = checkDeclaredType(file.originalname, file.mimetype);
      checkContent(file.buffer, kind, this.maxFileBytes);
      parsed = await this.parser.parse(file.buffer, kind);
    } catch (error) {
      if (error instanceof ResumeFileError) {
        this.logger.warn(`Resume upload rejected for student ${studentId}: ${error.message}`);
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    const fileName = sanitizeFileName(file.originalname);
    const saved = await this.storage.saveFile(`resumes/${studentId}`, { ...file, originalname: fileName });
    const previous = await this.resumeModel.findOne({ studentId }).select('+storageKey').exec();
    try {
      const resume = await this.resumeModel
        .findOneAndUpdate(
          { studentId },
          {
            $set: {
              studentId,
              fileName,
              fileType: kind,
              mimeType: file.mimetype,
              size: file.size,
              storageKey: saved.key,
              sha256: parsed.sha256,
              text: parsed.text,
              pageCount: parsed.pageCount,
              wordCount: parsed.wordCount,
              extractionMethod: parsed.method,
              ocrConfidence: parsed.ocrConfidence,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        )
        .exec();
      if (previous?.storageKey && previous.storageKey !== saved.key) {
        await this.storage.deleteFile(previous.storageKey);
      }
      this.logger.log(
        `Resume ${previous ? 'replaced' : 'uploaded'} for student ${studentId}: ${kind}, ${file.size} bytes, ${parsed.wordCount} words via ${parsed.method}`,
      );
      return this.toStoredResume(resume!);
    } catch (error) {
      await this.storage.deleteFile(saved.key);
      throw error;
    }
  }

  async removeResume(studentId: string): Promise<{ removed: true }> {
    const resume = await this.resumeModel.findOneAndDelete({ studentId }).select('+storageKey').exec();
    if (!resume) throw new NotFoundException('You have no uploaded resume.');
    await this.storage.deleteFile(resume.storageKey);
    this.logger.log(`Resume removed for student ${studentId}`);
    return { removed: true };
  }

  /* ───────────── Analysis ───────────── */

  async analyze(studentId: string, dto: AnalyzeResumeDto): Promise<ResumeAnalysis> {
    if (!this.ai.enabled) {
      throw new ServiceUnavailableException('AI resume analysis is not configured on this server.');
    }
    const resume = await this.resumeModel.findOne({ studentId }).select('+text').exec();
    if (!resume) throw new NotFoundException('Upload your resume before running an analysis.');

    if (this.inFlight.has(studentId)) {
      throw new ConflictException('An analysis of your resume is already running. Please wait for it to finish.');
    }
    this.checkRateLimit(studentId);

    const targetRole = dto.targetRole?.trim() || null;
    const jobDescription = dto.jobDescription?.trim() || null;
    const jobTitle = dto.jobTitle?.trim() || null;

    this.inFlight.add(studentId);
    const startedAt = Date.now();
    try {
      const profile = await this.profileModel
        .findOne({ userId: studentId })
        .select('department program graduationYear')
        .lean()
        .exec();
      const truncated = resume.text.length > this.maxTextChars;
      const resumeText = truncated ? resume.text.slice(0, this.maxTextChars) : resume.text;
      const signals = computeResumeSignals(resume.text, resume.pageCount);

      // Independent calls: the job description never influences the general score.
      const [general, match] = await Promise.all([
        this.ats.analyze({
          resumeText,
          truncated,
          extractionMethod: resume.extractionMethod,
          signals,
          targetRole,
          profile: {
            department: profile?.department,
            program: profile?.program,
            graduationYear: profile?.graduationYear,
          },
        }),
        jobDescription
          ? this.jobMatch.match({ resumeText, jobDescription, jobTitle })
          : Promise.resolve<ResumeJobMatch | null>(null),
      ]);

      if (general.adjustments.length) {
        this.logger.log(`Post-validation adjusted analysis for student ${studentId}: ${general.adjustments.join('; ')}`);
      }

      const record = await this.analysisModel.create({
        studentId,
        resumeId: resume.id,
        fileName: resume.fileName,
        fileType: resume.fileType,
        resumeSha256: resume.sha256,
        overallScore: general.overallScore,
        targetRole: general.targetRole,
        targetRoleInferred: !targetRole,
        summary: general.summary,
        categories: general.categories,
        strengths: general.strengths,
        weaknesses: general.weaknesses,
        missingSkills: general.missingSkills,
        missingKeywords: general.missingKeywords,
        formattingIssues: general.formattingIssues,
        grammarIssues: general.grammarIssues,
        weakBullets: general.weakBullets,
        sectionFeedback: general.sectionFeedback,
        recommendations: general.recommendations,
        signals,
        jobMatch: match,
        jobDescriptionExcerpt: jobDescription ? excerpt(jobDescription) : null,
        jobDescriptionSha256: jobDescription ? createHash('sha256').update(jobDescription).digest('hex') : null,
        provider: this.ai.provider,
        aiModel: general.model,
        promptVersion: jobDescription
          ? `${this.ats.promptVersion}+${this.jobMatch.promptVersion}`
          : this.ats.promptVersion,
        latencyMs: Date.now() - startedAt,
      });
      this.logger.log(
        `Resume analysis ${record.id} saved for student ${studentId}: score ${general.overallScore}${match ? `, job match ${match.score}` : ''} in ${Date.now() - startedAt}ms`,
      );
      return this.toAnalysis(record);
    } catch (error) {
      if (error instanceof AnalysisFailedError) {
        this.logger.warn(`Resume analysis failed for student ${studentId}: ${error.errorClass}`);
        const status = error.errorClass === 'RATE_LIMITED' ? HttpStatus.TOO_MANY_REQUESTS : HttpStatus.BAD_GATEWAY;
        throw new HttpException(analysisFailureMessage(error.errorClass), status);
      }
      if (error instanceof InsufficientAnalysisError) {
        this.logger.warn(`Resume analysis for student ${studentId} returned unusable feedback`);
        throw new BadGatewayException(analysisFailureMessage('INSUFFICIENT_OUTPUT'));
      }
      throw error;
    } finally {
      this.inFlight.delete(studentId);
    }
  }

  async listAnalyses(studentId: string): Promise<ResumeAnalysisSummary[]> {
    const rows = await this.analysisModel
      .find({ studentId })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('fileName fileType overallScore targetRole jobMatch.score jobMatch.jobTitle jobDescriptionExcerpt categories createdAt')
      .lean()
      .exec();
    return rows.map((row: any) => ({
      id: String(row._id),
      fileName: row.fileName,
      fileType: row.fileType,
      overallScore: row.overallScore,
      targetRole: row.targetRole,
      jobMatchScore: row.jobMatch?.score ?? null,
      jobTitle: row.jobMatch?.jobTitle ?? null,
      jobDescriptionExcerpt: row.jobDescriptionExcerpt ?? null,
      categories: (row.categories ?? []).map((c: any) => ({ key: c.key, label: c.label, score: c.score })),
      createdAt: new Date(row.createdAt).toISOString(),
    }));
  }

  async getAnalysis(studentId: string, id: string): Promise<ResumeAnalysis> {
    const record = await this.analysisModel.findOne({ _id: id, studentId }).exec();
    if (!record) throw new NotFoundException('Analysis not found.');
    return this.toAnalysis(record);
  }

  async deleteAnalysis(studentId: string, id: string): Promise<{ deleted: true }> {
    const result = await this.analysisModel.deleteOne({ _id: id, studentId }).exec();
    if (!result.deletedCount) throw new NotFoundException('Analysis not found.');
    this.logger.log(`Resume analysis ${id} deleted by student ${studentId}`);
    return { deleted: true };
  }

  /* ───────────── Helpers ───────────── */

  private checkRateLimit(studentId: string) {
    const hourAgo = Date.now() - 60 * 60 * 1000;
    const runs = (this.recentRuns.get(studentId) ?? []).filter((t) => t > hourAgo);
    if (runs.length >= this.hourlyLimit) {
      throw new HttpException(
        `You can run up to ${this.hourlyLimit} analyses an hour. Please try again later.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    runs.push(Date.now());
    this.recentRuns.set(studentId, runs);
  }

  private toStoredResume(resume: Resume): StoredResume {
    return {
      id: resume.id,
      fileName: resume.fileName,
      fileType: resume.fileType,
      size: resume.size,
      pageCount: resume.pageCount ?? null,
      wordCount: resume.wordCount,
      extractionMethod: resume.extractionMethod,
      uploadedAt: (resume.updatedAt ?? resume.createdAt).toISOString(),
    };
  }

  private toAnalysis(record: ResumeAnalysisRecord): ResumeAnalysis {
    return {
      id: record.id,
      resumeId: record.resumeId,
      fileName: record.fileName,
      fileType: record.fileType,
      overallScore: record.overallScore,
      targetRole: record.targetRole,
      targetRoleInferred: record.targetRoleInferred,
      summary: record.summary,
      categories: record.categories,
      strengths: record.strengths,
      weaknesses: record.weaknesses,
      missingSkills: record.missingSkills,
      missingKeywords: record.missingKeywords,
      formattingIssues: record.formattingIssues,
      grammarIssues: record.grammarIssues,
      weakBullets: record.weakBullets,
      sectionFeedback: record.sectionFeedback,
      recommendations: record.recommendations,
      signals: record.signals,
      jobMatch: record.jobMatch ?? null,
      jobDescriptionExcerpt: record.jobDescriptionExcerpt ?? null,
      model: record.aiModel,
      promptVersion: record.promptVersion,
      createdAt: record.createdAt.toISOString(),
    };
  }
}

/** Keeps a readable display name without path parts or control characters. */
export function sanitizeFileName(name: string): string {
  // oxlint-disable-next-line no-control-regex -- strips control bytes from file names
  const base = (name.split(/[\\/]/).pop() || 'resume').replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '').trim();
  return (base || 'resume').slice(0, 150);
}

function excerpt(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > EXCERPT_CHARS ? `${flat.slice(0, EXCERPT_CHARS - 1).trimEnd()}…` : flat;
}
