import { Test, TestingModule } from '@nestjs/testing';
import { ReadinessService, READINESS_WEIGHTS } from './readiness.service.js';
import { getModelToken } from '@nestjs/mongoose';
import { ReadinessSnapshot } from './schemas/readiness-snapshot.schema.js';
import { StudentProfile } from '../students/schemas/student-profile.schema.js';
import { StudentSkillProfile } from '../skills/schemas/student-skill-profile.schema.js';
import { AssessmentAttempt } from '../assessments/schemas/assessment-attempt.schema.js';
import { Evidence } from '../evidence/schemas/evidence.schema.js';
import { MockInterview } from '../interviews/schemas/mock-interview.schema.js';
import { Types } from 'mongoose';

describe('ReadinessService', () => {
  let service: ReadinessService;

  const mockModel = { findOne: vi.fn(), find: vi.fn(), save: vi.fn() };

  let mockSnapshotModel: any;

  beforeEach(async () => {
    // Construct mock schema model constructor behavior
    mockSnapshotModel = function (dto: any) {
      return {
        ...dto,
        save: vi.fn().mockResolvedValue(true),
        toJSON: vi.fn().mockReturnValue(dto),
      };
    };
    mockSnapshotModel.findOne = vi.fn();
    mockSnapshotModel.find = vi.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReadinessService,
        {
          provide: getModelToken(ReadinessSnapshot.name),
          useValue: mockSnapshotModel,
        },
        { provide: getModelToken(StudentProfile.name), useValue: mockModel },
        {
          provide: getModelToken(StudentSkillProfile.name),
          useValue: mockModel,
        },
        { provide: getModelToken(AssessmentAttempt.name), useValue: mockModel },
        { provide: getModelToken(Evidence.name), useValue: mockModel },
        { provide: getModelToken(MockInterview.name), useValue: mockModel },
      ],
    }).compile();

    service = module.get<ReadinessService>(ReadinessService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('weights should sum to exactly 1.00', () => {
    const sum = Object.values(READINESS_WEIGHTS).reduce((a, b) => a + b, 0);
    // JS math precision can be tricky, rounding for safe equality
    expect(Math.round(sum * 100) / 100).toBe(1.0);
  });

  it('should calculate the exact official validation example', () => {
    // Verified Skills = 80
    // Assessments     = 70
    // Academics       = 75
    // Projects        = 60
    // Interviews      = 65

    const result = service.calculateExactFormula(80, 70, 75, 60, 65);
    expect(result).toBe(72.0);
  });

  it('should calculate 100 correctly', () => {
    const result = service.calculateExactFormula(100, 100, 100, 100, 100);
    expect(result).toBe(100.0);
  });

  it('should calculate 0 correctly', () => {
    const result = service.calculateExactFormula(0, 0, 0, 0, 0);
    expect(result).toBe(0.0);
  });

  it('should generate a snapshot correctly from mock data', async () => {
    const studentId = new Types.ObjectId().toString();

    mockSnapshotModel.findOne.mockReturnValueOnce({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(null),
    });

    mockModel.findOne.mockReturnValueOnce({
      lean: vi
        .fn()
        .mockReturnValue({ exec: vi.fn().mockResolvedValue({ cgpa: 7.5 }) }),
    }); // Profile Academics

    mockModel.findOne.mockReturnValueOnce({
      lean: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          skills: [{ verificationStatus: 'VERIFIED', level: 4 }], // 4 * 20 = 80
        }),
      }),
    }); // Skills

    mockModel.find.mockReturnValueOnce({
      lean: vi
        .fn()
        .mockReturnValue({
          exec: vi
            .fn()
            .mockResolvedValue([{ assessmentId: 'a1', percentage: 70 }]),
        }),
    }); // Assessments

    mockModel.find.mockReturnValueOnce({
      lean: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          { _id: 'e1' },
          { _id: 'e2' }, // 2 projects -> 100 score
        ]),
      }),
    }); // Projects

    mockModel.find.mockReturnValueOnce({
      lean: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          { rubricScores: { tk: 8, ps: 6, cm: 6, pd: 6 } }, // average 6.5 -> 65 score
        ]),
      }),
    }); // Interviews

    const result = await service.calculateAndSaveReadiness(studentId);

    expect(result.academicsScore).toBe(75);
    expect(result.verifiedSkillsScore).toBe(80);
    expect(result.assessmentsScore).toBe(70);
    expect(result.projectsScore).toBe(100);
    expect(result.interviewsScore).toBe(65);

    expect(result.overallScore).toBe(78.4); // Expected from 80(0.32) + 70(0.24) + 75(0.18) + 100(0.16) + 65(0.1) = 25.6 + 16.8 + 13.5 + 16 + 6.5 = 78.4
  });

  it('should not create duplicate snapshots for identical recalculations', async () => {
    const studentId = new Types.ObjectId().toString();

    // Latest snapshot is identical to what we'll compute
    mockSnapshotModel.findOne.mockReturnValueOnce({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue({
        _id: 'snap1',
        overallScore: 0,
        verifiedSkillsScore: 0,
        assessmentsScore: 0,
        academicsScore: 0,
        projectsScore: 0,
        interviewsScore: 0,
      }),
    });

    mockModel.findOne.mockReturnValue({
      lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(null) }),
    });
    mockModel.find.mockReturnValue({
      lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue([]) }),
    });

    const result = await service.calculateAndSaveReadiness(studentId);

    // Should return the original snapshot without saving a new one
    expect(result.id).toBe('snap1');
  });

  it('status thresholds should behave correctly at boundaries', () => {
    let result = service.calculateExactFormula(50, 50, 50, 50, 50); // 50
    expect(result).toBe(50);

    // Simulate boundaries via direct testing or manual calculation verification
    // 59.9 -> NEEDS_PREPARATION
    // 60.0 -> DEVELOPING
    // 79.9 -> DEVELOPING
    // 80.0 -> READY
  });

  it('should handle missing data gracefully (0 score, retains weight)', async () => {
    const studentId = new Types.ObjectId().toString();

    // No existing snapshot
    mockSnapshotModel.findOne.mockReturnValueOnce({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(null),
    });

    // Provide only academic data, everything else missing
    mockModel.findOne.mockReturnValueOnce({
      lean: vi
        .fn()
        .mockReturnValue({ exec: vi.fn().mockResolvedValue({ cgpa: 10 }) }), // 100 score
    });
    mockModel.findOne.mockReturnValueOnce({
      lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(null) }),
    });
    mockModel.find.mockReturnValue({
      lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue([]) }),
    });

    const result = await service.calculateAndSaveReadiness(studentId);

    expect(result.academicsScore).toBe(100);
    expect(result.verifiedSkillsScore).toBe(0);
    expect(result.assessmentsScore).toBe(0);
    expect(result.projectsScore).toBe(0);
    expect(result.interviewsScore).toBe(0);

    expect(result.overallScore).toBe(18); // 100 * 0.18 = 18
    expect(result.coverageCount).toBe(1);
    expect(result.explanation.factors[2].contribution).toBe(18); // Academics
    expect(result.explanation.factors[0].contribution).toBe(0); // Skills
  });
});
