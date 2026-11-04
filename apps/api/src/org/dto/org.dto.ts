import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateLookupDto {
  @ApiProperty({ enum: ['DEPARTMENT', 'PROGRAMME'] })
  @IsIn(['DEPARTMENT', 'PROGRAMME'])
  type: 'DEPARTMENT' | 'PROGRAMME';

  @ApiProperty({ example: 'SCSE' })
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]{1,29}$/, { message: 'Code: 2–30 letters, digits, - or _' })
  code: string;

  @ApiProperty({ example: 'School of Computer Science and Engineering' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  departmentCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  durationYears?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  lateralEntry?: boolean;
}

export class DecideMappingDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT', 'RESET'] })
  @IsIn(['APPROVE', 'REJECT', 'RESET'])
  action: 'APPROVE' | 'REJECT' | 'RESET';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
