import { Types } from 'mongoose';
import { MatchingService } from './matching.service.js';
import { MatchingEngine } from './engine/matching.engine.js';
import { EligibilityEngine } from '../eligibility/engine/eligibility.engine.js';

const js = new Types.ObjectId();
const sql = new Types.ObjectId();
const react = new Types.ObjectId();

const drive = (id: string, company: string, skills: any[]) => ({
  id, companyName: company, roleTitle: 'SDE', status: 'PUBLISHED',
  requirements: { skills },
});

function build(profileSkills: any[], drives: any[]) {
  const drivesService = { findAllForStudent: vi.fn().mockResolvedValue(drives) };
  const skillsService = {
    getStudentProfile: vi.fn().mockResolvedValue({ studentId: 's1', skills: profileSkills }),
    getAllSkills: vi.fn().mockResolvedValue([
      { id: String(js), name: 'JavaScript', clusterId: { name: 'Programming' } },
      { id: String(sql), name: 'SQL', clusterId: { name: 'Databases' } },
      { id: String(react), name: 'React' },
    ]),
  };
  return new MatchingService(
    new MatchingEngine(),
    drivesService as any,
    skillsService as any,
    {} as any,
    new EligibilityEngine(),
    ...([{}, {}, {}, {}, {}, {}] as [any, any, any, any, any, any]),
  );
}

describe('MatchingService.getSkillGapAnalysis', () => {
  it('matches verified skills stored as ObjectIds against string requirements', async () => {
    const service = build(
      [{ skillId: js, level: 3, verificationStatus: 'VERIFIED' }],
      [drive('d1', 'Acme', [{ skillId: String(js), minimumLevel: 2, isOptional: false }])],
    );
    const result = await service.getSkillGapAnalysis('s1');
    expect(result.gaps).toEqual([]);
    expect(result.requirementsMet).toBe(1);
    expect(result.sufficientData).toBe(true);
  });

  it('merges gaps per skill across drives with the strictest status, priority and level', async () => {
    const service = build(
      [{ skillId: js, level: 1, verificationStatus: 'VERIFIED' }],
      [
        drive('d1', 'Acme', [
          { skillId: String(js), minimumLevel: 2, isOptional: false },
          { skillId: String(sql), minimumLevel: 2, isOptional: false },
        ]),
        drive('d2', 'Globex', [
          { skillId: String(js), minimumLevel: 4, isOptional: false },
          { skillId: String(react), minimumLevel: 1, isOptional: true },
        ]),
      ],
    );
    const result = await service.getSkillGapAnalysis('s1');
    const bySkill = Object.fromEntries(result.gaps.map((g) => [g.skillName, g]));

    expect(bySkill.JavaScript).toMatchObject({
      status: 'BELOW_LEVEL', priority: 'HIGH', currentLevel: 1, requiredLevel: 4, gapLevel: 3, category: 'Programming',
    });
    expect(bySkill.JavaScript.drives.map((d: any) => d.companyName)).toEqual(['Acme', 'Globex']);
    expect(bySkill.SQL).toMatchObject({ status: 'MISSING', priority: 'HIGH', category: 'Databases' });
    expect(bySkill.React).toMatchObject({ status: 'OPTIONAL', priority: 'LOW' });
    expect(result.gaps.at(-1)?.skillName).toBe('React');
    expect(result.requirementsTotal).toBe(3);
    expect(result.requirementsMet).toBe(0);
    expect(result.drivesAnalyzed).toBe(2);
  });

  it('reports insufficient data when the student has no verified skills', async () => {
    const service = build(
      [{ skillId: js, level: 2, verificationStatus: 'UNVERIFIED' }],
      [drive('d1', 'Acme', [{ skillId: String(js), minimumLevel: 1, isOptional: false }])],
    );
    const result = await service.getSkillGapAnalysis('s1');
    expect(result.sufficientData).toBe(false);
    expect(result.verifiedSkillCount).toBe(0);
  });
});

/** A Mongoose-like model whose queries resolve to `rows`. */
const model = (rows: unknown, single?: unknown) => {
  const q = (value: unknown) => {
    const chain: any = { select: () => chain, sort: () => chain, lean: () => chain, exec: () => Promise.resolve(value) };
    return chain;
  };
  return { find: vi.fn(() => q(rows)), findById: vi.fn(() => q(single)), findOne: vi.fn(() => q(single)) };
};

