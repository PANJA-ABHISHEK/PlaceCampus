import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  MinLength,
} from 'class-validator';
import { EvidenceType } from '../schemas/evidence.schema.js';

export class CreateEvidenceDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(EvidenceType)
  type!: EvidenceType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  claimedSkills?: string[];
}

export class UpdateEvidenceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  claimedSkills?: string[];
}
