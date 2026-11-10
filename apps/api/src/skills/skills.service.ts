import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Skill, SkillDocument } from './schemas/skill.schema.js';
import {
  SkillCluster,
  SkillClusterDocument,
} from './schemas/skill-cluster.schema.js';
import {
  SkillClaim,
  SkillClaimDocument,
} from './schemas/skill-claim.schema.js';
import {
  StudentSkillProfile,
  StudentSkillProfileDocument,
} from './schemas/student-skill-profile.schema.js';
import { SkillNormalizationService } from './skill-normalization.service.js';
import { Evidence, EvidenceDocument } from '../evidence/schemas/evidence.schema.js';
import {
  VerificationRecord,
  VerificationRecordDocument,
} from '../verification/schemas/verification-record.schema.js';
import { OnEvent } from '@nestjs/event-emitter';
import { EvidenceStatus, StudentSkillEntry } from '@placecampus/shared-types';
import { AuditService } from '../audit/audit.service.js';

/** A student's skills as returned to callers: stored profile plus pending claims. */
export interface StudentSkillProfileView {
  id?: string;
  studentId: string;
  skills: (StudentSkillEntry & { skillId: any })[];
  evidenceTypes: string[];
  updatedAt?: Date;
}

/** Evidence whose claimed skills are shown as pending until a decision. */
const PENDING_EVIDENCE: string[] = [EvidenceStatus.PROCESSING, EvidenceStatus.NEEDS_REVIEW];

@Injectable()
export class SkillsService {
  private readonly logger = new Logger(SkillsService.name);

  constructor(
    @InjectModel(Skill.name) private skillModel: Model<SkillDocument>,
    @InjectModel(SkillCluster.name)
    private skillClusterModel: Model<SkillClusterDocument>,
    @InjectModel(SkillClaim.name)
    private skillClaimModel: Model<SkillClaimDocument>,
    @InjectModel(StudentSkillProfile.name)
    private profileModel: Model<StudentSkillProfileDocument>,
    private normalizationService: SkillNormalizationService,
    private audit: AuditService,
    @InjectModel(Evidence.name) private evidenceModel: Model<EvidenceDocument>,
    @InjectModel(VerificationRecord.name)
    private recordModel: Model<VerificationRecordDocument>,
  ) {}

  async getAdminTaxonomy() {
    const skills = await this.skillModel.find().populate('clusterId').sort({ name: 1 }).lean().exec();
    return skills.map((skill: any) => ({
      id: String(skill._id), name: skill.name, normalizedName: skill.normalizedName,
      description: skill.description, active: skill.active !== false, synonyms: skill.synonyms ?? [],
      clusterId: skill.clusterId?._id ? String(skill.clusterId._id) : undefined,
      clusterName: skill.clusterId?.name,
    }));
  }

  async createTaxonomySkill(dto: { name: string; description?: string; clusterId?: string; synonyms?: string[] }, actor: { userId: string; role: string }) {
    const name = dto.name.trim();
    const normalizedName = this.normalizeCanonicalSkill(name);
    if (!name || !normalizedName) throw new BadRequestException('Enter a valid skill name.');
    if (dto.clusterId && !(await this.skillClusterModel.exists({ _id: dto.clusterId }).exec())) throw new BadRequestException('Choose an existing skill cluster.');
    try {
      const skill = await this.skillModel.create({ name, normalizedName, description: dto.description?.trim() || undefined, clusterId: dto.clusterId, synonyms: this.cleanSynonyms(dto.synonyms), active: true });
      await this.audit.logAction({ actorId: actor.userId, actorRole: actor.role, action: 'SKILL_TAXONOMY_CREATED', resourceType: 'SKILL', resourceId: String(skill._id), metadata: { name } });
      return { id: String(skill._id), name: skill.name, normalizedName: skill.normalizedName, description: skill.description, clusterId: skill.clusterId, active: skill.active, synonyms: skill.synonyms };
    } catch (error: any) {
      if (error?.code === 11000) throw new ConflictException('A skill with that name already exists.');
      throw error;
    }
  }

