import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditService } from './audit.service.js';
import { AdminAuditController, RecruiterAccessLogController } from './audit.controller.js';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema.js';
import { PlacementDrive, PlacementDriveSchema } from '../drives/schemas/placement-drive.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
      // Read-only lookups for drive and student names in the recruiter access log.
      { name: PlacementDrive.name, schema: PlacementDriveSchema },
      { name: User.name, schema: UserSchema },
    ])
  ],
  controllers: [AdminAuditController, RecruiterAccessLogController],
  providers: [AuditService],
  exports: [AuditService]
})
export class AuditModule {}
