import { Module } from '@nestjs/common';
import { RecruiterService } from './recruiter.service.js';
import { RecruiterController, RecruiterDashboardController } from './recruiter.controller.js';
import { RecruiterAccessModule } from '../recruiter-access/recruiter-access.module.js';
import { DrivesModule } from '../drives/drives.module.js';
import { ApplicationsModule } from '../applications/applications.module.js';
import { StudentsModule } from '../students/students.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { MongooseModule } from '@nestjs/mongoose';
import { RecruiterInterview, RecruiterInterviewSchema } from './schemas/recruiter-interview.schema.js';
import { RecruiterInterviewsController } from './recruiter-interviews.controller.js';
import { RecruiterInterviewsService } from './recruiter-interviews.service.js';
import { RecruiterInsightsService } from './recruiter-insights.service.js';
import { RecruiterDriveInsightsController, RecruiterInsightsController } from './recruiter-insights.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [
    RecruiterAccessModule,
    DrivesModule,
    ApplicationsModule,
    StudentsModule,
    AuditModule,
    NotificationsModule,
    UsersModule,
    MongooseModule.forFeature([{ name: RecruiterInterview.name, schema: RecruiterInterviewSchema }]),
  ],
  controllers: [RecruiterController, RecruiterDashboardController, RecruiterDriveInsightsController, RecruiterInsightsController, RecruiterInterviewsController],
  providers: [RecruiterService, RecruiterInterviewsService, RecruiterInsightsService]
})
export class RecruiterModule {}
