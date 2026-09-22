import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
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
import configuration from './config/configuration.js';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '../../.env'],
    }),

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

