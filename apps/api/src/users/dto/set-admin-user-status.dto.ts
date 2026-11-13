import { IsIn } from 'class-validator';

export class SetAdminUserStatusDto {
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status: 'ACTIVE' | 'SUSPENDED';
}
