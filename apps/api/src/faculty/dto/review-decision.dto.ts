import {
  IsIn,
  IsMongoId,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
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

/** Body of the approve endpoint: an optional comment. */
export class ReviewCommentDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string;
}

/** Body of the reject and request-resubmission endpoints: the reason is required. */
export class ReviewReasonDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;
}

/** Escalation to the Review Coordinator (Master Plan §12.8 reason codes). */
export class EscalateReviewDto {
  @ApiProperty({ enum: ['CONFLICT_OF_INTEREST', 'NEEDS_SUBJECT_EXPERT', 'SUSPECTED_FRAUD', 'POLICY_QUESTION'] })
  @IsIn(['CONFLICT_OF_INTEREST', 'NEEDS_SUBJECT_EXPERT', 'SUSPECTED_FRAUD', 'POLICY_QUESTION'])
  reasonCode: 'CONFLICT_OF_INTEREST' | 'NEEDS_SUBJECT_EXPERT' | 'SUSPECTED_FRAUD' | 'POLICY_QUESTION';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class ReassignReviewDto {
  @ApiProperty()
  @IsMongoId()
  reviewerId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
