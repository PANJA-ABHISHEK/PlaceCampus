import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { SkillsService } from './skills.service.js';
import { CreateSkillDto } from './dto/create-skill.dto.js';
import { UpdateSkillDto } from './dto/update-skill.dto.js';
import { CreateSkillClusterDto } from './dto/create-skill-cluster.dto.js';
import { UpdateSkillClusterDto } from './dto/update-skill-cluster.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '@placecampus/shared-types';

@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  // --- Skills ---

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() createSkillDto: CreateSkillDto) {
    return this.skillsService.createSkill(createSkillDto);
  }

  @Get('search')
  search(@Query('q') q: string) {
    return this.skillsService.searchSkills(q);
  }

  @Get()
  findAll() {
    return this.skillsService.findAllSkills();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.skillsService.findSkillById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateSkillDto: UpdateSkillDto) {
    return this.skillsService.updateSkill(id, updateSkillDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.skillsService.removeSkill(id);
  }

  // --- Skill Clusters ---

  @Post('clusters')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createCluster(@Body() createClusterDto: CreateSkillClusterDto) {
    return this.skillsService.createSkillCluster(createClusterDto);
  }

  @Get('clusters')
  findAllClusters() {
    return this.skillsService.findAllSkillClusters();
  }

  @Get('clusters/:id')
  findOneCluster(@Param('id') id: string) {
    return this.skillsService.findSkillClusterById(id);
  }

  @Patch('clusters/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateCluster(@Param('id') id: string, @Body() updateClusterDto: UpdateSkillClusterDto) {
    return this.skillsService.updateSkillCluster(id, updateClusterDto);
  }

  @Delete('clusters/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  removeCluster(@Param('id') id: string) {
    return this.skillsService.removeSkillCluster(id);
  }
}
