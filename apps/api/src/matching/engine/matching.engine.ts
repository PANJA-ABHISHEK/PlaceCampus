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

/** Sort key: required gaps by priority, then optional gaps, then met requirements. */
function urgency(item: SkillMatchItem): number {
  if (item.status === SkillMatchStatus.SATISFIED) return 9;
  if (item.isOptional) return item.status === SkillMatchStatus.OPTIONAL_GAP ? 5 : 6;
  const byPriority = { HIGH: 0, MEDIUM: 2, LOW: 4 } as const;
  // At equal priority a missing skill outranks one that only needs a higher level.
  return byPriority[item.priority ?? GapPriority.LOW] + (item.status === SkillMatchStatus.MISSING ? 0 : 1);
}

/** One concrete step per unmet requirement, naming the skill and levels involved. */
export function recommendAction(
  status: SkillMatchStatus,
  skill: string,
  required: number,
  current: number | undefined,
  pending: boolean,
): string | undefined {
  const prefix = status === SkillMatchStatus.OPTIONAL_GAP || status === SkillMatchStatus.OPTIONAL_MISSING ? 'Optional: ' : '';
  switch (status) {
    case SkillMatchStatus.SATISFIED:
      return undefined;
    case SkillMatchStatus.MISSING:
    case SkillMatchStatus.OPTIONAL_MISSING:
      if (pending) {
        return required > 1
          ? `${prefix}Your ${skill} evidence is awaiting faculty review. Once verified it counts at Level 1; add a project or certification that shows ${skill} at Level ${required}.`
          : `${prefix}Your ${skill} evidence is awaiting faculty review. It meets this requirement as soon as it is verified.`;
      }
      return `${prefix}Submit evidence of ${skill} (a certification, project or internship that uses it) and have it verified at Level ${required}.`;
    case SkillMatchStatus.GAP:
    case SkillMatchStatus.OPTIONAL_GAP:
      return `${prefix}Raise ${skill} from Level ${current ?? 0} to Level ${required}: submit a more advanced project or certification in ${skill}, or pass its assessment.`;
    default:
      return undefined;
  }
}

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
      const canonicalSkill = taxonomy.find((t) => String(t.id) === String(req.skillId));
      const skillName = canonicalSkill?.name || req.skillName || req.skillId;

      if (!req.isOptional) {
        requiredCount++;
      }

      // Check if student has the skill verified. Profile skill ids are stored as
      // ObjectIds while drive requirements hold strings, so compare as strings.
      const studentSkill = skillProfile?.skills.find(
        (s) =>
          String(s.skillId) === String(req.skillId) &&
          s.verificationStatus === 'VERIFIED',
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

      // Evidence claiming this skill that faculty have not decided on yet.
      const pendingVerification = !!skillProfile?.skills.some(
        (s) => String(s.skillId) === String(req.skillId) && s.verificationStatus === 'UNVERIFIED',
      );

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
        pendingVerification: pendingVerification || undefined,
        recommendedAction: recommendAction(status, skillName, req.minimumLevel, studentSkill?.level, pendingVerification),
      });
    }

    // Unmet requirements first, most urgent first; satisfied skills last.
    matchItems.sort(
      (a, b) =>
        urgency(a) - urgency(b) ||
        b.gapLevel - a.gapLevel ||
        a.skillName.localeCompare(b.skillName),
    );
    let rank = 0;
    for (const item of matchItems) {
      if (item.status !== SkillMatchStatus.SATISFIED) item.rank = ++rank;
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
