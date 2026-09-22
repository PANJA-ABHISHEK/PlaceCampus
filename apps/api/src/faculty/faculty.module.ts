import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FacultyReviewController } from './faculty-review.controller.js';
import { FacultyReviewService } from './faculty-review.service.js';
import { ReviewTask, ReviewTaskSchema } from './schemas/review-task.schema.js';
import { EvidenceModule } from '../evidence/evidence.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReviewTask.name, schema: ReviewTaskSchema },
    ]),
    EvidenceModule,
  ],
  controllers: [FacultyReviewController],
  providers: [FacultyReviewService],
  exports: [FacultyReviewService],
})
export class FacultyModule {}
