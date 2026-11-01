import { Module } from '@nestjs/common';
import { RecruiterService } from './recruiter.service.js';
import { RecruiterController } from './recruiter.controller.js';
import { RecruiterAccessModule } from '../recruiter-access/recruiter-access.module.js';
import { DrivesModule } from '../drives/drives.module.js';
import { ApplicationsModule } from '../applications/applications.module.js';
import { StudentsModule } from '../students/students.module.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [
    RecruiterAccessModule,
    DrivesModule,
    ApplicationsModule,
    StudentsModule,
    AuditModule,
  ],
  controllers: [RecruiterController],
  providers: [RecruiterService]
})
export class RecruiterModule {}
