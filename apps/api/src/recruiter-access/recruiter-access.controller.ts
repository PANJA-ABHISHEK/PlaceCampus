import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '@placecampus/shared-types';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RecruiterAccessService } from './recruiter-access.service.js';
import { CreateRecruiterAccessGrantDto, ExtendAccessGrantDto, UpdateAccessGrantDto } from './dto/recruiter-access.dto.js';

@ApiTags('Recruiter Access Management')
@Controller('placement/drives/:driveId/recruiter-access')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles(UserRole.PLACEMENT_OFFICER, UserRole.PLACEMENT_HEAD, UserRole.ADMIN)
export class RecruiterAccessController {
  constructor(private readonly accessService: RecruiterAccessService) {}

  @Get()
  @ApiOperation({ summary: 'Get all recruiter grants for a drive' })
  getGrants(@Param('driveId') driveId: string) {
    return this.accessService.getGrantsForDrive(driveId);
  }

  @Post()
  @ApiOperation({ summary: 'Grant recruiter access to a drive' })
  grantAccess(
    @Param('driveId') driveId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateRecruiterAccessGrantDto
  ) {
    return this.accessService.grantAccess(driveId, user.userId, user.role, dto);
  }
}

@ApiTags('Recruiter Access Management')
@Controller('placement/recruiter-access')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles(UserRole.PLACEMENT_OFFICER, UserRole.PLACEMENT_HEAD, UserRole.ADMIN)
export class RecruiterAccessGlobalController {
  constructor(private readonly accessService: RecruiterAccessService) {}

  @Patch(':grantId/revoke')
  @ApiOperation({ summary: 'Revoke recruiter access' })
  revokeAccess(
    @Param('grantId') grantId: string,
    @CurrentUser() user: any
  ) {
    return this.accessService.revokeAccess(grantId, user.userId, user.role);
  }

  @Patch(':grantId/extend')
  @ApiOperation({ summary: 'Extend recruiter access expiry' })
  extendAccess(
    @Param('grantId') grantId: string,
    @CurrentUser() user: any,
    @Body() dto: ExtendAccessGrantDto
  ) {
    return this.accessService.extendAccess(grantId, user.userId, user.role, dto);
  }

  @Patch(':grantId/fields')
  @ApiOperation({ summary: 'Update released fields for recruiter access' })
  updateFields(
    @Param('grantId') grantId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateAccessGrantDto
  ) {
    return this.accessService.updateFields(grantId, user.userId, user.role, dto.releasedFields || []);
  }
}
