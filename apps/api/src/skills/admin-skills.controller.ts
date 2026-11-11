import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@placecampus/shared-types';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { SkillsService } from './skills.service.js';
import { CreateSkillDto, UpdateSkillDto } from './dto/skill-admin.dto.js';

@Controller('admin/skills')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminSkillsController {
  constructor(private readonly skills: SkillsService) {}

  @Get()
  list() { return this.skills.getAdminTaxonomy(); }

  @Post()
  create(@Body() dto: CreateSkillDto, @CurrentUser() user: any) {
    return this.skills.createTaxonomySkill(dto, { userId: user.userId, role: user.role });
  }

  @Patch(':id')
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateSkillDto, @CurrentUser() user: any) {
    return this.skills.updateTaxonomySkill(id, dto, { userId: user.userId, role: user.role });
  }
}
