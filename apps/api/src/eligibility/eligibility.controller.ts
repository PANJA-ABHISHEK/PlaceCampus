import { Controller, Get, Param, UseGuards, Request, Query } from '@nestjs/common';
import { EligibilityService } from './eligibility.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '@placecampus/shared-types';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class EligibilityController {
  constructor(private readonly eligibilityService: EligibilityService) {}

  @Get('student/drives/:id/eligibility')
  @Roles(UserRole.STUDENT)
  getEligibility(@Param('id') id: string, @Request() req: any) {
    // We derive student identity securely from the JWT token
    return this.eligibilityService.calculateForStudent(id, req.user.id);
  }

  @Get('placement/drives/:id/eligible-students')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.PLACEMENT_HEAD, UserRole.ADMIN)
  getEligibleStudents(@Param('id') id: string, @Query('search') search?: string) {
    return this.eligibilityService.listForPlacement(id, search);
  }
}
