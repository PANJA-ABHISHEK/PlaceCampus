import {
  IsOptional,
  IsString,
  IsUrl,
  Length,
} from 'class-validator';
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