  async updateTaxonomySkill(id: string, dto: { name?: string; description?: string; clusterId?: string; synonyms?: string[]; active?: boolean }, actor: { userId: string; role: string }) {
    const skill = await this.skillModel.findById(id).exec();
    if (!skill) throw new NotFoundException('Skill not found.');
    const changes: Record<string, unknown> = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      const normalizedName = this.normalizeCanonicalSkill(name);
      if (!name || !normalizedName) throw new BadRequestException('Enter a valid skill name.');
      skill.name = name;
      skill.normalizedName = normalizedName;
      changes.name = name;
    }
    if (dto.description !== undefined) { skill.description = dto.description.trim() || undefined; changes.description = skill.description; }
    if (dto.clusterId !== undefined) {
      if (dto.clusterId && !(await this.skillClusterModel.exists({ _id: dto.clusterId }).exec())) throw new BadRequestException('Choose an existing skill cluster.');
      skill.clusterId = dto.clusterId || undefined;
      changes.clusterId = dto.clusterId || null;
    }
    if (dto.synonyms !== undefined) { skill.synonyms = this.cleanSynonyms(dto.synonyms); changes.synonyms = skill.synonyms; }
    if (dto.active !== undefined) { skill.active = dto.active; changes.active = dto.active; }
    try {
      await skill.save();
    } catch (error: any) {
      if (error?.code === 11000) throw new ConflictException('A skill with that name already exists.');
      throw error;
    }
    await this.audit.logAction({ actorId: actor.userId, actorRole: actor.role, action: 'SKILL_TAXONOMY_UPDATED', resourceType: 'SKILL', resourceId: id, metadata: changes });
    return { id, name: skill.name, normalizedName: skill.normalizedName, description: skill.description, clusterId: skill.clusterId, active: skill.active, synonyms: skill.synonyms };
  }

  private normalizeCanonicalSkill(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9]/g, ''); }
  private cleanSynonyms(values?: string[]) { return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))]; }

  /**
   * Processes a verified evidence item and its associated verification record.
   * Extracts AI claims, normalizes them, and aggregates into the student's profile.
   * Idempotent per (studentId, evidenceId).
   */
  @OnEvent('evidence.verified', { async: true })
  async handleEvidenceVerifiedEvent(payload: {
    evidence: EvidenceDocument;
    record: VerificationRecordDocument;
  }) {
    await this.processVerifiedEvidence(payload.evidence, payload.record);
  }

  async processVerifiedEvidence(
    evidence: EvidenceDocument,
    record: VerificationRecordDocument,
  ) {
    if (evidence.status !== 'VERIFIED') {
      this.logger.warn(
        `Evidence ${evidence._id} is not VERIFIED. Ignoring skill aggregation.`,
      );
      return;
    }

    const claimedSkills: string[] = record.aiResult?.claimedSkills || [];

    if (!claimedSkills.length) {
      this.logger.debug(
        `No skills claimed in verification record ${record._id}`,
      );
      return;
    }

    // Process each claim
    for (const rawClaim of claimedSkills) {
      try {
        const canonicalSkill =
          await this.normalizationService.normalizeSkill(rawClaim);

        // Upsert claim to avoid duplicates from multiple retries
        const claimStatus = canonicalSkill ? 'VERIFIED' : 'UNRESOLVED';
        const level = 1; // Default conservative level as per Step 9 requirements

        await this.skillClaimModel
          .findOneAndUpdate(
            {
              studentId: evidence.studentId,
              evidenceId: evidence._id,
              rawClaim: rawClaim,
            },
            {
              verificationRecordId: record._id,
              canonicalSkillId: canonicalSkill?._id,
              status: claimStatus,
              level: level,
              source: evidence.type,
              verifiedAt: new Date().toISOString(),
            },
            { upsert: true, new: true },
          )
          .exec();

        // If it resolved to a canonical skill, update the aggregated profile
        if (canonicalSkill) {
          await this.aggregateSkillToProfile(
            evidence.studentId,
            canonicalSkill,
            evidence._id.toString(),
            level,
          );
        }
      } catch (err) {
        this.logger.error(
          `Failed to process skill claim "${rawClaim}": ${err}`,
        );
      }
    }
  }

  private async aggregateSkillToProfile(
    studentId: string,
    canonicalSkill: SkillDocument,
    evidenceId: string,
    level: number,
  ) {
    let profile = await this.profileModel.findOne({ studentId }).exec();

    if (!profile) {
      profile = new this.profileModel({
        studentId,
        skills: [],
      });
    }

    const existingSkillIndex = profile.skills.findIndex(
      (s) => s.skillId.toString() === canonicalSkill._id.toString(),
    );

    if (existingSkillIndex >= 0) {
      const entry = profile.skills[existingSkillIndex];
      // Add evidence if not already present
      if (!entry.sourceEvidenceIds.some((id) => id.toString() === evidenceId)) {
        entry.sourceEvidenceIds.push(evidenceId as any);
      }
      // Keep highest level
      if (level > entry.level) {
        entry.level = level;
      }
      entry.lastVerifiedAt = new Date().toISOString();
      entry.verificationStatus = 'VERIFIED';
    } else {
      // Add new skill
      profile.skills.push({
        skillId: canonicalSkill._id as any,
        canonicalName: canonicalSkill.name,
        level: level,
        verificationStatus: 'VERIFIED',
        sourceEvidenceIds: [evidenceId as any],
        lastVerifiedAt: new Date().toISOString(),
      });
    }

    await profile.save();
    this.logger.debug(
      `Aggregated skill ${canonicalSkill.name} for student ${studentId}`,
    );
  }

  /**
   * The student's skill profile, assembled from every evidence type.
   * Verified skills come from the stored profile; skills claimed by evidence
   * still in review are added as UNVERIFIED so the student sees their status.
   * Matching, eligibility and readiness only ever count VERIFIED entries.
   */
  async getStudentProfile(studentId: string): Promise<StudentSkillProfileView> {
    const [profile, evidence] = await Promise.all([
      this.profileModel.findOne({ studentId }).lean().exec(),
      this.evidenceModel
        .find({ studentId })
        .select('type status')
        .lean()
        .exec(),
    ]);
    const typeOf = new Map(evidence.map((e: any) => [String(e._id), String(e.type)]));
    const typesFor = (ids: unknown[]) =>
      [...new Set(ids.map((id) => typeOf.get(String(id))).filter((t): t is string => !!t))];

    const skills: any[] = (profile?.skills ?? []).map((s: any) => ({
      ...s,
      sourceTypes: typesFor(s.sourceEvidenceIds ?? []),
    }));

    const inReview = evidence.filter((e: any) => PENDING_EVIDENCE.includes(e.status));
    if (inReview.length) {
      const records = await this.recordModel
        .find({ evidenceId: { $in: inReview.map((e: any) => e._id) } })
        .sort({ createdAt: -1 })
        .select('evidenceId aiResult.claimedSkills')
        .lean()
        .exec();
      const latest = new Map<string, string[]>();
      for (const r of records as any[]) {
        const key = String(r.evidenceId);
        if (!latest.has(key)) latest.set(key, r.aiResult?.claimedSkills ?? []);
      }
      const resolved = new Map<string, SkillDocument | null>();
      for (const [evidenceId, claims] of latest) {
        for (const claim of claims) {
          if (!resolved.has(claim)) {
            resolved.set(claim, await this.normalizationService.normalizeSkill(claim).catch(() => null));
          }
          const skill = resolved.get(claim);
          if (!skill) continue;
          const entry = skills.find((s) => String(s.skillId) === String(skill._id));
          if (entry?.verificationStatus === 'VERIFIED') continue;
          if (entry) {
            if (!entry.sourceEvidenceIds.some((id: unknown) => String(id) === evidenceId)) {
              entry.sourceEvidenceIds.push(evidenceId);
              entry.sourceTypes = typesFor(entry.sourceEvidenceIds);
            }
          } else {
            skills.push({
              skillId: String(skill._id),
              canonicalName: skill.name,
              level: 1,
              verificationStatus: 'UNVERIFIED',
              sourceEvidenceIds: [evidenceId],
              sourceTypes: typesFor([evidenceId]),
            });
          }
        }
      }
    }

    const evidenceTypes = [
      ...new Set(
        skills
          .filter((s) => s.verificationStatus === 'VERIFIED')
          .flatMap((s) => s.sourceTypes as string[]),
      ),
    ].sort();

    return {
      id: profile ? String((profile as any)._id) : undefined,
      studentId,
      skills,
      evidenceTypes,
      updatedAt: (profile as any)?.updatedAt,
    };
  }

  async getAllClusters() {
    const clusters = await this.skillClusterModel.find().lean().exec();
    return clusters.map((c: any) => {
      const { _id, __v, ...rest } = c;
      return { id: _id.toString(), ...rest };
    });
  }

  async getAllSkills() {
    const skills = await this.skillModel
      .find({ active: true })
      .populate('clusterId')
      .lean()
      .exec();
    return skills.map((s: any) => {
      const { _id, __v, ...rest } = s;
      return { id: _id.toString(), ...rest };
    });
  }
}
