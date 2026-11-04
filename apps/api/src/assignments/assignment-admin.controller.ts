import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@placecampus/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import { AssignmentAdminService, type AssignmentHistoryEntry } from './assignment-admin.service.js';
import { AllocationDto, CreateAssignmentDto, EndAssignmentDto, ReassignDto } from './dto/assignment.dto.js';

const actorOf = (user: any) => ({ userId: user.userId, role: user.role });

/**
 * Faculty assignment management. Authorised roles: Administrator and Placement
 * Officer — the Master Plan (§24, `faculty_assignments`) says assignments are
 * "bulk-managed by officers or Administrators". Faculty, students, Placement
 * Heads and recruiters are refused.
 */
@ApiTags('Admin: Faculty assignments')
@Controller('admin/assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.PLACEMENT_OFFICER)
@ApiBearerAuth()
export class AssignmentAdminController {
  constructor(private readonly admin: AssignmentAdminService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Workload dashboard: totals and per-faculty load' })
  overview(@Query() q: { search?: string; department?: string; sort?: string }) {
    return this.admin.overview(q);
  }

  @Get('unassigned')
  @ApiOperation({ summary: 'Exception queue: students without an active primary mentor' })
  unassigned(@Query() q: { reason?: string; search?: string; page?: number; limit?: number }) {
    return this.admin.unassigned(q);
  }

  @Post('allocation/preview')
  @ApiOperation({ summary: 'Preview mentor allocation (writes nothing)' })
  preview(@Body() dto: AllocationDto) {
    return this.admin.preview(dto);
  }

  @Post('allocation/commit')
  @ApiOperation({ summary: 'Allocate one active primary mentor to every eligible student' })
  commit(@Body() dto: AllocationDto, @CurrentUser() user: any) {
    return this.admin.commit(dto, actorOf(user));
  }

  @Get('faculty/:facultyUserId/mentees')
  @ApiOperation({ summary: "A faculty member's active assignments" })
  mentees(@Param('facultyUserId', ParseObjectIdPipe) facultyUserId: string) {
    return this.admin.mentees(facultyUserId);
  }

  @Get('students/:studentId/history')
  @ApiOperation({ summary: 'Assignment history for a student' })
  history(@Param('studentId', ParseObjectIdPipe) studentId: string): Promise<AssignmentHistoryEntry[]> {
    return this.admin.history(studentId);
  }

  @Get('students/:studentId/faculty-options')
  @ApiOperation({ summary: 'Faculty who can take this student, least loaded first' })
  options(@Param('studentId', ParseObjectIdPipe) studentId: string) {
    return this.admin.facultyOptions(studentId);
  }

  @Post()
  @ApiOperation({ summary: 'Manual assignment' })
  assign(@Body() dto: CreateAssignmentDto, @CurrentUser() user: any) {
    return this.admin.assign(dto, actorOf(user));
  }

  @Post(':id/reassign')
  @ApiOperation({ summary: 'Reassign to another faculty member (keeps history)' })
  reassign(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: ReassignDto, @CurrentUser() user: any) {
    return this.admin.reassign(id, dto, actorOf(user));
  }

  @Post(':id/end')
  @ApiOperation({ summary: 'End an assignment (keeps history)' })
  end(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: EndAssignmentDto, @CurrentUser() user: any) {
    return this.admin.end(id, dto.reason, actorOf(user));
  }
}
