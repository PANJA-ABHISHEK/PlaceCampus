import { EligibilityEngine } from './eligibility.engine.js';
import {
  StudentProfile,
  StudentSkillProfile,
  PlacementDrive,
  DriveStatus,
  EligibilityCheckStatus,
} from '@placecampus/shared-types';

describe('EligibilityEngine', () => {
  let engine: EligibilityEngine;

  beforeEach(() => {
    engine = new EligibilityEngine();
  });

  const getBaseStudentProfile = (): StudentProfile => ({
    id: 'student-1',
    userId: 'user-1',
    cgpa: 8.5,
    backlogs: 0,
    graduationYear: 2027,
    department: 'CSE',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const getBaseSkillProfile = (): StudentSkillProfile => ({
    id: 'skill-profile-1',
    studentId: 'user-1',
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
    ],
  });

  const getBaseDrive = (): PlacementDrive => ({
    id: 'drive-1',
    companyName: 'Test Company',
    roleTitle: 'Software Engineer',
    description: 'Test Description',
    status: DriveStatus.PUBLISHED,
    createdBy: 'po-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    requirements: {
      minimumCGPA: 7.5,
      maximumBacklogs: 0,
      graduationYear: 2027,
      allowedDepartments: ['CSE'],
      skills: [
        {
          skillId: 'java-id',
          minimumLevel: 3,
          isOptional: false,
        },
        {
          skillId: 'dsa-id',
          minimumLevel: 3,
          isOptional: false,
        },
      ],
    },
  });

  it('MANDATORY TEST 1: Should return ELIGIBLE for a fully matching student', () => {
    const student = getBaseStudentProfile();
    const skills = getBaseSkillProfile();
    const drive = getBaseDrive();

    const result = engine.evaluate(student, skills, drive);

    expect(result.eligible).toBe(true);
    expect(
      result.checks.every((c) => c.result === EligibilityCheckStatus.PASS),
    ).toBe(true);
  });

  it('MANDATORY TEST 2: Should return NOT_ELIGIBLE if DSA is below required level', () => {
    const student = getBaseStudentProfile();
    const skills = getBaseSkillProfile();
    const drive = getBaseDrive();

    // Drive requires DSA level 4
    drive.requirements.skills.find(
      (s) => s.skillId === 'dsa-id',
    )!.minimumLevel = 4;

    const result = engine.evaluate(student, skills, drive);

    expect(result.eligible).toBe(false);
    const dsaCheck = result.checks.find((c) => c.skill === 'dsa-id');
    expect(dsaCheck).toBeDefined();
    expect(dsaCheck!.result).toBe(EligibilityCheckStatus.FAIL);
    expect(dsaCheck!.reason).toContain('below the required level');
  });

  it('MANDATORY: Readiness Independence Test - Readiness is not considered', () => {
    // Engine evaluate signature explicitly only takes StudentProfile and StudentSkillProfile.
    // Readiness is intentionally omitted from inputs, guaranteeing independence.

    // Student failing CGPA
    const studentA = getBaseStudentProfile();
    studentA.cgpa = 6.8;
    const drive = getBaseDrive();
    const resultA = engine.evaluate(studentA, getBaseSkillProfile(), drive);
    expect(resultA.eligible).toBe(false);

    // Student passing all, readiness is irrelevant
    const studentB = getBaseStudentProfile();
    const resultB = engine.evaluate(studentB, getBaseSkillProfile(), drive);
    expect(resultB.eligible).toBe(true);
  });

  describe('Missing Data Semantics', () => {
    it('Should fail if required CGPA is missing', () => {
      const student = getBaseStudentProfile();
      student.cgpa = undefined;
      const result = engine.evaluate(
        student,
        getBaseSkillProfile(),
        getBaseDrive(),
      );
      expect(result.eligible).toBe(false);
      expect(result.checks.find((c) => c.type === 'CGPA')!.result).toBe(
        EligibilityCheckStatus.MISSING_DATA,
      );
    });

    it('Should pass if optional skill is missing', () => {
      const student = getBaseStudentProfile();
      const skills = getBaseSkillProfile();
      const drive = getBaseDrive();

      // Add optional React skill
      drive.requirements.skills.push({
        skillId: 'react-id',
        minimumLevel: 2,
        isOptional: true,
      });

      const result = engine.evaluate(student, skills, drive);
      expect(result.eligible).toBe(true);

      const reactCheck = result.checks.find((c) => c.skill === 'react-id');
      expect(reactCheck!.result).toBe(EligibilityCheckStatus.MISSING_DATA);
    });
  });

  describe('Unverified skills', () => {
    it('Should not count unverified skills towards requirements', () => {
      const student = getBaseStudentProfile();
      const skills = getBaseSkillProfile();
      const drive = getBaseDrive();

      // Make Java UNVERIFIED
      skills.skills.find((s) => s.skillId === 'java-id')!.verificationStatus =
        'UNVERIFIED';

      const result = engine.evaluate(student, skills, drive);

      expect(result.eligible).toBe(false);
      const javaCheck = result.checks.find((c) => c.skill === 'java-id');
      expect(javaCheck!.result).toBe(EligibilityCheckStatus.FAIL); // Because it is required
    });
  });
});
