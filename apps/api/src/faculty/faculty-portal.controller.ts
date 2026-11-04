import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@placecampus/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { FacultyPortalService } from './faculty-portal.service.js';

@ApiTags('Faculty Portal')
@Controller('faculty')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.FACULTY, UserRole.ADMIN)
@ApiBearerAuth()
export class FacultyPortalController {
  constructor(private readonly portal: FacultyPortalService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Faculty home: KPIs, review queue, upcoming interviews, assigned students' })
  getDashboard(@CurrentUser() user: any) {
    return this.portal.getDashboard({ userId: user.userId, role: user.role });
  }

  @Get('students')
  @ApiOperation({ summary: 'Students assigned to the signed-in faculty member' })
  getStudents(@CurrentUser() user: any) {
    return this.portal.getStudents({ userId: user.userId, role: user.role });
  }

  @Get('students/:studentId')
  @ApiOperation({ summary: 'Profile, readiness, skills and evidence of one assigned student' })
  getStudent(@CurrentUser() user: any, @Param('studentId') studentId: string) {
    return this.portal.getStudent({ userId: user.userId, role: user.role }, studentId);
  }
}
