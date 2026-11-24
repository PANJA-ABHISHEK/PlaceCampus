import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RESUME_ANALYZER_LIMITS, UserRole } from '@placecampus/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import { AnalyzeResumeDto } from './dto/analyze-resume.dto.js';
import { checkDeclaredType, ResumeFileError } from './parsing/resume-file.validation.js';
import { ResumeAnalyzerService, type UploadedResumeFile } from './resume-analyzer.service.js';

/** Hard ceiling for the multipart body; the service applies RESUME_MAX_FILE_MB within it. */
const UPLOAD_CEILING_BYTES = 10 * 1024 * 1024;

@ApiTags('Resume Analyzer')
@Controller('resume-analyzer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@ApiBearerAuth()
export class ResumeAnalyzerController {
  constructor(private readonly service: ResumeAnalyzerService) {}

  @Get('resume')
  @ApiOperation({ summary: "The authenticated student's current resume (null when none)" })
  async getResume(@CurrentUser() user: any) {
    return { resume: await this.service.getResume(user.userId) };
  }

  @Post('resume')
  @ApiOperation({ summary: 'Upload or replace the resume (PDF or DOCX)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: UPLOAD_CEILING_BYTES, files: 1 },
      fileFilter: (_req, file, cb) => {
        try {
          checkDeclaredType(file.originalname, file.mimetype);
          cb(null, true);
        } catch (error) {
          cb(new BadRequestException((error as ResumeFileError).message), false);
        }
      },
    }),
  )
  uploadResume(@CurrentUser() user: any, @UploadedFile() file: UploadedResumeFile | undefined) {
    return this.service.uploadResume(user.userId, file);
  }

  @Delete('resume')
  @ApiOperation({ summary: 'Remove the current resume (saved analyses are kept)' })
  removeResume(@CurrentUser() user: any) {
    return this.service.removeResume(user.userId);
  }

  @Post('analyses')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Analyse the current resume: estimated ATS compatibility, feedback and optional job description match',
  })
  analyze(@CurrentUser() user: any, @Body() dto: AnalyzeResumeDto) {
    return this.service.analyze(user.userId, dto);
  }

  @Get('analyses')
  @ApiOperation({ summary: 'Analysis history, newest first' })
  list(@CurrentUser() user: any) {
    return this.service.listAnalyses(user.userId);
  }

  @Get('limits')
  @ApiOperation({ summary: 'Upload and input limits' })
  limits() {
    return { ...RESUME_ANALYZER_LIMITS, maxFileBytes: this.service.maxFileBytes };
  }

  @Get('analyses/:id')
  @ApiOperation({ summary: 'One saved analysis' })
  get(@CurrentUser() user: any, @Param('id', ParseObjectIdPipe) id: string) {
    return this.service.getAnalysis(user.userId, id);
  }

  @Delete('analyses/:id')
  @ApiOperation({ summary: 'Delete one saved analysis' })
  remove(@CurrentUser() user: any, @Param('id', ParseObjectIdPipe) id: string) {
    return this.service.deleteAnalysis(user.userId, id);
  }
}
