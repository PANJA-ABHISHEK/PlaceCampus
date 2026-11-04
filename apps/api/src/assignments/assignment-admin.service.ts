import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Model, Types } from 'mongoose';
import type { ClientSession, Connection } from 'mongoose';
import { randomUUID } from 'crypto';
import { EvidenceStatus, FacultyAssignmentPurpose, UserRole } from '@placecampus/shared-types';
import { FacultyAssignment, FacultyAssignmentDocument } from './schemas/faculty-assignment.schema.js';
import { User, UserDocument } from '../users/schemas/user.schema.js';
import { StudentProfile, StudentProfileDocument } from '../students/schemas/student-profile.schema.js';
import { Evidence } from '../evidence/schemas/evidence.schema.js';
import { MockInterview, MockInterviewDocument } from '../interviews/schemas/mock-interview.schema.js';
import { AuditService } from '../audit/audit.service.js';
import { AVAILABLE_FACULTY, activeFilter } from './assignments.service.js';

export const DEFAULT_MENTEE_TARGET = 40;
const CHUNK = 200;

export interface AssignmentHistoryEntry {
  id: string;
  facultyUserId: string;
  studentId: string;
  purposes: FacultyAssignmentPurpose[];
  status: 'ACTIVE' | 'ENDED';
  source?: string;
  reason?: string;
  endReason?: string;
  validFrom: Date;
  validTo?: Date;
  replacesId?: string;
  replacedById?: string;
  conflictOfInterest: boolean;
  createdAt: Date;
  facultyName: string | null;
  assignedByName: string | null;
  endedByName: string | null;
}

export interface Actor {
  userId: string;
  role: string;
}

type UnassignedReason = 'DEPARTMENT_UNMAPPED' | 'NO_FACULTY_IN_DEPARTMENT' | 'ONLY_CONFLICTED_FACULTY' | 'ACCOUNT_DEACTIVATED';

export interface PlannedAssignment {
  studentId: string;
  facultyUserId: string;
  department: string;
}

/**
 * Mentor allocation and assignment management (Master Plan §24, Phase 8/11).
 * Placement Officers and Administrators manage assignments; the plan's
 * `faculty_assignments` note says they are "bulk-managed by officers or Administrators".
 */
@Injectable()
export class AssignmentAdminService {
  constructor(
    @InjectModel(FacultyAssignment.name) private assignmentModel: Model<FacultyAssignmentDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(StudentProfile.name) private profileModel: Model<StudentProfileDocument>,
    @InjectModel(Evidence.name) private evidenceModel: Model<Evidence>,
    @InjectModel(MockInterview.name) private interviewModel: Model<MockInterviewDocument>,
    @InjectConnection() private connection: Connection,
    private audit: AuditService,
    private events: EventEmitter2,
  ) {}

  /* ------------------------------------------------------------------ */
  /* Shared data loading                                                 */
  /* ------------------------------------------------------------------ */

  private async students(departmentCodes?: string[]) {
    const profiles = await this.profileModel
      .find(departmentCodes?.length ? { department: { $in: departmentCodes } } : {})
      .select('userId registrationNumber department program source batch derived isDemoData')
      .lean()
      .exec();
    const ids = profiles.map((p) => p.userId).filter((id) => Types.ObjectId.isValid(id));
    const users = await this.userModel
      .find({ _id: { $in: ids }, role: UserRole.STUDENT })
      .select('fullName accountStatus isDemoData')
      .lean()
      .exec();
    const byId = new Map(users.map((u) => [String(u._id), u]));
    return profiles
      .filter((p) => byId.has(p.userId))
      .map((p) => ({ ...p, user: byId.get(p.userId)! }));
  }

  private async faculty() {
    return this.userModel
      .find({ $or: [{ role: UserRole.FACULTY }, { roles: UserRole.FACULTY }] })
      .select('fullName email department designation employmentStatus accountStatus isActive isDemoData employeeId source')
      .lean()
      .exec();
  }

