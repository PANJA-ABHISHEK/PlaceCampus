import { Injectable } from '@nestjs/common';
import {
  StudentSkillProfile,
  PlacementDrive,
  SkillMatchResult,
  SkillMatchItem,
  SkillMatchStatus,
  GapPriority,
  Skill,
} from '@placecampus/shared-types';

@Injectable()
export class MatchingEngine {
  evaluate(
    skillProfile: StudentSkillProfile | null,
    drive: PlacementDrive,
    taxonomy: Skill[],
  ): SkillMatchResult {
    const matchItems: SkillMatchItem[] = [];

    let requiredCount = 0;
    let satisfiedCount = 0;
    let gapCount = 0;
    let missingCount = 0;
    let optionalGapCount = 0;

    for (const req of drive.requirements.skills) {
      // Resolve canonical name from taxonomy
      const canonicalSkill = taxonomy.find((t) => t.id === req.skillId);
      const skillName = canonicalSkill?.name || req.skillName || req.skillId;

      if (!req.isOptional) {
        requiredCount++;
      }

      // Check if student has the skill verified
      const studentSkill = skillProfile?.skills.find(
        (s) => s.skillId === req.skillId && s.verificationStatus === 'VERIFIED',
      );

      let status: SkillMatchStatus;
      let gapLevel = 0;
      let priority: GapPriority | undefined;
      let explanation = '';

      if (!studentSkill) {
        // Missing skill
        if (req.isOptional) {
          status = SkillMatchStatus.OPTIONAL_MISSING;
          explanation = `Optional skill ${skillName} is not currently verified in your profile.`;
        } else {
          status = SkillMatchStatus.MISSING;
          gapLevel = req.minimumLevel;
          priority = GapPriority.HIGH;
          explanation = `${skillName} is required at Level ${req.minimumLevel}, but no verified skill is currently present.`;
          missingCount++;
        }
      } else {
        // Skill exists, compare levels
        if (studentSkill.level >= req.minimumLevel) {
          status = SkillMatchStatus.SATISFIED;
          explanation = `${skillName} requirement satisfied: verified Level ${studentSkill.level} meets the required Level ${req.minimumLevel}.`;
          if (!req.isOptional) {
            satisfiedCount++;
          }
        } else {
          gapLevel = req.minimumLevel - studentSkill.level;

          if (req.isOptional) {
            status = SkillMatchStatus.OPTIONAL_GAP;
            priority = GapPriority.LOW;
            explanation = `Optional ${skillName} prefers Level ${req.minimumLevel}, while your verified level is Level ${studentSkill.level}.`;
            optionalGapCount++;
          } else {
            status = SkillMatchStatus.GAP;
            priority = gapLevel >= 2 ? GapPriority.HIGH : GapPriority.MEDIUM;
            explanation = `${skillName} is required at Level ${req.minimumLevel}, while your verified level is Level ${studentSkill.level}.`;
            gapCount++;
          }
        }
      }

      matchItems.push({
        skillId: req.skillId,
        skillName,
        requiredLevel: req.minimumLevel,
        studentLevel: studentSkill?.level,
        isOptional: req.isOptional,
        status,
        gapLevel,
        priority,
        explanation,
      });
    }

    const requiredSkillCoverage =
      requiredCount > 0
        ? Number(((satisfiedCount / requiredCount) * 100).toFixed(1))
        : 100; // If there are no required skills, coverage is 100%

    return {
      driveId: drive.id,
      studentId: skillProfile?.studentId || 'unknown',
      requiredSkillCoverage,
      satisfiedCount,
      gapCount,
      missingCount,
      optionalGapCount,
      skills: matchItems,
      calculatedAt: new Date().toISOString(),
    };
  }
}
