import { IsEnum } from 'class-validator';
import { PreparationItemStatus } from '@placecampus/shared-types';

export class UpdatePreparationItemStatusDto {
  @IsEnum(PreparationItemStatus)
  status: PreparationItemStatus;
}