  private isAvailable(f: { employmentStatus?: string; accountStatus?: string; isActive?: boolean }) {
    return (
      !['RELIEVED', 'ON_LEAVE'].includes(f.employmentStatus ?? '') &&
      !['SUSPENDED', 'DEACTIVATED'].includes(f.accountStatus ?? '') &&
      (f.isActive || f.accountStatus === 'INVITED')
    );
  }

  /** Active MENTOR counts and the latest mentor assignment time per faculty. */
  private async mentorLoad() {
    const rows = await this.assignmentModel
      .aggregate<{ _id: string; mentees: number; last: Date }>([
        { $match: { ...activeFilter(), purposes: FacultyAssignmentPurpose.MENTOR } },
        { $group: { _id: '$facultyUserId', mentees: { $sum: 1 }, last: { $max: '$createdAt' } } },
      ])
      .exec();
    return new Map(rows.map((r) => [r._id, { mentees: r.mentees, last: r.last?.getTime() ?? 0 }]));
  }

  /* ------------------------------------------------------------------ */
  /* Allocation                                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Builds the allocation plan without writing anything. Deterministic: students
   * are taken in department / programme / batch / registration order and each
   * goes to the eligible faculty member with the fewest mentees (then least
   * recently assigned). Only APPROVED departments (codes on the profile) count.
   */
  async plan(opts: { departmentCodes?: string[]; target?: number } = {}) {
    const target = Math.max(1, Math.min(Number(opts.target) || DEFAULT_MENTEE_TARGET, 500));
    const [students, faculty, load, mentors, conflicts] = await Promise.all([
      this.students(),
      this.faculty(),
      this.mentorLoad(),
      this.assignmentModel.find({ ...activeFilter(), purposes: FacultyAssignmentPurpose.MENTOR }).select('studentId').lean().exec(),
      this.assignmentModel.find({ conflictOfInterest: true }).select('studentId facultyUserId').lean().exec(),
    ]);
    const withMentor = new Set(mentors.map((m) => m.studentId));
    const conflicted = new Set(conflicts.map((c) => `${c.facultyUserId}:${c.studentId}`));
    const scope = opts.departmentCodes?.length ? new Set(opts.departmentCodes.map((c) => c.toUpperCase())) : null;

    const available = faculty.filter((f) => this.isAvailable(f) && f.department);
    const unavailable = faculty.filter((f) => !this.isAvailable(f));
    const pools = new Map<string, typeof available>();
    for (const f of available) {
      const key = `${f.department}|${f.isDemoData ? 'demo' : 'real'}`;
      pools.set(key, [...(pools.get(key) ?? []), f]);
    }
    // Working copy of the load so the plan balances as it goes.
    const counts = new Map(available.map((f) => [String(f._id), { ...(load.get(String(f._id)) ?? { mentees: 0, last: 0 }) }]));

    const planned: PlannedAssignment[] = [];
    const unassigned: { studentId: string; registrationNumber?: string; fullName: string; reason: UnassignedReason; school?: string; department?: string }[] = [];
    let alreadyAssigned = 0;
    let tick = Date.now();

    const ordered = [...students].sort((a, b) =>
      `${a.department ?? '~'}|${a.program ?? ''}|${a.batch ?? a.derived?.graduationBatch ?? ''}|${a.registrationNumber ?? ''}`.localeCompare(
        `${b.department ?? '~'}|${b.program ?? ''}|${b.batch ?? b.derived?.graduationBatch ?? ''}|${b.registrationNumber ?? ''}`,
      ),
    );
    for (const s of ordered) {
      if (scope && (!s.department || !scope.has(s.department))) continue;
      if (withMentor.has(s.userId)) {
        alreadyAssigned++;
        continue;
      }
      const base = { studentId: s.userId, registrationNumber: s.registrationNumber, fullName: s.user.fullName, school: s.source?.school, department: s.department };
      if (s.user.accountStatus === 'DEACTIVATED') {
        unassigned.push({ ...base, reason: 'ACCOUNT_DEACTIVATED' });
        continue;
      }
      if (!s.department) {
        unassigned.push({ ...base, reason: 'DEPARTMENT_UNMAPPED' });
        continue;
      }
      const pool = pools.get(`${s.department}|${s.isDemoData ? 'demo' : 'real'}`) ?? [];
      const eligible = pool.filter((f) => !conflicted.has(`${String(f._id)}:${s.userId}`));
      if (!eligible.length) {
        unassigned.push({ ...base, reason: pool.length ? 'ONLY_CONFLICTED_FACULTY' : 'NO_FACULTY_IN_DEPARTMENT' });
        continue;
      }
      const chosen = eligible.reduce((best, f) => {
        const a = counts.get(String(f._id))!;
        const b = counts.get(String(best._id))!;
        if (a.mentees !== b.mentees) return a.mentees < b.mentees ? f : best;
        if (a.last !== b.last) return a.last < b.last ? f : best;
        return String(f._id) < String(best._id) ? f : best;
      });
      const c = counts.get(String(chosen._id))!;
      c.mentees++;
      c.last = ++tick;
      planned.push({ studentId: s.userId, facultyUserId: String(chosen._id), department: s.department });
    }

    const plannedBy = new Map<string, number>();
    for (const p of planned) plannedBy.set(p.facultyUserId, (plannedBy.get(p.facultyUserId) ?? 0) + 1);
    const workload = available
      .filter((f) => !scope || scope.has(f.department!))
      .map((f) => {
        const current = load.get(String(f._id))?.mentees ?? 0;
        const added = plannedBy.get(String(f._id)) ?? 0;
        return {
          facultyUserId: String(f._id), fullName: f.fullName, department: f.department!, designation: f.designation,
          isDemoData: !!f.isDemoData, current, planned: added, total: current + added, overTarget: current + added > target,
        };
      })
      .sort((a, b) => a.department.localeCompare(b.department) || b.total - a.total);

    const byDept = new Map<string, { department: string; students: number; assigned: number; faculty: number }>();
    for (const s of students) {
      if (!s.department || (scope && !scope.has(s.department))) continue;
      const row = byDept.get(s.department) ?? { department: s.department, students: 0, assigned: 0, faculty: 0 };
      row.students++;
      byDept.set(s.department, row);
    }
    for (const p of planned) byDept.get(p.department)!.assigned++;
    for (const f of available) if (byDept.has(f.department!)) byDept.get(f.department!)!.faculty++;

    const unmapped = new Map<string, number>();
    for (const u of unassigned) if (u.reason === 'DEPARTMENT_UNMAPPED') unmapped.set(u.school ?? '(none)', (unmapped.get(u.school ?? '(none)') ?? 0) + 1);
    const reasons = new Map<string, number>();
    for (const u of unassigned) reasons.set(u.reason, (reasons.get(u.reason) ?? 0) + 1);

    return {
      target,
      totals: {
        students: scope ? students.filter((s) => s.department && scope.has(s.department)).length : students.length,
        eligible: planned.length + alreadyAssigned,
        alreadyAssigned,
        toAssign: planned.length,
        unassigned: unassigned.length,
        activeFaculty: available.length,
        unavailableFaculty: unavailable.length,
        facultyOverTarget: workload.filter((w) => w.overTarget).length,
      },
      unassignedByReason: [...reasons].map(([reason, students]) => ({ reason, students })),
      unmappedDepartments: [...unmapped].map(([school, students]) => ({ school, students })).sort((a, b) => b.students - a.students),
      unavailableFaculty: unavailable.map((f) => ({ facultyUserId: String(f._id), fullName: f.fullName, department: f.department, employmentStatus: f.employmentStatus, accountStatus: f.accountStatus })),
      departments: [...byDept.values()].sort((a, b) => b.students - a.students),
      workload,
      unassigned,
      planned,
    };
  }

