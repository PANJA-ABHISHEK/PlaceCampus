import { Test, TestingModule } from '@nestjs/testing';
import { SkillsService } from './skills.service.js';
import { getModelToken } from '@nestjs/mongoose';
import { Skill } from './schemas/skill.schema.js';
import { SkillCluster } from './schemas/skill-cluster.schema.js';
import { SkillClaim } from './schemas/skill-claim.schema.js';
import { StudentSkillProfile } from './schemas/student-skill-profile.schema.js';
import { SkillNormalizationService } from './skill-normalization.service.js';
import { Types } from 'mongoose';
import { AuditService } from '../audit/audit.service.js';
import { Evidence } from '../evidence/schemas/evidence.schema.js';
import { VerificationRecord } from '../verification/schemas/verification-record.schema.js';

describe('SkillsService', () => {
  let service: SkillsService;

  const mockSkillModel = { find: vi.fn(), findOne: vi.fn() };
  const mockSkillClusterModel = { find: vi.fn() };
  const mockSkillClaimModel = { findOneAndUpdate: vi.fn() };
  const mockProfileModel = { findOne: vi.fn() };
  const mockNormalizationService = { normalizeSkill: vi.fn() };
  const mockEvidenceModel = { find: vi.fn() };
  const mockRecordModel = { find: vi.fn() };
  const query = (rows: unknown) => {
    const q: any = { select: () => q, sort: () => q, lean: () => q, exec: vi.fn().mockResolvedValue(rows) };
    return q;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillsService,
        { provide: getModelToken(Skill.name), useValue: mockSkillModel },
        {
          provide: getModelToken(SkillCluster.name),
          useValue: mockSkillClusterModel,
        },
        {
          provide: getModelToken(SkillClaim.name),
          useValue: mockSkillClaimModel,
        },
        {
          provide: getModelToken(StudentSkillProfile.name),
          useValue: mockProfileModel,
        },
        {
          provide: SkillNormalizationService,
          useValue: mockNormalizationService,
        },
        { provide: AuditService, useValue: { logAction: vi.fn() } },
        { provide: getModelToken(Evidence.name), useValue: mockEvidenceModel },
        { provide: getModelToken(VerificationRecord.name), useValue: mockRecordModel },
      ],
    }).compile();

    service = module.get<SkillsService>(SkillsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processVerifiedEvidence', () => {
    it('should ignore evidence that is not VERIFIED', async () => {
      const evidence = {
        _id: new Types.ObjectId(),
        status: 'NEEDS_REVIEW',
      } as any;
      const record = { _id: new Types.ObjectId() } as any;

      await service.processVerifiedEvidence(evidence, record);

      expect(mockNormalizationService.normalizeSkill).not.toHaveBeenCalled();
    });

    it('should aggregate verified skills to student profile', async () => {
      const studentId = new Types.ObjectId();
      const evidenceId = new Types.ObjectId();
      const evidence = {
        _id: evidenceId,
        studentId,
        status: 'VERIFIED',
        type: 'CERTIFICATE',
      } as any;
      const record = {
        _id: new Types.ObjectId(),
        aiResult: { claimedSkills: ['React'] },
      } as any;

      const canonicalSkill = { _id: new Types.ObjectId(), name: 'React' };
      mockNormalizationService.normalizeSkill.mockResolvedValue(canonicalSkill);

      mockSkillClaimModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue({}),
      });

      const mockSave = vi.fn();
      mockProfileModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          studentId,
          skills: [],
          save: mockSave,
        }),
      });

      await service.processVerifiedEvidence(evidence, record);

      expect(mockNormalizationService.normalizeSkill).toHaveBeenCalledWith(
        'React',
      );
      expect(mockSkillClaimModel.findOneAndUpdate).toHaveBeenCalled();
      expect(mockSave).toHaveBeenCalled();
    });

    it('should preserve idempotency when same evidence processes multiple times', async () => {
      const studentId = new Types.ObjectId();
      const evidenceId = new Types.ObjectId();
      const evidence = {
        _id: evidenceId,
        studentId,
        status: 'VERIFIED',
        type: 'CERTIFICATE',
      } as any;
      const record = {
        _id: new Types.ObjectId(),
        aiResult: { claimedSkills: ['React'] },
      } as any;

      const canonicalSkillId = new Types.ObjectId();
      const canonicalSkill = { _id: canonicalSkillId, name: 'React' };
      mockNormalizationService.normalizeSkill.mockResolvedValue(canonicalSkill);

      mockSkillClaimModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue({}),
      });

      // Profile already has this skill from this evidence
      const mockSave = vi.fn();
      const existingProfile = {
        studentId,
        skills: [
          {
            skillId: canonicalSkillId,
            canonicalName: 'React',
            level: 1,
            sourceEvidenceIds: [evidenceId],
          },
        ],
        save: mockSave,
      };

      mockProfileModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(existingProfile),
      });

      await service.processVerifiedEvidence(evidence, record);

      // Save shouldn't add duplicate source evidence IDs
      expect(existingProfile.skills[0].sourceEvidenceIds).toHaveLength(1);
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('getStudentProfile', () => {
    const id = () => new Types.ObjectId();
    const [cert, project, internship, hackathon, inReview] = [id(), id(), id(), id(), id()];
    const [react, sql, docker, python, aws] = [id(), id(), id(), id(), id()];
    const verified = (skillId: Types.ObjectId, name: string, sources: Types.ObjectId[]) => ({
      skillId, canonicalName: name, level: 1, verificationStatus: 'VERIFIED', sourceEvidenceIds: sources,
    });

    beforeEach(() => {
      mockProfileModel.findOne.mockReturnValue(
        query({
          studentId: 'student-1',
          skills: [
            verified(react, 'React', [cert, project]),
            verified(sql, 'SQL', [internship]),
            verified(docker, 'Docker', [hackathon]),
          ],
        }),
      );
      mockEvidenceModel.find.mockReturnValue(
        query([
          { _id: cert, type: 'CERTIFICATION', status: 'VERIFIED' },
          { _id: project, type: 'PROJECT', status: 'VERIFIED' },
          { _id: internship, type: 'INTERNSHIP', status: 'VERIFIED' },
          { _id: hackathon, type: 'HACKATHON', status: 'VERIFIED' },
          { _id: inReview, type: 'CODING_PROFILE', status: 'NEEDS_REVIEW' },
        ]),
      );
      // The in-review evidence claims Python (new) and React (already verified).
      mockRecordModel.find.mockReturnValue(
        query([{ evidenceId: inReview, aiResult: { claimedSkills: ['python', 'React', 'AWS'] } }]),
      );
      mockNormalizationService.normalizeSkill.mockImplementation(async (claim: string) => {
        const map: Record<string, unknown> = {
          python: { _id: python, name: 'Python' },
          React: { _id: react, name: 'React' },
          AWS: { _id: aws, name: 'AWS' },
        };
        return map[claim] ?? null;
      });
    });

    it('assembles skills from four evidence types and lists the types', async () => {
      const profile: any = await service.getStudentProfile('student-1');
      expect(profile.evidenceTypes).toEqual(['CERTIFICATION', 'HACKATHON', 'INTERNSHIP', 'PROJECT']);
      const reactEntry = profile.skills.find((s: any) => s.canonicalName === 'React');
      expect(reactEntry.sourceTypes).toEqual(['CERTIFICATION', 'PROJECT']);
    });

    it('shows skills claimed by evidence in review as UNVERIFIED without touching verified ones', async () => {
      const profile: any = await service.getStudentProfile('student-1');
      const status = Object.fromEntries(profile.skills.map((s: any) => [s.canonicalName, s.verificationStatus]));
      expect(status).toEqual({
        React: 'VERIFIED', SQL: 'VERIFIED', Docker: 'VERIFIED', Python: 'UNVERIFIED', AWS: 'UNVERIFIED',
      });
      const pythonEntry = profile.skills.find((s: any) => s.canonicalName === 'Python');
      expect(pythonEntry.sourceTypes).toEqual(['CODING_PROFILE']);
      // Pending types are not counted as evidence behind verified skills.
      expect(profile.evidenceTypes).not.toContain('CODING_PROFILE');
    });

    it('returns an empty profile for a student with no evidence', async () => {
      mockProfileModel.findOne.mockReturnValue(query(null));
      mockEvidenceModel.find.mockReturnValue(query([]));
      const profile: any = await service.getStudentProfile('student-2');
      expect(profile).toMatchObject({ studentId: 'student-2', skills: [], evidenceTypes: [] });
    });
  });
});
