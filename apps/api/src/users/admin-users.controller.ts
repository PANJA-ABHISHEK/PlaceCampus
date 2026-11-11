import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@placecampus/shared-types';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import { SetAdminUserStatusDto } from './dto/set-admin-user-status.dto.js';
import { UsersService } from './users.service.js';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminUsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Query() query: { search?: string; role?: string; status?: string; page?: number; limit?: number }) {
    return this.users.listAdminUsers(query);
  }

  @Patch(':id/status')
  setStatus(@Param('id', ParseObjectIdPipe) id: string, @Body() body: SetAdminUserStatusDto, @CurrentUser() actor: any) {
    return this.users.setAdminUserStatus(id, body.status, { userId: actor.userId, role: actor.role });
  }
}
