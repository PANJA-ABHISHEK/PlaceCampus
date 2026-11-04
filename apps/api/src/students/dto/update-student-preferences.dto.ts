import { IsBoolean, IsIn, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type {
  ThemePreference,
  UpdateStudentPreferencesDto as IUpdateStudentPreferencesDto,
} from '@placecampus/shared-types';

export class NotificationPreferencesDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() email?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() driveAnnouncements?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() applicationUpdates?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() assessmentUpdates?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() interviewUpdates?: boolean;
}

export class PrivacyPreferencesDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() shareProfileLinks?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showLinkedin?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showGithub?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showPortfolio?: boolean;
}

export class UpdateStudentPreferencesDto implements IUpdateStudentPreferencesDto {
  @ApiPropertyOptional({ type: NotificationPreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notifications?: NotificationPreferencesDto;

  @ApiPropertyOptional({ type: PrivacyPreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PrivacyPreferencesDto)
  privacy?: PrivacyPreferencesDto;

  @ApiPropertyOptional({ enum: ['light', 'dark', 'system'] })
  @IsOptional()
  @IsIn(['light', 'dark', 'system'])
  theme?: ThemePreference;
}
