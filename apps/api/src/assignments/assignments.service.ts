import { Injectable, Logger, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Model } from 'mongoose';
import {
  EvidenceStatus,
  EvidenceType,
  FacultyAssignmentPurpose,
  UserRole,
} from '@placecampus/shared-types';
import {
  FacultyAssignment,
  FacultyAssignmentDocument,
} from './schemas/faculty-assignment.schema.js';
import { Evidence } from '../evidence/schemas/evidence.schema.js';
import { User, UserDocument } from '../users/schemas/user.schema.js';
import {
  StudentProfile,
  StudentProfileDocument,
} from '../students/schemas/student-profile.schema.js';

/** Review service level from the Master Plan (§12.8): 3 working days. */
export const REVIEW_SLA_WORKING_DAYS = 3;
/** Soft lock a reviewer holds while working on an item; renewed while open. */
export const REVIEW_LOCK_MS = 30 * 60 * 1000;

/** Adds working days, skipping Saturdays and Sundays. */
export function addWorkingDays(from: Date, days: number): Date {
  const date = new Date(from);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return date;
}

/** Assignments in force right now. */
export function activeFilter(now = new Date()) {
  return {
    status: 'ACTIVE',
    validFrom: { $lte: now },
    $or: [{ validTo: null }, { validTo: { $exists: false } }, { validTo: { $gt: now } }],
  };
}

/**
 * Faculty who may receive new work: faculty role (primary or extra), not
 * relieved or on leave, account not suspended or deactivated. Invited accounts
 * count: they are expected to activate.
 */
export const AVAILABLE_FACULTY = {
  $and: [
    { $or: [{ role: UserRole.FACULTY }, { roles: UserRole.FACULTY }] },
    { employmentStatus: { $nin: ['RELIEVED', 'ON_LEAVE'] } },
    { accountStatus: { $nin: ['SUSPENDED', 'DEACTIVATED'] } },
    { $or: [{ isActive: true }, { accountStatus: 'INVITED' }] },
  ],
};

/** Demo (synthetic) and real records are never paired. */
export const sameDataClass = (isDemo: boolean | undefined) =>
  isDemo ? { isDemoData: true } : { isDemoData: { $ne: true } };

