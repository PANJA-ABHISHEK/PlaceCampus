import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole, type UserDocument } from './schemas/user.schema.js';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getProfile(@CurrentUser() user: UserDocument) {
    return user;
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() user: UserDocument,
    @Body() updateData: { firstName?: string; lastName?: string },
  ) {
    return this.usersService.updateUser(String(user._id), updateData);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PLACEMENT_HEAD)
  findAll(
    @Query('role') role?: UserRole,
    @Query('isActive') isActive?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.findAll({ role, isActive, page, limit });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PLACEMENT_HEAD)
  findOne(@Param('id') id: string) {
    return this.usersService.findByIdOrFail(id);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN)
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivateUser(id);
  }
}
