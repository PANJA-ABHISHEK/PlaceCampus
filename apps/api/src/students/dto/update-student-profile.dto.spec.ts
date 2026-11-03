import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateStudentProfileDto } from './update-student-profile.dto.js';

describe('UpdateStudentProfileDto', () => {
  it('accepts personal profile fields', async () => {
    const dto = plainToInstance(UpdateStudentProfileDto, {
      phone: '1234567890',
      bio: 'Student profile',
      linkedinUrl: 'https://linkedin.com/in/student',
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toHaveLength(0);
  });

  it.each(['university', 'department', 'program', 'batch', 'graduationYear', 'cgpa', 'backlogs'])(
    'rejects student-supplied institution field %s',
    async (field) => {
      const dto = plainToInstance(UpdateStudentProfileDto, {
        [field]: field === 'university' ? 'Forged University' : 10,
      });

      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      expect(errors.some((error) => error.property === field)).toBe(true);
    },
  );
});
