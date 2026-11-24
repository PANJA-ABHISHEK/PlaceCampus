import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@placecampus/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import { ScheduleRecruiterInterviewDto, RecruiterInterviewFeedbackDto, RescheduleRecruiterInterviewDto, CancelRecruiterInterviewDto } from './dto/recruiter-interview.dto.js';
import { RecruiterInterviewsService } from './recruiter-interviews.service.js';

@ApiTags('Recruiter Interviews')
@ApiBearerAuth()
@Controller('recruiter/interviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.RECRUITER)
export class RecruiterInterviewsController {
  constructor(private readonly service: RecruiterInterviewsService) {}

  @Get()
  @ApiOperation({ summary: 'List interviews for drives with active recruiter access' })
  list(@CurrentUser() user: any) {
    return this.service.list(user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Schedule an interview for a candidate on an assigned drive' })
  schedule(@CurrentUser() user: any, @Body() dto: ScheduleRecruiterInterviewDto) {
    return this.service.schedule(user.userId, dto);
  }

  @Patch(':interviewId/reschedule')
  reschedule(@CurrentUser() user: any, @Param('interviewId', ParseObjectIdPipe) id: string, @Body() dto: RescheduleRecruiterInterviewDto) {
    return this.service.reschedule(user.userId, id, dto);
  }

  @Patch(':interviewId/cancel')
  cancel(@CurrentUser() user: any, @Param('interviewId', ParseObjectIdPipe) id: string, @Body() dto: CancelRecruiterInterviewDto) {
    return this.service.cancel(user.userId, id, dto);
  }

  @Patch(':interviewId/feedback')
  @ApiOperation({ summary: 'Submit structured interview feedback and recommendation' })
  submitFeedback(@CurrentUser() user: any, @Param('interviewId', ParseObjectIdPipe) id: string, @Body() dto: RecruiterInterviewFeedbackDto) {
    return this.service.submitFeedback(user.userId, id, dto);
  }
}
