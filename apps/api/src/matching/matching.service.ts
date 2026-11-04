import { Injectable } from '@nestjs/common';
import { MatchingEngine } from './engine/matching.engine.js';
import { DrivesService } from '../drives/drives.service.js';
import { SkillsService } from '../skills/skills.service.js';
import {
  GapPriority,
  SkillGapAnalysis,
  SkillGapDriveCoverage,
  SkillGapItem,
  SkillGapStatus,
  SkillMatchResult,
  SkillMatchStatus,
} from '@placecampus/shared-types';

const PRIORITY_RANK: Record<GapPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const STATUS_RANK: Record<SkillGapStatus, number> = { MISSING: 0, BELOW_LEVEL: 1, OPTIONAL: 2 };

@Injectable()
export class MatchingService {
  constructor(
    private readonly matchingEngine: MatchingEngine,
    private readonly drivesService: DrivesService,
    private readonly skillsService: SkillsService,
  ) {}

  async calculateForStudent(
    driveId: string,
    userId: string,
  ): Promise<SkillMatchResult> {
    const drive = await this.drivesService.findOnePublished(driveId);

    // Get verified skill profile
    const skillProfile = await this.skillsService
      .getStudentProfile(userId)
      .catch(() => null);

    // Get taxonomy for canonical naming and relationships
    const taxonomy = await this.skillsService.getAllSkills();

    // Calculate using the engine
    return this.matchingEngine.evaluate(
      skillProfile as any,
      drive as any,
      taxonomy as any,
    );
  }

  /**
   * Student-wide skill gaps: the matching engine run against every published
   * drive, merged per skill. Nothing is estimated; every gap comes from a real
   * drive requirement compared with the student's verified skill profile.
   */
  async getSkillGapAnalysis(userId: string): Promise<SkillGapAnalysis> {
    const [drives, skillProfile, taxonomy] = await Promise.all([
      this.drivesService.findAllForStudent(),
      this.skillsService.getStudentProfile(userId).catch(() => null),
      this.skillsService.getAllSkills(),
    ]);

    const verifiedSkillCount = ((skillProfile as any)?.skills ?? []).filter(
      (s: any) => s.verificationStatus === 'VERIFIED',
    ).length;
    const categoryBySkill = new Map<string, string | undefined>(
      (taxonomy as any[]).map((skill) => [
        String(skill.id),
        typeof skill.clusterId === 'object' ? skill.clusterId?.name : undefined,
      ]),
    );

    const gaps = new Map<string, SkillGapItem>();
    const driveCoverage: SkillGapDriveCoverage[] = [];
    let requirementsTotal = 0;
    let requirementsMet = 0;

    for (const driveDoc of drives) {
      const drive: any = driveDoc.toObject ? driveDoc.toObject({ virtuals: true }) : driveDoc;
      drive.id = String(drive.id ?? drive._id);
      if (!drive.requirements?.skills?.length) continue;

      const match = this.matchingEngine.evaluate(skillProfile as any, drive, taxonomy as any);
      const requiredCount = match.skills.filter((s) => !s.isOptional).length;
      requirementsTotal += requiredCount;
      requirementsMet += match.satisfiedCount;
      driveCoverage.push({
        driveId: drive.id,
        companyName: drive.companyName,
        roleTitle: drive.roleTitle,
        requiredSkillCoverage: match.requiredSkillCoverage,
        requiredCount,
        satisfiedCount: match.satisfiedCount,
      });

      for (const item of match.skills) {
        if (item.status === SkillMatchStatus.SATISFIED || item.status === SkillMatchStatus.NOT_EVALUABLE) continue;
        const key = String(item.skillId);
        const status: SkillGapStatus = item.isOptional
          ? 'OPTIONAL'
          : item.studentLevel == null
            ? 'MISSING'
            : 'BELOW_LEVEL';
        const priority = item.priority ?? GapPriority.LOW;
        const driveRef = {
          driveId: drive.id,
          companyName: drive.companyName,
          roleTitle: drive.roleTitle,
          requiredLevel: item.requiredLevel,
          isOptional: item.isOptional,
          applicationDeadline: drive.applicationDeadline
            ? new Date(drive.applicationDeadline).toISOString()
            : undefined,
        };

        const existing = gaps.get(key);
        if (!existing) {
          gaps.set(key, {
            skillId: key,
            skillName: item.skillName,
            category: categoryBySkill.get(key),
            status,
            priority,
            currentLevel: item.studentLevel,
            requiredLevel: item.requiredLevel,
            gapLevel: item.requiredLevel - (item.studentLevel ?? 0),
            drives: [driveRef],
          });
          continue;
        }
        existing.drives.push(driveRef);
        existing.requiredLevel = Math.max(existing.requiredLevel, item.requiredLevel);
        existing.gapLevel = existing.requiredLevel - (existing.currentLevel ?? 0);
        if (STATUS_RANK[status] < STATUS_RANK[existing.status]) existing.status = status;
        if (PRIORITY_RANK[priority] < PRIORITY_RANK[existing.priority]) existing.priority = priority;
      }
    }

    const sorted = [...gaps.values()].sort(
      (a, b) =>
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
        b.drives.filter((d) => !d.isOptional).length - a.drives.filter((d) => !d.isOptional).length ||
        b.gapLevel - a.gapLevel ||
        a.skillName.localeCompare(b.skillName),
    );

    return {
      sufficientData: verifiedSkillCount > 0,
      verifiedSkillCount,
      drivesAnalyzed: driveCoverage.length,
      requirementsTotal,
      requirementsMet,
      gaps: sorted,
      driveCoverage,
      calculatedAt: new Date().toISOString(),
    };
  }

  async getDriveSummary(driveId: string) {
    const drive = await this.drivesService
      .findOnePublished(driveId)
      .catch(() => this.drivesService.findOne(driveId));
    if (!drive) return { message: 'Drive not found' };

    // In a real scenario, this would aggregate matching scores for all eligible students.
    // For now, we return a structural placeholder per requirements.
    return {
      driveId,
      status: 'CALCULATING',
      message:
        'Cohort skill supply matching aggregation will be available in the next lifecycle update.',
      requiredSkills: drive.requirements.skills?.length || 0,
      totalStudents: 0,
    };
  }
}
