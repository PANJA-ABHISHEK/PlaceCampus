import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecruiterAccessService } from './recruiter-access.service.js';
import { RecruiterAccessController, RecruiterAccessGlobalController } from './recruiter-access.controller.js';
import { RecruiterAccessGrant, RecruiterAccessGrantSchema } from './schemas/access-grant.schema.js';
import { AuditModule } from '../audit/audit.module.js';
import { DrivesModule } from '../drives/drives.module.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: RecruiterAccessGrant.name, schema: RecruiterAccessGrantSchema }]),
    AuditModule,
    DrivesModule,
    UsersModule,
  ],
  controllers: [RecruiterAccessController, RecruiterAccessGlobalController],
  providers: [RecruiterAccessService],
  exports: [RecruiterAccessService]
})
export class RecruiterAccessModule {}
