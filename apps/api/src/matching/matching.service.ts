import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MatchingEngine } from './engine/matching.engine.js';
import { DrivesService } from '../drives/drives.service.js';
import { SkillsService } from '../skills/skills.service.js';
import { SkillNormalizationService } from '../skills/skill-normalization.service.js';
import { EligibilityEngine } from '../eligibility/engine/eligibility.engine.js';
import { User, UserDocument } from '../users/schemas/user.schema.js';
import { StudentProfile, StudentProfileDocument } from '../students/schemas/student-profile.schema.js';
import {
  StudentSkillProfile,
  StudentSkillProfileDocument,
} from '../skills/schemas/student-skill-profile.schema.js';
import { PlacementApplication, ApplicationDocument } from '../applications/schemas/application.schema.js';
import { Evidence, EvidenceDocument } from '../evidence/schemas/evidence.schema.js';
import {
  VerificationRecord,
  VerificationRecordDocument,
} from '../verification/schemas/verification-record.schema.js';
import {
  DriveSkillSupplyReport,
  DriveSkillSupplyRow,
  EvidenceStatus,
  UserRole,
  GapPriority,
  SkillGapAnalysis,
  SkillGapDriveCoverage,
  SkillGapItem,
  SkillGapStatus,
  SkillMatchResult,
  SkillMatchStatus,
} from '@placecampus/shared-types';

export interface StaffGapAnalysis {
  student: { id: string; name: string; registrationNumber?: string; department?: string };
  drive: { id: string; companyName: string; roleTitle: string; status: string };
  match: SkillMatchResult;
}

const PRIORITY_RANK: Record<GapPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const STATUS_RANK: Record<SkillGapStatus, number> = { MISSING: 0, BELOW_LEVEL: 1, OPTIONAL: 2 };

