import { Types } from 'mongoose';
import { MatchingService } from './matching.service.js';
import { MatchingEngine } from './engine/matching.engine.js';

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
  return new MatchingService(new MatchingEngine(), drivesService as any, skillsService as any);
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
