import { Controller, Get, Post, Body, Param, Query, Patch, UseGuards } from '@nestjs/common';
import { ApplicationsService } from './applications.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole, ApplicationStatus } from '@placecampus/shared-types';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('applications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @Roles(UserRole.STUDENT)
  create(@Body() createApplicationDto: CreateApplicationDto, @CurrentUser() user: any) {
    return this.applicationsService.create(createApplicationDto, user.userId);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.applicationsService.findAll(query);
  }

  @Get('eligibility/:driveId')
  @Roles(UserRole.STUDENT)
  checkEligibility(@Param('driveId') driveId: string, @CurrentUser() user: any) {
    return this.applicationsService.checkEligibility(driveId, user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.applicationsService.findOne(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.PLACEMENT_HEAD, UserRole.ADMIN, UserRole.RECRUITER)
  updateStatus(@Param('id') id: string, @Body('status') status: ApplicationStatus) {
    return this.applicationsService.updateStatus(id, status);
  }
}
