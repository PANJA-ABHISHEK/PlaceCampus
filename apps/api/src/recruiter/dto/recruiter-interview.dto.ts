import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsMongoId, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';
import { RECRUITER_INTERVIEW_RECOMMENDATION } from '../schemas/recruiter-interview.schema.js';

export class ScheduleRecruiterInterviewDto {
  @IsMongoId()
  driveId: string;

  @IsMongoId()
  applicationId: string;

  @IsDateString()
  startsAt: string;

  @IsString()
  @MaxLength(60)
  round: string;

  @IsOptional()
  @IsMongoId()
  interviewerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instructions?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(500)
  meetingUrl?: string;
}

export class RescheduleRecruiterInterviewDto {
  @IsDateString()
  startsAt: string;
}

export class CancelRecruiterInterviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class RecruiterInterviewFeedbackDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  technicalKnowledge: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  problemSolving: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  communication: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  projectUnderstanding: number;

  @IsString()
  @MaxLength(2000)
  comments: string;

  @IsEnum(RECRUITER_INTERVIEW_RECOMMENDATION)
  recommendation: (typeof RECRUITER_INTERVIEW_RECOMMENDATION)[number];
}
