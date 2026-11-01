import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { SkillsService } from './skills.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get('skills/clusters')
  async getClusters() {
    return this.skillsService.getAllClusters();
  }

  @Get('skills/taxonomy')
  async getTaxonomy() {
    return this.skillsService.getAllSkills();
  }

  @Get('student/skills')
  async getMySkills(@Req() req: any) {
    return this.skillsService.getStudentProfile(req.user.id);
  }
}
