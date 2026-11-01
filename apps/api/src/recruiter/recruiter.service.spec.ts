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

  beforeEach(async () => {
    accessService = {
      getActiveGrant: vi.fn(),
      getMyActiveGrants: vi.fn(),
    };
    auditService = {
      logAction: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecruiterService,
        { provide: RecruiterAccessService, useValue: accessService },
        { provide: DrivesService, useValue: {} },
        { provide: ApplicationsService, useValue: { findAllForDrivePaginated: vi.fn().mockResolvedValue({ applications: [], total: 0 }), findOne: vi.fn() } },
        { provide: StudentsService, useValue: {} },
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
});
