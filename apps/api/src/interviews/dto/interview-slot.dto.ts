import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  INTERVIEW_TYPES,
  type CreateInterviewSlotDto as ICreateInterviewSlotDto,
  type InterviewType,
} from '@placecampus/shared-types';

export class CreateInterviewSlotDto implements ICreateInterviewSlotDto {
  @ApiProperty({ enum: INTERVIEW_TYPES })
  @IsIn(INTERVIEW_TYPES)
  type: InterviewType;

  @ApiProperty({ example: '2026-11-10T09:30:00.000Z' })
  @IsISO8601({ strict: true })
  startsAt: string;

  @ApiProperty({ minimum: 15, maximum: 120, example: 30 })
  @IsInt()
  @Min(15)
  @Max(120)
  durationMinutes: number;

  @ApiProperty({ example: 'https://meet.google.com/abc-defg-hij' })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  meetingUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CancelInterviewDto {
  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
