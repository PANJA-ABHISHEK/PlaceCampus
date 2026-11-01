import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { EvidenceService } from './evidence.service.js';
import { EvidenceController } from './evidence.controller.js';
import { Evidence, EvidenceSchema } from './schemas/evidence.schema.js';
import { StorageModule } from '../storage/storage.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Evidence.name, schema: EvidenceSchema },
    ]),
    BullModule.registerQueue({
      name: 'verification',
    }),
    StorageModule,
  ],
  controllers: [EvidenceController],
  providers: [EvidenceService],
  exports: [EvidenceService],
})
export class EvidenceModule {}
