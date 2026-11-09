import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
