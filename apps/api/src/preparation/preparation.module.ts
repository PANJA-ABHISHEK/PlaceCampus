import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssessmentsModule } from '../assessments/assessments.module.js';
import { MatchingModule } from '../matching/matching.module.js';
import { PreparationController } from './preparation.controller.js';
import { PreparationService } from './preparation.service.js';
import {
  PreparationPlan,
  PreparationPlanSchema,
} from './schemas/preparation-plan.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PreparationPlan.name, schema: PreparationPlanSchema },
    ]),
    MatchingModule,
    AssessmentsModule,
  ],
  controllers: [PreparationController],
  providers: [PreparationService],
  exports: [PreparationService],
})
export class PreparationModule {}
