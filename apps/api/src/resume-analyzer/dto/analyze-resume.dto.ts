import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { RESUME_ANALYZER_LIMITS, type AnalyzeResumeDto as AnalyzeResumeContract } from '@placecampus/shared-types';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || undefined : value);

export class AnalyzeResumeDto implements AnalyzeResumeContract {
  @ApiPropertyOptional({ example: 'Frontend Developer', description: 'Role to assess the resume against.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(RESUME_ANALYZER_LIMITS.maxTargetRoleChars)
  targetRole?: string;

  @ApiPropertyOptional({ description: 'Pasted job description for the job-specific compatibility score.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(RESUME_ANALYZER_LIMITS.minJobDescriptionChars, {
    message: `The job description is too short to compare against. Paste at least ${RESUME_ANALYZER_LIMITS.minJobDescriptionChars} characters.`,
  })
  @MaxLength(RESUME_ANALYZER_LIMITS.maxJobDescriptionChars, {
    message: `The job description is too long. Keep it under ${RESUME_ANALYZER_LIMITS.maxJobDescriptionChars.toLocaleString('en')} characters.`,
  })
  jobDescription?: string;

  @ApiPropertyOptional({ example: 'Software Engineer Intern' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(RESUME_ANALYZER_LIMITS.maxJobTitleChars)
  jobTitle?: string;
}
