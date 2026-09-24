import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsController } from './analytics.controller.js';
import { UsersModule } from '../users/users.module.js';
import { StudentsModule } from '../students/students.module.js';
import { DrivesModule } from '../drives/drives.module.js';
import { ApplicationsModule } from '../applications/applications.module.js';

@Module({
  imports: [
    UsersModule,
    StudentsModule,
    DrivesModule,
    ApplicationsModule,
  ],
  providers: [AnalyticsService],
  controllers: [AnalyticsController]
})
export class AnalyticsModule {}
