import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ReadinessService } from './readiness.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '@placecampus/shared-types';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('readiness')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReadinessController {
  constructor(private readonly readinessService: ReadinessService) {}

  @Get('me/score')
  @Roles(UserRole.STUDENT)
  getMyReadinessScore(@CurrentUser() user: any) {
    return this.readinessService.getMyReadiness(user.userId);
  }

  @Get('me/plan')
  @Roles(UserRole.STUDENT)
  getMyPreparationPlan(@CurrentUser() user: any) {
    return this.readinessService.getMyPreparationPlan(user.userId);
  }

  @Patch('me/plan/tasks/:taskId')
  @Roles(UserRole.STUDENT)
  updateTaskStatus(
    @Param('taskId') taskId: string,
    @Body('isCompleted') isCompleted: boolean,
    @CurrentUser() user: any
  ) {
    return this.readinessService.updateTaskStatus(user.userId, taskId, isCompleted);
  }
}
