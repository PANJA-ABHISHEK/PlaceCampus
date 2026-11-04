import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Evidence } from '../evidence/schemas/evidence.schema.js';
import { VerificationRecord } from '../verification/schemas/verification-record.schema.js';
import { EvidenceStatus, UserRole } from '@placecampus/shared-types';
import { ReviewDecisionDto, ReviewAction } from './dto/review-decision.dto.js';
import { StorageService } from '../storage/storage.service.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User, UserDocument } from '../users/schemas/user.schema.js';
import {
  StudentProfile,
  StudentProfileDocument,
} from '../students/schemas/student-profile.schema.js';
import {
  AVAILABLE_FACULTY,
  AssignmentsService,
  REVIEW_LOCK_MS,
  activeFilter,
  sameDataClass,
} from '../assignments/assignments.service.js';
import { FacultyAssignment, FacultyAssignmentDocument } from '../assignments/schemas/faculty-assignment.schema.js';
import { AuditService } from '../audit/audit.service.js';

/** Escalation reason codes (Master Plan §12.8). */
export const ESCALATION_REASONS = ['CONFLICT_OF_INTEREST', 'NEEDS_SUBJECT_EXPERT', 'SUSPECTED_FRAUD', 'POLICY_QUESTION'] as const;
export type EscalationReason = (typeof ESCALATION_REASONS)[number];

/** Who is asking: reviewers see only items routed to them; administrators see all. */
export interface ReviewViewer {
  userId: string;
  role?: string;
}

const PENDING = [EvidenceStatus.NEEDS_REVIEW, EvidenceStatus.RESUBMISSION_REQUESTED];

@Injectable()
export class FacultyService {
  constructor(
    @InjectModel(Evidence.name) private evidenceModel: Model<Evidence>,
    @InjectModel(VerificationRecord.name)
    private recordModel: Model<VerificationRecord>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(StudentProfile.name)
    private profileModel: Model<StudentProfileDocument>,
    @InjectModel(FacultyAssignment.name)
    private assignmentModel: Model<FacultyAssignmentDocument>,
    private storageService: StorageService,
    private eventEmitter: EventEmitter2,
    private assignments: AssignmentsService,
    private audit: AuditService,
  ) {}

  private isAdmin(viewer: ReviewViewer) {
    return viewer.role === UserRole.ADMIN;
  }

  /** Reviewers may only act on items routed to them (`evidence:review:assigned`). */
  private assertReviewer(evidence: { reviewerId?: string }, viewer: ReviewViewer) {
    if (this.isAdmin(viewer)) return;
    if (evidence.reviewerId !== viewer.userId) {
      throw new ForbiddenException('This review is assigned to another reviewer.');
    }
  }

  /** Names and registration numbers for the students behind a set of items. */
  async studentRefs(studentIds: string[]) {
    const ids = [...new Set(studentIds)].filter((id) => Types.ObjectId.isValid(id));
    const [users, profiles] = await Promise.all([
      this.userModel.find({ _id: { $in: ids } }).select('fullName').lean().exec(),
      this.profileModel
        .find({ userId: { $in: ids } })
        .select('userId registrationNumber')
        .lean()
        .exec(),
    ]);
    const reg = new Map(profiles.map((p: any) => [String(p.userId), p.registrationNumber]));
    return new Map(
      users.map((u: any) => [
        String(u._id),
        { id: String(u._id), fullName: u.fullName, registrationNumber: reg.get(String(u._id)) },
      ]),
    );
  }

  /** Lean evidence -> API shape: id, no storage key, review state and overdue flag. */
  private serialize(e: any, refs?: Map<string, any>) {
    const now = Date.now();
    const doc = { ...e, id: e._id.toString() };
    delete (doc as any)._id;
    delete (doc as any).__v;
    if (doc.document && (doc.document as any).key) {
      doc.document = { ...doc.document };
      delete (doc.document as any).key;
    }
    const lockActive = e.reviewLockExpiresAt && new Date(e.reviewLockExpiresAt).getTime() > now;
    return {
      ...doc,
      reviewState: lockActive ? 'CLAIMED' : 'ASSIGNED',
      overdue:
        e.status === EvidenceStatus.NEEDS_REVIEW &&
        !!e.reviewDueAt &&
        new Date(e.reviewDueAt).getTime() < now,
      student: refs?.get(String(e.studentId)) ?? null,
    };
  }

