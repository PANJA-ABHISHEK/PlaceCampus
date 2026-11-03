import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InterviewsService } from './interviews.service.js';
import { InterviewsController } from './interviews.controller.js';
import {
  MockInterview,
  MockInterviewSchema,
} from './schemas/mock-interview.schema.js';
import {
  InterviewSlot,
  InterviewSlotSchema,
} from './schemas/interview-slot.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MockInterview.name, schema: MockInterviewSchema },
      { name: InterviewSlot.name, schema: InterviewSlotSchema },
      // Read-only lookups of participant names.
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [InterviewsController],
  providers: [InterviewsService],
  exports: [InterviewsService],
})
export class InterviewsModule {}
