import { Type } from 'class-transformer';
import { IsString, IsNumber, IsDateString, IsOptional, ValidateNested, IsArray, IsBoolean } from 'class-validator';

export class EligibilityCriteriaDto {
  @IsNumber()
  minimumCgpa: number;

  @IsNumber()
  maximumActiveBacklogs: number;

  @IsArray()
  @IsString({ each: true })
  eligibleBranches: string[];

  @IsNumber()
  @IsOptional()
  minimumTenthPercentage?: number;

  @IsNumber()
  @IsOptional()
  minimumTwelfthPercentage?: number;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  graduationYears?: number[];
}

export class DriveSkillRequirementDto {
  @IsString()
  skillId: string;

  @IsString()
  skillName: string;

  @IsString()
  minimumLevel: string;

  @IsNumber()
  @IsOptional()
  weight?: number;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;
}

export class CreateDriveDto {
  @IsString()
  companyId: string;

  @IsString()
  title: string;

  @IsString()
  jobRole: string;

  @IsString()
  description: string;

  @IsString()
  location: string;

  @IsNumber()
  packageLpa: number;

  @IsDateString()
  applicationDeadline: string;

  @IsDateString()
  driveDate: string;

  @ValidateNested()
  @Type(() => EligibilityCriteriaDto)
  eligibilityCriteria: EligibilityCriteriaDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DriveSkillRequirementDto)
  @IsOptional()
  requiredSkills?: DriveSkillRequirementDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DriveSkillRequirementDto)
  @IsOptional()
  preferredSkills?: DriveSkillRequirementDto[];

  @IsNumber()
  @IsOptional()
  maxSelections?: number;
}
