import { Test, TestingModule } from '@nestjs/testing';
import { SkillsService } from './skills.service.js';
import { getModelToken } from '@nestjs/mongoose';
import { Skill } from './schemas/skill.schema.js';
import { SkillCluster } from './schemas/skill-cluster.schema.js';
import { SkillClaim } from './schemas/skill-claim.schema.js';
import { StudentSkillProfile } from './schemas/student-skill-profile.schema.js';
import { SkillNormalizationService } from './skill-normalization.service.js';
import { Types } from 'mongoose';

describe('SkillsService', () => {
  let service: SkillsService;

  const mockSkillModel = { find: vi.fn(), findOne: vi.fn() };
  const mockSkillClusterModel = { find: vi.fn() };
  const mockSkillClaimModel = { findOneAndUpdate: vi.fn() };
  const mockProfileModel = { findOne: vi.fn() };
  const mockNormalizationService = { normalizeSkill: vi.fn() };

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
});
