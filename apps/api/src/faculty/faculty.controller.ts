import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  Res,
  StreamableFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UserRole } from '@placecampus/shared-types';
import { FacultyService } from './faculty.service.js';
import { ReviewDecisionDto, ReviewAction } from './dto/review-decision.dto.js';
import { StorageService } from '../storage/storage.service.js';

@ApiTags('Faculty Review')
@Controller('faculty/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FacultyController {
  constructor(
    private readonly facultyService: FacultyService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  @Roles(UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get list of evidence pending review' })
  getPendingReviews(@Query() query: any): Promise<any[]> {
    return this.facultyService.getPendingReviews(query);
  }

  @Get(':id')
  @Roles(UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get detailed review view for a specific evidence' })
  getReviewDetail(@Param('id') id: string): Promise<any> {
    return this.facultyService.getReviewDetail(id);
  }

  @Patch(':id/approve')
  @Roles(UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve evidence' })
  approveEvidence(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: Partial<ReviewDecisionDto>,
  ): Promise<any> {
    return this.facultyService.makeDecision(id, user.userId, {
      action: ReviewAction.APPROVE,
      reason: dto.reason,
    });
  }

  @Patch(':id/reject')
  @Roles(UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Reject evidence' })
  rejectEvidence(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ReviewDecisionDto,
  ): Promise<any> {
    if (!dto.reason)
      throw new BadRequestException('Reason required for rejection');
    return this.facultyService.makeDecision(id, user.userId, {
      action: ReviewAction.REJECT,
      reason: dto.reason,
    });
  }

  @Patch(':id/request-resubmission')
  @Roles(UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Request resubmission' })
  requestResubmission(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ReviewDecisionDto,
  ): Promise<any> {
    if (!dto.reason)
      throw new BadRequestException('Reason required for resubmission request');
    return this.facultyService.makeDecision(id, user.userId, {
      action: ReviewAction.REQUEST_RESUBMISSION,
      reason: dto.reason,
    });
  }

  @Get(':id/document/download')
  @Roles(UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Download the supporting document for evidence review',
  })
  async downloadDocument(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const documentMeta = await this.facultyService.getDocumentMeta(id);

    if (!(documentMeta as any).key) {
      throw new BadRequestException(
        'Document not fully uploaded or missing key',
      );
    }

    const absolutePath = await this.storageService.getFilePath(
      (documentMeta as any).key,
    );

    const fileStream = createReadStream(absolutePath);

    res.set({
      'Content-Type': documentMeta.mimeType,
      'Content-Disposition': `inline; filename="${documentMeta.originalName}"`,
    });

    return new StreamableFile(fileStream);
  }
}
