import { Test, TestingModule } from '@nestjs/testing';
import { SkillNormalizationService } from './skill-normalization.service.js';
import { getModelToken } from '@nestjs/mongoose';
import { Skill } from './schemas/skill.schema.js';
import { SkillEquivalence } from './schemas/skill-equivalence.schema.js';
import { Types } from 'mongoose';

describe('SkillNormalizationService', () => {
  let service: SkillNormalizationService;

  const mockSkillModel = { findOne: vi.fn(), findById: vi.fn() };
  const mockEquivalenceModel = { findOne: vi.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillNormalizationService,
        { provide: getModelToken(Skill.name), useValue: mockSkillModel },
        {
          provide: getModelToken(SkillEquivalence.name),
          useValue: mockEquivalenceModel,
        },
      ],
    }).compile();

    service = module.get<SkillNormalizationService>(SkillNormalizationService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should resolve direct canonical match', async () => {
    const skill = { _id: new Types.ObjectId(), normalizedName: 'react' };
    mockSkillModel.findOne.mockReturnValueOnce({
      exec: vi.fn().mockResolvedValue(skill),
    });
    mockEquivalenceModel.findOne.mockReturnValueOnce({
      exec: vi.fn().mockResolvedValue(null),
    });

    const result = await service.normalizeSkill(' React ');

    expect(result).toBe(skill);
    expect(mockSkillModel.findOne).toHaveBeenCalledWith({
      normalizedName: 'react',
    });
  });

  it('should resolve synonym match and ignore false substring matches', async () => {
    mockSkillModel.findOne.mockReturnValueOnce({
      exec: vi.fn().mockResolvedValue(null),
    });
    const skill = { _id: new Types.ObjectId(), normalizedName: 'react' };
    mockSkillModel.findOne.mockReturnValueOnce({
      exec: vi.fn().mockResolvedValue(skill),
    });
    mockEquivalenceModel.findOne.mockReturnValueOnce({
      exec: vi.fn().mockResolvedValue(null),
    });

    const result = await service.normalizeSkill('ReactJS');

    expect(result).toBe(skill);
    // Ensure regex checks for exact string matching ^...$
    expect(mockSkillModel.findOne).toHaveBeenCalledWith({
      synonyms: { $regex: new RegExp(`^reactjs$`, 'i') },
    });
  });

  it('should resolve explicit equivalence', async () => {
    const aliasSkill = { _id: new Types.ObjectId(), normalizedName: 'reactjs' };
    const canonicalSkill = {
      _id: new Types.ObjectId(),
      normalizedName: 'react',
      active: true,
    };

    // First lookup for normalizedName fails
    mockSkillModel.findOne.mockReturnValueOnce({
      exec: vi.fn().mockResolvedValue(aliasSkill),
    });

    // Lookup for equivalence
    mockEquivalenceModel.findOne.mockReturnValueOnce({
      exec: vi.fn().mockResolvedValue({
        skillId1: aliasSkill._id,
        skillId2: canonicalSkill._id,
        relationshipType: 'EXACT_ALIAS',
        active: true,
      }),
    });

    // Fetch the equivalent canonical skill
    mockSkillModel.findById.mockReturnValueOnce({
      exec: vi.fn().mockResolvedValue(canonicalSkill),
    });

    const result = await service.normalizeSkill('reactjs');

    expect(result).toBe(canonicalSkill);
  });

  it('should return null for unknown skill', async () => {
    mockSkillModel.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue(null),
    });

    const result = await service.normalizeSkill('SomeUnknownSkill');

    expect(result).toBeNull();
  });
});
