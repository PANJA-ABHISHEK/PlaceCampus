import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema.js';
import { UserRole } from '@placecampus/shared-types';
import * as bcrypt from 'bcrypt';

/**
 * Every role the user may act as. Recruiters are always separate identities
 * and never hold campus roles.
 */
export function assignedRoles(user: Pick<User, 'role' | 'roles'>): UserRole[] {
  if (user.role === UserRole.RECRUITER) return [UserRole.RECRUITER];
  const extra = (user.roles ?? []).filter((role) => role !== UserRole.RECRUITER);
  return [...new Set([user.role, ...extra])];
}

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async createStudent(
    fullName: string,
    email: string,
    passwordHash: string,
  ): Promise<UserDocument> {
    const existing = await this.userModel.findOne({
      email: email.toLowerCase(),
    });
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const newUser = new this.userModel({
      fullName,
      email: email.toLowerCase(),
      passwordHash,
      role: UserRole.STUDENT,
      isActive: true,
    });

    return newUser.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id);
  }

  /** Ids of active, real (non-demo) student accounts, for announcements. */
  async findActiveStudentIds(): Promise<string[]> {
    const users = await this.userModel
      .find({
        isActive: true,
        isDemoData: { $ne: true },
        $or: [{ role: UserRole.STUDENT }, { roles: UserRole.STUDENT }],
      })
      .select('_id')
      .lean()
      .exec();
    return users.map((u: any) => String(u._id));
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, { lastLoginAt: new Date() });
  }

  /**
   * Sanitizes a user document to ensure sensitive fields like passwordHash are removed
   */
  sanitize(user: UserDocument) {
    const obj = user.toObject();
    delete obj.passwordHash;

    // Map _id to id for the frontend
    const id = obj._id?.toString();
    delete obj._id;
    delete obj.__v;

    return {
      ...obj,
      id,
    };
  }
}
