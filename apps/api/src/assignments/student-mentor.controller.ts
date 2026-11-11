import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@placecampus/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AssignmentsService } from './assignments.service.js';

/** A student's own mentor. Students only ever see their own assignment. */
@ApiTags('Students')
@Controller('students/me/mentor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@ApiBearerAuth()
export class StudentMentorController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Get()
  @ApiOperation({ summary: "The signed-in student's active primary mentor (null when not yet assigned)" })
  async mine(@CurrentUser() user: any) {
    return { mentor: await this.assignments.mentorFor(user.userId) };
  }
}
