import { IsString, IsOptional, IsArray, IsMongoId, MinLength } from 'class-validator';

export class CreateSkillClusterDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  skillIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roleMappings?: string[];
}
