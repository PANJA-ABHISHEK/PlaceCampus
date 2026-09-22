import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ReviewTask,
  type ReviewTaskDocument,
  ReviewStatus,
} from './schemas/review-task.schema.js';
import { EvidenceService } from '../evidence/evidence.service.js';
import { EvidenceStatus } from '../evidence/schemas/evidence.schema.js';

@Injectable()
export class FacultyReviewService {
  private readonly logger = new Logger(FacultyReviewService.name);

  constructor(
    @InjectModel(ReviewTask.name)
    private readonly reviewModel: Model<ReviewTaskDocument>,
    private readonly evidenceService: EvidenceService,
  ) {}

  async createReviewTask(
    evidenceId: string,
    studentId: string,
    aiAnalysis?: Record<string, unknown>,
    aiReasons?: string[],
  ): Promise<ReviewTask> {
    const existing = await this.reviewModel
      .findOne({ evidenceId: new Types.ObjectId(evidenceId) })
      .exec();
    if (existing) {
      return existing;
    }

    const task = new this.reviewModel({
      evidenceId: new Types.ObjectId(evidenceId),
      studentId: new Types.ObjectId(studentId),
      status: ReviewStatus.PENDING,
      aiAnalysis,
      aiReasons: aiReasons ?? [],
    });

    return task.save();
  }

  async findPendingReviews(filters?: {
    facultyId?: string;
    status?: ReviewStatus;
    page?: number;
    limit?: number;
  }): Promise<{ reviews: ReviewTask[]; total: number }> {
    const query: Record<string, unknown> = {};
    if (filters?.status) {
      query['status'] = filters.status;
    } else {
      query['status'] = ReviewStatus.PENDING;
    }
    if (filters?.facultyId) {
      query['assignedFacultyId'] = new Types.ObjectId(filters.facultyId);
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find(query)
        .populate('evidenceId')
        .populate('studentId', 'firstName lastName email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: 1 })
        .exec(),
      this.reviewModel.countDocuments(query).exec(),
    ]);

    return { reviews, total };
  }

  async findById(id: string): Promise<ReviewTask> {
    const review = await this.reviewModel
      .findById(id)
      .populate('evidenceId')
      .populate('studentId', 'firstName lastName email')
      .exec();
    if (!review) {
      throw new NotFoundException('Review task not found');
    }
    return review;
  }

  async approve(
    id: string,
    facultyId: string,
    comments?: string,
  ): Promise<ReviewTask> {
    const review = await this.findById(id);
    if (review.status !== ReviewStatus.PENDING) {
      throw new BadRequestException('Review is not in PENDING status');
    }

    const updated = await this.reviewModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: ReviewStatus.APPROVED,
            reviewedBy: new Types.ObjectId(facultyId),
            reviewedAt: new Date(),
            facultyComments: comments,
          },
        },
        { new: true },
      )
      .exec();

    // Update evidence status to VERIFIED
    await this.evidenceService.updateStatus(
      review.evidenceId.toString(),
      EvidenceStatus.VERIFIED,
      { verifiedBy: facultyId, reviewNotes: comments },
    );

    this.logger.log(`Review ${id} approved by faculty ${facultyId}`);
    return updated!;
  }

  async reject(
    id: string,
    facultyId: string,
    rejectionReason: string,
  ): Promise<ReviewTask> {
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      throw new BadRequestException('Rejection reason is required');
    }

    const review = await this.findById(id);
    if (review.status !== ReviewStatus.PENDING) {
      throw new BadRequestException('Review is not in PENDING status');
    }

    const updated = await this.reviewModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: ReviewStatus.REJECTED,
            reviewedBy: new Types.ObjectId(facultyId),
            reviewedAt: new Date(),
            rejectionReason,
          },
        },
        { new: true },
      )
      .exec();

    // Update evidence status to REJECTED
    await this.evidenceService.updateStatus(
      review.evidenceId.toString(),
      EvidenceStatus.REJECTED,
      { verifiedBy: facultyId, rejectionReason },
    );

    this.logger.log(`Review ${id} rejected by faculty ${facultyId}`);
    return updated!;
  }

  async requestResubmission(
    id: string,
    facultyId: string,
    comments: string,
  ): Promise<ReviewTask> {
    const review = await this.findById(id);
    if (review.status !== ReviewStatus.PENDING) {
      throw new BadRequestException('Review is not in PENDING status');
    }

    const updated = await this.reviewModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: ReviewStatus.RESUBMISSION_REQUESTED,
            reviewedBy: new Types.ObjectId(facultyId),
            reviewedAt: new Date(),
            facultyComments: comments,
          },
        },
        { new: true },
      )
      .exec();

    await this.evidenceService.updateStatus(
      review.evidenceId.toString(),
      EvidenceStatus.REJECTED,
      { verifiedBy: facultyId, rejectionReason: `Resubmission requested: ${comments}` },
    );

    this.logger.log(`Review ${id} – resubmission requested by faculty ${facultyId}`);
    return updated!;
  }

  async getPendingCount(facultyId?: string): Promise<number> {
    const query: Record<string, unknown> = {
      status: ReviewStatus.PENDING,
    };
    if (facultyId) {
      query['assignedFacultyId'] = new Types.ObjectId(facultyId);
    }
    return this.reviewModel.countDocuments(query).exec();
  }
}
