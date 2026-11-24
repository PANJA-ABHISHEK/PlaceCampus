import { BadRequestException, Body, Controller, Get, Header, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ApplicationStatus, UserRole } from '@placecampus/shared-types';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RecruiterService } from './recruiter.service.js';
import { RecruiterInsightsService } from './recruiter-insights.service.js';
import { parseLimit } from './recruiter-insights.controller.js';

function optionalNumber(value: string | undefined, label: string) {
  if (value === undefined || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new BadRequestException(`${label} must be a number`);
  return parsed;
}

@ApiTags('Recruiter Portal')
@Controller('recruiter/drives')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles(UserRole.RECRUITER)
export class RecruiterController {
  constructor(private readonly recruiterService: RecruiterService) {}

  @Get()
  @ApiOperation({ summary: 'Get drives authorized for this recruiter' })
  getDrives(@CurrentUser() user: any) {
    return this.recruiterService.getDrives(user.userId);
  }

  @Get(':driveId/candidates')
  @ApiOperation({ summary: 'Get registered candidates for a drive' })
  getCandidates(
    @Param('driveId') driveId: string,
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('q') query?: string,
    @Query('department') department?: string,
    @Query('minCgpa') minCgpa?: string,
    @Query('maxCgpa') maxCgpa?: string,
    @Query('graduationYear') graduationYear?: string,
    @Query('skill') skill?: string,
  ) {
    if (status && !Object.values(ApplicationStatus).includes(status as ApplicationStatus)) {
      throw new BadRequestException('Invalid application status');
    }
    const min = optionalNumber(minCgpa, 'Minimum CGPA');
    const max = optionalNumber(maxCgpa, 'Maximum CGPA');
    const year = optionalNumber(graduationYear, 'Graduation year');
    if ((min !== undefined && (min < 0 || min > 10)) || (max !== undefined && (max < 0 || max > 10))) {
      throw new BadRequestException('CGPA filters must be between 0 and 10');
    }
    if (min !== undefined && max !== undefined && min > max) {
      throw new BadRequestException('Minimum CGPA cannot exceed maximum CGPA');
    }
    if (year !== undefined && (!Number.isInteger(year) || year < 2000 || year > 2100)) {
      throw new BadRequestException('Graduation year must be a valid four-digit year');
    }
    return this.recruiterService.getCandidates(
      user.userId,
      driveId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
      status,
      query?.slice(0, 100),
      { department, minCgpa: min, maxCgpa: max, graduationYear: year, skill: skill?.slice(0, 80) },
    );
  }

  @Get(':driveId/candidates/export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="placecampus-candidates.csv"')
  @ApiOperation({ summary: 'Export authorized candidate fields for an assigned drive' })
  exportCandidates(@Param('driveId') driveId: string, @CurrentUser() user: any, @Query('status') status?: string) {
    if (status && !Object.values(ApplicationStatus).includes(status as ApplicationStatus)) {
      throw new BadRequestException('Invalid application status');
    }
    return this.recruiterService.exportCandidatesCsv(user.userId, driveId, status);
  }

  @Get(':driveId/candidates/:applicationId')
  @ApiOperation({ summary: 'Get specific candidate detail' })
  getCandidateDetail(
    @Param('driveId') driveId: string,
    @Param('applicationId') applicationId: string,
    @CurrentUser() user: any,
  ) {
    return this.recruiterService.getCandidateDetail(user.userId, driveId, applicationId);
  }

  @Patch(':driveId/candidates/:applicationId')
  @ApiOperation({ summary: 'Update a demonstration application stage or recruiter note' })
  updateCandidate(@Param('driveId') driveId: string, @Param('applicationId') applicationId: string, @CurrentUser() user: any, @Body() payload: { status?: string; recruiterNotes?: string }) {
    return this.recruiterService.updateDemoApplication(user.userId, driveId, applicationId, payload);
  }
}

@ApiTags('Recruiter Portal')
@Controller('recruiter/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles(UserRole.RECRUITER)
export class RecruiterDashboardController {
  constructor(private readonly recruiterService: RecruiterService, private readonly insights: RecruiterInsightsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get per-drive applicant, status and interview counts for the recruiter’s active drive grants' })
  getSummary(@CurrentUser() user: any) {
    return this.insights.getDriveSummaries(user.userId);
  }

  @Get('activities')
  @ApiOperation({ summary: 'Recent application, status and interview activity on assigned drives' })
  getActivities(@CurrentUser() user: any, @Query('limit') limit?: string) {
    return this.insights.getActivities(user.userId, parseLimit(limit));
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get recruiter dashboard KPIs from assigned-drive applications' })
  getStats(@CurrentUser() user: any) {
    return this.recruiterService.getDashboardStats(user.userId);
  }

  @Get('pipeline')
  @ApiOperation({ summary: 'Get recruiter application funnel from assigned-drive applications' })
  getPipeline(@CurrentUser() user: any) {
    return this.recruiterService.getDashboardPipeline(user.userId);
  }
}
