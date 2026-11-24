import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * When applications open and close (epoch ms, or null if unbounded).
 * Drive dates are picked as calendar dates and stored as UTC midnight, so a
 * date-only deadline stays open through the end of that day.
 */
export function getApplicationWindow(drive: {
  applicationStart?: string | Date | null;
  applicationDeadline?: string | Date | null;
}) {
  const toMs = (value?: string | Date | null) => {
    if (!value) return null;
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? null : ms;
  };
  const opensAt = toMs(drive.applicationStart);
  const deadline = toMs(drive.applicationDeadline);
  const closesAt =
    deadline === null
      ? null
      : deadline % DAY_MS === 0
        ? deadline + DAY_MS - 1
        : deadline;
  return { opensAt, closesAt };
}

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

    // 1b. Respect the application window
    const window = getApplicationWindow(drive);
    const now = Date.now();
    if (window.opensAt !== null && now < window.opensAt) {
      throw new BadRequestException('Applications for this drive are not open yet');
    }
    if (window.closesAt !== null && now > window.closesAt) {
      throw new BadRequestException('The application deadline for this drive has passed');
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

  async findAllForDrivePaginated(
    driveId: string,
    page: number,
    limit: number,
    status?: string,
    query?: string,
    candidateFilters: {
      department?: string;
      minCgpa?: number;
      maxCgpa?: number;
      graduationYear?: number;
      skill?: string;
    } = {},
    searchFields: { studentName?: boolean; studentEmail?: boolean; registrationNumber?: boolean } = { studentName: true },
  ) {
    const filter: Record<string, any> = { driveId };
    if (status) {
      filter.status = status;
    }

    const studentIdClauses: string[][] = [];
    const { department, minCgpa, maxCgpa, graduationYear } = candidateFilters;
    if (department || minCgpa != null || maxCgpa != null || graduationYear != null) {
      const profileFilter: Record<string, any> = {};
      if (department) {
        const escapedDepartment = department.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        profileFilter.department = { $regex: escapedDepartment, $options: 'i' };
      }
      if (minCgpa != null || maxCgpa != null) {
        profileFilter.cgpa = {
          ...(minCgpa != null ? { $gte: minCgpa } : {}),
          ...(maxCgpa != null ? { $lte: maxCgpa } : {}),
        };
      }
      if (graduationYear != null) profileFilter.graduationYear = graduationYear;
      const profiles = await this.applicationModel.db
        .collection('student_profiles')
        .find(profileFilter, { projection: { userId: 1 } })
        .toArray();
      studentIdClauses.push(profiles.map((profile: any) => String(profile.userId)));
    }
    if (candidateFilters.skill) {
      const escapedSkill = candidateFilters.skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter['matchSnapshot.skills.skillName'] = { $regex: escapedSkill, $options: 'i' };
    }

    const normalizedQuery = query?.trim();
    if (normalizedQuery) {
      const applicantIds = await this.applicationModel
        .distinct('studentId', { ...filter })
        .exec();
      const applicantObjectIds = applicantIds
        .filter((studentId): studentId is string =>
          Types.ObjectId.isValid(studentId),
        )
        .map((studentId) => new Types.ObjectId(studentId));
      const escapedQuery = normalizedQuery.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      );
      const userCriteria: Record<string, any>[] = [];
      if (searchFields.studentName) userCriteria.push({ fullName: { $regex: escapedQuery, $options: 'i' } });
      if (searchFields.studentEmail) userCriteria.push({ email: { $regex: escapedQuery, $options: 'i' } });
      const matchingUsers = applicantObjectIds.length && userCriteria.length
        ? await this.applicationModel.db
            .collection('users')
            .find(
              {
                _id: { $in: applicantObjectIds },
                $or: userCriteria,
              },
              { projection: { _id: 1 } },
            )
            .toArray()
        : [];
      const matchingStudentIds = matchingUsers.map((user) => user._id.toString());
      if (searchFields.registrationNumber) {
        const matchingProfiles = await this.applicationModel.db
          .collection('student_profiles')
          .find({ userId: { $in: applicantIds }, registrationNumber: { $regex: escapedQuery, $options: 'i' } }, { projection: { userId: 1 } })
          .toArray();
        matchingStudentIds.push(...matchingProfiles.map((profile: any) => String(profile.userId)));
      }
      studentIdClauses.push([...new Set(matchingStudentIds)]);
    }

    if (studentIdClauses.length) {
      filter.$and = studentIdClauses.map((ids) => ({ studentId: { $in: ids } }));
    }
    
    const skip = (page - 1) * limit;
    
    const [applications, total] = await Promise.all([
      this.applicationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.applicationModel.countDocuments(filter).exec()
    ]);

    return { applications, total };
  }

  /**
   * Cross-drive candidate listing for recruiters. Every filter carries the drive IDs on which the
   * underlying field is released, so a filter can never reveal data from a drive that withholds it:
   * applications on drives outside a filter's scope are excluded while that filter is active.
   */
  async findScopedPaginated(options: {
    driveIds: string[];
    page: number;
    limit: number;
    status?: { value: string; driveIds: string[] };
    query?: { text: string; studentName: string[]; studentEmail: string[]; registrationNumber: string[] };
    department?: { value: string; driveIds: string[] };
    cgpa?: { min?: number; max?: number; driveIds: string[] };
    graduationYear?: { value: number; driveIds: string[] };
    skill?: { value: string; driveIds: string[] };
  }) {
    const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const and: Record<string, any>[] = [{ driveId: { $in: options.driveIds } }];
    const profileIds = async (filter: Record<string, any>) => (await this.applicationModel.db
      .collection('student_profiles')
      .find(filter, { projection: { userId: 1 } })
      .toArray()).map((profile: any) => String(profile.userId));

    if (options.status) and.push({ driveId: { $in: options.status.driveIds }, status: options.status.value });
    if (options.department) {
      and.push({ driveId: { $in: options.department.driveIds }, studentId: { $in: await profileIds({ department: { $regex: escape(options.department.value), $options: 'i' } }) } });
    }
    if (options.cgpa && (options.cgpa.min != null || options.cgpa.max != null)) {
      const cgpa = { ...(options.cgpa.min != null ? { $gte: options.cgpa.min } : {}), ...(options.cgpa.max != null ? { $lte: options.cgpa.max } : {}) };
      and.push({ driveId: { $in: options.cgpa.driveIds }, studentId: { $in: await profileIds({ cgpa }) } });
    }
    if (options.graduationYear) {
      and.push({ driveId: { $in: options.graduationYear.driveIds }, studentId: { $in: await profileIds({ graduationYear: options.graduationYear.value }) } });
    }
    if (options.skill) {
      const pattern = { $regex: escape(options.skill.value), $options: 'i' };
      and.push({
        driveId: { $in: options.skill.driveIds },
        $or: [
          { studentId: { $in: await profileIds({ skills: pattern }) } },
          { 'matchSnapshot.skills': { $elemMatch: { skillName: pattern, status: 'SATISFIED' } } },
        ],
      });
    }
    const text = options.query?.text.trim();
    if (options.query && text) {
      const pattern = { $regex: escape(text), $options: 'i' };
      const applicantIds = (await this.applicationModel.distinct('studentId', { driveId: { $in: options.driveIds } }).exec()).map(String);
      const objectIds = applicantIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
      const users = (field: string) => this.applicationModel.db.collection('users')
        .find({ _id: { $in: objectIds }, [field]: pattern }, { projection: { _id: 1 } }).toArray()
        .then((rows) => rows.map((row) => String(row._id)));
      const clauses: Record<string, any>[] = [];
      if (options.query.studentName.length) clauses.push({ driveId: { $in: options.query.studentName }, studentId: { $in: await users('fullName') } });
      if (options.query.studentEmail.length) clauses.push({ driveId: { $in: options.query.studentEmail }, studentId: { $in: await users('email') } });
      if (options.query.registrationNumber.length) {
        clauses.push({ driveId: { $in: options.query.registrationNumber }, studentId: { $in: await profileIds({ userId: { $in: applicantIds }, registrationNumber: pattern }) } });
      }
      and.push(clauses.length ? { $or: clauses } : { _id: null });
    }

    const filter = { $and: and };
    const [applications, total] = await Promise.all([
      this.applicationModel.find(filter).sort({ appliedAt: -1, _id: -1 }).skip((options.page - 1) * options.limit).limit(options.limit).exec(),
      this.applicationModel.countDocuments(filter).exec(),
    ]);
    return { applications, total };
  }

  /** Lightweight projection used by recruiter analytics over assigned drives only. */
  async findLeanForDrives(driveIds: string[], filter: Record<string, any> = {}) {
    if (!driveIds.length) return [];
    return this.applicationModel
      .find({ ...filter, driveId: { $in: driveIds } })
      .select('driveId studentId status appliedAt reviewedAt createdAt updatedAt')
      .lean()
      .exec();
  }

  async findByStudentForDrives(studentId: string, driveIds: string[]) {
    if (!driveIds.length) return [];
    return this.applicationModel.find({ studentId, driveId: { $in: driveIds } }).sort({ appliedAt: -1 }).lean().exec();
  }

  async countForDrive(driveId: string, status?: string) {
    return this.applicationModel.countDocuments({
      driveId,
      ...(status ? { status } : {}),
    }).exec();
  }

  /** One grouped query for recruiter dashboard counts across assigned drives. */
  async getCountsByDrive(driveIds: string[]) {
    if (driveIds.length === 0) return {};
    const rows = await this.applicationModel.aggregate([
      { $match: { driveId: { $in: driveIds } } },
      { $group: { _id: { driveId: '$driveId', status: '$status' }, count: { $sum: 1 } } },
    ]).exec();
    const result: Record<string, { total: number; [status: string]: number }> = {};
    for (const driveId of driveIds) result[driveId] = { total: 0 };
    for (const row of rows) {
      const driveId = String(row._id.driveId);
      if (!result[driveId]) continue;
      result[driveId].total += row.count;
      result[driveId][row._id.status] = row.count;
    }
    return result;
  }

  async countUniqueStudentsForDrives(driveIds: string[]) {
    if (!driveIds.length) return 0;
    const rows = await this.applicationModel.aggregate([
      { $match: { driveId: { $in: driveIds } } },
      { $group: { _id: '$studentId' } },
      { $count: 'count' },
    ]).exec();
    return rows[0]?.count ?? 0;
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
      [ApplicationStatus.SHORTLISTED]: [ApplicationStatus.INTERVIEW_SCHEDULED, ApplicationStatus.REJECTED],
      [ApplicationStatus.INTERVIEW_SCHEDULED]: [ApplicationStatus.OFFER_RELEASED, ApplicationStatus.REJECTED],
      [ApplicationStatus.OFFER_RELEASED]: [ApplicationStatus.SELECTED, ApplicationStatus.REJECTED],
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
