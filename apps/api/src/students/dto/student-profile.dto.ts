import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsArray,
  IsObject,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { Branch } from '../schemas/student-profile.schema.js';

export class CreateStudentProfileDto {
  @IsString()
  @MinLength(1)
  rollNumber!: string;

  @IsEnum(Branch)
  branch!: Branch;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  program?: string;

  @IsNumber()
  graduationYear!: number;

  @IsNumber()
  @Min(0)
  @Max(10)
  cgpa!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  activeBacklogs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalBacklogs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  tenthPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  twelfthPercentage?: number;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdateStudentProfileDto {
  @IsOptional()
  @IsEnum(Branch)
  branch?: Branch;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  program?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  cgpa?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  activeBacklogs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalBacklogs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  tenthPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  twelfthPercentage?: number;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  resumeUrl?: string;

  @IsOptional()
  @IsString()
  linkedinUrl?: string;

  @IsOptional()
  @IsString()
  githubUrl?: string;

  @IsOptional()
  @IsString()
  portfolioUrl?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  projects?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @IsOptional()
  @IsObject()
  placementPreferences?: {
    preferredRoles?: string[];
    preferredLocations?: string[];
    minimumPackageLpa?: number;
  };
}
