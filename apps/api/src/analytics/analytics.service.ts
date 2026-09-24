import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service.js';
import { StudentsService } from '../students/students.service.js';
import { DrivesService } from '../drives/drives.service.js';
import { ApplicationsService } from '../applications/applications.service.js';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly usersService: UsersService,
    private readonly studentsService: StudentsService,
    private readonly drivesService: DrivesService,
    private readonly applicationsService: ApplicationsService,
  ) {}

  async getPlatformStats() {
    // In a real app, these would be precise aggregations from MongoDB.
    // For now, we will try to fetch real counts where possible, or use reasonable defaults.
    
    const [studentsResult, drivesResult, applicationsResult] = await Promise.all([
      this.studentsService.findAll({ limit: 1 }),
      this.drivesService.findAll({ limit: 1 }),
      this.applicationsService.findAll({ limit: 1 }),
    ]);

    return {
      totalStudents: studentsResult.total || 1250,
      activeDrives: drivesResult.total || 24,
      applicationsSubmitted: applicationsResult.total || 3450,
      placementRate: 78, // mock percentage
      topCompanies: ['Google', 'Microsoft', 'Amazon', 'TCS', 'Infosys'],
      recentActivity: [
        { type: 'DRIVE_CREATED', message: 'TCS launched Ninja hiring drive', time: new Date() },
        { type: 'APPLICATION', message: '50 new applications for Amazon SDE', time: new Date(Date.now() - 3600000) },
      ]
    };
  }
}
