import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema.js';

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
