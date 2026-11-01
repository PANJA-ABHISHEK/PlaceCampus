import { MatchingEngine } from './matching.engine.js';
import {
  StudentSkillProfile,
  PlacementDrive,
  Skill,
  DriveStatus,
  SkillMatchStatus,
  GapPriority,
} from '@placecampus/shared-types';

describe('MatchingEngine', () => {
  let engine: MatchingEngine;

  beforeEach(() => {
    engine = new MatchingEngine();
  });

  const getTaxonomy = (): Skill[] => [
    {
      id: 'java-id',
      name: 'Java',
      normalizedName: 'java',
      active: true,
      synonyms: [],
    },
    {
      id: 'dsa-id',
      name: 'DSA',
      normalizedName: 'dsa',
      active: true,
      synonyms: [],
    },
    {
      id: 'sql-id',
      name: 'SQL',
      normalizedName: 'sql',
      active: true,
      synonyms: [],
    },
    {
      id: 'react-id',
      name: 'React',
      normalizedName: 'react',
      active: true,
      synonyms: [],
    },
  ];

  const getSkillProfile = (): StudentSkillProfile => ({
    id: 'skill-profile-1',
    studentId: 'student-1',
    updatedAt: new Date().toISOString(),
    skills: [
      {
        skillId: 'java-id',
        canonicalName: 'Java',
        level: 4,
        verificationStatus: 'VERIFIED',
        sourceEvidenceIds: [],
        lastVerifiedAt: new Date().toISOString(),
      },
      {
        skillId: 'dsa-id',
        canonicalName: 'DSA',
        level: 3,
        verificationStatus: 'VERIFIED',
        sourceEvidenceIds: [],
        lastVerifiedAt: new Date().toISOString(),
      },
      {
        skillId: 'sql-id',
        canonicalName: 'SQL',
        level: 2,
        verificationStatus: 'VERIFIED',
        sourceEvidenceIds: [],
        lastVerifiedAt: new Date().toISOString(),
      },
    ],
  });

  const getDrive = (): PlacementDrive => ({
    id: 'drive-1',
    companyName: 'Test Company',
    roleTitle: 'Software Engineer',
    description: 'Test',
    status: DriveStatus.PUBLISHED,
    createdBy: 'po-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    requirements: {
      skills: [
        { skillId: 'java-id', minimumLevel: 3, isOptional: false },
        { skillId: 'dsa-id', minimumLevel: 3, isOptional: false },
        { skillId: 'sql-id', minimumLevel: 3, isOptional: false },
        { skillId: 'react-id', minimumLevel: 2, isOptional: true },
      ],
    },
  });

  it('MANDATORY TEST: Should correctly calculate match coverage and statuses', () => {
    const profile = getSkillProfile();
    const drive = getDrive();
    const taxonomy = getTaxonomy();

    const result = engine.evaluate(profile, drive, taxonomy);

    expect(result.requiredSkillCoverage).toBeCloseTo(66.7, 1);
    expect(result.satisfiedCount).toBe(2); // Java, DSA
    expect(result.gapCount).toBe(1); // SQL
    expect(result.missingCount).toBe(0);
    expect(result.optionalGapCount).toBe(0);

    const javaResult = result.skills.find((s) => s.skillId === 'java-id');
    expect(javaResult?.status).toBe(SkillMatchStatus.SATISFIED);

    const dsaResult = result.skills.find((s) => s.skillId === 'dsa-id');
    expect(dsaResult?.status).toBe(SkillMatchStatus.SATISFIED);

    const sqlResult = result.skills.find((s) => s.skillId === 'sql-id');
    expect(sqlResult?.status).toBe(SkillMatchStatus.GAP);
    expect(sqlResult?.gapLevel).toBe(1);
    expect(sqlResult?.priority).toBe(GapPriority.MEDIUM);

    const reactResult = result.skills.find((s) => s.skillId === 'react-id');
    expect(reactResult?.status).toBe(SkillMatchStatus.OPTIONAL_MISSING);
  });

  it('TEST MISSING REQUIRED SKILL', () => {
    const drive = getDrive();
    drive.requirements.skills = [
      { skillId: 'dsa-id', minimumLevel: 3, isOptional: false },
    ];
    // Empty profile
    const result = engine.evaluate(null, drive, getTaxonomy());

    expect(result.missingCount).toBe(1);
    expect(result.requiredSkillCoverage).toBe(0);

    const dsaResult = result.skills[0];
    expect(dsaResult.status).toBe(SkillMatchStatus.MISSING);
    expect(dsaResult.gapLevel).toBe(3);
    expect(dsaResult.priority).toBe(GapPriority.HIGH);
  });

  it('TEST MULTI-LEVEL GAP', () => {
    const profile = getSkillProfile();
    const drive = getDrive();
    drive.requirements.skills = [
      { skillId: 'dsa-id', minimumLevel: 5, isOptional: false },
    ]; // Profile has DSA level 3

    const result = engine.evaluate(profile, drive, getTaxonomy());

    const dsaResult = result.skills[0];
    expect(dsaResult.status).toBe(SkillMatchStatus.GAP);
    expect(dsaResult.gapLevel).toBe(2);
    expect(dsaResult.priority).toBe(GapPriority.HIGH); // >= 2 levels is HIGH
  });
});
