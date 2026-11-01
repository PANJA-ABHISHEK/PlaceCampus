import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InterviewsService } from './interviews.service.js';
import { InterviewsController } from './interviews.controller.js';
import {
  MockInterview,
  MockInterviewSchema,
} from './schemas/mock-interview.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MockInterview.name, schema: MockInterviewSchema },
    ]),
  ],
  controllers: [InterviewsController],
  providers: [InterviewsService],
  exports: [InterviewsService],
})
export class InterviewsModule {}
