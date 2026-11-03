import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InterviewsService } from './interviews.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole, InterviewRubric } from '@placecampus/shared-types';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import {
  CancelInterviewDto,
  CreateInterviewSlotDto,
} from './dto/interview-slot.dto.js';

@ApiTags('Interviews')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  /* ---------------------------- Student ---------------------------- */

  @Get('student/interviews')
  @Roles(UserRole.STUDENT)
  async getStudentInterviews(@Req() req: any) {
    return this.interviewsService.getStudentInterviews(req.user.id);
  }

  @Get('student/interviews/:id')
  @Roles(UserRole.STUDENT)
  async getStudentInterviewById(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: any,
  ) {
    return this.interviewsService.getStudentInterviewById(id, req.user.id);
  }

  @Post('student/interviews/:id/cancel')
  @Roles(UserRole.STUDENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a booked interview (up to 2 hours before)' })
  async cancelByStudent(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: CancelInterviewDto,
    @Req() req: any,
  ) {
    return this.interviewsService.cancelByStudent(id, req.user.id, dto);
  }

  @Get('student/interview-slots')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'List open interview slots that can be booked' })
  async getOpenSlots() {
    return this.interviewsService.getOpenSlots();
  }

  @Post('student/interview-slots/:id/book')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Book an open slot as a mock interview' })
  async bookSlot(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: any,
  ) {
    return this.interviewsService.bookSlot(id, req.user.id);
  }

  /* ---------------------------- Faculty ---------------------------- */

  @Get('faculty/interviews')
  @Roles(UserRole.FACULTY)
  async getFacultyInterviews(@Req() req: any) {
    return this.interviewsService.getFacultyInterviews(req.user.id);
  }

  @Get('faculty/interviews/:id')
  @Roles(UserRole.FACULTY)
  async getFacultyInterviewById(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: any,
  ) {
    return this.interviewsService.getFacultyInterviewById(id, req.user.id);
  }

  @Post('faculty/interviews/:id/start')
  @Roles(UserRole.FACULTY)
  @HttpCode(HttpStatus.OK)
  async startInterview(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: any,
  ) {
    return this.interviewsService.startInterview(id, req.user.id);
  }

  @Post('faculty/interviews/:id/no-show')
  @Roles(UserRole.FACULTY)
  @HttpCode(HttpStatus.OK)
  async markNoShow(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: any,
  ) {
    return this.interviewsService.markNoShow(id, req.user.id);
  }

  @Post('faculty/interviews/:id/evaluate')
  @Roles(UserRole.FACULTY)
  async evaluateInterview(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() payload: { rubricScores: InterviewRubric; feedback: string },
    @Req() req: any,
  ) {
    return this.interviewsService.evaluateInterview(id, req.user.id, payload);
  }

  @Get('faculty/interview-slots')
  @Roles(UserRole.FACULTY)
  @ApiOperation({ summary: 'List your upcoming interview slots' })
  async getFacultySlots(@Req() req: any) {
    return this.interviewsService.getFacultySlots(req.user.id);
  }

  @Post('faculty/interview-slots')
  @Roles(UserRole.FACULTY)
  @ApiOperation({ summary: 'Open a time slot for a live mock interview' })
  async createSlot(@Body() dto: CreateInterviewSlotDto, @Req() req: any) {
    return this.interviewsService.createSlot(req.user.id, dto);
  }

  @Post('faculty/interview-slots/:id/cancel')
  @Roles(UserRole.FACULTY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a slot (and its booking, if any)' })
  async cancelSlot(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: CancelInterviewDto,
    @Req() req: any,
  ) {
    return this.interviewsService.cancelSlot(id, req.user.id, dto);
  }
}
