import { Injectable, Logger } from '@nestjs/common';
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
import { EvidenceDocument } from '../evidence/schemas/evidence.schema.js';
import { VerificationRecordDocument } from '../verification/schemas/verification-record.schema.js';
import { OnEvent } from '@nestjs/event-emitter';

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
  ) {}

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

  async getStudentProfile(studentId: string) {
    const profile = await this.profileModel
      .findOne({ studentId })
      .lean()
      .exec();
    if (!profile) {
      return { studentId, skills: [] };
    }

    // Enrich with cluster names if needed, though frontend can fetch clusters
    return profile;
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
