import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditService } from './audit.service.js';
import { AdminAuditController } from './audit.controller.js';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AuditLog.name, schema: AuditLogSchema }])
  ],
  controllers: [AdminAuditController],
  providers: [AuditService],
  exports: [AuditService]
})
export class AuditModule {}
