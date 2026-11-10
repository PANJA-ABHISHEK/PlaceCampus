import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MatchingService } from './matching.service.js';
import { MatchingController } from './matching.controller.js';
import { MatchingEngine } from './engine/matching.engine.js';
import { DrivesModule } from '../drives/drives.module.js';
import { SkillsModule } from '../skills/skills.module.js';
import { EligibilityEngine } from '../eligibility/engine/eligibility.engine.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { StudentProfile, StudentProfileSchema } from '../students/schemas/student-profile.schema.js';
import {
  StudentSkillProfile,
  StudentSkillProfileSchema,
} from '../skills/schemas/student-skill-profile.schema.js';
import { PlacementApplication, ApplicationSchema } from '../applications/schemas/application.schema.js';
import { Evidence, EvidenceSchema } from '../evidence/schemas/evidence.schema.js';
import {
  VerificationRecord,
  VerificationRecordSchema,
} from '../verification/schemas/verification-record.schema.js';

@Module({
  imports: [
    DrivesModule,
    SkillsModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: StudentProfile.name, schema: StudentProfileSchema },
      { name: StudentSkillProfile.name, schema: StudentSkillProfileSchema },
      { name: PlacementApplication.name, schema: ApplicationSchema },
      { name: Evidence.name, schema: EvidenceSchema },
      { name: VerificationRecord.name, schema: VerificationRecordSchema },
    ]),
  ],
  controllers: [MatchingController],
  // The eligibility engine is stateless; supply reports use it to find each drive's pool.
  providers: [MatchingService, MatchingEngine, EligibilityEngine],
  exports: [MatchingService],
})
export class MatchingModule {}
