import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '@placecampus/shared-types';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RecruiterService } from './recruiter.service.js';

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
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.recruiterService.getCandidates(user.userId, driveId, pageNum, limitNum, status, query);
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
}
