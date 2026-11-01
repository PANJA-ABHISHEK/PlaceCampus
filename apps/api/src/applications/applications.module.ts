import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationsService } from './applications.service.js';
import { ApplicationsController } from './applications.controller.js';
import {
  PlacementApplication,
  ApplicationSchema,
} from './schemas/application.schema.js';
import { DrivesModule } from '../drives/drives.module.js';
import { EligibilityModule } from '../eligibility/eligibility.module.js';
import { MatchingModule } from '../matching/matching.module.js';
import { ReadinessModule } from '../readiness/readiness.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlacementApplication.name, schema: ApplicationSchema },
    ]),
    DrivesModule,
    EligibilityModule,
    MatchingModule,
    ReadinessModule,
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
