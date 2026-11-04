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
import {
  EscalateReviewDto,
  ReassignReviewDto,
  ReviewAction,
  ReviewCommentDto,
  ReviewReasonDto,
} from './dto/review-decision.dto.js';
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
  getPendingReviews(
    @CurrentUser() user: any,
    @Query() query: any,
  ): Promise<any[]> {
    return this.facultyService.getPendingReviews({ userId: user.userId, role: user.role }, query);
  }

  @Get(':id')
  @Roles(UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get detailed review view for a specific evidence' })
  getReviewDetail(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.facultyService.getReviewDetail(id, { userId: user.userId, role: user.role });
  }

  @Post(':id/claim')
  @Roles(UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Claim or renew the 30-minute review lock' })
  claimReview(@Param('id') id: string, @CurrentUser() user: any) {
    return this.facultyService.claimReview(id, { userId: user.userId, role: user.role });
  }

  @Post(':id/escalate')
  @Roles(UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Escalate to the Review Coordinator with a reason code' })
  escalate(@Param('id') id: string, @Body() dto: EscalateReviewDto, @CurrentUser() user: any) {
    return this.facultyService.escalate(id, { userId: user.userId, role: user.role }, dto);
  }

  @Post(':id/release')
  @Roles(UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Release the review lock (the item stays assigned)' })
  releaseReview(@Param('id') id: string, @CurrentUser() user: any) {
    return this.facultyService.releaseReview(id, { userId: user.userId, role: user.role });
  }

  @Patch(':id/approve')
  @Roles(UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve evidence' })
  approveEvidence(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ReviewCommentDto,
  ): Promise<any> {
    return this.facultyService.makeDecision(id, { userId: user.userId, role: user.role }, {
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
    @Body() dto: ReviewReasonDto,
  ): Promise<any> {
    if (!dto.reason)
      throw new BadRequestException('Reason required for rejection');
    return this.facultyService.makeDecision(id, { userId: user.userId, role: user.role }, {
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
    @Body() dto: ReviewReasonDto,
  ): Promise<any> {
    if (!dto.reason)
      throw new BadRequestException('Reason required for resubmission request');
    return this.facultyService.makeDecision(id, { userId: user.userId, role: user.role }, {
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
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const documentMeta = await this.facultyService.getDocumentMeta(id, { userId: user.userId, role: user.role });

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

/**
 * Review Coordinator queue. No separate coordinator role exists yet, so the
 * Administrator acts as Review Coordinator (Master Plan ADM-21).
 */
@ApiTags('Admin: Review coordination')
@Controller('admin/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class ReviewCoordinatorController {
  constructor(private readonly facultyService: FacultyService) {}

  @Get()
  @ApiOperation({ summary: 'Coordinator queue (unroutable and escalated) or all overdue reviews' })
  queue(@Query('filter') filter?: 'coordinator' | 'overdue') {
    return this.facultyService.coordinatorQueue(filter === 'overdue' ? 'overdue' : 'coordinator');
  }

  @Post(':id/reassign')
  @ApiOperation({ summary: 'Assign a review to a reviewer (reason required)' })
  reassign(@Param('id') id: string, @Body() dto: ReassignReviewDto, @CurrentUser() user: any) {
    return this.facultyService.reassignReview(id, dto.reviewerId, dto.reason, { userId: user.userId, role: user.role });
  }
}
