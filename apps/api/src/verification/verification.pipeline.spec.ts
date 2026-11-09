import * as path from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EvidenceStatus, EvidenceType } from '@placecampus/shared-types';
import { VerificationProcessor } from './verification.processor.js';
import { VerificationService } from './verification.service.js';
import { DocumentExtractorService } from './providers/document-extractor.service.js';
import { AiAnalysisService } from './ai/ai-analysis.service.js';
import { AiAnalysis, AiAnalysisSchema } from './schemas/ai-analysis.schema.js';
import { Skill, SkillSchema } from '../skills/schemas/skill.schema.js';
import { VerificationEngineService } from './providers/verification-engine.service.js';
import { ExtractionStoreService } from './extraction-store.service.js';
import { VerificationRecord, VerificationRecordSchema } from './schemas/verification-record.schema.js';
import { EvidenceExtraction, EvidenceExtractionSchema } from './schemas/evidence-extraction.schema.js';
import { Evidence, EvidenceSchema } from '../evidence/schemas/evidence.schema.js';
import { EvidenceService } from '../evidence/evidence.service.js';
import { StorageService } from '../storage/storage.service.js';

/**
 * End-to-end run of the verification job against a real MongoDB:
 * extraction (text layer + OCR) -> stored extraction -> fingerprint duplicates
 * -> rules -> verification record -> evidence status.
 *
 *   MONGO_TEST_URI=mongodb://localhost:27999/pc_ocr_test pnpm vitest run verification.pipeline
 *
 * Skipped when MONGO_TEST_URI is not set. Never point it at a shared database:
 * the test drops its database.
 */
const MONGO_TEST_URI = process.env.MONGO_TEST_URI;
const describeDb = MONGO_TEST_URI && process.env.SKIP_OCR_TESTS !== 'true' ? describe : describe.skip;
const FIXTURES = path.resolve(process.cwd(), 'test/fixtures/ocr');

