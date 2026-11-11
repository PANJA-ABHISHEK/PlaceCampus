import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EligibilityService } from './eligibility.service.js';
import { EligibilityController } from './eligibility.controller.js';
import { EligibilityEngine } from './engine/eligibility.engine.js';
import { DrivesModule } from '../drives/drives.module.js';
import { StudentsModule } from '../students/students.module.js';
import { SkillsModule } from '../skills/skills.module.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { StudentProfile, StudentProfileSchema } from '../students/schemas/student-profile.schema.js';
import { StudentSkillProfile, StudentSkillProfileSchema } from '../skills/schemas/student-skill-profile.schema.js';

@Module({
  imports: [
    DrivesModule,
    StudentsModule,
    SkillsModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: StudentProfile.name, schema: StudentProfileSchema },
      { name: StudentSkillProfile.name, schema: StudentSkillProfileSchema },
    ]),
  ],
  controllers: [EligibilityController],
  providers: [EligibilityService, EligibilityEngine],
  exports: [EligibilityService],
})
export class EligibilityModule {}
