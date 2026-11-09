import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Model } from 'mongoose';
import type { StudentSettings } from '@placecampus/shared-types';
import {
  StudentProfile,
  StudentProfileDocument,
} from './schemas/student-profile.schema.js';
import { User, UserDocument } from '../users/schemas/user.schema.js';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto.js';
import { UpdateStudentPreferencesDto } from './dto/update-student-preferences.dto.js';
import { resolvePreferences } from './student-preferences.js';

@Injectable()
export class StudentsService {
  constructor(
    @InjectModel(StudentProfile.name)
    private readonly profileModel: Model<StudentProfileDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @Optional() private readonly events?: EventEmitter2,
  ) {}

  async getProfileByUserId(userId: string): Promise<StudentProfileDocument> {
    let profile = await this.profileModel.findOne({ userId });

    // Auto-create an empty profile if one doesn't exist yet for the authenticated student
    if (!profile) {
      profile = await this.profileModel.create({ userId });
      this.events?.emit('student.profile_created', { userId });
    }

    return profile;
  }

  async updateProfile(
    userId: string,
    updateDto: UpdateStudentProfileDto,
  ): Promise<StudentProfileDocument> {
    const profile = await this.profileModel.findOneAndUpdate(
      { userId },
      { $set: updateDto },
      { new: true, upsert: true },
    );
    return profile;
  }

  /** Account details (read-only, institution-managed) plus the student's own preferences. */
  async getSettings(userId: string): Promise<StudentSettings> {
    const [user, profile] = await Promise.all([
      this.userModel.findById(userId).lean().exec(),
      this.getProfileByUserId(userId),
    ]);
    if (!user) throw new NotFoundException('Account not found');
    const u: any = user;
    return {
      account: {
        fullName: u.fullName,
        email: u.email,
        registrationNumber: profile.registrationNumber,
        university: profile.university,
        department: profile.department,
        program: profile.program,
        batch: profile.batch,
        graduationYear: profile.graduationYear,
        lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : undefined,
        createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : undefined,
      },
      preferences: resolvePreferences(profile.preferences),
      // No outbound mailer is configured in this API yet; the email choice is stored for when one is.
      emailDeliveryAvailable: false,
    };
  }

  /** Partial update: only the keys sent are changed. */
  async updatePreferences(userId: string, dto: UpdateStudentPreferencesDto) {
    const $set: Record<string, unknown> = {};
    for (const group of ['notifications', 'privacy'] as const) {
      for (const [key, value] of Object.entries(dto[group] ?? {})) {
        if (typeof value === 'boolean') $set[`preferences.${group}.${key}`] = value;
      }
    }
    if (dto.theme) $set['preferences.theme'] = dto.theme;

    const profile = await this.profileModel.findOneAndUpdate(
      { userId },
      Object.keys($set).length ? { $set } : {},
      { new: true, upsert: true },
    );
    return resolvePreferences(profile?.preferences);
  }

  /** Resolved preferences keyed by user id, for the users that have a student profile. */
  async getPreferencesForUsers(userIds: string[]) {
    const profiles = await this.profileModel
      .find({ userId: { $in: userIds } })
      .select('userId preferences')
      .lean()
      .exec();
    return new Map(
      profiles.map((p: any) => [String(p.userId), resolvePreferences(p.preferences)]),
    );
  }

  /** Preferences for a user, or null when they have no student profile (staff). */
  async getPreferencesIfStudent(userId: string) {
    const profile = await this.profileModel.findOne({ userId }).select('preferences').lean().exec();
    return profile ? resolvePreferences((profile as any).preferences) : null;
  }
}
