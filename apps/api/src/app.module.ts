import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { SkillsModule } from './skills/skills.module.js';
import { StudentsModule } from './students/students.module.js';
import { EvidenceModule } from './evidence/evidence.module.js';
import { AIModule } from './ai/ai.module.js';
import { VerificationModule } from './verification/verification.module.js';
import { FacultyModule } from './faculty/faculty.module.js';
import { DrivesModule } from './drives/drives.module.js';
import { ApplicationsModule } from './applications/applications.module.js';
import { ReadinessModule } from './readiness/readiness.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import configuration from './config/configuration.js';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '../../.env'],
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),

    // MongoDB connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
      }),
    }),

    // BullMQ / Redis for background jobs
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
          password: configService.get<string>('redis.password') || undefined,
        },
      }),
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    SkillsModule,
    StudentsModule,
    EvidenceModule,
    AIModule,
    VerificationModule,
    FacultyModule,
    DrivesModule,
    ApplicationsModule,
    ReadinessModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

