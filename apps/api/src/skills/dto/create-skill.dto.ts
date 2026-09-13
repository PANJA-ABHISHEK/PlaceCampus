import { IsString, IsEnum, IsOptional, IsArray, IsBoolean, IsMongoId, MinLength } from 'class-validator';
import { SkillCategory } from '@skillbridge/shared-types';

export class CreateSkillDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEnum(SkillCategory)
  category!: SkillCategory;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  synonyms?: string[];

  @IsMongoId()
  @IsOptional()
  parentSkillId?: string;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  childSkillIds?: string[];

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  relatedSkillIds?: string[];

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  clusterIds?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
