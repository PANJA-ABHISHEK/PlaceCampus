import { Test, TestingModule } from '@nestjs/testing';
import { RecruiterAccessService } from './recruiter-access.service.js';
import { getModelToken } from '@nestjs/mongoose';
import { RecruiterAccessGrant } from './schemas/access-grant.schema.js';
import { AuditService } from '../audit/audit.service.js';
import { DrivesService } from '../drives/drives.service.js';
import { UsersService } from '../users/users.service.js';
import { vi } from 'vitest';

class MockRecruiterAccessGrantModel {
  static findOne = vi.fn();
  static findById = vi.fn();
  static find = vi.fn();
  save = vi.fn();

  constructor(data: Record<string, unknown>) {
    Object.assign(this, data);
  }
}

describe('RecruiterAccessService', () => {
  let service: RecruiterAccessService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecruiterAccessService,
        {
          provide: getModelToken(RecruiterAccessGrant.name),
          useValue: MockRecruiterAccessGrantModel,
        },
        { provide: AuditService, useValue: { logAction: vi.fn() } },
        { provide: DrivesService, useValue: { findOne: vi.fn() } },
        { provide: UsersService, useValue: { findById: vi.fn() } },
      ],
    }).compile();

    service = module.get<RecruiterAccessService>(RecruiterAccessService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
