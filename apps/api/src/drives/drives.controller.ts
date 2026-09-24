import { Controller, Get, Post, Body, Param, Query, Patch, UseGuards } from '@nestjs/common';
import { DrivesService } from './drives.service.js';
import { CreateDriveDto } from './dto/create-drive.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole, DriveStatus } from '@placecampus/shared-types';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('drives')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DrivesController {
  constructor(private readonly drivesService: DrivesService) {}

  @Post()
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.PLACEMENT_HEAD, UserRole.ADMIN)
  create(@Body() createDriveDto: CreateDriveDto, @CurrentUser() user: any) {
    return this.drivesService.create(createDriveDto, user.userId);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.drivesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.drivesService.findOne(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.PLACEMENT_HEAD, UserRole.ADMIN)
  updateStatus(@Param('id') id: string, @Body('status') status: DriveStatus) {
    return this.drivesService.updateStatus(id, status);
  }
}
