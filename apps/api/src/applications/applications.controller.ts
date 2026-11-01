import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '@placecampus/shared-types';
import { ReviewApplicationDto } from './dto/review-application.dto.js';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  // --- Student Endpoints ---

  @Post('drives/:driveId/applications')
  @Roles(UserRole.STUDENT)
  applyToDrive(@Param('driveId') driveId: string, @Request() req: any) {
    return this.applicationsService.applyToDrive(driveId, req.user.id);
  }

  @Get('applications/me')
  @Roles(UserRole.STUDENT)
  getMyApplications(@Request() req: any) {
    return this.applicationsService.getStudentApplications(req.user.id);
  }

  @Get('applications/:id')
  @Roles(UserRole.STUDENT)
  getApplication(@Param('id') id: string, @Request() req: any) {
    return this.applicationsService.getStudentApplication(id, req.user.id);
  }

  @Patch('applications/:id/withdraw')
  @Roles(UserRole.STUDENT)
  withdrawApplication(@Param('id') id: string, @Request() req: any) {
    return this.applicationsService.withdrawApplication(id, req.user.id);
  }

  // --- Placement Officer Endpoints ---

  @Get('placement/drives/:driveId/applications')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.PLACEMENT_HEAD, UserRole.ADMIN)
  getDriveApplications(@Param('driveId') driveId: string) {
    return this.applicationsService.findAllForDrive(driveId);
  }

  @Get('placement/applications/:id')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.PLACEMENT_HEAD, UserRole.ADMIN)
  getPlacementApplication(@Param('id') id: string) {
    return this.applicationsService.findOneForPlacement(id);
  }

  @Patch('placement/applications/:id/review')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.PLACEMENT_HEAD, UserRole.ADMIN)
  reviewApplication(
    @Param('id') id: string,
    @Body() dto: ReviewApplicationDto,
    @Request() req: any,
  ) {
    return this.applicationsService.reviewApplication(id, dto, req.user.id);
  }
}
