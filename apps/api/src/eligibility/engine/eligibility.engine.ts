import { Injectable } from '@nestjs/common';
import {
  StudentProfile,
  StudentSkillProfile,
  PlacementDrive,
  EligibilityResult,
  EligibilityCheckResult,
  EligibilityCheckStatus,
  DriveSkillRequirement,
} from '@placecampus/shared-types';

@Injectable()
export class EligibilityEngine {
  evaluate(
    studentProfile: StudentProfile | null,
    skillProfile: StudentSkillProfile | null,
    drive: PlacementDrive,
  ): EligibilityResult {
    const checks: EligibilityCheckResult[] = [];
    let isEligible = true;

    // 1. CGPA
    if (
      drive.requirements.minimumCGPA !== undefined &&
      drive.requirements.minimumCGPA !== null
    ) {
      if (!studentProfile?.cgpa) {
        checks.push({
          type: 'CGPA',
          requirement: drive.requirements.minimumCGPA,
          result: EligibilityCheckStatus.MISSING_DATA,
          reason: 'Student CGPA is missing.',
        });
        isEligible = false;
      } else {
        const pass = studentProfile.cgpa >= drive.requirements.minimumCGPA;
        checks.push({
          type: 'CGPA',
          requirement: drive.requirements.minimumCGPA,
          actual: studentProfile.cgpa,
          result: pass
            ? EligibilityCheckStatus.PASS
            : EligibilityCheckStatus.FAIL,
          reason: pass ? undefined : 'CGPA is below the minimum requirement.',
        });
        if (!pass) isEligible = false;
      }
    }

    // 2. Backlogs
    if (
      drive.requirements.maximumBacklogs !== undefined &&
      drive.requirements.maximumBacklogs !== null
    ) {
      if (
        studentProfile?.backlogs === undefined ||
        studentProfile?.backlogs === null
      ) {
        checks.push({
          type: 'BACKLOGS',
          requirement: drive.requirements.maximumBacklogs,
          result: EligibilityCheckStatus.MISSING_DATA,
          reason: 'Student backlog count is missing.',
        });
        isEligible = false;
      } else {
        const pass =
          studentProfile.backlogs <= drive.requirements.maximumBacklogs;
        checks.push({
          type: 'BACKLOGS',
          requirement: drive.requirements.maximumBacklogs,
          actual: studentProfile.backlogs,
          result: pass
            ? EligibilityCheckStatus.PASS
            : EligibilityCheckStatus.FAIL,
          reason: pass
            ? undefined
            : 'Backlogs exceed the maximum allowed limit.',
        });
        if (!pass) isEligible = false;
      }
    }

    // 3. Graduation Year
    if (
      drive.requirements.graduationYear !== undefined &&
      drive.requirements.graduationYear !== null
    ) {
      if (!studentProfile?.graduationYear) {
        checks.push({
          type: 'GRADUATION_YEAR',
          requirement: drive.requirements.graduationYear,
          result: EligibilityCheckStatus.MISSING_DATA,
          reason: 'Student graduation year is missing.',
        });
        isEligible = false;
      } else {
        const pass =
          studentProfile.graduationYear === drive.requirements.graduationYear;
        checks.push({
          type: 'GRADUATION_YEAR',
          requirement: drive.requirements.graduationYear,
          actual: studentProfile.graduationYear,
          result: pass
            ? EligibilityCheckStatus.PASS
            : EligibilityCheckStatus.FAIL,
          reason: pass
            ? undefined
            : 'Graduation year does not match the requirement.',
        });
        if (!pass) isEligible = false;
      }
    }

    // 4. Department
    if (
      drive.requirements.allowedDepartments &&
      drive.requirements.allowedDepartments.length > 0
    ) {
      if (!studentProfile?.department) {
        checks.push({
          type: 'DEPARTMENT',
          requirement: drive.requirements.allowedDepartments,
          result: EligibilityCheckStatus.MISSING_DATA,
          reason: 'Student department is missing.',
        });
        isEligible = false;
      } else {
        const pass = drive.requirements.allowedDepartments.includes(
          studentProfile.department,
        );
        checks.push({
          type: 'DEPARTMENT',
          requirement: drive.requirements.allowedDepartments,
          actual: studentProfile.department,
          result: pass
            ? EligibilityCheckStatus.PASS
            : EligibilityCheckStatus.FAIL,
          reason: pass ? undefined : 'Department is not in the allowed list.',
        });
        if (!pass) isEligible = false;
      }
    }

    // 5. Skills
    if (drive.requirements.skills && drive.requirements.skills.length > 0) {
      for (const req of drive.requirements.skills) {
        // Find matching skill in student's verified profile
        const studentSkill = skillProfile?.skills.find(
          (s) =>
            s.skillId === req.skillId && s.verificationStatus === 'VERIFIED',
        );

        if (!studentSkill) {
          checks.push({
            type: 'SKILL',
            skill: req.skillId,
            requiredLevel: req.minimumLevel,
            result: req.isOptional
              ? EligibilityCheckStatus.MISSING_DATA
              : EligibilityCheckStatus.FAIL,
            reason: req.isOptional
              ? 'Optional skill is missing or unverified.'
              : 'Required skill is missing or unverified.',
          });

          if (!req.isOptional) {
            isEligible = false;
          }
        } else {
          const pass = studentSkill.level >= req.minimumLevel;
          checks.push({
            type: 'SKILL',
            skill: req.skillId,
            requiredLevel: req.minimumLevel,
            actualLevel: studentSkill.level,
            result: pass
              ? EligibilityCheckStatus.PASS
              : EligibilityCheckStatus.FAIL,
            reason: pass
              ? undefined
              : `Verified ${studentSkill.canonicalName} level is below the required level.`,
          });

          if (!pass && !req.isOptional) {
            isEligible = false;
          }
        }
      }
    }

    return {
      eligible: isEligible,
      checks,
      calculatedAt: new Date().toISOString(),
    };
  }
}
