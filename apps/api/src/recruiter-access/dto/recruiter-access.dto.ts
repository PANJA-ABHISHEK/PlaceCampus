import { IsString, IsArray, IsDateString, IsOptional, ArrayMinSize, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRecruiterAccessGrantDto {
  @ApiProperty()
  @IsMongoId()
  recruiterId: string;

  @ApiProperty()
  @IsDateString()
  expiresAt: string;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  releasedFields: string[];
}

export class ExtendAccessGrantDto {
  @ApiProperty()
  @IsDateString()
  expiresAt: string;
}

export class UpdateAccessGrantDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  releasedFields?: string[];
}
