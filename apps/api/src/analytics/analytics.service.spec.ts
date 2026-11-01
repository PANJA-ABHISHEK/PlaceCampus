import { BadRequestException } from '@nestjs/common';
import { ApplicationStatus, EvidenceStatus } from '@placecampus/shared-types';
import { AnalyticsService } from './analytics.service.js';

const query = (value: unknown) => ({ exec: vi.fn().mockResolvedValue(value) });

function makeModel() {
  return {
    countDocuments: vi.fn().mockReturnValue(query(0)),
    aggregate: vi.fn().mockReturnValue(query([])),
    find: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockReturnValue(query([])) }) }),
  };
}

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let userModel: ReturnType<typeof makeModel>;
  let profileModel: ReturnType<typeof makeModel>;
  let skillProfileModel: ReturnType<typeof makeModel>;
  let readinessModel: ReturnType<typeof makeModel>;
  let driveModel: ReturnType<typeof makeModel>;
  let applicationModel: ReturnType<typeof makeModel>;
  let evidenceModel: ReturnType<typeof makeModel>;
  let preparationModel: ReturnType<typeof makeModel>;

  beforeEach(() => {
    userModel = makeModel();
    profileModel = makeModel();
    skillProfileModel = makeModel();
    readinessModel = makeModel();
    driveModel = makeModel();
    applicationModel = makeModel();
    evidenceModel = makeModel();
    preparationModel = makeModel();
    service = new AnalyticsService(
      userModel as any,
      profileModel as any,
      skillProfileModel as any,
      readinessModel as any,
      driveModel as any,
      applicationModel as any,
      evidenceModel as any,
      preparationModel as any,
    );
  });

  it('selects one latest readiness snapshot per student and preserves thresholds', async () => {
    readinessModel.aggregate.mockReturnValue(query([
      { overallScore: 90, status: 'READY', coverageCount: 5, profile: { department: 'CSE', graduationYear: 2026 }, explanation: { factors: [] } },
      { overallScore: 50, status: 'NEEDS_PREPARATION', coverageCount: 3, profile: { department: 'ECE', graduationYear: 2025 }, explanation: { factors: [] } },
    ]));

    const result = await service.getReadiness({});

    expect(result.studentsWithSnapshots).toBe(2);
    expect(result.mean).toBe(70);
    expect(result.median).toBe(70);
    expect(result.byStatus).toEqual(expect.arrayContaining([
      { status: 'READY', count: 1 },
      { status: 'NEEDS_PREPARATION', count: 1 },
    ]));
    expect(result.coverage.studentsMissingFactors).toBe(1);
  });

  it('returns safe empty overview metrics and validates date ordering', async () => {
    userModel.countDocuments.mockReturnValue(query(0));
    profileModel.countDocuments.mockReturnValue(query(0));
    readinessModel.aggregate.mockReturnValue(query([]));
    driveModel.countDocuments.mockReturnValue(query(0));
    applicationModel.aggregate.mockReturnValue(query([]));
    evidenceModel.aggregate.mockReturnValue(query([]));
    preparationModel.countDocuments.mockReturnValue(query(0));

    const result = await service.getOverview({});
    expect(result.students.registered).toBe(0);
    expect(result.readiness.average).toBeNull();
    expect(result.applicationsByStatus).toEqual({});

    await expect(service.getOverview({ from: '2027-01-02', to: '2027-01-01' })).rejects.toThrow(BadRequestException);
  });

  it('counts verified canonical skill supply separately from required and optional demand', async () => {
    driveModel.aggregate.mockReturnValue(query([
      { _id: 'skill-1', skillName: 'React', driveIds: ['drive-1'], requiredDemand: 2, optionalDemand: 1, requiredLevels: [3, 4] },
    ]));
    skillProfileModel.aggregate.mockReturnValue(query([
      { _id: 'skill-1', students: [{ id: 'student-1', level: 4 }, { id: 'student-2', level: 2 }] },
    ]));

    const result = await service.getSkills({});

    expect(result.skills[0]).toMatchObject({
      requiredDemand: 2,
      optionalDemand: 1,
      verifiedStudents: 2,
      studentsMeetingRequiredLevel: 1,
      supplyGap: 1,
    });
    expect(skillProfileModel.aggregate).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ $match: { 'skills.verificationStatus': 'VERIFIED' } }),
    ]));
  });

  it('uses all stored evidence as the denominator for verified percentage', async () => {
    evidenceModel.countDocuments
      .mockReturnValueOnce(query(4))
      .mockReturnValueOnce(query(1));
    evidenceModel.aggregate
      .mockReturnValueOnce(query([{ _id: EvidenceStatus.VERIFIED, count: 1 }]))
      .mockReturnValueOnce(query([]));

    const result = await service.getEvidence({});

    expect(result.total).toBe(4);
    expect(result.verified).toBe(1);
    expect(result.verifiedPercentage).toBe(25);
  });

  it('reports current application statuses without inventing offer or placement states', async () => {
    applicationModel.aggregate
      .mockReturnValueOnce(query([{ _id: ApplicationStatus.APPLIED, count: 2 }, { _id: ApplicationStatus.SHORTLISTED, count: 1 }]))
      .mockReturnValueOnce(query([]))
      .mockReturnValueOnce(query([]))
      .mockReturnValueOnce(query([]));
    applicationModel.find.mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockReturnValue(query([])) }) });

    const result = await service.getPlacements({});

    expect(result.byStatus).toEqual(expect.arrayContaining([
      { status: ApplicationStatus.APPLIED, count: 2 },
      { status: ApplicationStatus.SHORTLISTED, count: 1 },
    ]));
    expect(result).not.toHaveProperty('offers');
  });
});
