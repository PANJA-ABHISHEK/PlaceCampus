import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Evidence } from '../evidence/schemas/evidence.schema.js';
import { VerificationRecord } from '../verification/schemas/verification-record.schema.js';
import { EvidenceStatus } from '@placecampus/shared-types';
import { ReviewDecisionDto, ReviewAction } from './dto/review-decision.dto.js';
import { StorageService } from '../storage/storage.service.js';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class FacultyService {
  constructor(
    @InjectModel(Evidence.name) private evidenceModel: Model<Evidence>,
    @InjectModel(VerificationRecord.name)
    private recordModel: Model<VerificationRecord>,
    private storageService: StorageService,
    private eventEmitter: EventEmitter2,
  ) {}

  async getPendingReviews(query: any = {}): Promise<any[]> {
    const filter: any = {
      status: {
        $in: [
          EvidenceStatus.NEEDS_REVIEW,
          EvidenceStatus.RESUBMISSION_REQUESTED,
        ],
      },
    };

    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;

    const evidence = await this.evidenceModel
      .find(filter)
      .sort({ createdAt: 1 }) // oldest first
      .limit(50)
      .lean()
      .exec();

    // Remove internal keys
    return evidence.map((e) => {
      const doc = { ...e, id: e._id.toString() };
      delete (doc as any)._id;
      delete (doc as any).__v;
      if (doc.document && (doc.document as any).key)
        delete (doc.document as any).key;
      return doc;
    });
  }

  async getReviewDetail(evidenceId: string): Promise<any> {
    const evidence = await this.evidenceModel
      .findById(evidenceId)
      .lean()
      .exec();
    if (!evidence) throw new NotFoundException('Evidence not found');

    const record = await this.recordModel
      .findOne({ evidenceId })
      .sort({ attemptNumber: -1 })
      .lean()
      .exec();

    const doc = { ...evidence, id: evidence._id.toString() };
    delete (doc as any)._id;
    delete (doc as any).__v;
    if (doc.document && (doc.document as any).key)
      delete (doc.document as any).key;

    return {
      evidence: doc,
      verificationRecord: record
        ? { ...record, id: record._id.toString() }
        : null,
    };
  }

  async makeDecision(
    evidenceId: string,
    facultyId: string,
    decision: ReviewDecisionDto,
  ): Promise<any> {
    const evidence = await this.evidenceModel.findById(evidenceId).exec();
    if (!evidence) throw new NotFoundException('Evidence not found');

    if (
      evidence.status !== EvidenceStatus.NEEDS_REVIEW &&
      evidence.status !== EvidenceStatus.RESUBMISSION_REQUESTED
    ) {
      throw new BadRequestException(
        `Evidence is currently ${evidence.status} and cannot be reviewed.`,
      );
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

    return this.getReviewDetail(evidenceId);
  }

  async getDocumentMeta(evidenceId: string) {
    const evidence = await this.evidenceModel.findById(evidenceId).exec();
    if (!evidence || !evidence.document) {
      throw new NotFoundException('Evidence document not found');
    }
    // We do NOT check ownership here, because faculty is authorized via roles guard
    return evidence.document;
  }
}
