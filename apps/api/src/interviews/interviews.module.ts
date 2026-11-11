import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import {
  InterviewFeedbackRecord,
  InterviewFeedbackSchema,
} from './schemas/interview-feedback.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import {
  StudentProfile,
  StudentProfileSchema,
} from '../students/schemas/student-profile.schema.js';
import { AssignmentsModule } from '../assignments/assignments.module.js';
import { RtcConfigService } from './rtc-config.service.js';
import { InterviewRoomRegistry } from './interview-room.registry.js';
import { InterviewRoomGateway } from './interview-room.gateway.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MockInterview.name, schema: MockInterviewSchema },
      { name: InterviewSlot.name, schema: InterviewSlotSchema },
      { name: InterviewFeedbackRecord.name, schema: InterviewFeedbackSchema },
      // Read-only lookups of participant names and registration numbers.
      { name: User.name, schema: UserSchema },
      { name: StudentProfile.name, schema: StudentProfileSchema },
    ]),
    // Scheduling is limited to students assigned to the faculty member.
    AssignmentsModule,
    // Verifies access tokens on the interview-room socket (same secret as the REST API).
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'fallback_secret_for_development_only'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [InterviewsController],
  providers: [
    InterviewsService,
    RtcConfigService,
    InterviewRoomRegistry,
    InterviewRoomGateway,
  ],
  exports: [InterviewsService],
})
export class InterviewsModule {}
