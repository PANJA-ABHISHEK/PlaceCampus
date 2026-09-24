import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationsController } from './applications.controller.js';
import { ApplicationsService } from './applications.service.js';
import { Application, ApplicationSchema } from './schemas/application.schema.js';
import { EligibilityEngineService } from './eligibility-engine.service.js';
import { DrivesModule } from '../drives/drives.module.js';
import { StudentsModule } from '../students/students.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Application.name, schema: ApplicationSchema }]),
    forwardRef(() => DrivesModule),
    StudentsModule,
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, EligibilityEngineService],
  exports: [ApplicationsService, EligibilityEngineService],
})
export class ApplicationsModule {}
