import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { MatchingService } from './matching.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '@placecampus/shared-types';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get('student/drives/:id/match')
  @Roles(UserRole.STUDENT)
  getSkillMatch(@Param('id') id: string, @Request() req: any) {
    // Derive student identity securely from the JWT token
    return this.matchingService.calculateForStudent(id, req.user.id);
  }

  @Get('placement/drives/:id/matching-summary')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.PLACEMENT_HEAD, UserRole.ADMIN)
  getMatchingSummary(@Param('id') id: string) {
    return this.matchingService.getDriveSummary(id);
  }
}
