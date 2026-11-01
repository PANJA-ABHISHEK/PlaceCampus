import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { DrivesService } from './drives.service.js';
import {
  CreatePlacementDriveDto,
  UpdatePlacementDriveDto,
} from './dto/placement-drive.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '@placecampus/shared-types';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DrivesController {
  constructor(private readonly drivesService: DrivesService) {}

  // ==========================================
  // PLACEMENT OFFICER ROUTES
  // ==========================================

  @Post('placement/drives')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.PLACEMENT_HEAD, UserRole.ADMIN)
  create(@Body() createDto: CreatePlacementDriveDto, @Request() req: any) {
    return this.drivesService.create(createDto, req.user.id);
  }

  @Get('placement/drives')
  @Roles(
    UserRole.PLACEMENT_OFFICER,
    UserRole.PLACEMENT_HEAD,
    UserRole.ADMIN,
    UserRole.RECRUITER,
  )
  findAllForPlacement() {
    return this.drivesService.findAllForPlacementOfficer();
  }

  @Get('placement/drives/:id')
  @Roles(
    UserRole.PLACEMENT_OFFICER,
    UserRole.PLACEMENT_HEAD,
    UserRole.ADMIN,
    UserRole.RECRUITER,
  )
  findOneForPlacement(@Param('id') id: string) {
    return this.drivesService.findOne(id);
  }

  @Patch('placement/drives/:id')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.PLACEMENT_HEAD, UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateDto: UpdatePlacementDriveDto) {
    return this.drivesService.update(id, updateDto);
  }

  @Patch('placement/drives/:id/publish')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.PLACEMENT_HEAD, UserRole.ADMIN)
  publish(@Param('id') id: string) {
    return this.drivesService.publish(id);
  }

  @Patch('placement/drives/:id/close')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.PLACEMENT_HEAD, UserRole.ADMIN)
  close(@Param('id') id: string) {
    return this.drivesService.close(id);
  }

  // ==========================================
  // STUDENT ROUTES
  // ==========================================

  @Get('student/drives')
  @Roles(UserRole.STUDENT)
  findAllForStudent() {
    return this.drivesService.findAllForStudent();
  }

  @Get('student/drives/:id')
  @Roles(UserRole.STUDENT)
  findOneForStudent(@Param('id') id: string) {
    return this.drivesService.findOnePublished(id);
  }
}
