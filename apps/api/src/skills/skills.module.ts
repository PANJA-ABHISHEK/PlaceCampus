import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Skill, SkillSchema } from './schemas/skill.schema.js';
import {
  SkillCluster,
  SkillClusterSchema,
} from './schemas/skill-cluster.schema.js';
import { SkillClaim, SkillClaimSchema } from './schemas/skill-claim.schema.js';
import {
  StudentSkillProfile,
  StudentSkillProfileSchema,
} from './schemas/student-skill-profile.schema.js';
import {
  SkillEquivalence,
  SkillEquivalenceSchema,
} from './schemas/skill-equivalence.schema.js';
import {
  SkillRoleMapping,
  SkillRoleMappingSchema,
} from './schemas/skill-role-mapping.schema.js';
import { SkillsService } from './skills.service.js';
import { SkillNormalizationService } from './skill-normalization.service.js';
import { SkillsController } from './skills.controller.js';
import {
  VerificationRecord,
  VerificationRecordSchema,
} from '../verification/schemas/verification-record.schema.js';
import {
  Evidence,
  EvidenceSchema,
} from '../evidence/schemas/evidence.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Skill.name, schema: SkillSchema },
      { name: SkillCluster.name, schema: SkillClusterSchema },
      { name: SkillClaim.name, schema: SkillClaimSchema },
      { name: StudentSkillProfile.name, schema: StudentSkillProfileSchema },
      { name: SkillEquivalence.name, schema: SkillEquivalenceSchema },
      { name: SkillRoleMapping.name, schema: SkillRoleMappingSchema },
      { name: VerificationRecord.name, schema: VerificationRecordSchema },
      { name: Evidence.name, schema: EvidenceSchema },
    ]),
  ],
  controllers: [SkillsController],
  providers: [SkillsService, SkillNormalizationService],
  exports: [SkillsService, SkillNormalizationService],
})
export class SkillsModule {}
