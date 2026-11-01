import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsService } from './analytics.service.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { StudentProfile, StudentProfileSchema } from '../students/schemas/student-profile.schema.js';
import { StudentSkillProfile, StudentSkillProfileSchema } from '../skills/schemas/student-skill-profile.schema.js';
import { ReadinessSnapshot, ReadinessSnapshotSchema } from '../readiness/schemas/readiness-snapshot.schema.js';
import { Skill, SkillSchema } from '../skills/schemas/skill.schema.js';
import { PlacementDrive, PlacementDriveSchema } from '../drives/schemas/placement-drive.schema.js';
import { PlacementApplication, ApplicationSchema } from '../applications/schemas/application.schema.js';
import { Evidence, EvidenceSchema } from '../evidence/schemas/evidence.schema.js';
import { PreparationPlan, PreparationPlanSchema } from '../preparation/schemas/preparation-plan.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: StudentProfile.name, schema: StudentProfileSchema },
      { name: StudentSkillProfile.name, schema: StudentSkillProfileSchema },
      { name: ReadinessSnapshot.name, schema: ReadinessSnapshotSchema },
      { name: Skill.name, schema: SkillSchema },
      { name: PlacementDrive.name, schema: PlacementDriveSchema },
      { name: PlacementApplication.name, schema: ApplicationSchema },
      { name: Evidence.name, schema: EvidenceSchema },
      { name: PreparationPlan.name, schema: PreparationPlanSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
