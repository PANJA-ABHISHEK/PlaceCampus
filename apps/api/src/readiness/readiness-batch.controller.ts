import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '@placecampus/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ReadinessBatchService } from './readiness-batch.service.js';

export class StartBatchRunDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  graduationYear?: number;

  @IsOptional()
  @IsString()
  department?: string;
}

/**
 * Batch readiness (Master Plan §15.11, REQ-P06-11): recompute readiness for a
 * whole cohort as a background job and follow its progress.
 */
@ApiTags('Readiness: batch runs')
@Controller('readiness/batch-runs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLACEMENT_HEAD, UserRole.ADMIN)
@ApiBearerAuth()
export class ReadinessBatchController {
  constructor(private readonly batch: ReadinessBatchService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Start a batch readiness run for all students or one cohort (202; runs in the background)' })
  start(@Body() dto: StartBatchRunDto, @CurrentUser() user: any) {
    return this.batch.start(
      { graduationYear: dto.graduationYear, department: dto.department?.trim() || undefined },
      { userId: user.userId, role: user.role },
    );
  }

  @Get()
  @ApiOperation({ summary: 'Recent batch readiness runs' })
  list(@Query('limit') limit?: string) {
    return this.batch.listRuns(Number(limit) || 10);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One run with live progress, chunk timings and failures' })
  get(@Param('id') id: string) {
    return this.batch.getRun(id);
  }
}