  async getPendingReviews(viewer: ReviewViewer, query: any = {}): Promise<any[]> {
    const filter: any = { status: { $in: PENDING } };

    if (query.status === 'ALL') {
      filter.status = {
        $in: [
          EvidenceStatus.UNVERIFIED,
          EvidenceStatus.PROCESSING,
          EvidenceStatus.NEEDS_REVIEW,
          EvidenceStatus.RESUBMISSION_REQUESTED,
        ],
      };
    } else if (query.status) {
      filter.status = query.status;
    }
    if (query.type) filter.type = query.type;
    if (query.filter === 'overdue') {
      filter.status = EvidenceStatus.NEEDS_REVIEW;
      filter.reviewDueAt = { $lt: new Date() };
    }
    if (!this.isAdmin(viewer)) filter.reviewerId = viewer.userId;

    const evidence = await this.evidenceModel
      .find(filter)
      .sort({ reviewDueAt: 1, createdAt: 1 }) // most urgent first
      .limit(50)
      .lean()
      .exec();

    const refs = await this.studentRefs(evidence.map((e) => e.studentId));
    return evidence.map((e) => this.serialize(e, refs));
  }

  async getReviewDetail(evidenceId: string, viewer: ReviewViewer): Promise<any> {
    const evidence = await this.evidenceModel.findById(evidenceId).lean().exec();
    if (!evidence) throw new NotFoundException('Evidence not found');
    this.assertReviewer(evidence, viewer);

    const record = await this.recordModel
      .findOne({ evidenceId })
      .sort({ attemptNumber: -1 })
      .lean()
      .exec();

    const refs = await this.studentRefs([evidence.studentId]);
    return {
      evidence: this.serialize(evidence, refs),
      verificationRecord: record ? { ...record, id: record._id.toString() } : null,
    };
  }

  /**
   * Claims (or renews) the 30-minute soft lock. Only the assigned reviewer can
   * claim; another holder's active lock blocks it.
   */
  async claimReview(evidenceId: string, viewer: ReviewViewer) {
    const evidence = await this.evidenceModel.findById(evidenceId).exec();
    if (!evidence) throw new NotFoundException('Evidence not found');
    this.assertReviewer(evidence, viewer);
    if (evidence.status !== EvidenceStatus.NEEDS_REVIEW) {
      throw new BadRequestException(`Evidence is ${evidence.status} and cannot be claimed.`);
    }
    const now = Date.now();
    if (
      evidence.reviewClaimedBy &&
      evidence.reviewClaimedBy !== viewer.userId &&
      evidence.reviewLockExpiresAt &&
      evidence.reviewLockExpiresAt.getTime() > now
    ) {
      throw new ConflictException('Another reviewer is working on this item.');
    }
    evidence.reviewClaimedBy = viewer.userId;
    evidence.reviewLockExpiresAt = new Date(now + REVIEW_LOCK_MS);
    await evidence.save();
    return { reviewState: 'CLAIMED', reviewLockExpiresAt: evidence.reviewLockExpiresAt.toISOString() };
  }

  /** Releases the lock the caller holds; the item stays assigned to them. */
  async releaseReview(evidenceId: string, viewer: ReviewViewer) {
    const evidence = await this.evidenceModel.findById(evidenceId).exec();
    if (!evidence) throw new NotFoundException('Evidence not found');
    this.assertReviewer(evidence, viewer);
    if (evidence.reviewClaimedBy === viewer.userId) {
      evidence.reviewClaimedBy = undefined;
      evidence.reviewLockExpiresAt = undefined;
      await evidence.save();
    }
    return { reviewState: 'ASSIGNED' };
  }

