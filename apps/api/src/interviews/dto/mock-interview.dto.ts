import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  INTERVIEW_ASSESSMENTS,
  INTERVIEW_DURATIONS,
  INTERVIEW_QUESTION_CATEGORIES,
  SCHEDULABLE_INTERVIEW_TYPES,
  type EvaluateInterviewDto as IEvaluateInterviewDto,
  type InterviewAssessment,
  type InterviewQuestionCategory,
  type InterviewType,
  type RescheduleInterviewDto as IRescheduleInterviewDto,
  type ScheduleInterviewDto as IScheduleInterviewDto,
} from '@placecampus/shared-types';

export const MAX_QUESTIONS = 40;

export class InterviewQuestionInputDto {
  @ApiProperty({ maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  text: string;

  @ApiProperty({ enum: INTERVIEW_QUESTION_CATEGORIES })
  @IsIn(INTERVIEW_QUESTION_CATEGORIES)
  category: InterviewQuestionCategory;
}

export class ScheduleInterviewDto implements IScheduleInterviewDto {
  @ApiProperty({ description: 'User id of an assigned student' })
  @IsMongoId()
  studentId: string;

  @ApiProperty({ maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @ApiProperty({ enum: SCHEDULABLE_INTERVIEW_TYPES })
  @IsIn(SCHEDULABLE_INTERVIEW_TYPES)
  type: InterviewType;

  @ApiProperty({ example: '2026-11-20T09:30:00.000Z' })
  @IsISO8601({ strict: true })
  scheduledAt: string;

  @ApiProperty({ enum: INTERVIEW_DURATIONS })
  @IsInt()
  @IsIn(INTERVIEW_DURATIONS)
  durationMinutes: number;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructions?: string;

  @ApiPropertyOptional({ type: [InterviewQuestionInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_QUESTIONS)
  @ValidateNested({ each: true })
  @Type(() => InterviewQuestionInputDto)
  questions?: InterviewQuestionInputDto[];
}

export class RescheduleInterviewDto implements IRescheduleInterviewDto {
  @ApiProperty()
  @IsISO8601({ strict: true })
  scheduledAt: string;

  @ApiPropertyOptional({ enum: INTERVIEW_DURATIONS })
  @IsOptional()
  @IsInt()
  @IsIn(INTERVIEW_DURATIONS)
  durationMinutes?: number;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class AddInterviewQuestionsDto {
  @ApiProperty({ type: [InterviewQuestionInputDto] })
  @IsArray()
  @ArrayMaxSize(MAX_QUESTIONS)
  @ValidateNested({ each: true })
  @Type(() => InterviewQuestionInputDto)
  questions: InterviewQuestionInputDto[];
}

export class UpdateInterviewQuestionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  asked?: boolean;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string;
}

export class UpdateFacultyNotesDto {
  @ApiProperty({ maxLength: 5000 })
  @IsString()
  @MaxLength(5000)
  notes: string;
}

export class EvaluateInterviewDto implements IEvaluateInterviewDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  technicalKnowledge: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  problemSolving: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  communication: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  conceptualUnderstanding: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  confidence: number;

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  strengths: string;

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  improvements: string;

  @ApiPropertyOptional({ maxLength: 3000 })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  facultyComments?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  recommendedTopics?: string[];

  @ApiProperty({ enum: INTERVIEW_ASSESSMENTS })
  @IsIn(INTERVIEW_ASSESSMENTS)
  assessment: InterviewAssessment;
}
