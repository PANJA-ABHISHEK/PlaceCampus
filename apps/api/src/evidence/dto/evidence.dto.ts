import {
  IsString,
  IsOptional,
  IsEnum,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EvidenceType, EvidenceStatus } from '@placecampus/shared-types';

export class CreateEvidenceDto {
  @ApiProperty({ example: 'AWS Certified Solutions Architect' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: 'Passed with score 850' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ enum: EvidenceType, example: EvidenceType.CERTIFICATION })
  @IsEnum(EvidenceType)
  type: EvidenceType;

  @ApiPropertyOptional({ example: 'Amazon Web Services' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  issuer?: string;

  @ApiPropertyOptional({ example: '2023-10-01' })
  @IsOptional()
  @IsString()
  issuedDate?: string;

  @ApiPropertyOptional({ example: 'https://aws.amazon.com/verify/...' })
  @IsOptional()
  @IsUrl()
  externalUrl?: string;
}

export class UpdateEvidenceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: EvidenceType })
  @IsOptional()
  @IsEnum(EvidenceType)
  type?: EvidenceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  issuer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issuedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  externalUrl?: string;
}
