import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@placecampus/shared-types';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { AnalyticsQueryDto } from './dto/analytics-query.dto.js';
import { AnalyticsService } from './analytics.service.js';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLACEMENT_HEAD, UserRole.ADMIN)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  getOverview(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getOverview(query);
  }

  @Get('readiness')
  getReadiness(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getReadiness(query);
  }

  @Get('skills')
  getSkills(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getSkills(query);
  }

  @Get('placements')
  getPlacements(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getPlacements(query);
  }

  @Get('evidence')
  getEvidence(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getEvidence(query);
  }

  @Get('preparation')
  getPreparation(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getPreparation(query);
  }
}
