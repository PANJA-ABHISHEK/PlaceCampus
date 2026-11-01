import { Module } from '@nestjs/common';
import { MatchingService } from './matching.service.js';
import { MatchingController } from './matching.controller.js';
import { MatchingEngine } from './engine/matching.engine.js';
import { DrivesModule } from '../drives/drives.module.js';
import { SkillsModule } from '../skills/skills.module.js';

@Module({
  imports: [DrivesModule, SkillsModule],
  controllers: [MatchingController],
  providers: [MatchingService, MatchingEngine],
  exports: [MatchingService],
})
export class MatchingModule {}
