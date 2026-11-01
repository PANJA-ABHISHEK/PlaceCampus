import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DrivesService } from './drives.service.js';
import { DrivesController } from './drives.controller.js';
import {
  PlacementDrive,
  PlacementDriveSchema,
} from './schemas/placement-drive.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlacementDrive.name, schema: PlacementDriveSchema },
    ]),
  ],
  controllers: [DrivesController],
  providers: [DrivesService],
  exports: [DrivesService, MongooseModule],
})
export class DrivesModule {}
