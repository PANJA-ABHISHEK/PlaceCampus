import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrgLookup, OrgLookupSchema } from './schemas/org-lookup.schema.js';
import { ImportMapping, ImportMappingSchema } from './schemas/import-mapping.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { StudentProfile, StudentProfileSchema } from '../students/schemas/student-profile.schema.js';
import { AuditModule } from '../audit/audit.module.js';
import { OrgService } from './org.service.js';
import { OrgController } from './org.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OrgLookup.name, schema: OrgLookupSchema },
      { name: ImportMapping.name, schema: ImportMappingSchema },
      { name: User.name, schema: UserSchema },
      { name: StudentProfile.name, schema: StudentProfileSchema },
    ]),
    AuditModule,
  ],
  controllers: [OrgController],
  providers: [OrgService],
  exports: [OrgService],
})
export class OrgModule {}
