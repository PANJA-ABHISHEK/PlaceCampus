import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ReadinessService } from './readiness.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '@placecampus/shared-types';

@Controller('student/readiness')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class ReadinessController {
  constructor(private readonly readinessService: ReadinessService) {}

  @Get()
  async getLatestReadiness(@Req() req: any) {
    return this.readinessService.getLatestSnapshot(req.user.id);
  }

  @Get('history')
  async getReadinessHistory(@Req() req: any) {
    return this.readinessService.getSnapshotHistory(req.user.id);
  }
}
