import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Evidence,
  EvidenceSchema,
} from '../evidence/schemas/evidence.schema.js';
import {
  VerificationRecord,
  VerificationRecordSchema,
} from '../verification/schemas/verification-record.schema.js';
import {
  ReadinessSnapshot,
  ReadinessSnapshotSchema,
} from '../readiness/schemas/readiness-snapshot.schema.js';
import {
  StudentSkillProfile,
  StudentSkillProfileSchema,
} from '../skills/schemas/student-skill-profile.schema.js';
import {
  MockInterview,
  MockInterviewSchema,
} from '../interviews/schemas/mock-interview.schema.js';
import { FacultyController, ReviewCoordinatorController } from './faculty.controller.js';
import { FacultyService } from './faculty.service.js';
import { FacultyPortalController } from './faculty-portal.controller.js';
import { FacultyPortalService } from './faculty-portal.service.js';
import { StorageModule } from '../storage/storage.module.js';
import { AssignmentsModule } from '../assignments/assignments.module.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Evidence.name, schema: EvidenceSchema },
      { name: VerificationRecord.name, schema: VerificationRecordSchema },
      { name: ReadinessSnapshot.name, schema: ReadinessSnapshotSchema },
      { name: StudentSkillProfile.name, schema: StudentSkillProfileSchema },
      { name: MockInterview.name, schema: MockInterviewSchema },
    ]),
    StorageModule,
    // Also provides the User, StudentProfile and FacultyAssignment models.
    AssignmentsModule,
    AuditModule,
  ],
  controllers: [FacultyPortalController, FacultyController, ReviewCoordinatorController],
  providers: [FacultyService, FacultyPortalService],
  exports: [FacultyService],
})
export class FacultyModule {}