  async makeDecision(
    evidenceId: string,
    viewer: ReviewViewer,
    decision: ReviewDecisionDto,
  ): Promise<any> {
    const facultyId = viewer.userId;
    const evidence = await this.evidenceModel.findById(evidenceId).exec();
    if (!evidence) throw new NotFoundException('Evidence not found');
    this.assertReviewer(evidence, viewer);

    if (
      evidence.status !== EvidenceStatus.NEEDS_REVIEW &&
      evidence.status !== EvidenceStatus.RESUBMISSION_REQUESTED
    ) {
      throw new BadRequestException(
        `Evidence is currently ${evidence.status} and cannot be reviewed.`,
      );
    }

    if (
      evidence.reviewClaimedBy &&
      evidence.reviewClaimedBy !== facultyId &&
      evidence.reviewLockExpiresAt &&
      evidence.reviewLockExpiresAt.getTime() > Date.now()
    ) {
      throw new ConflictException('Another reviewer is working on this item.');
    }

    if (
      (decision.action === ReviewAction.REJECT ||
        decision.action === ReviewAction.REQUEST_RESUBMISSION) &&
      !decision.reason
    ) {
      throw new BadRequestException(
        'A reason must be provided for rejection or resubmission request.',
      );
    }

    let finalStatus: EvidenceStatus;
    if (decision.action === ReviewAction.APPROVE)
      finalStatus = EvidenceStatus.VERIFIED;
    else if (decision.action === ReviewAction.REJECT)
      finalStatus = EvidenceStatus.REJECTED;
    else finalStatus = EvidenceStatus.RESUBMISSION_REQUESTED;

    // Update Evidence
    evidence.status = finalStatus;

    if (
      finalStatus === EvidenceStatus.REJECTED ||
      finalStatus === EvidenceStatus.RESUBMISSION_REQUESTED
    ) {
      evidence.rejectionReason = decision.reason;
    } else {
      evidence.rejectionReason = undefined;
    }

    if (finalStatus === EvidenceStatus.VERIFIED) {
      evidence.verifiedAt = new Date().toISOString();
    }

    // The decision completes the task: drop the lock (the reviewer stays on record).
    evidence.reviewClaimedBy = undefined;
    evidence.reviewLockExpiresAt = undefined;

    await evidence.save();

    // Update the latest verification record with the human decision
    const record = await this.recordModel
      .findOne({ evidenceId })
      .sort({ attemptNumber: -1 })
      .exec();

    if (record) {
      record.finalDecision = finalStatus;
      if (decision.reason) {
        // Append human reason to reasons
        record.reasons = record.reasons || [];
        record.reasons.push(`Faculty Note: ${decision.reason}`);
      }
      record.reviewedBy = facultyId;
      record.reviewedAt = new Date().toISOString();
      record.reviewerComments = decision.reason;
      await record.save();
    }

    if (finalStatus === EvidenceStatus.VERIFIED) {
      this.eventEmitter.emit('evidence.verified', { evidence, record });
    }
    this.eventEmitter.emit('evidence.decision', { evidence, record });

    return this.getReviewDetail(evidenceId, viewer);
  }

  /**
   * Hands the item to the Review Coordinator queue with a reason code. It leaves
   * the reviewer's queue; the coordinator reassigns it (Master Plan §12.8).
   */
  async escalate(evidenceId: string, viewer: ReviewViewer, dto: { reasonCode: EscalationReason; comment?: string }) {
    const evidence = await this.evidenceModel.findById(evidenceId).exec();
    if (!evidence) throw new NotFoundException('Evidence not found');
    this.assertReviewer(evidence, viewer);
    if (evidence.status !== EvidenceStatus.NEEDS_REVIEW) throw new BadRequestException(`Evidence is ${evidence.status} and cannot be escalated.`);
    if (dto.reasonCode === 'POLICY_QUESTION' && !dto.comment?.trim()) throw new BadRequestException('Describe the policy question.');
    evidence.reviewEscalation = { reasonCode: dto.reasonCode, comment: dto.comment, by: viewer.userId, at: new Date(), previousReviewerId: evidence.reviewerId };
    evidence.reviewQueue = 'COORDINATOR';
    evidence.reviewerId = undefined;
    evidence.reviewClaimedBy = undefined;
    evidence.reviewLockExpiresAt = undefined;
    await evidence.save();
    await this.audit.logAction({
      actorId: viewer.userId, actorRole: viewer.role ?? UserRole.FACULTY, action: 'REVIEW_ESCALATED', resourceType: 'EVIDENCE',
      resourceId: evidenceId, studentId: evidence.studentId, reason: dto.reasonCode, metadata: { comment: dto.comment },
    });
    return { reviewQueue: 'COORDINATOR' };
  }

