import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { StudentsModule } from './students/students.module.js';
import { CommonModule } from './common/common.module.js';
import { HealthController } from './common/health.controller.js';
import appConfig from './config/app.config.js';
import databaseConfig from './config/database.config.js';
import redisConfig from './config/redis.config.js';
import jwtConfig from './config/jwt.config.js';
import { StorageModule } from './storage/storage.module.js';
import { EvidenceModule } from './evidence/evidence.module.js';
import { VerificationModule } from './verification/verification.module.js';
import { FacultyModule } from './faculty/faculty.module.js';
import { SkillsModule } from './skills/skills.module.js';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AssessmentsModule } from './assessments/assessments.module.js';
import { InterviewsModule } from './interviews/interviews.module.js';
import { ReadinessModule } from './readiness/readiness.module.js';
import { DrivesModule } from './drives/drives.module.js';
import { EligibilityModule } from './eligibility/eligibility.module.js';
import { MatchingModule } from './matching/matching.module.js';
import { ApplicationsModule } from './applications/applications.module.js';
import { AuditModule } from './audit/audit.module.js';
import { RecruiterAccessModule } from './recruiter-access/recruiter-access.module.js';
import { RecruiterModule } from './recruiter/recruiter.module.js';
import { PreparationModule } from './preparation/preparation.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
@Module({
  imports: [
    // ── Configuration ──
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig],
      envFilePath: ['.env', '../../.env'],
    }),

    // ── Database ──
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
      }),
      inject: [ConfigService],
    }),

    // ── Queue (BullMQ via Redis) ──
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
        },
      }),
      inject: [ConfigService],
    }),

    // ── Feature Modules ──
    EventEmitterModule.forRoot(),
    CommonModule,
    AuthModule,
    UsersModule,
    StudentsModule,
    StorageModule,
    EvidenceModule,
    VerificationModule,
    FacultyModule,
    SkillsModule,
    AssessmentsModule,
    InterviewsModule,
    ReadinessModule,
    DrivesModule,
    EligibilityModule,
    MatchingModule,
    ApplicationsModule,
    AuditModule,
    RecruiterAccessModule,
    RecruiterModule,
    PreparationModule,
    AnalyticsModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
