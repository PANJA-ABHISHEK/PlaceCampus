import { Injectable } from '@nestjs/common';
import { MatchingEngine } from './engine/matching.engine.js';
import { DrivesService } from '../drives/drives.service.js';
import { SkillsService } from '../skills/skills.service.js';
import { SkillMatchResult } from '@placecampus/shared-types';

@Injectable()
export class MatchingService {
  constructor(
    private readonly matchingEngine: MatchingEngine,
    private readonly drivesService: DrivesService,
    private readonly skillsService: SkillsService,
  ) {}

  async calculateForStudent(
    driveId: string,
    userId: string,
  ): Promise<SkillMatchResult> {
    const drive = await this.drivesService.findOnePublished(driveId);

    // Get verified skill profile
    const skillProfile = await this.skillsService
      .getStudentProfile(userId)
      .catch(() => null);

    // Get taxonomy for canonical naming and relationships
    const taxonomy = await this.skillsService.getAllSkills();

    // Calculate using the engine
    return this.matchingEngine.evaluate(
      skillProfile as any,
      drive as any,
      taxonomy as any,
    );
  }

  async getDriveSummary(driveId: string) {
    const drive = await this.drivesService
      .findOnePublished(driveId)
      .catch(() => this.drivesService.findOne(driveId));
    if (!drive) return { message: 'Drive not found' };

    // In a real scenario, this would aggregate matching scores for all eligible students.
    // For now, we return a structural placeholder per requirements.
    return {
      driveId,
      status: 'CALCULATING',
      message:
        'Cohort skill supply matching aggregation will be available in the next lifecycle update.',
      requiredSkills: drive.requirements.skills?.length || 0,
      totalStudents: 0,
    };
  }
}
