import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EligibilityEngine } from './engine/eligibility.engine.js';
import { DrivesService } from '../drives/drives.service.js';
import { StudentsService } from '../students/students.service.js';
import { SkillsService } from '../skills/skills.service.js';
import { EligibilityResult, UserRole } from '@placecampus/shared-types';
import { User, UserDocument } from '../users/schemas/user.schema.js';
import { StudentProfile, StudentProfileDocument } from '../students/schemas/student-profile.schema.js';
import { StudentSkillProfile, StudentSkillProfileDocument } from '../skills/schemas/student-skill-profile.schema.js';

@Injectable()
export class EligibilityService {
  constructor(
    private readonly eligibilityEngine: EligibilityEngine,
    private readonly drivesService: DrivesService,
    private readonly studentsService: StudentsService,
    private readonly skillsService: SkillsService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(StudentProfile.name) private readonly profileModel: Model<StudentProfileDocument>,
    @InjectModel(StudentSkillProfile.name) private readonly studentSkillsModel: Model<StudentSkillProfileDocument>,
  ) {}

  async calculateForStudent(
    driveId: string,
    userId: string,
  ): Promise<EligibilityResult> {
    const drive = await this.drivesService.findOnePublished(driveId);

    // Get student profile
    const studentProfile = await this.studentsService
      .getProfileByUserId(userId)
      .catch(() => null);

    // Get verified skill profile
    const skillProfile = await this.skillsService
      .getStudentProfile(userId)
      .catch(() => null);

    // Calculate using the engine
    return this.eligibilityEngine.evaluate(
      studentProfile as any,
      skillProfile as any,
      drive as any,
    );
  }

  async listForPlacement(driveId: string, search?: string) {
    const drive = await this.drivesService.findOnePublished(driveId);
    const users = await this.userModel
      .find({ $or: [{ role: UserRole.STUDENT }, { roles: UserRole.STUDENT }], isActive: true })
      .select('fullName email isDemoData accountStatus')
      .lean()
      .exec();
    const userIds = users.map((user: any) => String(user._id));
    const profiles = await this.profileModel.find({ userId: { $in: userIds } }).lean().exec();
    const profilesByUser = new Map(profiles.map((profile: any) => [String(profile.userId), profile]));
    const profileIds = profiles.map((profile: any) => profile._id);
    const skillProfiles = await this.studentSkillsModel.find({ studentId: { $in: profileIds } }).lean().exec();
    const skillsByProfile = new Map(skillProfiles.map((profile: any) => [String(profile.studentId), profile]));
    const needle = search?.trim().toLocaleLowerCase();

    const students = users.flatMap((user: any) => {
      const profile: any = profilesByUser.get(String(user._id));
      if (!profile || user.accountStatus === 'SUSPENDED' || user.accountStatus === 'DEACTIVATED') return [];
      const eligibility = this.eligibilityEngine.evaluate(
        profile as any,
        (skillsByProfile.get(String(profile._id)) as any) ?? null,
        drive as any,
      );
      const student = {
        id: String(user._id),
        name: user.fullName,
        email: user.email,
        registrationNumber: profile.registrationNumber ?? null,
        department: profile.department ?? 'Not provided',
        program: profile.program ?? null,
        graduationYear: profile.graduationYear ?? null,
        cgpa: profile.cgpa ?? null,
        isDemoData: Boolean(user.isDemoData || profile.isDemoData),
        eligibility,
      };
      if (needle && ![student.name, student.email, student.registrationNumber, student.department]
        .some((value) => String(value ?? '').toLocaleLowerCase().includes(needle))) return [];
      return [student];
    });

    return {
      drive: { id: String(drive._id), companyName: drive.companyName, roleTitle: drive.roleTitle },
      total: students.length,
      eligible: students.filter((student) => student.eligibility.eligible).length,
      students: students.sort((a, b) => Number(b.eligibility.eligible) - Number(a.eligibility.eligible) || a.name.localeCompare(b.name)),
    };
  }
}
