import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PlacementApplication,
  ApplicationDocument,
} from './schemas/application.schema.js';
import { DrivesService } from '../drives/drives.service.js';
import { EligibilityService } from '../eligibility/eligibility.service.js';
import { MatchingService } from '../matching/matching.service.js';
import { ReadinessService } from '../readiness/readiness.service.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ApplicationStatus,
  ReviewApplicationDto,
  DriveStatus,
} from '@placecampus/shared-types';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectModel(PlacementApplication.name)
    private applicationModel: Model<ApplicationDocument>,
    private drivesService: DrivesService,
    private eligibilityService: EligibilityService,
    private matchingService: MatchingService,
    private readinessService: ReadinessService,
    @Optional() private eventEmitter?: EventEmitter2,
  ) {}

  async applyToDrive(driveId: string, studentId: string) {
    // 1. Verify drive
    const drive = await this.drivesService.findOnePublished(driveId);
    if (!drive) {
      throw new NotFoundException('Drive not found or not published');
    }

    if (drive.status !== DriveStatus.PUBLISHED) {
      throw new BadRequestException('Drive is not accepting applications');
    }

    // 2. Prevent duplicates
    const existing = await this.applicationModel.findOne({
      driveId,
      studentId,
    });
    if (existing) {
      throw new ConflictException('You have already applied to this drive');
    }

    // 3. Evaluate eligibility
    const eligibility = await this.eligibilityService.calculateForStudent(
      driveId,
      studentId,
    );
    if (!eligibility.eligible) {
      throw new ForbiddenException(
        'You are not eligible to apply for this drive',
      );
    }

    // 4. Gather snapshots
    const matchSnapshot = await this.matchingService.calculateForStudent(
      driveId,
      studentId,
    );
    const readinessSnapshot = await this.readinessService
      .getLatestSnapshot(studentId)
      .catch(() => null);

    // 5. Create application
    const application = await this.applicationModel.create({
      driveId,
      studentId,
      status: ApplicationStatus.APPLIED,
      eligibilitySnapshot: eligibility,
      matchSnapshot,
      readinessSnapshot,
    });
    this.eventEmitter?.emit('application.created', { application });
    return application;
  }

  async getStudentApplications(studentId: string) {
    return this.applicationModel
      .find({ studentId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getStudentApplication(id: string, studentId: string) {
    const app = await this.applicationModel
      .findOne({ _id: id, studentId })
      .exec();
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  async withdrawApplication(id: string, studentId: string) {
    const app = await this.getStudentApplication(id, studentId);
    if (app.status !== ApplicationStatus.APPLIED) {
      throw new BadRequestException(
        'Can only withdraw applications in APPLIED state',
      );
    }
    app.status = ApplicationStatus.WITHDRAWN;
    const saved = await app.save();
    this.eventEmitter?.emit('application.status-changed', { application: saved, previousStatus: ApplicationStatus.APPLIED });
    return saved;
  }

  // --- Placement Officer Methods ---

  async findAllForDrive(driveId: string) {
    return this.applicationModel
      .find({ driveId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAllForDrivePaginated(driveId: string, page: number, limit: number, status?: string, query?: string) {
    const filter: any = { driveId };
    if (status) {
      filter.status = status;
    }
    // Note: To implement text search properly on applications, we might need to lookup user details.
    // For now, filtering by status is the primary backend filter.
    
    const skip = (page - 1) * limit;
    
    const [applications, total] = await Promise.all([
      this.applicationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.applicationModel.countDocuments(filter).exec()
    ]);

    return { applications, total };
  }

  async findOne(id: string) {
    const app = await this.applicationModel.findById(id).exec();
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  async findOneForPlacement(id: string) {
    const app = await this.applicationModel.findById(id).exec();
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  async reviewApplication(
    id: string,
    dto: ReviewApplicationDto,
    reviewerId: string,
  ) {
    const app = await this.findOneForPlacement(id);

    // Valid transitions
    const validTransitions: Record<string, string[]> = {
      [ApplicationStatus.APPLIED]: [ApplicationStatus.UNDER_REVIEW],
      [ApplicationStatus.UNDER_REVIEW]: [
        ApplicationStatus.SHORTLISTED,
        ApplicationStatus.REJECTED,
      ],
    };

    const allowedNext = validTransitions[app.status] || [];
    if (!allowedNext.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition application from ${app.status} to ${dto.status}`,
      );
    }

    const previousStatus = app.status;
    app.status = dto.status;
    app.reviewedBy = reviewerId;
    app.reviewedAt = new Date();
    if (dto.reviewerComment) app.reviewerComment = dto.reviewerComment;
    if (dto.rejectionReason && dto.status === ApplicationStatus.REJECTED) {
      app.rejectionReason = dto.rejectionReason;
    }

    const saved = await app.save();
    this.eventEmitter?.emit('application.status-changed', { application: saved, previousStatus });
    return saved;
  }
}
