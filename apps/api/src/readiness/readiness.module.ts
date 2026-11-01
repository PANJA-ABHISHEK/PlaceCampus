import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReadinessService } from './readiness.service.js';
import { ReadinessController } from './readiness.controller.js';
import {
  ReadinessSnapshot,
  ReadinessSnapshotSchema,
} from './schemas/readiness-snapshot.schema.js';
import {
  StudentProfile,
  StudentProfileSchema,
} from '../students/schemas/student-profile.schema.js';
import {
  StudentSkillProfile,
  StudentSkillProfileSchema,
} from '../skills/schemas/student-skill-profile.schema.js';
import {
  AssessmentAttempt,
  AssessmentAttemptSchema,
} from '../assessments/schemas/assessment-attempt.schema.js';
import {
  Evidence,
  EvidenceSchema,
} from '../evidence/schemas/evidence.schema.js';
import {
  MockInterview,
  MockInterviewSchema,
} from '../interviews/schemas/mock-interview.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReadinessSnapshot.name, schema: ReadinessSnapshotSchema },
      { name: StudentProfile.name, schema: StudentProfileSchema },
      { name: StudentSkillProfile.name, schema: StudentSkillProfileSchema },
      { name: AssessmentAttempt.name, schema: AssessmentAttemptSchema },
      { name: Evidence.name, schema: EvidenceSchema },
      { name: MockInterview.name, schema: MockInterviewSchema },
    ]),
  ],
  controllers: [ReadinessController],
  providers: [ReadinessService],
  exports: [ReadinessService],
})
export class ReadinessModule {}