@Injectable()
export class AssignmentsService implements OnModuleInit, OnApplicationBootstrap {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(
    @InjectModel(FacultyAssignment.name)
    private readonly assignmentModel: Model<FacultyAssignmentDocument>,
    @InjectModel(Evidence.name) private readonly evidenceModel: Model<Evidence>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(StudentProfile.name)
    private readonly profileModel: Model<StudentProfileDocument>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Data migration: legacy assignments get status ACTIVE, and the old
   * "one pair ever" index makes way for the partial (active-only) indexes.
   */
  async onModuleInit() {
    try {
      await this.assignmentModel.updateMany({ status: { $exists: false } }, { $set: { status: 'ACTIVE' } }).exec();
      await this.dropIndexIfPresent(this.assignmentModel, 'facultyUserId_1_studentId_1');
      await this.dropIndexIfPresent(this.profileModel, 'registrationNumber_1');
      await this.assignmentModel.createIndexes();
      await this.profileModel.createIndexes();
    } catch (error: any) {
      this.logger.error(`Assignment index migration failed: ${error.message}`);
    }
  }

  private async dropIndexIfPresent(model: Model<any>, name: string) {
    const indexes = await model.collection.indexes().catch(() => []);
    if (indexes.some((i: any) => i.name === name)) await model.collection.dropIndex(name);
  }

  /* ------------------------------------------------------------------ */
  /* Scope                                                               */
  /* ------------------------------------------------------------------ */

  /** Active assignments for a faculty member, optionally limited to purposes. */
  async assignmentsFor(facultyUserId: string, purposes?: FacultyAssignmentPurpose[]) {
    return this.assignmentModel
      .find({
        facultyUserId,
        ...activeFilter(),
        ...(purposes ? { purposes: { $in: purposes } } : {}),
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async isAssigned(facultyUserId: string, studentId: string) {
    const found = await this.assignmentModel
      .exists({ facultyUserId, studentId, ...activeFilter() })
      .exec();
    return !!found;
  }

  /* ------------------------------------------------------------------ */
  /* Review routing (Master Plan §12.8)                                  */
  /* ------------------------------------------------------------------ */

  @OnEvent('evidence.review_needed', { async: true })
  async onReviewNeeded({ evidenceId }: { evidenceId: string }) {
    try {
      await this.routeReview(evidenceId);
    } catch (error: any) {
      this.logger.error(`Could not route review for ${evidenceId}: ${error.message}`);
    }
  }

  /** Routes items that need review but have no reviewer and are not yet with the coordinator. */
  async onApplicationBootstrap() {
    const pending = await this.evidenceModel
      .find({ status: EvidenceStatus.NEEDS_REVIEW, reviewerId: { $in: [null, ''] }, reviewQueue: { $ne: 'COORDINATOR' } })
      .select('_id')
      .lean()
      .exec();
    for (const item of pending) await this.onReviewNeeded({ evidenceId: String(item._id) });
    if (pending.length) this.logger.log(`Routed ${pending.length} unassigned review(s).`);
  }

  /**
   * Picks a reviewer and stamps the item with reviewer, assignment time and due date.
   * 1. The student's assigned reviewers/mentors (project guides first for projects).
   * 2. The department review pool: available faculty of the student's department.
   * 3. Nobody: the Review Coordinator queue.
   * Conflicts of interest, the student themselves and the other data class
   * (demo vs real) are always excluded; among candidates the one with the
   * fewest open reviews wins, then least recently assigned. A resubmitted item
   * goes back to its previous reviewer while they remain eligible.
   */
  async routeReview(evidenceId: string) {
    const evidence = await this.evidenceModel.findById(evidenceId).exec();
    if (!evidence || evidence.status !== EvidenceStatus.NEEDS_REVIEW) return null;

    const studentId = evidence.studentId;
    const profile = await this.profileModel.findOne({ userId: studentId }).lean().exec();
    const isDemo = !!profile?.isDemoData;
    const assignments = await this.assignmentModel
      .find({ studentId, ...activeFilter() })
      .lean()
      .exec();
    const conflicted = new Set(
      assignments.filter((a) => a.conflictOfInterest).map((a) => a.facultyUserId),
    );
    const eligible = (id: string) => id !== studentId && !conflicted.has(id);

    let candidates: string[] = [];
    const usable = assignments.filter((a) => !a.conflictOfInterest);
    if (evidence.type === EvidenceType.PROJECT) {
      candidates = usable
        .filter((a) => a.purposes.includes(FacultyAssignmentPurpose.PROJECT_GUIDE))
        .map((a) => a.facultyUserId);
    }
    if (!candidates.length) {
      candidates = usable
        .filter((a) =>
          a.purposes.some(
            (p) =>
              p === FacultyAssignmentPurpose.EVIDENCE_REVIEWER ||
              p === FacultyAssignmentPurpose.MENTOR,
          ),
        )
        .map((a) => a.facultyUserId);
    }
    candidates = await this.onlyAvailable(candidates.filter(eligible), isDemo);

    if (evidence.reviewerId && candidates.includes(evidence.reviewerId)) {
      candidates = [evidence.reviewerId];
    }

    if (!candidates.length && profile?.department) {
      candidates = (await this.facultyIds({ department: profile.department }, isDemo)).filter(eligible);
    }

    if (!candidates.length) {
      evidence.reviewerId = undefined;
      evidence.reviewQueue = 'COORDINATOR';
      evidence.reviewAssignedAt = new Date();
      evidence.reviewDueAt = addWorkingDays(new Date(), REVIEW_SLA_WORKING_DAYS);
      await evidence.save();
      this.logger.warn(`No reviewer available for evidence ${evidenceId}; sent to the Review Coordinator queue.`);
      return null;
    }

    const reviewerId = await this.leastLoaded(candidates);
    await this.assignReviewer(evidence, reviewerId);
    return reviewerId;
  }

  /** Stamps reviewer, assignment time and a fresh due date; clears any lock and queue. */
  async assignReviewer(evidence: Evidence & { save: () => Promise<unknown>; _id: unknown }, reviewerId: string) {
    const now = new Date();
    evidence.reviewerId = reviewerId;
    evidence.reviewQueue = undefined;
    evidence.reviewAssignedAt = now;
    evidence.reviewDueAt = addWorkingDays(now, REVIEW_SLA_WORKING_DAYS);
    evidence.reviewClaimedBy = undefined;
    evidence.reviewLockExpiresAt = undefined;
    await evidence.save();
    this.eventEmitter.emit('review.assigned', {
      evidenceId: String(evidence._id),
      reviewerId,
      title: evidence.title,
      dueAt: evidence.reviewDueAt,
    });
  }

  async facultyIds(extra: Record<string, unknown>, isDemo: boolean) {
    const users = await this.userModel
      .find({ $and: [AVAILABLE_FACULTY, sameDataClass(isDemo), extra] })
      .select('_id')
      .lean()
      .exec();
    return users.map((u) => String(u._id));
  }

  private async onlyAvailable(ids: string[], isDemo: boolean) {
    if (!ids.length) return [];
    const valid = await this.facultyIds({ _id: { $in: ids } }, isDemo);
    return ids.filter((id) => valid.includes(id));
  }

  /** Fewest open reviews; ties go to whoever was assigned least recently. */
  async leastLoaded(candidates: string[]) {
    const stats = await this.evidenceModel
      .aggregate<{ _id: string; open: number; last: Date }>([
        { $match: { reviewerId: { $in: candidates } } },
        {
          $group: {
            _id: '$reviewerId',
            open: {
              $sum: { $cond: [{ $eq: ['$status', EvidenceStatus.NEEDS_REVIEW] }, 1, 0] },
            },
            last: { $max: '$reviewAssignedAt' },
          },
        },
      ])
      .exec();
    const byId = new Map(stats.map((s) => [s._id, s]));
    return [...candidates].sort((a, b) => {
      const sa = byId.get(a);
      const sb = byId.get(b);
      const openDiff = (sa?.open ?? 0) - (sb?.open ?? 0);
      if (openDiff) return openDiff;
      return (sa?.last?.getTime() ?? 0) - (sb?.last?.getTime() ?? 0);
    })[0];
  }
}
