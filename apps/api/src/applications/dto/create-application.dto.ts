import { IsString, IsOptional } from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  driveId: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