  /** Review Coordinator queue (unroutable + escalated) or every overdue item. */
  async coordinatorQueue(filter: 'coordinator' | 'overdue' = 'coordinator') {
    const query: Record<string, unknown> =
      filter === 'overdue'
        ? { status: EvidenceStatus.NEEDS_REVIEW, reviewDueAt: { $lt: new Date() } }
        : { status: EvidenceStatus.NEEDS_REVIEW, reviewQueue: 'COORDINATOR' };
    const items = await this.evidenceModel.find(query).sort({ reviewDueAt: 1 }).limit(200).lean().exec();
    const refs = await this.studentRefs(items.map((e) => e.studentId));
    const reviewers = await this.userModel
      .find({ _id: { $in: items.map((e) => e.reviewerId ?? e.reviewEscalation?.previousReviewerId).filter((id): id is string => !!id && Types.ObjectId.isValid(id)) } })
      .select('fullName')
      .lean()
      .exec();
    const reviewerName = new Map(reviewers.map((r) => [String(r._id), r.fullName]));
    return items.map((e) => ({
      ...this.serialize(e, refs),
      reviewerName: e.reviewerId ? (reviewerName.get(e.reviewerId) ?? null) : null,
      previousReviewerName: e.reviewEscalation?.previousReviewerId ? (reviewerName.get(e.reviewEscalation.previousReviewerId) ?? null) : null,
    }));
  }

  /** Coordinator reassignment: validates availability, data class and conflicts. */
  async reassignReview(evidenceId: string, reviewerId: string, reason: string, actor: ReviewViewer) {
    if (!reason?.trim()) throw new BadRequestException('A reason is required.');
    if (!Types.ObjectId.isValid(reviewerId)) throw new BadRequestException('Invalid reviewer');
    const evidence = await this.evidenceModel.findById(evidenceId).exec();
    if (!evidence) throw new NotFoundException('Evidence not found');
    if (evidence.status !== EvidenceStatus.NEEDS_REVIEW) throw new BadRequestException(`Evidence is ${evidence.status}.`);
    if (reviewerId === evidence.studentId) throw new BadRequestException('Students cannot review their own evidence.');
    const profile = await this.profileModel.findOne({ userId: evidence.studentId }).lean().exec();
    const reviewer = await this.userModel.findOne({ $and: [{ _id: reviewerId }, AVAILABLE_FACULTY, sameDataClass(!!profile?.isDemoData)] }).lean().exec();
    if (!reviewer) throw new BadRequestException('That reviewer is not available (or belongs to the other data class: demo vs real).');
    const conflict = await this.assignmentModel.exists({ studentId: evidence.studentId, facultyUserId: reviewerId, conflictOfInterest: true, ...activeFilter() }).exec();
    if (conflict) throw new BadRequestException('That reviewer has a declared conflict of interest with this student.');
    const previous = evidence.reviewerId ?? evidence.reviewEscalation?.previousReviewerId;
    await this.assignments.assignReviewer(evidence as any, reviewerId);
    await this.audit.logAction({
      actorId: actor.userId, actorRole: actor.role ?? UserRole.ADMIN, action: 'REVIEW_REASSIGNED', resourceType: 'EVIDENCE',
      resourceId: evidenceId, studentId: evidence.studentId, reason, metadata: { from: previous ?? null, to: reviewerId },
    });
    return { reviewerId, reviewDueAt: evidence.reviewDueAt };
  }

  async getDocumentMeta(evidenceId: string, viewer: ReviewViewer) {
    const evidence = await this.evidenceModel.findById(evidenceId).exec();
    if (!evidence || !evidence.document) {
      throw new NotFoundException('Evidence document not found');
    }
    this.assertReviewer(evidence, viewer);
    return evidence.document;
  }
}
