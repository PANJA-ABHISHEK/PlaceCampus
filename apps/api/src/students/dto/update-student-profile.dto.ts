import {
  IsOptional,
  IsString,
  IsNumber,
  IsUrl,
  Min,
  Max,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateStudentProfileDto as IUpdateStudentProfileDto } from '@placecampus/shared-types';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStudentProfileDto implements IUpdateStudentProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(10, 15)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  university?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  program?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batch?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1900)
  @Max(2100)
  graduationYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(10)
  cgpa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  backlogs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  linkedinUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  githubUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  portfolioUrl?: string;
}
