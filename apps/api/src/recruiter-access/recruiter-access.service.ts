import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RecruiterAccessGrant, RecruiterAccessGrantDocument } from './schemas/access-grant.schema.js';
import { CreateRecruiterAccessGrantDto, ExtendAccessGrantDto, UpdateAccessGrantDto } from './dto/recruiter-access.dto.js';
import { GrantStatus, UserRole } from '@placecampus/shared-types';
import { AuditService } from '../audit/audit.service.js';
import { DrivesService } from '../drives/drives.service.js';
import { UsersService } from '../users/users.service.js';

export const ALLOWED_RELEASE_FIELDS = [
  'studentName',
  'department',
  'graduationYear',
  'cgpa',
  'skills',
  'readinessScore',
  'skillMatchCoverage',
  'applicationStatus',
  'projects',
  'linkedinUrl',
  'portfolioUrl',
];

@Injectable()
export class RecruiterAccessService {
  constructor(
    @InjectModel(RecruiterAccessGrant.name)
    private readonly grantModel: Model<RecruiterAccessGrantDocument>,
    private readonly auditService: AuditService,
    private readonly drivesService: DrivesService,
    private readonly usersService: UsersService,
  ) {}

  private validateFields(fields: string[]) {
    const invalidFields = fields.filter((f) => !ALLOWED_RELEASE_FIELDS.includes(f));
    if (invalidFields.length > 0) {
      throw new BadRequestException(`Invalid release fields: ${invalidFields.join(', ')}`);
    }
  }

  async grantAccess(driveId: string, grantedBy: string, role: string, dto: CreateRecruiterAccessGrantDto): Promise<RecruiterAccessGrantDocument> {
    // 1. Verify drive exists
    await this.drivesService.findOne(driveId);

    // 2. Verify recruiter exists and has RECRUITER role
    const recruiter = await this.usersService.findById(dto.recruiterId);
    if (!recruiter || recruiter.role !== UserRole.RECRUITER) {
      throw new BadRequestException('Target user is not a valid recruiter');
    }

    // 3. Cannot grant access to self
    if (grantedBy === dto.recruiterId) {
      throw new ForbiddenException('Cannot grant access to yourself');
    }

    // 4. Validate fields
    this.validateFields(dto.releasedFields);

    // 5. Expiry must be future
    if (new Date(dto.expiresAt) <= new Date()) {
      throw new BadRequestException('Expiry must be in the future');
    }

    // 6. Check if active grant already exists for this recruiter + drive
    const existing = await this.grantModel.findOne({
      driveId,
      recruiterId: dto.recruiterId,
      status: GrantStatus.ACTIVE,
    });

    if (existing) {
      throw new BadRequestException('Active grant already exists for this recruiter on this drive');
    }

    const grant = new this.grantModel({
      recruiterId: dto.recruiterId,
      driveId,
      grantedBy,
      expiresAt: new Date(dto.expiresAt),
      releasedFields: dto.releasedFields,
    });

    await grant.save();

    await this.auditService.logAction({
      actorId: grantedBy,
      actorRole: role,
      action: 'GRANT_RECRUITER_ACCESS',
      resourceType: 'RecruiterAccessGrant',
      resourceId: grant.id,
      driveId,
      metadata: { recruiterId: dto.recruiterId, fields: dto.releasedFields },
    });

    return grant;
  }

  async revokeAccess(grantId: string, actorId: string, role: string): Promise<RecruiterAccessGrantDocument> {
    const grant = await this.grantModel.findById(grantId);
    if (!grant) {
      throw new NotFoundException('Grant not found');
    }

    grant.status = GrantStatus.REVOKED;
    await grant.save();

    await this.auditService.logAction({
      actorId,
      actorRole: role,
      action: 'REVOKE_RECRUITER_ACCESS',
      resourceType: 'RecruiterAccessGrant',
      resourceId: grant.id,
      driveId: grant.driveId,
      metadata: { recruiterId: grant.recruiterId },
    });

    return grant;
  }

  async extendAccess(grantId: string, actorId: string, role: string, dto: ExtendAccessGrantDto): Promise<RecruiterAccessGrantDocument> {
    const grant = await this.grantModel.findById(grantId);
    if (!grant) {
      throw new NotFoundException('Grant not found');
    }

    if (grant.status !== GrantStatus.ACTIVE) {
      throw new BadRequestException('Can only extend ACTIVE grants');
    }

    if (new Date(dto.expiresAt) <= new Date()) {
      throw new BadRequestException('Expiry must be in the future');
    }

    grant.expiresAt = new Date(dto.expiresAt);
    await grant.save();

    await this.auditService.logAction({
      actorId,
      actorRole: role,
      action: 'EXTEND_RECRUITER_ACCESS',
      resourceType: 'RecruiterAccessGrant',
      resourceId: grant.id,
      driveId: grant.driveId,
      metadata: { recruiterId: grant.recruiterId, expiresAt: dto.expiresAt },
    });

    return grant;
  }

  async updateFields(grantId: string, actorId: string, role: string, fields: string[]): Promise<RecruiterAccessGrantDocument> {
    const grant = await this.grantModel.findById(grantId);
    if (!grant) throw new NotFoundException('Grant not found');
    
    if (grant.status !== GrantStatus.ACTIVE) {
      throw new BadRequestException('Can only update ACTIVE grants');
    }

    this.validateFields(fields);
    grant.releasedFields = fields;
    await grant.save();

    await this.auditService.logAction({
      actorId,
      actorRole: role,
      action: 'UPDATE_RECRUITER_ACCESS_FIELDS',
      resourceType: 'RecruiterAccessGrant',
      resourceId: grant.id,
      driveId: grant.driveId,
      metadata: { recruiterId: grant.recruiterId, fields },
    });

    return grant;
  }

  async getGrantsForDrive(driveId: string): Promise<RecruiterAccessGrantDocument[]> {
    return this.grantModel.find({ driveId }).populate('recruiterId', 'fullName email').exec();
  }

  async getActiveGrant(driveId: string, recruiterId: string): Promise<RecruiterAccessGrantDocument | null> {
    return this.grantModel.findOne({
      driveId,
      recruiterId,
      status: GrantStatus.ACTIVE,
      expiresAt: { $gt: new Date() },
    });
  }

  async getMyActiveGrants(recruiterId: string): Promise<RecruiterAccessGrantDocument[]> {
    return this.grantModel.find({
      recruiterId,
      status: GrantStatus.ACTIVE,
      expiresAt: { $gt: new Date() },
    }).populate('driveId', 'companyName roleTitle status').exec();
  }
}
