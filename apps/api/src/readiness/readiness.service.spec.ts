import { Test, TestingModule } from '@nestjs/testing';
import { ReadinessService } from './readiness.service.js';

describe('ReadinessService', () => {
  let service: ReadinessService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReadinessService],
    }).compile();

    service = module.get<ReadinessService>(ReadinessService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
