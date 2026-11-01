import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ReadinessSnapshot,
  ReadinessSnapshotDocument,
} from './schemas/readiness-snapshot.schema.js';
import { StudentProfile } from '../students/schemas/student-profile.schema.js';
import { StudentSkillProfile } from '../skills/schemas/student-skill-profile.schema.js';
import { AssessmentAttempt } from '../assessments/schemas/assessment-attempt.schema.js';
import { Evidence } from '../evidence/schemas/evidence.schema.js';
import { MockInterview } from '../interviews/schemas/mock-interview.schema.js';
import { ReadinessStatus } from '@placecampus/shared-types';
import { OnEvent } from '@nestjs/event-emitter';

export const READINESS_WEIGHTS = {
  verifiedSkills: 0.32,
  assessments: 0.24,
  academics: 0.18,
  projects: 0.16,
  interviews: 0.1,
};

@Injectable()
export class ReadinessService {
  private readonly logger = new Logger(ReadinessService.name);

  constructor(
    @InjectModel(ReadinessSnapshot.name)
    private snapshotModel: Model<ReadinessSnapshotDocument>,
    @InjectModel(StudentProfile.name) private studentProfileModel: Model<any>, // using any to avoid direct Document type conflicts if not exported correctly, we just need basic find
    @InjectModel(StudentSkillProfile.name)
    private skillProfileModel: Model<any>,
    @InjectModel(AssessmentAttempt.name) private attemptModel: Model<any>,
    @InjectModel(Evidence.name) private evidenceModel: Model<any>,
    @InjectModel(MockInterview.name) private interviewModel: Model<any>,
  ) {}

  @OnEvent('evidence.verified')
  @OnEvent('assessment.evaluated')
  @OnEvent('interview.evaluated')
  async handleReadinessTriggers(payload: { studentId: string }) {
    this.logger.log(
      `Triggered readiness recomputation for student ${payload.studentId}`,
    );
    // In a production system, this would push to a BullMQ queue.
    // For this implementation, we compute directly.
    await this.calculateAndSaveReadiness(payload.studentId);
  }

  async getLatestSnapshot(studentId: string) {
    const snapshot = await this.snapshotModel
      .findOne({ studentId })
      .sort({ calculatedAt: -1 })
      .lean()
      .exec();
    if (!snapshot) {
      // If no snapshot exists, we can try to compute one on the fly, or just return 404
      // Let's compute one.
      return this.calculateAndSaveReadiness(studentId);
    }
    return snapshot;
  }

  async getSnapshotHistory(studentId: string) {
    return this.snapshotModel
      .find({ studentId })
      .sort({ calculatedAt: -1 })
      .lean()
      .exec();
  }

