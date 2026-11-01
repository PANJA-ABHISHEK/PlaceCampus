import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AssessmentsService } from './assessments.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '@placecampus/shared-types';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get('assessments')
  async getActiveAssessments() {
    return this.assessmentsService.getActiveAssessments();
  }

  @Get('assessments/:id')
  async getAssessmentById(@Param('id') id: string) {
    return this.assessmentsService.getAssessmentById(id);
  }

  @Get('student/assessments')
  @Roles(UserRole.STUDENT)
  async getStudentAttemptHistory(@Req() req: any) {
    return this.assessmentsService.getStudentAttemptHistory(req.user.id);
  }

  @Get('student/assessments/:attemptId')
  @Roles(UserRole.STUDENT)
  async getAttemptById(@Param('attemptId') attemptId: string, @Req() req: any) {
    return this.assessmentsService.getAttemptById(attemptId, req.user.id);
  }

  @Post('assessments/:id/start')
  @Roles(UserRole.STUDENT)
  async startAssessment(@Param('id') id: string, @Req() req: any) {
    return this.assessmentsService.startAssessment(id, req.user.id);
  }

  @Post('student/assessments/:attemptId/submit')
  @Roles(UserRole.STUDENT)
  async submitAssessment(
    @Param('attemptId') attemptId: string,
    @Body() payload: { answers: Record<string, string> },
    @Req() req: any,
  ) {
    return this.assessmentsService.submitAssessment(
      attemptId,
      req.user.id,
      payload,
    );
  }
}
