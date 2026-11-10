import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema.js';
import { PlacementDrive } from '../drives/schemas/placement-drive.schema.js';
import { User } from '../users/schemas/user.schema.js';
import { RecruiterAccessLogPage, UserRole } from '@placecampus/shared-types';

export interface RecruiterAccessLogFilter {
  driveId?: string;
  recruiterId?: string;
  outcome?: 'ALLOWED' | 'DENIED';
  page?: number;
  limit?: number;
}

export interface LogActionParams {
  /** Omitted for automated system actions (shown as "System"). */
  actorId?: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  driveId?: string;
  applicationId?: string;
  studentId?: string;
  success?: boolean;
  reason?: string;
  metadata?: any;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name) private readonly auditLogModel: Model<AuditLogDocument>,
    @InjectModel(PlacementDrive.name) private readonly driveModel: Model<PlacementDrive>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async recent(limit = 8) {
    const rows = await this.auditLogModel
      .find()
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(limit, 1), 50))
      .populate('actorId', 'fullName')
      .lean()
      .exec();

    return rows.map((row: any) => ({
      id: String(row._id),
      action: row.action,
      resourceType: row.resourceType,
      resourceId: row.resourceId ? String(row.resourceId) : undefined,
      actorName: row.actorId?.fullName ?? 'System',
      actorRole: row.actorRole,
      success: row.success,
      reason: row.reason,
      createdAt: row.createdAt,
    }));
  }

  /**
   * Every recruiter read of student data, allowed or denied, newest first.
   * Candidate-list entries written before `driveId` was stored carry the drive
   * as their resource, so both shapes are matched.
   */
  async recruiterAccessLogs(filter: RecruiterAccessLogFilter): Promise<RecruiterAccessLogPage> {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(Math.max(filter.limit ?? 20, 1), 100);
    const query: Record<string, any> = { actorRole: UserRole.RECRUITER };
    if (filter.driveId) {
      query.$or = [
        { driveId: filter.driveId },
        { resourceType: 'PlacementDrive', resourceId: filter.driveId },
        { 'metadata.driveIds': filter.driveId },
      ];
    }
    if (filter.recruiterId) query.actorId = filter.recruiterId;
    if (filter.outcome === 'ALLOWED') query.success = true;
    if (filter.outcome === 'DENIED') query.success = false;
    const [rows, total, allowed] = await Promise.all([
      this.auditLogModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('actorId', 'fullName email')
        .lean()
        .exec(),
      this.auditLogModel.countDocuments(query),
      this.auditLogModel.countDocuments({ ...query, success: query.success ?? true }),
    ]);

    const driveOf = (row: any) =>
      row.driveId ? String(row.driveId) : row.resourceType === 'PlacementDrive' && row.resourceId ? String(row.resourceId) : undefined;
    const driveIds = [...new Set(rows.map(driveOf).filter((id): id is string => !!id))];
    const studentIds = [...new Set(rows.map((r: any) => r.studentId && String(r.studentId)).filter(Boolean))];
    const [drives, students] = await Promise.all([
      driveIds.length ? this.driveModel.find({ _id: { $in: driveIds } }).select('companyName roleTitle').lean().exec() : [],
      studentIds.length ? this.userModel.find({ _id: { $in: studentIds } }).select('fullName').lean().exec() : [],
    ]);
    const driveById = new Map(drives.map((d: any) => [String(d._id), d]));
    const studentById = new Map(students.map((s: any) => [String(s._id), s]));

    return {
      entries: rows.map((row: any) => {
        const driveId = driveOf(row);
        const drive = driveId ? driveById.get(driveId) : undefined;
        const studentId = row.studentId ? String(row.studentId) : undefined;
        return {
          id: String(row._id),
          action: row.action,
          success: row.success !== false,
          recruiter: row.actorId
            ? { id: String(row.actorId._id ?? row.actorId), name: row.actorId.fullName ?? 'Deleted account', email: row.actorId.email }
            : null,
          drive: driveId
            ? { id: driveId, companyName: drive?.companyName ?? 'Unknown drive', roleTitle: drive?.roleTitle ?? '' }
            : null,
          student: studentId ? { id: studentId, name: studentById.get(studentId)?.fullName ?? 'Unknown student' } : null,
          resourceType: row.resourceType,
          resourceId: row.resourceId ? String(row.resourceId) : undefined,
          createdAt: new Date(row.createdAt).toISOString(),
        };
      }),
      total,
      page,
      limit,
      allowed: filter.outcome === 'DENIED' ? 0 : allowed,
      denied: filter.outcome === 'ALLOWED' ? 0 : total - (filter.outcome === 'DENIED' ? 0 : allowed),
    };
  }

  async logAction(params: LogActionParams): Promise<void> {
    try {
      const log = new this.auditLogModel({
        ...params,
        success: params.success !== false,
      });
      await log.save();
    } catch (error) {
      // Do not block the main execution flow if audit logging fails
      this.logger.error('Failed to write audit log', error);
    }
  }
}
