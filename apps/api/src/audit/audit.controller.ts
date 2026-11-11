import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { UserRole } from '@placecampus/shared-types';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { AuditService } from './audit.service.js';

@Controller('admin/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('recent')
  recent(@Query('limit') limit?: string) {
    const parsed = Number(limit);
    return this.auditService.recent(Number.isFinite(parsed) && parsed > 0 ? parsed : 8);
  }
}

/**
 * Review of recruiter access: every candidate list, profile view and denied
 * attempt, for the staff who grant that access.
 */
@Controller('placement/recruiter-access-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLACEMENT_OFFICER, UserRole.PLACEMENT_HEAD, UserRole.ADMIN)
export class RecruiterAccessLogController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(
    @Query('driveId') driveId?: string,
    @Query('recruiterId') recruiterId?: string,
    @Query('outcome') outcome?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    for (const [name, id] of [['driveId', driveId], ['recruiterId', recruiterId]] as const) {
      if (id && !Types.ObjectId.isValid(id)) throw new BadRequestException(`Invalid ${name}`);
    }
    if (outcome && outcome !== 'ALLOWED' && outcome !== 'DENIED') {
      throw new BadRequestException('outcome must be ALLOWED or DENIED');
    }
    return this.auditService.recruiterAccessLogs({
      driveId,
      recruiterId,
      outcome: outcome as 'ALLOWED' | 'DENIED' | undefined,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
  }
}
