import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DriveStatus } from '@placecampus/shared-types';

export class DriveSkillRequirementDto {
  @IsString()
  @IsNotEmpty()
  skillId: string;

  @IsString()
  @IsOptional()
  skillName?: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  minimumLevel: number;

  @IsBoolean()
  @IsOptional()
  isOptional?: boolean;
}

export class DriveRequirementDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(10)
  minimumCGPA?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maximumBacklogs?: number;

  @IsNumber()
  @IsOptional()
  graduationYear?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedDepartments?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DriveSkillRequirementDto)
  @IsOptional()
  skills?: DriveSkillRequirementDto[];
}

export class CreatePlacementDriveDto {
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsNotEmpty()
  roleTitle: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  workMode?: string;

  @IsString()
  @IsOptional()
  package?: string;

  @IsString()
  @IsOptional()
  applicationStart?: string;

  @IsString()
  @IsOptional()
  applicationDeadline?: string;

  @IsString()
  @IsOptional()
  driveDate?: string;

  @ValidateNested()
  @Type(() => DriveRequirementDto)
  @IsOptional()
  requirements?: DriveRequirementDto;
}

export class UpdatePlacementDriveDto extends CreatePlacementDriveDto {}
