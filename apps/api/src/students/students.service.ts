import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  StudentProfile,
  StudentProfileDocument,
} from './schemas/student-profile.schema.js';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto.js';

@Injectable()
export class StudentsService {
  constructor(
    @InjectModel(StudentProfile.name)
    private readonly profileModel: Model<StudentProfileDocument>,
  ) {}

  async getProfileByUserId(userId: string): Promise<StudentProfileDocument> {
    let profile = await this.profileModel.findOne({ userId });

    // Auto-create an empty profile if one doesn't exist yet for the authenticated student
    if (!profile) {
      profile = await this.profileModel.create({ userId });
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
}
