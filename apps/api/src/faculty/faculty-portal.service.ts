import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  EvidenceStatus,
  FacultyAssignmentPurpose,
  FacultyDashboard,
  FacultyStudentDetail,
  FacultyStudentSummary,
  UserRole,
} from '@placecampus/shared-types';
import { Evidence } from '../evidence/schemas/evidence.schema.js';
import { User, UserDocument } from '../users/schemas/user.schema.js';
import {
  StudentProfile,
  StudentProfileDocument,
} from '../students/schemas/student-profile.schema.js';
import {
  ReadinessSnapshot,
  ReadinessSnapshotDocument,
} from '../readiness/schemas/readiness-snapshot.schema.js';
import {
  StudentSkillProfile,
  StudentSkillProfileDocument,
} from '../skills/schemas/student-skill-profile.schema.js';
import {
  MockInterview,
  MockInterviewDocument,
} from '../interviews/schemas/mock-interview.schema.js';
import { AssignmentsService } from '../assignments/assignments.service.js';
import { FacultyService, ReviewViewer } from './faculty.service.js';

/** Matches the web's isUpcoming(): a slot (max 120 min) stays listed until 30 min after it ends. */
const UPCOMING_GRACE_MINUTES = 150;

/**
 * Faculty home data. Everything is scoped to the caller: their own review
 * queue, their own interviews, and only students assigned to them
 * (`student:read:assigned`).
 */
@Injectable()
export class FacultyPortalService {
  constructor(
    @InjectModel(Evidence.name) private evidenceModel: Model<Evidence>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(StudentProfile.name)
    private profileModel: Model<StudentProfileDocument>,
    @InjectModel(ReadinessSnapshot.name)
    private readinessModel: Model<ReadinessSnapshotDocument>,
    @InjectModel(StudentSkillProfile.name)
    private skillProfileModel: Model<StudentSkillProfileDocument>,
    @InjectModel(MockInterview.name)
    private interviewModel: Model<MockInterviewDocument>,
    private readonly assignments: AssignmentsService,
    private readonly facultyService: FacultyService,
  ) {}

  /** Interviews that haven't finished: in progress, or scheduled and not yet over. */
  private upcomingFilter(facultyId: string) {
    const graceStart = new Date(Date.now() - UPCOMING_GRACE_MINUTES * 60_000).toISOString();
    return {
      interviewerId: facultyId,
      $or: [{ status: 'IN_PROGRESS' }, { status: 'SCHEDULED', scheduledAt: { $gte: graceStart } }],
    };
  }

  async getDashboard(viewer: ReviewViewer): Promise<FacultyDashboard> {
    const facultyId = viewer.userId;
    const now = new Date();
    const [me, assignments, pendingReviews, overdueReviews, upcomingCount, queue, interviews] =
      await Promise.all([
        this.userModel.findById(facultyId).select('fullName designation department').lean().exec(),
        this.assignments.assignmentsFor(facultyId),
        this.evidenceModel.countDocuments({ reviewerId: facultyId, status: EvidenceStatus.NEEDS_REVIEW }),
        this.evidenceModel.countDocuments({
          reviewerId: facultyId,
          status: EvidenceStatus.NEEDS_REVIEW,
          reviewDueAt: { $lt: now },
        }),
        this.interviewModel.countDocuments(this.upcomingFilter(facultyId)),
        this.facultyService.getPendingReviews(viewer, { status: EvidenceStatus.NEEDS_REVIEW }),
        this.interviewModel
          .find(this.upcomingFilter(facultyId))
          .sort({ scheduledAt: 1 })
          .limit(3)
          .lean()
          .exec(),
      ]);
    if (!me) throw new NotFoundException('Faculty account not found');

    const studentRefs = await this.facultyService.studentRefs(interviews.map((i) => String(i.studentId)));
    const students = await this.summaries(assignments.slice(0, 3));

    return {
      faculty: {
        id: facultyId,
        fullName: me.fullName,
        designation: me.designation,
        department: me.department,
      },
      stats: {
        assignedStudents: new Set(assignments.map((a) => a.studentId)).size,
        pendingReviews,
        upcomingInterviews: upcomingCount,
        overdueReviews,
      },
      reviewQueue: queue.slice(0, 3).map((e: any) => ({
        id: e.id,
        title: e.title,
        type: e.type,
        status: e.status,
        student: e.student,
        reviewDueAt: e.reviewDueAt ? new Date(e.reviewDueAt).toISOString() : undefined,
        reviewState: e.reviewState,
        overdue: e.overdue,
        createdAt: new Date(e.createdAt).toISOString(),
      })),
      upcomingInterviews: interviews.map((i: any) => ({
        id: String(i._id),
        type: i.type,
        status: i.status,
        scheduledAt: i.scheduledAt,
        durationMinutes: i.durationMinutes,
        meetingUrl: i.meetingUrl,
        student: studentRefs.get(String(i.studentId)) ?? null,
      })),
      students,
    };
  }

  async getStudents(viewer: ReviewViewer): Promise<FacultyStudentSummary[]> {
    return this.summaries(await this.assignments.assignmentsFor(viewer.userId));
  }

