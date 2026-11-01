import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssessmentsService } from './assessments.service.js';
import { AssessmentsController } from './assessments.controller.js';
import { Assessment, AssessmentSchema } from './schemas/assessment.schema.js';
import {
  AssessmentAttempt,
  AssessmentAttemptSchema,
} from './schemas/assessment-attempt.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Assessment.name, schema: AssessmentSchema },
      { name: AssessmentAttempt.name, schema: AssessmentAttemptSchema },
    ]),
  ],
  controllers: [AssessmentsController],
  providers: [AssessmentsService],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}
