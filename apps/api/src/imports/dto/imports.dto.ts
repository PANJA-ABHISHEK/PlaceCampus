import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * Multipart fields arrive as strings, and implicit conversion would turn "false"
 * into true before this runs — so read the raw request value instead.
 */
const toBool = ({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
  const raw = obj[key];
  return raw === true || raw === 'true' || raw === '1' || raw === 'on';
};

export class UploadImportDto {
  @ApiProperty({ enum: ['STUDENTS', 'FACULTY'] })
  @IsIn(['STUDENTS', 'FACULTY'])
  kind: 'STUDENTS' | 'FACULTY';

  @ApiProperty({ enum: ['CREATE_ONLY', 'CREATE_AND_UPDATE_PROFILE'], required: false })
  @IsOptional()
  @IsIn(['CREATE_ONLY', 'CREATE_AND_UPDATE_PROFILE'])
  mode?: 'CREATE_ONLY' | 'CREATE_AND_UPDATE_PROFILE';

  @ApiProperty({ required: false, description: 'Synthetic/sample data (development only)' })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  isDemoData?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reimportReason?: string;
}

export class ConfirmImportDto {
  @ApiProperty({ description: 'Type the number of rows that will be applied' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  confirmRowCount: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  acknowledgeColumnMapping?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  acknowledgeDiff?: boolean;
}

export class ReasonDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export class DerivedReviewDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT'] })
  @IsIn(['APPROVE', 'REJECT'])
  action: 'APPROVE' | 'REJECT';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
