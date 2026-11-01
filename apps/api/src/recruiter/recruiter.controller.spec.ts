import { Test, TestingModule } from '@nestjs/testing';
import { RecruiterController } from './recruiter.controller.js';
import { RecruiterService } from './recruiter.service.js';
import { vi } from 'vitest';

describe('RecruiterController', () => {
  let controller: RecruiterController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecruiterController],
      providers: [
        {
          provide: RecruiterService,
          useValue: {
            getDrives: vi.fn(),
            getCandidates: vi.fn(),
            getCandidateDetail: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RecruiterController>(RecruiterController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