  async preview(opts: { departmentCodes?: string[]; target?: number }) {
    const { planned, unassigned, ...summary } = await this.plan(opts);
    return { ...summary, unassigned: unassigned.slice(0, 500), plannedSample: planned.slice(0, 50) };
  }

  private async withTransaction<T>(fn: (session?: ClientSession) => Promise<T>) {
    const session = await this.connection.startSession();
    try {
      let result!: T;
      await session.withTransaction(async () => {
        result = await fn(session);
      });
      return result;
    } catch (error: any) {
      if (/Transaction numbers are only allowed|replica set/i.test(error?.message ?? '')) return fn(undefined);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Re-plans (so the commit always reflects current data) and writes one active
   * MENTOR assignment per planned student, in transactional chunks. The partial
   * unique index guarantees no student ever gets two active primary mentors.
   */
  async commit(opts: { departmentCodes?: string[]; target?: number }, actor: Actor) {
    const result = await this.plan(opts);
    const runId = randomUUID();
    let created = 0;
    let skipped = 0;
    for (let i = 0; i < result.planned.length; i += CHUNK) {
      const chunk = result.planned.slice(i, i + CHUNK).map((p) => ({
        facultyUserId: p.facultyUserId, studentId: p.studentId, purposes: [FacultyAssignmentPurpose.MENTOR], status: 'ACTIVE',
        source: 'ALLOCATION', allocationRunId: runId, assignedBy: actor.userId, validFrom: new Date(),
      }));
      try {
        await this.withTransaction(async (session) => {
          await this.assignmentModel.insertMany(chunk, session ? { session } : {});
        });
        created += chunk.length;
      } catch {
        // A concurrent manual assignment won the race for some students: insert the rest individually.
        for (const doc of chunk) {
          try {
            await this.assignmentModel.create(doc);
            created++;
          } catch (error: any) {
            if (error?.code === 11000) skipped++;
            else throw error;
          }
        }
      }
    }
    await this.audit.logAction({
      actorId: actor.userId, actorRole: actor.role, action: 'ASSIGNMENT_ALLOCATION_COMMITTED', resourceType: 'FACULTY_ASSIGNMENT',
      metadata: { runId, target: result.target, created, skipped, totals: result.totals, unassignedByReason: result.unassignedByReason, departments: result.departments },
    });
    const { planned, unassigned, ...summary } = result;
    return { runId, created, skipped, ...summary, unassigned: unassigned.slice(0, 500) };
  }

  /* ------------------------------------------------------------------ */
  /* Manual assignment, reassignment, ending                            */
  /* ------------------------------------------------------------------ */

  private async loadPair(studentId: string, facultyUserId: string) {
    if (!Types.ObjectId.isValid(studentId) || !Types.ObjectId.isValid(facultyUserId)) throw new BadRequestException('Invalid id');
    const [student, profile, faculty] = await Promise.all([
      this.userModel.findOne({ _id: studentId, role: UserRole.STUDENT }).lean().exec(),
      this.profileModel.findOne({ userId: studentId }).lean().exec(),
      this.userModel.findOne({ _id: facultyUserId, ...AVAILABLE_FACULTY }).lean().exec(),
    ]);
    if (!student || !profile) throw new NotFoundException('Student not found');
    if (!faculty) throw new BadRequestException('That faculty member is not available for new assignments (relieved, on leave, suspended or not faculty).');
    if (!!profile.isDemoData !== !!faculty.isDemoData) {
      throw new BadRequestException('Demo (synthetic) faculty and real students are never paired.');
    }
    return { student, profile, faculty };
  }

  private async checkScopeAndCapacity(
    profile: { department?: string },
    faculty: { _id: unknown; department?: string },
    opts: { allowCrossDepartment?: boolean; allowOverTarget?: boolean; reason: string; purposes: FacultyAssignmentPurpose[] },
  ) {
    if (!profile.department) throw new BadRequestException('The student has no approved department yet; approve the department mapping first.');
    if (faculty.department !== profile.department && !opts.allowCrossDepartment) {
      throw new BadRequestException(`Department mismatch: student ${profile.department}, faculty ${faculty.department ?? 'none'}. Tick "allow cross-department" with a reason to override.`);
    }
    if (opts.purposes.includes(FacultyAssignmentPurpose.MENTOR)) {
      const mentees = await this.assignmentModel.countDocuments({ facultyUserId: String(faculty._id), ...activeFilter(), purposes: FacultyAssignmentPurpose.MENTOR }).exec();
      if (mentees >= DEFAULT_MENTEE_TARGET && !opts.allowOverTarget) {
        throw new ConflictException(`This faculty member already mentors ${mentees} students (target ${DEFAULT_MENTEE_TARGET}). Confirm "allow over target" to proceed.`);
      }
    }
  }

  async assign(
    dto: { studentId: string; facultyUserId: string; purposes: FacultyAssignmentPurpose[]; reason: string; allowCrossDepartment?: boolean; allowOverTarget?: boolean },
    actor: Actor,
  ) {
    const { profile, faculty, student } = await this.loadPair(dto.studentId, dto.facultyUserId);
    await this.checkScopeAndCapacity(profile, faculty, dto);
    try {
      const created = await this.assignmentModel.create({
        facultyUserId: dto.facultyUserId, studentId: dto.studentId, purposes: dto.purposes, status: 'ACTIVE',
        source: 'MANUAL', reason: dto.reason, assignedBy: actor.userId, validFrom: new Date(),
      });
      await this.audit.logAction({
        actorId: actor.userId, actorRole: actor.role, action: 'ASSIGNMENT_CREATED', resourceType: 'FACULTY_ASSIGNMENT', resourceId: String(created._id),
        studentId: dto.studentId, reason: dto.reason, metadata: { facultyUserId: dto.facultyUserId, purposes: dto.purposes, crossDepartment: faculty.department !== profile.department },
      });
      this.events.emit('assignment.changed', { studentId: dto.studentId, studentName: student.fullName, newFacultyId: dto.facultyUserId, newFacultyName: faculty.fullName, purposes: dto.purposes });
      return created.toObject();
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException(
          dto.purposes.includes(FacultyAssignmentPurpose.MENTOR)
            ? 'The student already has an active primary mentor (or this pair is already assigned). Use reassign instead.'
            : 'This faculty member is already assigned to the student.',
        );
      }
      throw error;
    }
  }

  /**
   * Ends the current assignment and creates its replacement in one transaction,
   * keeping the chain (replacesId / replacedById) and a reason.
   */
  async reassign(
    assignmentId: string,
    dto: { facultyUserId: string; reason: string; allowCrossDepartment?: boolean; allowOverTarget?: boolean },
    actor: Actor,
  ) {
    const current = await this.assignmentModel.findOne({ _id: assignmentId, status: 'ACTIVE' }).exec();
    if (!current) throw new NotFoundException('Active assignment not found');
    if (current.facultyUserId === dto.facultyUserId) throw new BadRequestException('Choose a different faculty member.');
    const { profile, faculty, student } = await this.loadPair(current.studentId, dto.facultyUserId);
    await this.checkScopeAndCapacity(profile, faculty, { ...dto, purposes: current.purposes });
    const previousFaculty = await this.userModel.findById(current.facultyUserId).select('fullName').lean().exec();

    const replacement = await this.withTransaction(async (session) => {
      const opts = session ? { session } : {};
      const now = new Date();
      current.status = 'ENDED';
      current.validTo = now;
      current.endedBy = actor.userId;
      current.endReason = dto.reason;
      await current.save(opts);
      const [created] = await this.assignmentModel.create(
        [{
          facultyUserId: dto.facultyUserId, studentId: current.studentId, purposes: current.purposes, status: 'ACTIVE',
          source: 'REASSIGNMENT', reason: dto.reason, assignedBy: actor.userId, validFrom: now, replacesId: String(current._id),
        }],
        opts,
      );
      current.replacedById = String(created._id);
      await current.save(opts);
      return created;
    });
    await this.audit.logAction({
      actorId: actor.userId, actorRole: actor.role, action: 'ASSIGNMENT_REASSIGNED', resourceType: 'FACULTY_ASSIGNMENT', resourceId: String(replacement._id),
      studentId: current.studentId, reason: dto.reason, metadata: { from: current.facultyUserId, to: dto.facultyUserId, purposes: current.purposes, previousAssignmentId: String(current._id) },
    });
    this.events.emit('assignment.changed', {
      studentId: current.studentId, studentName: student.fullName, newFacultyId: dto.facultyUserId, newFacultyName: faculty.fullName,
      previousFacultyId: current.facultyUserId, previousFacultyName: previousFaculty?.fullName, purposes: current.purposes,
    });
    return replacement.toObject();
  }

  async end(assignmentId: string, reason: string, actor: Actor) {
    if (!reason?.trim()) throw new BadRequestException('A reason is required.');
    const current = await this.assignmentModel
      .findOneAndUpdate({ _id: assignmentId, status: 'ACTIVE' }, { $set: { status: 'ENDED', validTo: new Date(), endedBy: actor.userId, endReason: reason } }, { new: true })
      .exec();
    if (!current) throw new NotFoundException('Active assignment not found');
    await this.audit.logAction({
      actorId: actor.userId, actorRole: actor.role, action: 'ASSIGNMENT_ENDED', resourceType: 'FACULTY_ASSIGNMENT', resourceId: assignmentId,
      studentId: current.studentId, reason, metadata: { facultyUserId: current.facultyUserId, purposes: current.purposes },
    });
    return current.toObject();
  }

  async history(studentId: string): Promise<AssignmentHistoryEntry[]> {
    if (!Types.ObjectId.isValid(studentId)) throw new BadRequestException('Invalid id');
    const rows = await this.assignmentModel.find({ studentId }).sort({ createdAt: -1 }).lean().exec();
    const people = await this.userModel
      .find({ _id: { $in: [...new Set(rows.flatMap((r) => [r.facultyUserId, r.assignedBy, r.endedBy]).filter((id): id is string => !!id && Types.ObjectId.isValid(id)))] } })
      .select('fullName role')
      .lean()
      .exec();
    const name = new Map(people.map((p) => [String(p._id), p.fullName]));
    return rows.map((r) => ({
      id: String(r._id), facultyUserId: r.facultyUserId, studentId: r.studentId, purposes: r.purposes, status: r.status,
      source: r.source, reason: r.reason, endReason: r.endReason, validFrom: r.validFrom, validTo: r.validTo,
      replacesId: r.replacesId, replacedById: r.replacedById, conflictOfInterest: r.conflictOfInterest, createdAt: r.createdAt,
      facultyName: name.get(r.facultyUserId) ?? null,
      assignedByName: r.assignedBy ? (name.get(r.assignedBy) ?? null) : null, endedByName: r.endedBy ? (name.get(r.endedBy) ?? null) : null,
    }));
  }

  /* ------------------------------------------------------------------ */
  /* Dashboard                                                           */
  /* ------------------------------------------------------------------ */

  async overview(q: { search?: string; department?: string; sort?: string } = {}) {
    const now = new Date();
    const [students, faculty, load, mentored, pending, overdue, coordinator, interviews] = await Promise.all([
      this.students(),
      this.faculty(),
      this.mentorLoad(),
      this.assignmentModel.distinct('studentId', { ...activeFilter(), purposes: FacultyAssignmentPurpose.MENTOR }).exec(),
      this.evidenceModel.aggregate<{ _id: string; n: number }>([{ $match: { status: EvidenceStatus.NEEDS_REVIEW, reviewerId: { $type: 'string' } } }, { $group: { _id: '$reviewerId', n: { $sum: 1 } } }]).exec(),
      this.evidenceModel.aggregate<{ _id: string; n: number }>([{ $match: { status: EvidenceStatus.NEEDS_REVIEW, reviewerId: { $type: 'string' }, reviewDueAt: { $lt: now } } }, { $group: { _id: '$reviewerId', n: { $sum: 1 } } }]).exec(),
      this.evidenceModel.countDocuments({ status: EvidenceStatus.NEEDS_REVIEW, reviewQueue: 'COORDINATOR' }).exec(),
      this.interviewModel.aggregate<{ _id: unknown; n: number }>([{ $match: { status: 'SCHEDULED', scheduledAt: { $gte: now.toISOString() } } }, { $group: { _id: '$interviewerId', n: { $sum: 1 } } }]).exec(),
    ]);
    const pendingBy = new Map(pending.map((p) => [p._id, p.n]));
    const overdueBy = new Map(overdue.map((p) => [p._id, p.n]));
    const interviewsBy = new Map(interviews.map((p) => [String(p._id), p.n]));
    const mentoredSet = new Set(mentored as string[]);
    const live = students.filter((s) => s.user.accountStatus !== 'DEACTIVATED');

    let rows = faculty.map((f) => ({
      facultyUserId: String(f._id), fullName: f.fullName, employeeId: f.employeeId, department: f.department ?? null,
      sourceDepartment: f.source?.department ?? null, designation: f.designation, employmentStatus: f.employmentStatus ?? 'ACTIVE',
      accountStatus: f.accountStatus ?? 'ACTIVE', isDemoData: !!f.isDemoData, available: this.isAvailable(f),
      mentees: load.get(String(f._id))?.mentees ?? 0, pendingReviews: pendingBy.get(String(f._id)) ?? 0,
      overdueReviews: overdueBy.get(String(f._id)) ?? 0, upcomingInterviews: interviewsBy.get(String(f._id)) ?? 0,
    }));
    if (q.department) rows = rows.filter((r) => r.department === q.department);
    if (q.search) {
      const s = q.search.toLowerCase();
      rows = rows.filter((r) => `${r.fullName} ${r.employeeId ?? ''} ${r.designation ?? ''}`.toLowerCase().includes(s));
    }
    const sorters: Record<string, (a: (typeof rows)[number], b: (typeof rows)[number]) => number> = {
      mentees: (a, b) => b.mentees - a.mentees, menteesAsc: (a, b) => a.mentees - b.mentees,
      reviews: (a, b) => b.pendingReviews - a.pendingReviews, name: (a, b) => a.fullName.localeCompare(b.fullName),
    };
    rows.sort(sorters[q.sort ?? 'mentees'] ?? sorters.mentees);

    return {
      target: DEFAULT_MENTEE_TARGET,
      stats: {
        totalStudents: live.length,
        activeFaculty: faculty.filter((f) => this.isAvailable(f)).length,
        assignedStudents: live.filter((s) => mentoredSet.has(s.userId)).length,
        unassignedStudents: live.filter((s) => !mentoredSet.has(s.userId)).length,
        pendingReviews: pending.reduce((n, p) => n + p.n, 0),
        overdueReviews: overdue.reduce((n, p) => n + p.n, 0),
        coordinatorQueue: coordinator,
        upcomingInterviews: interviews.reduce((n, p) => n + p.n, 0),
      },
      departments: [...new Set(faculty.map((f) => f.department).filter(Boolean))].sort(),
      faculty: rows,
    };
  }

  /** Exception queue: students without an active primary mentor, with the reason. */
  async unassigned(q: { reason?: string; search?: string; page?: number; limit?: number }) {
    const { unassigned, planned } = await this.plan();
    const plannedSet = new Set(planned.map((p) => p.studentId));
    const students = await this.students();
    const mentored = new Set((await this.assignmentModel.distinct('studentId', { ...activeFilter(), purposes: FacultyAssignmentPurpose.MENTOR }).exec()) as string[]);
    // Students allocation *could* place appear as AWAITING_ALLOCATION.
    const awaiting = students
      .filter((s) => plannedSet.has(s.userId) && !mentored.has(s.userId))
      .map((s) => ({ studentId: s.userId, registrationNumber: s.registrationNumber, fullName: s.user.fullName, reason: 'AWAITING_ALLOCATION', school: s.source?.school, department: s.department }));
    let rows = [...unassigned, ...awaiting];
    if (q.reason) rows = rows.filter((r) => r.reason === q.reason);
    if (q.search) {
      const s = q.search.toLowerCase();
      rows = rows.filter((r) => `${r.fullName} ${r.registrationNumber ?? ''}`.toLowerCase().includes(s));
    }
    const limit = Math.min(Math.max(Number(q.limit) || 50, 1), 200);
    const page = Math.max(Number(q.page) || 1, 1);
    return { total: rows.length, page, limit, items: rows.slice((page - 1) * limit, page * limit) };
  }

  /** A faculty member's active assignments with student identity (workload drill-down). */
  async mentees(facultyUserId: string): Promise<{ assignmentId: string; studentId: string; fullName: string; registrationNumber?: string; purposes: FacultyAssignmentPurpose[]; source?: string; since: Date }[]> {
    if (!Types.ObjectId.isValid(facultyUserId)) throw new BadRequestException('Invalid id');
    const rows = await this.assignmentModel.find({ facultyUserId, ...activeFilter() }).sort({ createdAt: -1 }).lean().exec();
    const ids = rows.map((r) => r.studentId).filter((id) => Types.ObjectId.isValid(id));
    const [users, profiles] = await Promise.all([
      this.userModel.find({ _id: { $in: ids } }).select('fullName').lean().exec(),
      this.profileModel.find({ userId: { $in: ids } }).select('userId registrationNumber').lean().exec(),
    ]);
    const name = new Map(users.map((u) => [String(u._id), u.fullName]));
    const reg = new Map(profiles.map((p) => [p.userId, p.registrationNumber]));
    return rows.map((r) => ({
      assignmentId: String(r._id), studentId: r.studentId, fullName: name.get(r.studentId) ?? 'Unknown', registrationNumber: reg.get(r.studentId),
      purposes: r.purposes, source: r.source, since: r.validFrom,
    }));
  }

  /** Faculty who could take a student, least loaded first (for the assign dialog). */
  async facultyOptions(studentId: string) {
    if (!Types.ObjectId.isValid(studentId)) throw new BadRequestException('Invalid id');
    const profile = await this.profileModel.findOne({ userId: studentId }).lean().exec();
    if (!profile) throw new NotFoundException('Student not found');
    const [faculty, load, conflicts] = await Promise.all([
      this.userModel.find({ $and: [AVAILABLE_FACULTY, profile.isDemoData ? { isDemoData: true } : { isDemoData: { $ne: true } }] }).select('fullName department designation employeeId').lean().exec(),
      this.mentorLoad(),
      this.assignmentModel.find({ studentId, conflictOfInterest: true }).select('facultyUserId').lean().exec(),
    ]);
    const blocked = new Set(conflicts.map((c) => c.facultyUserId));
    return faculty
      .filter((f) => !blocked.has(String(f._id)))
      .map((f) => ({
        facultyUserId: String(f._id), fullName: f.fullName, department: f.department ?? null, designation: f.designation,
        employeeId: f.employeeId, mentees: load.get(String(f._id))?.mentees ?? 0, sameDepartment: !!profile.department && f.department === profile.department,
      }))
      .sort((a, b) => Number(b.sameDepartment) - Number(a.sameDepartment) || a.mentees - b.mentees);
  }
}
