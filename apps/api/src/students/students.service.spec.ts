import { Test, TestingModule } from '@nestjs/testing';
import { StudentsService } from './students.service.js';
import { getModelToken } from '@nestjs/mongoose';
import { StudentProfile } from './schemas/student-profile.schema.js';

describe('StudentsService', () => {
  let service: StudentsService;
  let model: any;

  beforeEach(async () => {
    model = {
      findOne: vi.fn(),
      create: vi.fn(),
      findOneAndUpdate: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        {
          provide: getModelToken(StudentProfile.name),
          useValue: model,
        },
      ],
    }).compile();

    service = module.get<StudentsService>(StudentsService);
  });

  describe('getProfileByUserId', () => {
    it('should return existing profile', async () => {
      model.findOne.mockResolvedValue({ userId: 'user-1', phone: '123' });
      const profile = await service.getProfileByUserId('user-1');
      expect(profile).toEqual({ userId: 'user-1', phone: '123' });
    });

    it('should create new profile if none exists', async () => {
      model.findOne.mockResolvedValue(null);
      model.create.mockResolvedValue({ userId: 'user-1' });
      const profile = await service.getProfileByUserId('user-1');
      expect(model.create).toHaveBeenCalledWith({ userId: 'user-1' });
      expect(profile).toEqual({ userId: 'user-1' });
    });
  });

  describe('updateProfile', () => {
    it('should update and return profile', async () => {
      model.findOneAndUpdate.mockResolvedValue({
        userId: 'user-1',
        phone: 'new',
      });
      const profile = await service.updateProfile('user-1', { phone: 'new' });
      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'user-1' },
        { $set: { phone: 'new' } },
        { new: true, upsert: true },
      );
      expect(profile).toEqual({ userId: 'user-1', phone: 'new' });
    });
  });
});
