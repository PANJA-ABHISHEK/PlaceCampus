import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StorageModule } from '../storage/storage.module.js';
import { VerificationModule } from '../verification/verification.module.js';
import { StudentProfile, StudentProfileSchema } from '../students/schemas/student-profile.schema.js';
import { Resume, ResumeSchema } from './schemas/resume.schema.js';
import { ResumeAnalysisRecord, ResumeAnalysisRecordSchema } from './schemas/resume-analysis.schema.js';
import { ResumeAnalyzerController } from './resume-analyzer.controller.js';
import { ResumeAnalyzerService } from './resume-analyzer.service.js';
import { ResumeParserService } from './parsing/resume-parser.service.js';
import { ResumeAiClient } from './ai/resume-ai.client.js';
import { AtsAnalysisService } from './ats-analysis.service.js';
import { JobMatchService } from './job-match.service.js';

/** AI Resume Analyzer: student resume upload, estimated ATS analysis, job matching and history. */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Resume.name, schema: ResumeSchema },
      { name: ResumeAnalysisRecord.name, schema: ResumeAnalysisRecordSchema },
      { name: StudentProfile.name, schema: StudentProfileSchema },
    ]),
    StorageModule,
    // Provides DocumentExtractorService (PDF text layer + local OCR).
    VerificationModule,
  ],
  controllers: [ResumeAnalyzerController],
  providers: [ResumeAnalyzerService, ResumeParserService, ResumeAiClient, AtsAnalysisService, JobMatchService],
})
export class ResumeAnalyzerModule {}
