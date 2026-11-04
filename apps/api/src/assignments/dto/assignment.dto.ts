import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsBoolean, IsIn, IsInt, IsMongoId, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { FacultyAssignmentPurpose } from '@placecampus/shared-types';

export class AllocationDto {
  @ApiProperty({ required: false, type: [String], description: 'Limit to these approved department codes' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departmentCodes?: string[];

  @ApiProperty({ required: false, default: 40, description: 'Soft mentee target per faculty member' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  target?: number;
}

class OverrideFlags {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  allowCrossDepartment?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  allowOverTarget?: boolean;
}

export class CreateAssignmentDto extends OverrideFlags {
  @ApiProperty()
  @IsMongoId()
  studentId: string;

  @ApiProperty()
  @IsMongoId()
  facultyUserId: string;

  @ApiProperty({ enum: Object.values(FacultyAssignmentPurpose), isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(Object.values(FacultyAssignmentPurpose), { each: true })
  purposes: FacultyAssignmentPurpose[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export class ReassignDto extends OverrideFlags {
  @ApiProperty()
  @IsMongoId()
  facultyUserId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export class EndAssignmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
