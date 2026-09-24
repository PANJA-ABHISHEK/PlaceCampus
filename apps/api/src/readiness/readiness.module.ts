import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReadinessService } from './readiness.service.js';
import { ReadinessController } from './readiness.controller.js';
import { ReadinessScore, ReadinessScoreSchema, PreparationPlan, PreparationPlanSchema } from './schemas/readiness.schema.js';
import { StudentsModule } from '../students/students.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReadinessScore.name, schema: ReadinessScoreSchema },
      { name: PreparationPlan.name, schema: PreparationPlanSchema },
    ]),
    StudentsModule,
  ],
  providers: [ReadinessService],
  controllers: [ReadinessController],
  exports: [ReadinessService],
})
export class ReadinessModule {}
