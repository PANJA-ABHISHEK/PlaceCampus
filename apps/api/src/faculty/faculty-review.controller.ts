import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { FacultyReviewService } from './faculty-review.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole, type UserDocument } from '../users/schemas/user.schema.js';
import { ReviewStatus } from './schemas/review-task.schema.js';

@Controller('faculty/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.FACULTY, UserRole.ADMIN, UserRole.PLACEMENT_HEAD)
export class FacultyReviewController {
  constructor(
    private readonly reviewService: FacultyReviewService,
  ) {}

  @Get()
  getReviews(
    @CurrentUser() user: UserDocument,
    @Query('status') status?: ReviewStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewService.findPendingReviews({
      status,
      page,
      limit,
    });
  }

  @Get('count')
  getPendingCount() {
    return this.reviewService.getPendingCount();
  }

  @Get(':id')
  getReview(@Param('id') id: string) {
    return this.reviewService.findById(id);
  }

  @Patch(':id/approve')
  approve(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
    @Body('comments') comments?: string,
  ) {
    return this.reviewService.approve(id, String(user._id), comments);
  }

  @Patch(':id/reject')
  reject(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
    @Body('rejectionReason') rejectionReason: string,
  ) {
    return this.reviewService.reject(id, String(user._id), rejectionReason);
  }

  @Patch(':id/request-resubmission')
  requestResubmission(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
    @Body('comments') comments: string,
  ) {
    return this.reviewService.requestResubmission(
      id,
      String(user._id),
      comments,
    );
  }
}
