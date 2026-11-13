import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InterviewsService } from './interviews.service.js';
import { RtcConfigService } from './rtc-config.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '@placecampus/shared-types';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import {
  CancelInterviewDto,
  CreateInterviewSlotDto,
} from './dto/interview-slot.dto.js';
import {
  AddInterviewQuestionsDto,
  EvaluateInterviewDto,
  RescheduleInterviewDto,
  ScheduleInterviewDto,
  UpdateFacultyNotesDto,
  UpdateInterviewQuestionDto,
} from './dto/mock-interview.dto.js';

@ApiTags('Interviews')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class InterviewsController {
  constructor(
    private readonly interviewsService: InterviewsService,
    private readonly rtcConfig: RtcConfigService,
  ) {}

  /* ---------------------------- Student ---------------------------- */

  @Get('student/interviews')
  @Roles(UserRole.STUDENT)
  async getStudentInterviews(@Req() req: any) {
    return this.interviewsService.getStudentInterviews(req.user.id);
  }

  @Get('student/interviews/:id')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'One interview, including faculty feedback once evaluated' })
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

  @Get('faculty/interviews/summary')
  @Roles(UserRole.FACULTY)
  @ApiOperation({ summary: 'Counts for the faculty interview dashboard' })
  async getFacultySummary(@Req() req: any) {
    return this.interviewsService.getFacultySummary(req.user.id);
  }

  @Get('faculty/interview-question-bank')
  @Roles(UserRole.FACULTY)
  @ApiOperation({ summary: 'Built-in interview questions grouped by category' })
  getQuestionBank() {
    return this.interviewsService.getQuestionBank();
  }

  @Post('faculty/interviews')
  @Roles(UserRole.FACULTY)
  @ApiOperation({ summary: 'Schedule a mock interview with an assigned student' })
  async scheduleInterview(@Body() dto: ScheduleInterviewDto, @Req() req: any) {
    return this.interviewsService.scheduleInterview(req.user.id, dto);
  }

  @Get('faculty/interviews/:id')
  @Roles(UserRole.FACULTY)
  async getFacultyInterviewById(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: any,
  ) {
    return this.interviewsService.getFacultyInterviewById(id, req.user.id);
  }

  @Post('faculty/interviews/:id/reschedule')
  @Roles(UserRole.FACULTY)
  @HttpCode(HttpStatus.OK)
  async rescheduleInterview(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: RescheduleInterviewDto,
    @Req() req: any,
  ) {
    return this.interviewsService.rescheduleInterview(id, req.user.id, dto);
  }

  @Post('faculty/interviews/:id/cancel')
  @Roles(UserRole.FACULTY)
  @HttpCode(HttpStatus.OK)
  async cancelInterview(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: CancelInterviewDto,
    @Req() req: any,
  ) {
    return this.interviewsService.cancelByFaculty(id, req.user.id, dto);
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

  @Post('faculty/interviews/:id/end')
  @Roles(UserRole.FACULTY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End the live call; the interview then awaits evaluation' })
  async endInterview(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: any,
  ) {
    return this.interviewsService.endInterview(id, req.user.id);
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
  @ApiOperation({ summary: 'Submit the structured evaluation and complete the interview' })
  async evaluateInterview(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: EvaluateInterviewDto,
    @Req() req: any,
  ) {
    return this.interviewsService.evaluateInterview(id, req.user.id, dto);
  }

  @Post('faculty/interviews/:id/questions')
  @Roles(UserRole.FACULTY)
  async addQuestions(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: AddInterviewQuestionsDto,
    @Req() req: any,
  ) {
    return this.interviewsService.addQuestions(id, req.user.id, dto.questions);
  }

  @Patch('faculty/interviews/:id/questions/:questionId')
  @Roles(UserRole.FACULTY)
  @ApiOperation({ summary: 'Mark a question as asked and/or record private feedback on it' })
  async updateQuestion(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('questionId', ParseObjectIdPipe) questionId: string,
    @Body() dto: UpdateInterviewQuestionDto,
    @Req() req: any,
  ) {
    return this.interviewsService.updateQuestion(id, req.user.id, questionId, dto);
  }

  @Delete('faculty/interviews/:id/questions/:questionId')
  @Roles(UserRole.FACULTY)
  async removeQuestion(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('questionId', ParseObjectIdPipe) questionId: string,
    @Req() req: any,
  ) {
    return this.interviewsService.removeQuestion(id, req.user.id, questionId);
  }

  @Put('faculty/interviews/:id/notes')
  @Roles(UserRole.FACULTY)
  @ApiOperation({ summary: 'Save private interviewer notes (never shown to the student)' })
  async updateNotes(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateFacultyNotesDto,
    @Req() req: any,
  ) {
    return this.interviewsService.updateNotes(id, req.user.id, dto.notes);
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

  /* ------------------------- Video room (both) ------------------------- */

  @Get('interviews/rooms/:roomId')
  @Roles(UserRole.FACULTY, UserRole.STUDENT)
  @ApiOperation({ summary: 'Interview details for a participant opening the video room' })
  async getRoom(@Param('roomId') roomId: string, @Req() req: any) {
    return this.interviewsService.getRoomDetails(roomId, req.user.id, req.user.role);
  }

  @Get('interviews/rtc-config')
  @Roles(UserRole.FACULTY, UserRole.STUDENT)
  @ApiOperation({ summary: 'ICE servers with short-lived TURN credentials' })
  getRtcConfig(@Req() req: any) {
    return this.rtcConfig.forUser(req.user.id);
  }
}
