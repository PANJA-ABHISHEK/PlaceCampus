import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { StudentsService } from './students.service.js';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UserRole } from '@placecampus/shared-types';
import type { UserReference } from '@placecampus/shared-types';

@ApiTags('Students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get('me/profile')
  @ApiOperation({ summary: 'Get the current student profile' })
  @ApiResponse({
    status: 200,
    description: 'Student profile retrieved successfully',
  })
  async getMyProfile(@CurrentUser() user: UserReference) {
    const profile = await this.studentsService.getProfileByUserId(user.id);
    return { success: true, data: profile };
  }

  @Patch('me/profile')
  @ApiOperation({ summary: 'Update the current student profile' })
  @ApiResponse({
    status: 200,
    description: 'Student profile updated successfully',
  })
  async updateMyProfile(
    @CurrentUser() user: UserReference,
    @Body() updateDto: UpdateStudentProfileDto,
  ) {
    const profile = await this.studentsService.updateProfile(
      user.id,
      updateDto,
    );
    return { success: true, data: profile };
  }
}