@Injectable()
export class MatchingService {
  constructor(
    private readonly matchingEngine: MatchingEngine,
    private readonly drivesService: DrivesService,
    private readonly skillsService: SkillsService,
    private readonly normalization: SkillNormalizationService,
    private readonly eligibilityEngine: EligibilityEngine,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(StudentProfile.name) private readonly profileModel: Model<StudentProfileDocument>,
    @InjectModel(StudentSkillProfile.name)
    private readonly skillProfileModel: Model<StudentSkillProfileDocument>,
    @InjectModel(PlacementApplication.name)
    private readonly applicationModel: Model<ApplicationDocument>,
    @InjectModel(Evidence.name) private readonly evidenceModel: Model<EvidenceDocument>,
    @InjectModel(VerificationRecord.name)
    private readonly recordModel: Model<VerificationRecordDocument>,
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

  /**
   * Gap analysis of any student against any drive (draft, published or
   * closed), for placement staff. Same engine and ranking the student sees.
   */
  async analyseForStaff(driveId: string, studentId: string): Promise<StaffGapAnalysis> {
    const [drive, user, profile] = await Promise.all([
      this.drivesService.findOne(driveId),
      this.userModel.findById(studentId).select('fullName email role roles').lean().exec(),
      this.profileModel
        .findOne({ userId: studentId })
        .select('registrationNumber department graduationYear')
        .lean()
        .exec(),
    ]);
    const isStudent =
      user && ((user as any).role === UserRole.STUDENT || ((user as any).roles ?? []).includes(UserRole.STUDENT));
    if (!isStudent) throw new NotFoundException('Student not found');

    const [skillProfile, taxonomy] = await Promise.all([
      this.skillsService.getStudentProfile(studentId),
      this.skillsService.getAllSkills(),
    ]);
    const match = this.matchingEngine.evaluate(skillProfile as any, drive as any, taxonomy as any);
    return {
      student: {
        id: studentId,
        name: (user as any).fullName,
        registrationNumber: (profile as any)?.registrationNumber,
        department: (profile as any)?.department,
      },
      drive: {
        id: String(drive._id),
        companyName: drive.companyName,
        roleTitle: drive.roleTitle,
        status: drive.status,
      },
      match: { ...match, driveId: String(drive._id), studentId },
    };
  }

  /**
   * Skill supply against demand for one real drive. Demand is the drive's
   * skill requirements. Supply is counted over every active student who
   * passes the drive's non-skill rules (CGPA, backlogs, year, department),
   * using verified skills only; evidence still in review is reported apart.
   */
  async getDriveSummary(driveId: string): Promise<DriveSkillSupplyReport> {
    const drive = await this.drivesService.findOne(driveId);
    const requirements: any[] = (drive.requirements?.skills as any[]) ?? [];

    const users = await this.userModel
      .find({
        $or: [{ role: UserRole.STUDENT }, { roles: UserRole.STUDENT }],
        isActive: true,
        accountStatus: { $nin: ['SUSPENDED', 'DEACTIVATED'] },
      })
      .select('_id')
      .lean()
      .exec();
    const userIds = users.map((u: any) => String(u._id));
    const [profiles, skillProfiles, applications, taxonomy] = await Promise.all([
      this.profileModel.find({ userId: { $in: userIds } }).lean().exec(),
      this.skillProfileModel.find({ studentId: { $in: userIds } }).lean().exec(),
      this.applicationModel.find({ driveId: drive._id }).select('studentId').lean().exec(),
      this.skillsService.getAllSkills(),
    ]);
    const skillsOf = new Map(skillProfiles.map((p: any) => [String(p.studentId), p]));

    // Non-skill rules decide who the drive is open to; skill rules are what we measure.
    const rulesWithoutSkills = { requirements: { ...this.plain(drive.requirements), skills: [] } };
    let fullyEligible = 0;
    const pool: string[] = [];
    for (const profile of profiles as any[]) {
      const id = String(profile.userId);
      const skills = skillsOf.get(id) ?? null;
      if (!this.eligibilityEngine.evaluate(profile, skills, rulesWithoutSkills as any).eligible) continue;
      pool.push(id);
      if (this.eligibilityEngine.evaluate(profile, skills, drive as any).eligible) fullyEligible++;
    }
    const applicants = new Set(applications.map((a: any) => String(a.studentId)));
    const pending = await this.pendingClaims(pool);

    const levelOf = (studentId: string, skillId: string) =>
      (skillsOf.get(studentId)?.skills ?? []).find(
        (s: any) => String(s.skillId) === skillId && s.verificationStatus === 'VERIFIED',
      )?.level as number | undefined;

    const meetsAll = new Set(pool);
    const rows: DriveSkillSupplyRow[] = requirements.map((req) => {
      const skillId = String(req.skillId);
      let meetsLevel = 0;
      let belowLevel = 0;
      let pendingReview = 0;
      let applicantsMeetingLevel = 0;
      for (const id of pool) {
        const level = levelOf(id, skillId);
        const meets = level !== undefined && level >= req.minimumLevel;
        if (meets) meetsLevel++;
        else {
          if (level !== undefined) belowLevel++;
          if (pending.has(`${id}:${skillId}`)) pendingReview++;
          if (!req.isOptional) meetsAll.delete(id);
        }
        if (meets && applicants.has(id)) applicantsMeetingLevel++;
      }
      const supplyRate = pool.length ? Math.round((meetsLevel / pool.length) * 1000) / 10 : 0;
      return {
        skillId,
        skillName:
          (taxonomy as any[]).find((t) => String(t.id ?? t._id) === skillId)?.name ?? req.skillName ?? skillId,
        requiredLevel: req.minimumLevel,
        isOptional: !!req.isOptional,
        meetsLevel,
        belowLevel,
        missing: pool.length - meetsLevel - belowLevel,
        pendingReview,
        supplyRate,
        supplyStatus: supplyRate < 25 ? 'SHORTAGE' : supplyRate < 60 ? 'LIMITED' : 'ADEQUATE',
        applicantsMeetingLevel,
      };
    });

    return {
      drive: {
        id: String(drive._id),
        companyName: drive.companyName,
        roleTitle: drive.roleTitle,
        status: drive.status,
        applicationDeadline: drive.applicationDeadline ? new Date(drive.applicationDeadline).toISOString() : undefined,
      },
      poolSize: pool.length,
      fullyEligible,
      applicants: applicants.size,
      meetingAllRequired: pool.length ? meetsAll.size : 0,
      skills: rows.sort(
        (a, b) => Number(a.isOptional) - Number(b.isOptional) || a.supplyRate - b.supplyRate || a.skillName.localeCompare(b.skillName),
      ),
      shortages: rows.filter((r) => !r.isOptional && r.supplyStatus !== 'ADEQUATE').map((r) => r.skillName),
      generatedAt: new Date().toISOString(),
    };
  }

  /** `${studentId}:${skillId}` for skills claimed by evidence still in review. */
  private async pendingClaims(studentIds: string[]): Promise<Set<string>> {
    const keys = new Set<string>();
    if (!studentIds.length) return keys;
    const evidence = await this.evidenceModel
      .find({ studentId: { $in: studentIds }, status: { $in: [EvidenceStatus.PROCESSING, EvidenceStatus.NEEDS_REVIEW] } })
      .select('studentId')
      .lean()
      .exec();
    if (!evidence.length) return keys;
    const owner = new Map(evidence.map((e: any) => [String(e._id), String(e.studentId)]));
    const records = await this.recordModel
      .find({ evidenceId: { $in: evidence.map((e: any) => e._id) } })
      .select('evidenceId aiResult.claimedSkills')
      .lean()
      .exec();
    const resolved = new Map<string, string | null>();
    for (const r of records as any[]) {
      for (const claim of (r.aiResult?.claimedSkills ?? []) as string[]) {
        if (!resolved.has(claim)) {
          const skill = await this.normalization.normalizeSkill(claim).catch(() => null);
          resolved.set(claim, skill ? String(skill._id) : null);
        }
        const skillId = resolved.get(claim);
        if (skillId) keys.add(`${owner.get(String(r.evidenceId))}:${skillId}`);
      }
    }
    return keys;
  }

  private plain(value: any) {
    return typeof value?.toObject === 'function' ? value.toObject() : { ...(value ?? {}) };
  }
}
