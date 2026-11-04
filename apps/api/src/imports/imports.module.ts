import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImportJob, ImportJobSchema } from './schemas/import-job.schema.js';
import { ImportRow, ImportRowSchema } from './schemas/import-row.schema.js';
import { ImportsService } from './imports.service.js';
import { ImportsController } from './imports.controller.js';
import { ImportsProcessor } from './imports.processor.js';
import { OrgModule } from '../org/org.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { AssignmentsModule } from '../assignments/assignments.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ImportJob.name, schema: ImportJobSchema },
      { name: ImportRow.name, schema: ImportRowSchema },
    ]),
    // The 'imports' queue is registered once, globally, in QueuesModule.
    // Provides the User, StudentProfile and FacultyAssignment models.
    AssignmentsModule,
    OrgModule,
    AuditModule,
    StorageModule,
  ],
  controllers: [ImportsController],
  providers: [ImportsService, ImportsProcessor],
  exports: [ImportsService],
})
export class ImportsModule {}
