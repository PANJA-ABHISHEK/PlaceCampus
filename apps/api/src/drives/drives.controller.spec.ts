import { Test, TestingModule } from '@nestjs/testing';
import { DrivesController } from './drives.controller.js';

describe('DrivesController', () => {
  let controller: DrivesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DrivesController],
    }).compile();

    controller = module.get<DrivesController>(DrivesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
