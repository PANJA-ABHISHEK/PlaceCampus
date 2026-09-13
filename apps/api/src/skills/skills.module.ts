import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SkillsService } from './skills.service.js';
import { SkillsController } from './skills.controller.js';
import { Skill, SkillSchema } from './schemas/skill.schema.js';
import { SkillCluster, SkillClusterSchema } from './schemas/skill-cluster.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Skill.name, schema: SkillSchema },
      { name: SkillCluster.name, schema: SkillClusterSchema },
    ]),
  ],
  controllers: [SkillsController],
  providers: [SkillsService],
  exports: [SkillsService],
})
export class SkillsModule {}
