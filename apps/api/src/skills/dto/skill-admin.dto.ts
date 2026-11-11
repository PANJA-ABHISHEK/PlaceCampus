import { IsArray, IsBoolean, IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSkillDto {
  @IsString() @MaxLength(100)
  name: string;

  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @IsOptional() @IsMongoId()
  clusterId?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  synonyms?: string[];
}

export class UpdateSkillDto {
  @IsOptional() @IsString() @MaxLength(100)
  name?: string;

  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @IsOptional() @IsMongoId()
  clusterId?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  synonyms?: string[];

  @IsOptional() @IsBoolean()
  active?: boolean;
}
