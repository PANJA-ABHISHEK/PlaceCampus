import { Injectable, NotFoundException } from '@nestjs/common';
import { EligibilityEngine } from './engine/eligibility.engine.js';
import { DrivesService } from '../drives/drives.service.js';
import { StudentsService } from '../students/students.service.js';
import { SkillsService } from '../skills/skills.service.js';
import { EligibilityResult } from '@placecampus/shared-types';

@Injectable()
export class EligibilityService {
  constructor(
    private readonly eligibilityEngine: EligibilityEngine,
    private readonly drivesService: DrivesService,
    private readonly studentsService: StudentsService,
    private readonly skillsService: SkillsService,
  ) {}

  async calculateForStudent(
    driveId: string,
    userId: string,
  ): Promise<EligibilityResult> {
    const drive = await this.drivesService.findOnePublished(driveId);

    // Get student profile
    const studentProfile = await this.studentsService
      .getProfileByUserId(userId)
      .catch(() => null);

    // Get verified skill profile
    const skillProfile = await this.skillsService
      .getStudentProfile(userId)
      .catch(() => null);

    // Calculate using the engine
    return this.eligibilityEngine.evaluate(
      studentProfile as any,
      skillProfile as any,
      drive as any,
    );
  }
}
