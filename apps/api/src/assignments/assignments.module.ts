import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  FacultyAssignment,
  FacultyAssignmentSchema,
} from './schemas/faculty-assignment.schema.js';
import { Evidence, EvidenceSchema } from '../evidence/schemas/evidence.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import {
  StudentProfile,
  StudentProfileSchema,
} from '../students/schemas/student-profile.schema.js';
import { MockInterview, MockInterviewSchema } from '../interviews/schemas/mock-interview.schema.js';
import { AuditModule } from '../audit/audit.module.js';
import { AssignmentsService } from './assignments.service.js';
import { AssignmentAdminService } from './assignment-admin.service.js';
import { AssignmentAdminController } from './assignment-admin.controller.js';
import { AutoAllocationService } from './auto-allocation.service.js';
import { StudentMentorController } from './student-mentor.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FacultyAssignment.name, schema: FacultyAssignmentSchema },
      { name: Evidence.name, schema: EvidenceSchema },
      { name: User.name, schema: UserSchema },
      { name: StudentProfile.name, schema: StudentProfileSchema },
      { name: MockInterview.name, schema: MockInterviewSchema },
    ]),
    AuditModule,
  ],
  controllers: [AssignmentAdminController, StudentMentorController],
  providers: [AssignmentsService, AssignmentAdminService, AutoAllocationService],
  exports: [AssignmentsService, AssignmentAdminService, AutoAllocationService, MongooseModule],
})
export class AssignmentsModule {}