describeDb('verification pipeline (MongoDB + OCR)', () => {
  let moduleRef: TestingModule;
  let processor: VerificationProcessor;
  let evidenceModel: Model<Evidence>;
  let recordModel: Model<VerificationRecord>;
  let extractionModel: Model<EvidenceExtraction>;
  const statusUpdates: { id: string; status: string }[] = [];

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ ignoreEnvFile: true, isGlobal: true }),
        MongooseModule.forRoot(MONGO_TEST_URI!),
        MongooseModule.forFeature([
          { name: VerificationRecord.name, schema: VerificationRecordSchema },
          { name: EvidenceExtraction.name, schema: EvidenceExtractionSchema },
          { name: Evidence.name, schema: EvidenceSchema },
          { name: AiAnalysis.name, schema: AiAnalysisSchema },
          { name: Skill.name, schema: SkillSchema },
        ]),
      ],
      providers: [
        VerificationProcessor,
        VerificationService,
        DocumentExtractorService,
        AiAnalysisService,
        VerificationEngineService,
        ExtractionStoreService,
        {
          provide: EvidenceService,
          useFactory: (model: Model<Evidence>) => ({
            findOne: (id: string, studentId: string) => model.findOne({ _id: id, studentId }).exec(),
            updateVerificationResult: async (id: string, _studentId: string, status: string) => {
              statusUpdates.push({ id, status });
              await model.updateOne({ _id: id }, { status });
            },
          }),
          inject: [getModelToken(Evidence.name)],
        },
        { provide: StorageService, useValue: { getFilePath: async (key: string) => path.join(FIXTURES, key) } },
      ],
    }).compile();
    await moduleRef.init();

    processor = moduleRef.get(VerificationProcessor);
    evidenceModel = moduleRef.get(getModelToken(Evidence.name));
    recordModel = moduleRef.get(getModelToken(VerificationRecord.name));
    extractionModel = moduleRef.get(getModelToken(EvidenceExtraction.name));
    await evidenceModel.db.dropDatabase();
  }, 60_000);

  afterAll(async () => {
    if (!moduleRef) return;
    await evidenceModel.db.dropDatabase();
    await moduleRef.close();
  });

  async function submit(studentId: string, file: string, mimeType: string) {
    const evidence = await evidenceModel.create({
      studentId,
      title: 'Advanced React and TypeScript',
      type: EvidenceType.CERTIFICATION,
      status: EvidenceStatus.PROCESSING,
      document: { id: `file-${Date.now()}`, originalName: file, mimeType, size: 1, key: file },
    });
    await processor.handleVerification({ data: { evidenceId: evidence.id, studentId, documentKey: file } } as any);
    const record = await recordModel.findOne({ evidenceId: evidence.id }).lean().exec();
    const extraction = await extractionModel.findOne({ evidenceId: evidence.id }).lean().exec();
    return { evidence, record: record!, extraction: extraction! };
  }

  let first: Awaited<ReturnType<typeof submit>>;
  let second: Awaited<ReturnType<typeof submit>>;

  it('OCRs a scanned PDF and stores the extraction with the record', async () => {
    first = await submit('student-a', 'scanned.pdf', 'application/pdf');

    expect(first.extraction).toMatchObject({ method: 'OCR', status: 'COMPLETED', version: 1, pageCount: 1 });
    expect(first.extraction.text).toMatch(/Advanced React and TypeScript/i);
    expect(first.extraction.ocrConfidence).toBeGreaterThan(80);
    expect(first.extraction.fileSha256).toMatch(/^[a-f0-9]{64}$/);

    expect(first.record).toMatchObject({
      extractionMethod: 'OCR',
      extractionStatus: 'COMPLETED',
      extractionId: first.extraction._id.toString(),
      finalDecision: EvidenceStatus.NEEDS_REVIEW,
    });
    expect(first.record.extractedTextMetadata.ocrConfidence).toBeGreaterThan(80);
    expect(first.record.duplicateMatches).toBeUndefined();
    expect(first.record.ruleResults.checks.possibleDuplicate).toBeUndefined();
    expect(statusUpdates).toContainEqual({ id: first.evidence.id, status: EvidenceStatus.NEEDS_REVIEW });
  }, 120_000);

  it('flags the same file submitted by another student as an exact duplicate', async () => {
    second = await submit('student-b', 'scanned.pdf', 'application/pdf');
    expect(second.record.duplicateMatches).toEqual([
      { evidenceId: first.evidence.id, matchType: 'FILE', sameStudent: false },
    ]);
    expect(second.record.ruleResults.checks.duplicateMatchType).toBe('FILE');
    expect(second.record.reasons[0]).toMatch(/same file/);
  }, 120_000);

  it('detects a re-scanned photo of the same certificate by its text', async () => {
    const photo = await submit('student-a', 'certificate.png', 'image/png');
    expect(photo.extraction.method).toBe('OCR');
    const matches = photo.record.duplicateMatches ?? [];
    expect(matches).toHaveLength(2);
    expect(matches.every((m) => m.matchType === 'TEXT')).toBe(true);
    expect(matches.find((m) => m.evidenceId === first.evidence.id)?.sameStudent).toBe(true);
    expect(photo.record.reasons[0]).toMatch(/text matches/);
  }, 120_000);

  it('ignores deleted evidence when matching duplicates', async () => {
    await evidenceModel.deleteMany({ _id: { $in: [first.evidence._id, second.evidence._id] } });
    await evidenceModel.deleteMany({ 'document.key': 'certificate.png' });
    const again = await submit('student-c', 'scanned.pdf', 'application/pdf');
    expect(again.record.duplicateMatches).toBeUndefined();
  }, 120_000);

  it('uses PDF text without OCR for a text PDF and numbers re-runs as new versions', async () => {
    const text = await submit('student-d', 'text.pdf', 'application/pdf');
    expect(text.extraction).toMatchObject({ method: 'PDF_TEXT', status: 'COMPLETED', ocrConfidence: null });

    // Re-run the same evidence (resubmission): version 2, and it does not match itself.
    await evidenceModel.updateOne({ _id: text.evidence._id }, { status: EvidenceStatus.PROCESSING });
    await processor.handleVerification({
      data: { evidenceId: text.evidence.id, studentId: 'student-d', documentKey: 'text.pdf' },
    } as any);
    const versions = await extractionModel.find({ evidenceId: text.evidence.id }).sort({ version: 1 }).lean().exec();
    expect(versions.map((v) => v.version)).toEqual([1, 2]);
    const latest = await recordModel.findOne({ evidenceId: text.evidence.id }).sort({ attemptNumber: -1 }).lean().exec();
    expect(latest!.attemptNumber).toBe(2);
    expect(latest!.duplicateMatches).toBeUndefined();
  }, 120_000);

  it('routes a blank scan to review as unreadable', async () => {
    const blank = await submit('student-e', 'blank.png', 'image/png');
    expect(blank.record.ruleResults.checks.insufficientText).toBe(true);
    expect(blank.record.reasons[0]).toMatch(/Too little text/);
  }, 120_000);

  it('hides duplicate matches and extraction ids from the student view', async () => {
    const service = moduleRef.get(VerificationService);
    const fresh = await submit('student-f', 'scanned.pdf', 'application/pdf');
    await submit('student-g', 'scanned.pdf', 'application/pdf');
    const own: any = await service.getLatestRecord(fresh.evidence.id, 'student-f');
    expect(own.extractionMethod).toBe('OCR');
    expect(own.extractedTextMetadata.ocrConfidence).toBeGreaterThan(80);
    expect(own.duplicateMatches).toBeUndefined();
    expect(own.extractionId).toBeUndefined();

    const dupe = await recordModel.findOne({ studentId: 'student-g' }).lean().exec();
    expect(dupe!.duplicateMatches).toContainEqual({ evidenceId: fresh.evidence.id, matchType: 'FILE', sameStudent: false });
    const dupeView: any = await service.getLatestRecord(dupe!.evidenceId, 'student-g');
    expect(dupeView.duplicateMatches).toBeUndefined();
    expect(dupeView.reasons[0]).not.toMatch(fresh.evidence.id);
  }, 120_000);
});
