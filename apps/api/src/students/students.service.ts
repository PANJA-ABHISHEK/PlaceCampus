import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  StudentProfile,
  type StudentProfileDocument,
} from './schemas/student-profile.schema.js';
import {
  CreateStudentProfileDto,
  UpdateStudentProfileDto,
} from './dto/student-profile.dto.js';

@Injectable()
export class StudentsService {
  constructor(
    @InjectModel(StudentProfile.name)
    private readonly studentModel: Model<StudentProfileDocument>,
  ) {}

  async create(
    userId: string,
    dto: CreateStudentProfileDto,
  ): Promise<StudentProfile> {
    const existing = await this.studentModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
    if (existing) {
      throw new ConflictException('Student profile already exists for this user');
    }

    const profile = new this.studentModel({
      ...dto,
      userId: new Types.ObjectId(userId),
    });
    return profile.save();
  }

  async findByUserId(userId: string): Promise<StudentProfile> {
    const profile = await this.studentModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }
    return profile;
  }

  async findById(id: string): Promise<StudentProfile> {
    const profile = await this.studentModel.findById(id).exec();
    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }
    return profile;
  }

  async update(
    userId: string,
    dto: UpdateStudentProfileDto,
  ): Promise<StudentProfile> {
    const profile = await this.studentModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $set: dto },
        { new: true },
      )
      .exec();
    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }
    return profile;
  }

  async getProfileCompletion(userId: string): Promise<{
    percentage: number;
    missing: string[];
  }> {
    const profile = await this.findByUserId(userId);
    const fields = [
      { key: 'rollNumber', label: 'Roll Number' },
      { key: 'branch', label: 'Branch' },
      { key: 'graduationYear', label: 'Graduation Year' },
      { key: 'cgpa', label: 'CGPA' },
      { key: 'phone', label: 'Phone' },
      { key: 'tenthPercentage', label: '10th Percentage' },
      { key: 'twelfthPercentage', label: '12th Percentage' },
      { key: 'resumeUrl', label: 'Resume' },
      { key: 'linkedinUrl', label: 'LinkedIn' },
      { key: 'githubUrl', label: 'GitHub' },
      { key: 'bio', label: 'Bio' },
    ];

    const p = profile as unknown as Record<string, unknown>;
    const missing: string[] = [];
    let filled = 0;

    for (const field of fields) {
      if (p[field.key] !== undefined && p[field.key] !== null && p[field.key] !== '') {
        filled++;
      } else {
        missing.push(field.label);
      }
    }

    return {
      percentage: Math.round((filled / fields.length) * 100),
      missing,
    };
  }

  async findAll(filters?: {
    branch?: string;
    graduationYear?: number;
    page?: number;
    limit?: number;
  }): Promise<{ profiles: StudentProfile[]; total: number }> {
    const query: Record<string, unknown> = {};
    if (filters?.branch) query['branch'] = filters.branch;
    if (filters?.graduationYear) query['graduationYear'] = filters.graduationYear;

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [profiles, total] = await Promise.all([
      this.studentModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.studentModel.countDocuments(query).exec(),
    ]);

    return { profiles, total };
  }
}
