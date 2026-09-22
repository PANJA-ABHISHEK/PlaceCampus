import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EvidenceController } from './evidence.controller.js';
import { EvidenceService } from './evidence.service.js';
import { Evidence, EvidenceSchema } from './schemas/evidence.schema.js';
import { FileUploadService } from '../common/services/file-upload.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Evidence.name, schema: EvidenceSchema },
    ]),
  ],
  controllers: [EvidenceController],
  providers: [EvidenceService, FileUploadService],
  exports: [EvidenceService],
})
export class EvidenceModule {}