describe('MatchingService.getDriveSummary (skill supply against demand)', () => {
  const ids = Array.from({ length: 5 }, () => String(new Types.ObjectId()));
  const realDrive = {
    _id: new Types.ObjectId(),
    companyName: 'Finvista Labs',
    roleTitle: 'Backend Engineer',
    status: 'PUBLISHED',
    applicationDeadline: new Date('2026-12-01'),
    requirements: {
      minimumCGPA: 7,
      skills: [
        { skillId: String(js), minimumLevel: 2, isOptional: false },
        { skillId: String(sql), minimumLevel: 1, isOptional: false },
        { skillId: String(react), minimumLevel: 1, isOptional: true },
      ],
    },
  };
  const v = (skillId: Types.ObjectId, level: number) => ({ skillId, level, verificationStatus: 'VERIFIED' });

  function summaryService() {
    const pendingEvidence = new Types.ObjectId();
    const deps = {
      users: model(ids.map((id) => ({ _id: id }))),
      // ids[4] is below the CGPA rule, so outside the drive's pool.
      profiles: model(ids.map((id, i) => ({ userId: id, cgpa: i === 4 ? 6 : 8 }))),
      skills: model([
        { studentId: ids[0], skills: [v(js, 3), v(sql, 2), v(react, 1)] },
        { studentId: ids[1], skills: [v(js, 1), v(sql, 1)] },
        { studentId: ids[2], skills: [v(sql, 1)] },
        { studentId: ids[4], skills: [v(js, 5), v(sql, 5)] },
      ]),
      applications: model([{ studentId: ids[0] }, { studentId: ids[1] }]),
      evidence: model([{ _id: pendingEvidence, studentId: ids[3] }]),
      records: model([{ evidenceId: pendingEvidence, aiResult: { claimedSkills: ['JavaScript'] } }]),
    };
    const service = new MatchingService(
      new MatchingEngine(),
      { findOne: vi.fn().mockResolvedValue(realDrive) } as any,
      { getAllSkills: vi.fn().mockResolvedValue([
        { id: String(js), name: 'JavaScript' }, { id: String(sql), name: 'SQL' }, { id: String(react), name: 'React' },
      ]) } as any,
      { normalizeSkill: vi.fn(async (c: string) => (c === 'JavaScript' ? { _id: js } : null)) } as any,
      new EligibilityEngine(),
      deps.users as any, deps.profiles as any, deps.skills as any,
      deps.applications as any, deps.evidence as any, deps.records as any,
    );
    return service;
  }

  it('counts verified supply per required skill over the drive pool', async () => {
    const report = await summaryService().getDriveSummary(String(realDrive._id));
    expect(report.poolSize).toBe(4);
    expect(report.applicants).toBe(2);
    const row = Object.fromEntries(report.skills.map((r) => [r.skillName, r]));
    expect(row.JavaScript).toMatchObject({ meetsLevel: 1, belowLevel: 1, missing: 2, pendingReview: 1, supplyRate: 25, supplyStatus: 'LIMITED', applicantsMeetingLevel: 1 });
    expect(row.SQL).toMatchObject({ meetsLevel: 3, missing: 1, supplyRate: 75, supplyStatus: 'ADEQUATE' });
    expect(row.React).toMatchObject({ isOptional: true, meetsLevel: 1 });
  });

  it('ranks shortages first and counts students meeting every required skill', async () => {
    const report = await summaryService().getDriveSummary(String(realDrive._id));
    expect(report.skills.map((r) => r.skillName)).toEqual(['JavaScript', 'SQL', 'React']);
    expect(report.shortages).toEqual(['JavaScript']);
    expect(report.meetingAllRequired).toBe(1);
    expect(report.fullyEligible).toBe(1);
    expect(report.drive).toMatchObject({ companyName: 'Finvista Labs', status: 'PUBLISHED' });
  });
});

describe('MatchingService.analyseForStaff', () => {
  const studentId = String(new Types.ObjectId());
  const staffService = (user: unknown) =>
    new MatchingService(
      new MatchingEngine(),
      { findOne: vi.fn().mockResolvedValue({
        _id: new Types.ObjectId(), companyName: 'Nexora', roleTitle: 'SDE', status: 'CLOSED',
        requirements: { skills: [
          { skillId: String(sql), minimumLevel: 3, isOptional: false },
          { skillId: String(js), minimumLevel: 2, isOptional: false },
          { skillId: String(react), minimumLevel: 1, isOptional: true },
        ] },
      }) } as any,
      {
        getStudentProfile: vi.fn().mockResolvedValue({ studentId, skills: [{ skillId: sql, level: 2, verificationStatus: 'VERIFIED' }] }),
        getAllSkills: vi.fn().mockResolvedValue([{ id: String(js), name: 'JavaScript' }, { id: String(sql), name: 'SQL' }, { id: String(react), name: 'React' }]),
      } as any,
      {} as any,
      new EligibilityEngine(),
      model([], user) as any,
      model([], { registrationNumber: 'R1', department: 'CSE' }) as any,
      {} as any, {} as any, {} as any, {} as any,
    );

  it('ranks gaps for any student against a closed drive, each with a next step', async () => {
    const result = await staffService({ fullName: 'Asha', role: 'student' }).analyseForStaff('d', studentId);
    expect(result.student).toMatchObject({ name: 'Asha', department: 'CSE' });
    expect(result.match.skills.map((s) => [s.skillName, s.rank])).toEqual([
      ['JavaScript', 1], ['SQL', 2], ['React', 3],
    ]);
    for (const gap of result.match.skills) expect(gap.recommendedAction).toContain(gap.skillName);
  });

  it('refuses ids that are not students', async () => {
    await expect(staffService({ fullName: 'Recruiter', role: 'recruiter' }).analyseForStaff('d', studentId)).rejects.toThrow('Student not found');
    await expect(staffService(null).analyseForStaff('d', studentId)).rejects.toThrow('Student not found');
  });
});
