import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UserRole } from '@placecampus/shared-types';
import { VerificationService } from './verification.service.js';

@ApiTags('Verification')
@Controller('evidence/:evidenceId/verification')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get()
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get verification record for an evidence item' })
  getVerificationRecord(
    @Param('evidenceId') evidenceId: string,
    @CurrentUser() user: any,
  ) {
    return this.verificationService.getLatestRecord(evidenceId, user.userId);
  }
}
