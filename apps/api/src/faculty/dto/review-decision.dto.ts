import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ReviewAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REQUEST_RESUBMISSION = 'REQUEST_RESUBMISSION',
}

export class ReviewDecisionDto {
  @ApiProperty({ enum: ReviewAction })
  @IsEnum(ReviewAction)
  action: ReviewAction;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}
