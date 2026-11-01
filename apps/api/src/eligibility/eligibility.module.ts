import { Module } from '@nestjs/common';
import { EligibilityService } from './eligibility.service.js';
import { EligibilityController } from './eligibility.controller.js';
import { EligibilityEngine } from './engine/eligibility.engine.js';
import { DrivesModule } from '../drives/drives.module.js';
import { StudentsModule } from '../students/students.module.js';
import { SkillsModule } from '../skills/skills.module.js';

@Module({
  imports: [DrivesModule, StudentsModule, SkillsModule],
  controllers: [EligibilityController],
  providers: [EligibilityService, EligibilityEngine],
  exports: [EligibilityService],
})
export class EligibilityModule {}