  async getStudent(viewer: ReviewViewer, studentId: string): Promise<FacultyStudentDetail> {
    if (!Types.ObjectId.isValid(studentId)) throw new NotFoundException('Student not found');
    const isAdmin = viewer.role === UserRole.ADMIN;
    if (!isAdmin && !(await this.assignments.isAssigned(viewer.userId, studentId))) {
      throw new ForbiddenException('This student is not assigned to you.');
    }
    const assignment = (await this.assignments.assignmentsFor(viewer.userId)).find(
      (a) => a.studentId === studentId,
    );
    const [summary] = await this.summaries([
      assignment ?? { studentId, purposes: [], createdAt: new Date() },
    ]);
    if (!summary) throw new NotFoundException('Student not found');

    const [profile, readiness, skillProfile, evidence, interviews] = await Promise.all([
      this.profileModel.findOne({ userId: studentId }).select('cgpa phone').lean().exec(),
      this.readinessModel.findOne({ studentId }).sort({ calculatedAt: -1 }).lean().exec(),
      this.skillProfileModel.findOne({ studentId }).lean().exec(),
      this.evidenceModel
        .find({ studentId })
        .select('title type status createdAt reviewerId')
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      this.interviewModel
        .find({ studentId, interviewerId: viewer.userId })
        .select('type status scheduledAt')
        .sort({ scheduledAt: -1 })
        .lean()
        .exec(),
    ]);

    return {
      student: { ...summary, cgpa: profile?.cgpa, phone: profile?.phone },
      readiness: readiness
        ? {
            overallScore: readiness.overallScore,
            calculatedAt: readiness.calculatedAt,
            strengths: readiness.explanation?.strengths ?? [],
            areasToImprove: readiness.explanation?.areasToImprove ?? [],
          }
        : null,
      skills: (skillProfile?.skills ?? [])
        .filter((s: any) => s.verificationStatus === 'VERIFIED')
        .map((s: any) => ({ name: s.canonicalName, level: s.level }))
        .sort((a, b) => b.level - a.level),
      evidence: evidence.map((e: any) => ({
        id: String(e._id),
        title: e.title,
        type: e.type,
        status: e.status,
        createdAt: new Date(e.createdAt).toISOString(),
        reviewedByMe: e.reviewerId === viewer.userId,
      })),
      interviews: interviews.map((i: any) => ({
        id: String(i._id),
        type: i.type,
        status: i.status,
        scheduledAt: i.scheduledAt,
      })),
    };
  }

  /** One row per assigned student: identity, readiness, verified skills, open reviews. */
  private async summaries(
    assignments: { studentId: string; purposes: FacultyAssignmentPurpose[]; createdAt?: Date }[],
  ): Promise<FacultyStudentSummary[]> {
    const ids = assignments.map((a) => a.studentId).filter((id) => Types.ObjectId.isValid(id));
    if (!ids.length) return [];
    const [users, profiles, snapshots, skillProfiles, pending] = await Promise.all([
      this.userModel.find({ _id: { $in: ids } }).select('fullName email').lean().exec(),
      this.profileModel
        .find({ userId: { $in: ids } })
        .select('userId registrationNumber department program batch')
        .lean()
        .exec(),
      this.readinessModel
        .aggregate<{ _id: unknown; overallScore: number }>([
          // Snapshots have been stored with both string and ObjectId student ids.
          { $match: { studentId: { $in: [...ids, ...ids.map((id) => new Types.ObjectId(id))] } } },
          { $sort: { calculatedAt: -1 } },
          { $group: { _id: '$studentId', overallScore: { $first: '$overallScore' } } },
        ])
        .exec(),
      this.skillProfileModel.find({ studentId: { $in: ids } }).select('studentId skills').lean().exec(),
      this.evidenceModel
        .aggregate<{ _id: string; count: number }>([
          { $match: { studentId: { $in: ids }, status: EvidenceStatus.NEEDS_REVIEW } },
          { $group: { _id: '$studentId', count: { $sum: 1 } } },
        ])
        .exec(),
    ]);
    const user = new Map(users.map((u: any) => [String(u._id), u]));
    const profile = new Map(profiles.map((p: any) => [String(p.userId), p]));
    const score = new Map(snapshots.map((s) => [String(s._id), s.overallScore]));
    const skills = new Map(
      skillProfiles.map((p: any) => [
        String(p.studentId),
        (p.skills ?? []).filter((s: any) => s.verificationStatus === 'VERIFIED').length,
      ]),
    );
    const open = new Map(pending.map((p) => [String(p._id), p.count]));

    return assignments
      .filter((a) => user.has(a.studentId))
      .map((a) => {
        const u = user.get(a.studentId);
        const p = profile.get(a.studentId);
        return {
          id: a.studentId,
          fullName: u.fullName,
          email: u.email,
          registrationNumber: p?.registrationNumber,
          department: p?.department,
          program: p?.program,
          batch: p?.batch,
          purposes: a.purposes,
          readinessScore: score.has(a.studentId) ? Math.round(score.get(a.studentId)!) : null,
          verifiedSkills: skills.get(a.studentId) ?? 0,
          pendingReviews: open.get(a.studentId) ?? 0,
          assignedAt: new Date(a.createdAt ?? Date.now()).toISOString(),
        };
      });
  }
}
