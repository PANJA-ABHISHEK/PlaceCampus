import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DrivesController } from './drives.controller.js';
import { DrivesService } from './drives.service.js';
import { PlacementDrive, PlacementDriveSchema } from './schemas/drive.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PlacementDrive.name, schema: PlacementDriveSchema }])
  ],
  controllers: [DrivesController],
  providers: [DrivesService],
  exports: [DrivesService],
})
export class DrivesModule {}