  async calculateAndSaveReadiness(studentId: string) {
    // 1. Fetch all raw inputs
    const [profile, skillProfile, attempts, projects, interviews] =
      await Promise.all([
        this.studentProfileModel
          .findOne({ userId: studentId })
          .lean()
          .exec() as Promise<any>,
        this.skillProfileModel
          .findOne({ studentId })
          .lean()
          .exec() as Promise<any>,
        this.attemptModel
          .find({ studentId, status: 'EVALUATED' })
          .lean()
          .exec(),
        this.evidenceModel
          .find({ studentId, type: 'PROJECT', status: 'VERIFIED' })
          .lean()
          .exec(),
        this.interviewModel
          .find({ studentId, status: 'COMPLETED' })
          .lean()
          .exec(),
      ]);

    // Calculate Verified Skills Score
    let verifiedSkillsScore = 0;
    let hasSkills = false;
    if (skillProfile && skillProfile.skills && skillProfile.skills.length > 0) {
      const verified = skillProfile.skills.filter(
        (s: any) => s.verificationStatus === 'VERIFIED',
      );
      if (verified.length > 0) {
        hasSkills = true;
        // Normalization: Level 1 -> 20, 2 -> 40, 3 -> 60, 4 -> 80, 5 -> 100
        const total = verified.reduce(
          (sum: number, skill: any) => sum + skill.level * 20,
          0,
        );
        verifiedSkillsScore = total / verified.length;
      }
    }

    // Calculate Assessments Score
    let assessmentsScore = 0;
    let hasAssessments = false;
    if (attempts && attempts.length > 0) {
      hasAssessments = true;
      // Get best score per assessment
      const bestScores = new Map<string, number>();
      for (const attempt of attempts) {
        const id = attempt.assessmentId.toString();
        const currentBest = bestScores.get(id) || 0;
        if (attempt.percentage > currentBest) {
          bestScores.set(id, attempt.percentage);
        }
      }

      const sum = Array.from(bestScores.values()).reduce((a, b) => a + b, 0);
      assessmentsScore = sum / bestScores.size;
    }

    // Calculate Academics Score
    let academicsScore = 0;
    let hasAcademics = false;
    if (profile && typeof profile.cgpa === 'number') {
      hasAcademics = true;
      // Normalize assuming 10 point scale
      academicsScore = Math.min((profile.cgpa / 10) * 100, 100);
    }

    // Calculate Projects Score
    let projectsScore = 0;
    let hasProjects = false;
    if (projects && projects.length > 0) {
      hasProjects = true;
      // Conservative heuristic: 1 verified project = 50, 2+ = 100
      projectsScore = projects.length >= 2 ? 100 : 50;
    }

    // Calculate Interviews Score
    let interviewsScore = 0;
    let hasInterviews = false;
    if (interviews && interviews.length > 0) {
      hasInterviews = true;
      let totalScore = 0;
      let count = 0;
      for (const iv of interviews) {
        if (iv.rubricScores) {
          const vals = Object.values(iv.rubricScores) as number[];
          if (vals.length > 0) {
            const avg10 = vals.reduce((a, b) => a + b, 0) / vals.length;
            totalScore += avg10 * 10;
            count++;
          }
        }
      }
      if (count > 0) {
        interviewsScore = totalScore / count;
      }
    }

    // Apply exact formula
    const verifiedSkillsContrib =
      verifiedSkillsScore * READINESS_WEIGHTS.verifiedSkills;
    const assessmentsContrib = assessmentsScore * READINESS_WEIGHTS.assessments;
    const academicsContrib = academicsScore * READINESS_WEIGHTS.academics;
    const projectsContrib = projectsScore * READINESS_WEIGHTS.projects;
    const interviewsContrib = interviewsScore * READINESS_WEIGHTS.interviews;

    const overallScore =
      Math.round(
        (verifiedSkillsContrib +
          assessmentsContrib +
          academicsContrib +
          projectsContrib +
          interviewsContrib) *
          10,
      ) / 10; // 1 decimal place

    let status: ReadinessStatus = 'NEEDS_PREPARATION';
    if (overallScore >= 80) status = 'READY';
    else if (overallScore >= 60) status = 'DEVELOPING';

    const coverageCount = [
      hasSkills,
      hasAssessments,
      hasAcademics,
      hasProjects,
      hasInterviews,
    ].filter(Boolean).length;

    // Generate Strengths and Areas to Improve
    const strengths: string[] = [];
    const areasToImprove: string[] = [];

    if (hasSkills) {
      if (verifiedSkillsScore >= 80)
        strengths.push('Strong verified skill profile');
      else if (verifiedSkillsScore < 60)
        areasToImprove.push('Verified Skills depth');
    }

    if (hasAssessments) {
      if (assessmentsScore >= 80)
        strengths.push('Excellent assessment performance');
      else if (assessmentsScore < 60)
        areasToImprove.push('Assessment performance');
    }

    if (hasInterviews) {
      if (interviewsScore >= 80)
        strengths.push('Strong interview communication and problem solving');
      else if (interviewsScore < 60)
        areasToImprove.push('Mock interview performance');
    }

    if (hasProjects) {
      if (projectsScore >= 80) strengths.push('Good project evidence');
      else if (projectsScore < 60)
        areasToImprove.push('Project portfolio depth');
    }

    // Check if anything actually changed to prevent duplicate snapshots
    const latestSnapshot = await this.snapshotModel
      .findOne({ studentId })
      .sort({ calculatedAt: -1 })
      .lean()
      .exec();

    if (
      latestSnapshot &&
      latestSnapshot.overallScore === overallScore &&
      latestSnapshot.verifiedSkillsScore === verifiedSkillsScore &&
      latestSnapshot.assessmentsScore === assessmentsScore &&
      latestSnapshot.academicsScore === academicsScore &&
      latestSnapshot.projectsScore === projectsScore &&
      latestSnapshot.interviewsScore === interviewsScore
    ) {
      this.logger.log(
        `Skipping duplicate readiness snapshot for student ${studentId}`,
      );
      return { ...latestSnapshot, id: latestSnapshot._id?.toString() };
    }

    const snapshotData = {
      studentId,
      overallScore,
      status,
      verifiedSkillsScore,
      assessmentsScore,
      academicsScore,
      projectsScore,
      interviewsScore,
      factorWeights: READINESS_WEIGHTS,
      coverageCount,
      explanation: {
        factors: [
          {
            key: 'verifiedSkills',
            score: verifiedSkillsScore,
            weight: READINESS_WEIGHTS.verifiedSkills,
            contribution: verifiedSkillsContrib,
            coverage: hasSkills,
          },
          {
            key: 'assessments',
            score: assessmentsScore,
            weight: READINESS_WEIGHTS.assessments,
            contribution: assessmentsContrib,
            coverage: hasAssessments,
          },
          {
            key: 'academics',
            score: academicsScore,
            weight: READINESS_WEIGHTS.academics,
            contribution: academicsContrib,
            coverage: hasAcademics,
          },
          {
            key: 'projects',
            score: projectsScore,
            weight: READINESS_WEIGHTS.projects,
            contribution: projectsContrib,
            coverage: hasProjects,
          },
          {
            key: 'interviews',
            score: interviewsScore,
            weight: READINESS_WEIGHTS.interviews,
            contribution: interviewsContrib,
            coverage: hasInterviews,
          },
        ],
        strengths,
        areasToImprove,
      },
      calculatedAt: new Date().toISOString(),
    };

    const newSnapshot = new this.snapshotModel(snapshotData);
    await newSnapshot.save();
    return newSnapshot.toJSON();
  }

  // Exact testing method exposed for unit test validation
  calculateExactFormula(
    verifiedSkills: number,
    assessments: number,
    academics: number,
    projects: number,
    interviews: number,
  ) {
    const total =
      verifiedSkills * READINESS_WEIGHTS.verifiedSkills +
      assessments * READINESS_WEIGHTS.assessments +
      academics * READINESS_WEIGHTS.academics +
      projects * READINESS_WEIGHTS.projects +
      interviews * READINESS_WEIGHTS.interviews;

    return Math.round(total * 10) / 10;
  }
}
