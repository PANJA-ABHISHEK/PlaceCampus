import { Test, TestingModule } from '@nestjs/testing';
import {
  RecruiterAccessController,
  RecruiterAccessGlobalController,
} from './recruiter-access.controller.js';
import { RecruiterAccessService } from './recruiter-access.service.js';
import { vi } from 'vitest';

describe('RecruiterAccessController', () => {
  let controller: RecruiterAccessController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecruiterAccessController, RecruiterAccessGlobalController],
      providers: [
        {
          provide: RecruiterAccessService,
          useValue: {
            getGrantsForDrive: vi.fn(),
            grantAccess: vi.fn(),
            revokeAccess: vi.fn(),
            extendAccess: vi.fn(),
            updateFields: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RecruiterAccessController>(RecruiterAccessController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
