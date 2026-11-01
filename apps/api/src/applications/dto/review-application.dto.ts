import { IsString, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';
import { ApplicationStatus } from '@placecampus/shared-types';

export class ReviewApplicationDto {
  @IsEnum(['UNDER_REVIEW', 'SHORTLISTED', 'REJECTED'])
  @IsNotEmpty()
  status: 'UNDER_REVIEW' | 'SHORTLISTED' | 'REJECTED';

  @IsString()
  @IsOptional()
  reviewerComment?: string;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
