import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { InterviewsService } from './interviews.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole, InterviewRubric } from '@placecampus/shared-types';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Get('student/interviews')
  @Roles(UserRole.STUDENT)
  async getStudentInterviews(@Req() req: any) {
    return this.interviewsService.getStudentInterviews(req.user.id); // Assuming req.user.id maps to studentId logic or user id -> student doc. Actually, throughout the app, req.user.id is used directly as studentId in some places. I'll stick to req.user.id.
  }

  @Get('student/interviews/:id')
  @Roles(UserRole.STUDENT)
  async getStudentInterviewById(@Param('id') id: string, @Req() req: any) {
    return this.interviewsService.getStudentInterviewById(id, req.user.id);
  }

  @Get('faculty/interviews')
  @Roles(UserRole.FACULTY)
  async getFacultyInterviews(@Req() req: any) {
    return this.interviewsService.getFacultyInterviews(req.user.id);
  }

  @Get('faculty/interviews/:id')
  @Roles(UserRole.FACULTY)
  async getFacultyInterviewById(@Param('id') id: string, @Req() req: any) {
    return this.interviewsService.getFacultyInterviewById(id, req.user.id);
  }

  @Post('faculty/interviews/:id/evaluate')
  @Roles(UserRole.FACULTY)
  async evaluateInterview(
    @Param('id') id: string,
    @Body() payload: { rubricScores: InterviewRubric; feedback: string },
    @Req() req: any,
  ) {
    return this.interviewsService.evaluateInterview(id, req.user.id, payload);
  }
}
