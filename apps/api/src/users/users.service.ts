import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema.js';
import { UserRole } from '@placecampus/shared-types';
import { AuditService } from '../audit/audit.service.js';

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
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private audit: AuditService,
  ) {}

  async listAdminUsers(query: { search?: string; role?: string; status?: string; page?: number; limit?: number }) {
    const filter: Record<string, any> = {};
    const search = query.search?.trim();
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ fullName: regex }, { email: regex }, { employeeId: regex }];
    }
    if (query.role) filter.$and = [...(filter.$and ?? []), { $or: [{ role: query.role }, { roles: query.role }] }];
    if (query.status === 'ACTIVE') filter.$and = [...(filter.$and ?? []), { isActive: true, accountStatus: { $nin: ['INVITED', 'SUSPENDED', 'DEACTIVATED'] } }];
    if (query.status === 'INVITED') filter.accountStatus = 'INVITED';
    if (query.status === 'SUSPENDED') filter.accountStatus = 'SUSPENDED';
    if (query.status === 'DEACTIVATED') filter.accountStatus = 'DEACTIVATED';
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const [rows, total] = await Promise.all([
      this.userModel.find(filter).select('fullName email role roles designation department employeeId isActive accountStatus emailStatus identityStatus employmentStatus isDemoData lastLoginAt createdAt').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);
    return {
      items: rows.map((user: any) => ({
        id: String(user._id), fullName: user.fullName, email: user.email, roles: assignedRoles(user),
        designation: user.designation, department: user.department, employeeId: user.employeeId,
        isActive: !!user.isActive, accountStatus: user.accountStatus ?? (user.isActive ? 'ACTIVE' : 'INVITED'),
        emailStatus: user.emailStatus, identityStatus: user.identityStatus, employmentStatus: user.employmentStatus,
        isDemoData: !!user.isDemoData, lastLoginAt: user.lastLoginAt, createdAt: user.createdAt,
      })),
      total, page, limit,
    };
  }

  async setAdminUserStatus(id: string, status: 'ACTIVE' | 'SUSPENDED', actor: { userId: string; role: string }) {
    if (!['ACTIVE', 'SUSPENDED'].includes(status)) throw new BadRequestException('Unsupported account status.');
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found.');
    if (String(user._id) === actor.userId && status === 'SUSPENDED') throw new ForbiddenException('You cannot suspend your own account.');
    if (user.accountStatus === 'INVITED' || user.accountStatus === 'DEACTIVATED') throw new ConflictException('Invited or deactivated accounts must use their existing account lifecycle workflow.');
    const hasAdminRole = assignedRoles(user).includes(UserRole.ADMIN);
    if (hasAdminRole && status === 'SUSPENDED' && user.isActive) {
      const activeAdmins = await this.userModel.countDocuments({ isActive: true, $or: [{ role: UserRole.ADMIN }, { roles: UserRole.ADMIN }] }).exec();
      if (activeAdmins <= 1) throw new ConflictException('The last active administrator cannot be suspended.');
    }
    user.isActive = status === 'ACTIVE';
    user.accountStatus = status;
    await user.save();
    await this.audit.logAction({ actorId: actor.userId, actorRole: actor.role, action: status === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_REACTIVATED', resourceType: 'USER', resourceId: id, metadata: { status } });
    return { id, isActive: user.isActive, accountStatus: user.accountStatus };
  }

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

  async createRecruiter(
    fullName: string,
    email: string,
    passwordHash: string,
    companyName: string,
  ): Promise<UserDocument> {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.userModel.findOne({ email: normalizedEmail });
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const recruiter = new this.userModel({
      fullName: fullName.trim(),
      email: normalizedEmail,
      passwordHash,
      companyName: companyName.trim(),
      role: UserRole.RECRUITER,
      isActive: true,
    });

    return recruiter.save();
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
