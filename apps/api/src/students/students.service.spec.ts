import { Test, TestingModule } from '@nestjs/testing';
import { StudentsService } from './students.service.js';
import { getModelToken } from '@nestjs/mongoose';
import { StudentProfile } from './schemas/student-profile.schema.js';
import { User } from '../users/schemas/user.schema.js';
import { DEFAULT_STUDENT_PREFERENCES } from './student-preferences.js';

const lean = (value: unknown) => ({
  select: () => lean(value),
  lean: () => ({ exec: () => Promise.resolve(value) }),
});

describe('StudentsService', () => {
  let service: StudentsService;
  let model: any;
  let userModel: any;

  beforeEach(async () => {
    model = {
      findOne: vi.fn(),
      create: vi.fn(),
      findOneAndUpdate: vi.fn(),
    };
    userModel = { findById: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        {
          provide: getModelToken(StudentProfile.name),
          useValue: model,
        },
        { provide: getModelToken(User.name), useValue: userModel },
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

  describe('settings', () => {
    it('returns account details with default preferences for a new student', async () => {
      userModel.findById.mockReturnValue(lean({ fullName: 'A B', email: 'a@b.edu' }));
      model.findOne.mockResolvedValue({ userId: 'user-1', registrationNumber: 'R1' });
      const settings = await service.getSettings('user-1');
      expect(settings.account).toMatchObject({ fullName: 'A B', email: 'a@b.edu', registrationNumber: 'R1' });
      expect(settings.preferences).toEqual(DEFAULT_STUDENT_PREFERENCES);
      expect(settings.emailDeliveryAvailable).toBe(false);
    });

    it('updates only the preference keys that were sent, scoped to the caller', async () => {
      model.findOneAndUpdate.mockResolvedValue({
        preferences: { notifications: { interviewUpdates: false }, theme: 'dark' },
      });
      const prefs = await service.updatePreferences('user-1', {
        notifications: { interviewUpdates: false },
        theme: 'dark',
      });
      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'user-1' },
        { $set: { 'preferences.notifications.interviewUpdates': false, 'preferences.theme': 'dark' } },
        { new: true, upsert: true },
      );
      expect(prefs.notifications.interviewUpdates).toBe(false);
      expect(prefs.notifications.applicationUpdates).toBe(true);
      expect(prefs.theme).toBe('dark');
    });

    it('returns null preferences for users without a student profile', async () => {
      model.findOne.mockReturnValue(lean(null));
      expect(await service.getPreferencesIfStudent('staff-1')).toBeNull();
    });
  });
});
