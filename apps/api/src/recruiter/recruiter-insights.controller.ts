import { BadRequestException, Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { ApplicationStatus, UserRole } from '@placecampus/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AnalyticsFilters, CandidateListFilters, RecruiterInsightsService } from './recruiter-insights.service.js';

type QueryParams = Record<string, string | undefined>;

function num(value: string | undefined, label: string, min: number, max: number, integer = false) {
  if (value === undefined || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max || (integer && !Number.isInteger(parsed))) {
    throw new BadRequestException(`${label} must be ${integer ? 'a whole number' : 'a number'} between ${min} and ${max}`);
  }
  return parsed;
}
function text(value: string | undefined, max = 100) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}
function driveIdParam(value: string | undefined) {
  if (!value) return undefined;
  if (!Types.ObjectId.isValid(value)) throw new BadRequestException('Invalid drive ID');
  return value;
}
function statusParam(value: string | undefined) {
  if (!value) return undefined;
  if (!Object.values(ApplicationStatus).includes(value as ApplicationStatus)) throw new BadRequestException('Invalid application status');
  return value;
}
function dateParam(value: string | undefined, label: string, endOfDay = false) {
  if (!value) return undefined;
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z` : value);
  if (Number.isNaN(date.getTime())) throw new BadRequestException(`${label} must be a valid date`);
  return date;
}

export function parseCandidateFilters(query: QueryParams): CandidateListFilters {
  const minCgpa = num(query.minCgpa, 'Minimum CGPA', 0, 10);
  const maxCgpa = num(query.maxCgpa, 'Maximum CGPA', 0, 10);
  if (minCgpa !== undefined && maxCgpa !== undefined && minCgpa > maxCgpa) throw new BadRequestException('Minimum CGPA cannot exceed maximum CGPA');
  return {
    page: num(query.page, 'Page', 1, 10_000, true) ?? 1,
    limit: num(query.limit, 'Limit', 1, 100, true) ?? 25,
    driveId: driveIdParam(query.driveId),
    company: text(query.company, 120),
    status: statusParam(query.status),
    q: text(query.q),
    department: text(query.department, 80),
    minCgpa,
    maxCgpa,
    graduationYear: num(query.graduationYear, 'Graduation year', 2000, 2100, true),
    skill: text(query.skill, 80),
  };
}

export function parseAnalyticsFilters(query: QueryParams): AnalyticsFilters {
  const from = dateParam(query.from, 'From date');
  const to = dateParam(query.to, 'To date', true);
  if (from && to && from > to) throw new BadRequestException('From date must be before the to date');
  if (from && to && to.getTime() - from.getTime() > 731 * 86_400_000) throw new BadRequestException('Date range cannot exceed two years');
  return { from, to, driveId: driveIdParam(query.driveId), company: text(query.company, 120), department: text(query.department, 80), status: statusParam(query.status) };
}

export function parseLimit(value: string | undefined) {
  return num(value, 'Limit', 1, 50, true) ?? 10;
}

@ApiTags('Recruiter Portal')
@Controller('recruiter/drives')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles(UserRole.RECRUITER)
export class RecruiterDriveInsightsController {
  constructor(private readonly insights: RecruiterInsightsService) {}

  @Get(':driveId')
  @ApiOperation({ summary: 'Assigned drive detail with applicant, shortlist and interview counts' })
  getDrive(@CurrentUser() user: any, @Param('driveId') driveId: string) {
    return this.insights.getDriveDetail(user.userId, driveIdParam(driveId)!);
  }

  @Get(':driveId/applicants')
  @ApiOperation({ summary: 'Applicants for one assigned drive (same filters as /recruiter/candidates)' })
  getApplicants(@CurrentUser() user: any, @Param('driveId') driveId: string, @Query() query: QueryParams) {
    return this.insights.listCandidates(user.userId, { ...parseCandidateFilters(query), driveId: driveIdParam(driveId) });
  }
}

@ApiTags('Recruiter Portal')
@Controller('recruiter')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles(UserRole.RECRUITER)
export class RecruiterInsightsController {
  constructor(private readonly insights: RecruiterInsightsService) {}

  @Get('candidates')
  @ApiOperation({ summary: 'Candidates across all assigned drives, filtered by drive, company, status, branch, CGPA and skills' })
  listCandidates(@CurrentUser() user: any, @Query() query: QueryParams) {
    return this.insights.listCandidates(user.userId, parseCandidateFilters(query));
  }

  @Get('candidates/:applicationId')
  @ApiOperation({ summary: 'Candidate profile with application and interview history on assigned drives' })
  getCandidate(@CurrentUser() user: any, @Param('applicationId') applicationId: string) {
    return this.insights.getCandidateProfile(user.userId, applicationId);
  }

  @Get('shortlists')
  @ApiOperation({ summary: 'Shortlisted candidates across assigned drives' })
  listShortlists(@CurrentUser() user: any, @Query() query: QueryParams) {
    return this.insights.listCandidates(user.userId, { ...parseCandidateFilters(query), status: ApplicationStatus.SHORTLISTED });
  }

  @Get('analytics')
  @ApiOperation({ summary: 'All recruiter analytics sections for the given filters' })
  getAnalytics(@CurrentUser() user: any, @Query() query: QueryParams) {
    return this.insights.getAnalytics(user.userId, parseAnalyticsFilters(query));
  }

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Funnel, selection and interview analytics' })
  async getOverview(@CurrentUser() user: any, @Query() query: QueryParams) {
    return (await this.insights.getAnalytics(user.userId, parseAnalyticsFilters(query))).overview;
  }

  @Get('analytics/applications')
  @ApiOperation({ summary: 'Application, shortlist, offer and selection trends over time' })
  async getApplicationTrends(@CurrentUser() user: any, @Query() query: QueryParams) {
    return (await this.insights.getAnalytics(user.userId, parseAnalyticsFilters(query))).applications;
  }

  @Get('analytics/drives')
  @ApiOperation({ summary: 'Drive-wise applicant statistics' })
  async getDriveAnalytics(@CurrentUser() user: any, @Query() query: QueryParams) {
    return (await this.insights.getAnalytics(user.userId, parseAnalyticsFilters(query))).drives;
  }

  @Get('analytics/branches')
  @ApiOperation({ summary: 'Branch-wise application distribution' })
  async getBranchAnalytics(@CurrentUser() user: any, @Query() query: QueryParams) {
    return (await this.insights.getAnalytics(user.userId, parseAnalyticsFilters(query))).branches;
  }
}
