import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { MatchingService } from './matching.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import { UserRole } from '@placecampus/shared-types';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get('student/skill-gaps')
  @Roles(UserRole.STUDENT)
  getSkillGaps(@Request() req: any) {
    // Scoped to the caller: the student id always comes from the JWT.
    return this.matchingService.getSkillGapAnalysis(req.user.id);
  }

  @Get('student/drives/:id/match')
  @Roles(UserRole.STUDENT)
  getSkillMatch(@Param('id') id: string, @Request() req: any) {
    // Derive student identity securely from the JWT token
    return this.matchingService.calculateForStudent(id, req.user.id);
  }

  /** Skill supply against demand for one drive (any status). */
  @Get('placement/drives/:id/matching-summary')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.PLACEMENT_HEAD, UserRole.ADMIN)
  getMatchingSummary(@Param('id', ParseObjectIdPipe) id: string) {
    return this.matchingService.getDriveSummary(id);
  }

  /** Ranked, actionable gaps for any student against any drive. */
  @Get('placement/drives/:id/students/:studentId/gap-analysis')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.PLACEMENT_HEAD, UserRole.ADMIN)
  getStudentGapAnalysis(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('studentId', ParseObjectIdPipe) studentId: string,
  ) {
    return this.matchingService.analyseForStaff(id, studentId);
  }
}
