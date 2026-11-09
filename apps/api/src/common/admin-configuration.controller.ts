import { Controller, Get, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@placecampus/shared-types';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { DEFAULT_MENTEE_TARGET } from '../assignments/assignment-admin.service.js';
import { REVIEW_SLA_WORKING_DAYS } from '../assignments/assignments.service.js';
import { MAX_IMPORT_ROWS } from '../imports/imports.service.js';
import { MAX_UPCOMING_BOOKINGS } from '../interviews/interviews.service.js';

@Controller('admin/configuration')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminConfigurationController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  getConfiguration() {
    return {
      checkedAt: new Date().toISOString(),
      runtime: {
        environment: this.config.get<string>('app.nodeEnv', 'development'),
        apiPort: this.config.get<number>('app.port', 4000),
        frontendUrl: this.config.get<string>('app.frontendUrl'),
        backendUrl: this.config.get<string>('app.backendUrl'),
        accessTokenLifetime: this.config.get<string>('jwt.expiresIn'),
        refreshTokenLifetime: this.config.get<string>('jwt.refreshExpiresIn'),
        databaseConfiguration: process.env.MONGODB_URI ? 'Environment variable' : 'Application default',
        queueConfiguration: process.env.REDIS_URL ? 'Environment variable' : 'Local default',
      },
      policies: {
        mentorSoftTarget: DEFAULT_MENTEE_TARGET,
        evidenceReviewSlaWorkingDays: REVIEW_SLA_WORKING_DAYS,
        maximumImportRows: MAX_IMPORT_ROWS,
        maximumUpcomingInterviews: MAX_UPCOMING_BOOKINGS,
      },
    };
  }
}
