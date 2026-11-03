import { Test, TestingModule } from '@nestjs/testing';
import { RecruiterService } from './recruiter.service.js';
import { RecruiterAccessService } from '../recruiter-access/recruiter-access.service.js';
import { DrivesService } from '../drives/drives.service.js';
import { ApplicationsService } from '../applications/applications.service.js';
import { StudentsService } from '../students/students.service.js';
import { AuditService } from '../audit/audit.service.js';
import { ForbiddenException } from '@nestjs/common';

describe('RecruiterService', () => {
  let service: RecruiterService;
  let accessService: any;
  let auditService: any;
  let applicationsService: any;
  let studentsService: any;

  beforeEach(async () => {
    accessService = {
      getActiveGrant: vi.fn(),
      getMyActiveGrants: vi.fn(),
    };
    auditService = {
      logAction: vi.fn(),
    };
    applicationsService = {
      findAllForDrivePaginated: vi.fn().mockResolvedValue({ applications: [], total: 0 }),
      findOne: vi.fn(),
    };
    studentsService = { getProfileByUserId: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecruiterService,
        { provide: RecruiterAccessService, useValue: accessService },
        { provide: DrivesService, useValue: {} },
        { provide: ApplicationsService, useValue: applicationsService },
        { provide: StudentsService, useValue: studentsService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<RecruiterService>(RecruiterService);
  });

  it('should deny access if no active grant', async () => {
    accessService.getActiveGrant.mockResolvedValue(null);
    await expect(service.getCandidates('recruiter1', 'drive1')).rejects.toThrow(ForbiddenException);
    expect(auditService.logAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'DENIED_CROSS_DRIVE_ACCESS' }));
  });

  it('should allow access if active grant', async () => {
    accessService.getActiveGrant.mockResolvedValue({ releasedFields: [] });
    const result = await service.getCandidates('recruiter1', 'drive1');
    expect(result.candidates).toBeDefined();
  });

  it('does not search hidden student names when the grant omits studentName', async () => {
    accessService.getActiveGrant.mockResolvedValue({ releasedFields: ['department'] });

    await service.getCandidates('recruiter1', 'drive1', 1, 10, undefined, 'Alex');

    expect(applicationsService.findAllForDrivePaginated).toHaveBeenCalledWith(
      'drive1',
      1,
      10,
      undefined,
      undefined,
    );
  });

  it('does not release student email when only the name field is granted', async () => {
    accessService.getActiveGrant.mockResolvedValue({
      releasedFields: ['studentName'],
    });
    applicationsService.findAllForDrivePaginated.mockResolvedValue({
      applications: [{ id: 'application1', studentId: 'student1' }],
      total: 1,
    });
    studentsService.getProfileByUserId.mockResolvedValue({
      userId: { fullName: 'Demo Student', email: 'private@example.test' },
    });

    const result = await service.getCandidates('recruiter1', 'drive1');

    expect(result.candidates[0]).toEqual({
      id: 'application1',
      studentId: 'student1',
      studentName: 'Demo Student',
    });
    expect(result.candidates[0]).not.toHaveProperty('email');
  });

  it('never exposes student readiness scores to recruiters', async () => {
    accessService.getActiveGrant.mockResolvedValue({
      releasedFields: ['readinessScore'],
    });
    applicationsService.findAllForDrivePaginated.mockResolvedValue({
      applications: [
        {
          id: 'application1',
          studentId: 'student1',
          readinessSnapshot: { overallScore: 98 },
        },
      ],
      total: 1,
    });
    studentsService.getProfileByUserId.mockResolvedValue({});

    const result = await service.getCandidates('recruiter1', 'drive1');

    expect(result.candidates[0]).not.toHaveProperty('readinessScore');
  });
});
