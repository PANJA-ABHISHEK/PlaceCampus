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
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
