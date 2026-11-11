import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service.js';
import { getModelToken } from '@nestjs/mongoose';
import { AuditLog } from './schemas/audit-log.schema.js';
import { vi } from 'vitest';

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getModelToken(AuditLog.name), useValue: vi.fn() },
        { provide: getModelToken('PlacementDrive'), useValue: {} },
        { provide: getModelToken('User'), useValue: {} },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recruiterAccessLogs', () => {
    const chain = (rows: unknown) => {
      const q: any = { sort: () => q, skip: () => q, limit: () => q, populate: () => q, select: () => q, lean: () => q, exec: () => Promise.resolve(rows) };
      return q;
    };
    const driveId = '6aea089ce1d8d3278f9f6c44';
    const rows = [
      { _id: 'l1', action: 'VIEW_CANDIDATE_DETAIL', success: true, actorId: { _id: 'r1', fullName: 'Riya (Finvista)', email: 'r@f.test' }, driveId, studentId: 's1', resourceType: 'Application', resourceId: 'a1', createdAt: new Date('2026-11-09T10:00:00Z') },
      // Older shape: the drive is only stored as the resource.
      { _id: 'l2', action: 'DENIED_CROSS_DRIVE_ACCESS', success: false, actorId: { _id: 'r1', fullName: 'Riya (Finvista)' }, resourceType: 'PlacementDrive', resourceId: driveId, createdAt: new Date('2026-11-09T09:00:00Z') },
    ];

    it('lists recruiter reads with recruiter, drive and student names, and counts outcomes', async () => {
      const logModel = { find: vi.fn((_q: any) => chain(rows)), countDocuments: vi.fn(async (q: any) => (q.success === true ? 1 : 2)) };
      const svc = new AuditService(
        logModel as any,
        { find: () => chain([{ _id: driveId, companyName: 'Finvista Labs', roleTitle: 'Backend Engineer' }]) } as any,
        { find: () => chain([{ _id: 's1', fullName: 'Abhishek Panja' }]) } as any,
      );
      const page = await svc.recruiterAccessLogs({ driveId });

      const query: any = logModel.find.mock.calls[0][0];
      expect(query.actorRole).toBe('recruiter');
      expect(query.$or).toEqual(expect.arrayContaining([{ driveId }, { resourceType: 'PlacementDrive', resourceId: driveId }]));
      expect(page).toMatchObject({ total: 2, allowed: 1, denied: 1 });
      expect(page.entries[0]).toMatchObject({
        action: 'VIEW_CANDIDATE_DETAIL', success: true,
        recruiter: { name: 'Riya (Finvista)' },
        drive: { companyName: 'Finvista Labs' },
        student: { name: 'Abhishek Panja' },
      });
      expect(page.entries[1]).toMatchObject({ success: false, drive: { id: driveId, companyName: 'Finvista Labs' }, student: null });
    });
  });
});
