import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StudentsService } from './students.service.js';
import { CreateStudentProfileDto, UpdateStudentProfileDto } from './dto/student-profile.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole, type UserDocument } from '../users/schemas/user.schema.js';

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post('me')
  @Roles(UserRole.STUDENT)
  createProfile(
    @CurrentUser() user: UserDocument,
    @Body() dto: CreateStudentProfileDto,
  ) {
    return this.studentsService.create(String(user._id), dto);
  }

  @Get('me')
  @Roles(UserRole.STUDENT)
  getMyProfile(@CurrentUser() user: UserDocument) {
    return this.studentsService.findByUserId(String(user._id));
  }

  @Patch('me')
  @Roles(UserRole.STUDENT)
  updateMyProfile(
    @CurrentUser() user: UserDocument,
    @Body() dto: UpdateStudentProfileDto,
  ) {
    return this.studentsService.update(String(user._id), dto);
  }

  @Get('me/completion')
  @Roles(UserRole.STUDENT)
  getProfileCompletion(@CurrentUser() user: UserDocument) {
    return this.studentsService.getProfileCompletion(String(user._id));
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PLACEMENT_HEAD, UserRole.PLACEMENT_OFFICER, UserRole.FACULTY)
  findAll(
    @Query('branch') branch?: string,
    @Query('graduationYear') graduationYear?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.studentsService.findAll({ branch, graduationYear, page, limit });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PLACEMENT_HEAD, UserRole.PLACEMENT_OFFICER, UserRole.FACULTY)
  findOne(@Param('id') id: string) {
    return this.studentsService.findById(id);
  }
}
