import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Evidence,
  EvidenceSchema,
} from '../evidence/schemas/evidence.schema.js';
import {
  VerificationRecord,
  VerificationRecordSchema,
} from '../verification/schemas/verification-record.schema.js';
import { FacultyController } from './faculty.controller.js';
import { FacultyService } from './faculty.service.js';
import { StorageModule } from '../storage/storage.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Evidence.name, schema: EvidenceSchema },
      { name: VerificationRecord.name, schema: VerificationRecordSchema },
    ]),
    StorageModule,
  ],
  controllers: [FacultyController],
  providers: [FacultyService],
  exports: [FacultyService],
})
export class FacultyModule {}
