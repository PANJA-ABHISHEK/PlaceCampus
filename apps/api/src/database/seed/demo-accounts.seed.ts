import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module.js';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../users/schemas/user.schema.js';
import { StudentProfile } from '../../students/schemas/student-profile.schema.js';
import { FacultyAssignment } from '../../assignments/schemas/faculty-assignment.schema.js';
import { FacultyAssignmentPurpose, UserRole } from '@placecampus/shared-types';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env
dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), '../../.env') });

import { configureMongoDns } from '../../config/dns.config.js';
configureMongoDns();

async function runSeed() {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.ENABLE_DEMO_SEED !== 'true'
  ) {
    console.error(
      'ERROR: Seed cannot run in production without ENABLE_DEMO_SEED=true.',
    );
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const userModel = app.get<Model<any>>(getModelToken(User.name));
  const studentProfileModel = app.get<Model<any>>(
    getModelToken(StudentProfile.name),
  );
  const assignmentModel = app.get<Model<any>>(
    getModelToken(FacultyAssignment.name),
  );

  const password = process.env.DEMO_ACCOUNT_PASSWORD || 'PlaceCampus@Demo123';
  const salt = await bcrypt.genSalt();
  const passwordHash = await bcrypt.hash(password, salt);

  const demoAccounts = [
    {
      role: UserRole.STUDENT,
      email: 'student.demo@placecampus.local',
      fullName: 'Demo Student',
    },
    {
      role: UserRole.FACULTY,
      email: 'faculty.demo@placecampus.local',
      fullName: 'Demo Faculty',
      designation: 'Assistant Professor',
      department: 'CSE',
    },
    {
      role: UserRole.PLACEMENT_OFFICER,
      email: 'placement.demo@placecampus.local',
      fullName: 'Demo Placement Officer',
    },
    {
      role: UserRole.PLACEMENT_HEAD,
      email: 'head.demo@placecampus.local',
      fullName: 'Demo Placement Head',
    },
    {
      role: UserRole.RECRUITER,
      email: 'recruiter.demo@placecampus.local',
      fullName: 'Demo Recruiter',
    },
    {
      role: UserRole.ADMIN,
      email: 'admin.demo@placecampus.local',
      fullName: 'Demo Admin',
    },
  ];

  console.log('Seeding demo accounts...');
  const seeded = new Map<string, any>();

  for (const account of demoAccounts) {
    let user = await userModel.findOne({ email: account.email });

    if (user) {
      console.log(
        `Account ${account.email} already exists. Updating password and role to ensure consistency.`,
      );
      user.passwordHash = passwordHash;
      user.role = account.role;
      user.fullName = account.fullName;
      user.isActive = true;
      if ('designation' in account) user.designation = account.designation;
      if ('department' in account) user.department = account.department;
      await user.save();
    } else {
      console.log(`Creating account ${account.email}...`);
      user = new userModel({
        email: account.email,
        passwordHash,
        fullName: account.fullName,
        role: account.role,
        isActive: true,
        ...('designation' in account ? { designation: account.designation } : {}),
        ...('department' in account ? { department: account.department } : {}),
      });
      await user.save();
    }

    seeded.set(account.role, user);

    // Special logic for Student profile creation
    if (account.role === UserRole.STUDENT) {
      const profile = await studentProfileModel.findOne({ userId: user._id });
      if (!profile) {
        console.log(`Creating student profile for ${account.email}...`);
        await studentProfileModel.create({
          userId: user._id,
          registrationNumber: '22CS001',
          department: 'CSE',
        });
      } else {
        // Fill institution fields without overwriting anything already set.
        if (!profile.registrationNumber) profile.registrationNumber = '22CS001';
        if (!profile.department) profile.department = 'CSE';
        await profile.save();
      }
    }
  }

  // The demo faculty member mentors, reviews and interviews the demo student.
  const faculty = seeded.get(UserRole.FACULTY);
  const student = seeded.get(UserRole.STUDENT);
  if (faculty && student) {
    await assignmentModel.updateOne(
      { facultyUserId: String(faculty._id), studentId: String(student._id) },
      {
        $setOnInsert: { validFrom: new Date(), conflictOfInterest: false },
        $set: {
          purposes: [
            FacultyAssignmentPurpose.MENTOR,
            FacultyAssignmentPurpose.EVIDENCE_REVIEWER,
            FacultyAssignmentPurpose.INTERVIEWER,
          ],
        },
      },
      { upsert: true },
    );
    console.log('Assigned the demo student to the demo faculty member.');
  }

  console.log('====================================');
  console.log('Seed Complete.');
  console.log('Development Password:', password);
  console.log('====================================');

  await app.close();
}

runSeed().catch((err) => {
  console.error('Seed Failed', err);
  process.exit(1);
});
