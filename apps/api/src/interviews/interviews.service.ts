import { randomBytes } from 'crypto';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  MockInterview,
  MockInterviewDocument,
} from './schemas/mock-interview.schema.js';
import {
  InterviewSlot,
  InterviewSlotDocument,
} from './schemas/interview-slot.schema.js';
import {
  InterviewFeedbackRecord,
  InterviewFeedbackDocument,
} from './schemas/interview-feedback.schema.js';
import { User, UserDocument } from '../users/schemas/user.schema.js';
import {
  StudentProfile,
  StudentProfileDocument,
} from '../students/schemas/student-profile.schema.js';
import {
  EVALUATION_CRITERIA,
  UserRole,
  MockInterviewStatus,
  InterviewSlotStatus,
  InterviewParticipant,
  type FacultyInterviewSummary,
  type InterviewFeedback,
  type InterviewQuestion,
  type InterviewRoomRole,
} from '@placecampus/shared-types';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type {
  CreateInterviewSlotDto,
  CancelInterviewDto,
} from './dto/interview-slot.dto.js';
import {
  MAX_QUESTIONS,
  type EvaluateInterviewDto,
  type InterviewQuestionInputDto,
  type RescheduleInterviewDto,
  type ScheduleInterviewDto,
  type UpdateInterviewQuestionDto,
} from './dto/mock-interview.dto.js';
import { AssignmentsService } from '../assignments/assignments.service.js';
import { InterviewRoomRegistry } from './interview-room.registry.js';
import { QUESTION_BANK } from './question-bank.js';

const MINUTE = 60_000;
/** Slots must start at least this far in the future when created. */
export const SLOT_MIN_LEAD_MS = 5 * MINUTE;
/** Students can cancel a booking up to this long before it starts. */
export const STUDENT_CANCEL_CUTOFF_MS = 120 * MINUTE;
/** Faculty can start or evaluate an interview from this long before it starts. */
export const START_WINDOW_MS = 15 * MINUTE;
/** Upper bound on a student's upcoming bookings, to keep slots fair. */
export const MAX_UPCOMING_BOOKINGS = 3;
/** Longest allowed slot, used to bound overlap queries. */
const MAX_DURATION_MS = 120 * MINUTE;
/** Directly scheduled interviews must start at least this far ahead. */
export const SCHEDULE_MIN_LEAD_MS = 5 * MINUTE;

const ACTIVE_INTERVIEW = [
  MockInterviewStatus.SCHEDULED,
  MockInterviewStatus.IN_PROGRESS,
];

const str = (value: unknown) =>
  value == null ? undefined : String((value as any)?._id ?? value);

/** 32 hex chars from the CSPRNG: unguessable room identifiers. */
export const newRoomId = () => randomBytes(16).toString('hex');

/** Mean of the five 1–5 criteria, rounded to one decimal place. */
export function overallScoreOf(dto: Pick<EvaluateInterviewDto, (typeof EVALUATION_CRITERIA)[number]>) {
  const sum = EVALUATION_CRITERIA.reduce((total, key) => total + dto[key], 0);
  return Math.round((sum / EVALUATION_CRITERIA.length) * 10) / 10;
}

type Viewer = InterviewRoomRole;

@Injectable()
export class InterviewsService {
  private readonly logger = new Logger(InterviewsService.name);

  constructor(
    @InjectModel(MockInterview.name)
    private interviewModel: Model<MockInterviewDocument>,
    @InjectModel(InterviewSlot.name)
    private slotModel: Model<InterviewSlotDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @Optional() private eventEmitter?: EventEmitter2,
    @Optional()
    @InjectModel(InterviewFeedbackRecord.name)
    private feedbackModel?: Model<InterviewFeedbackDocument>,
    @Optional()
    @InjectModel(StudentProfile.name)
    private profileModel?: Model<StudentProfileDocument>,
    @Optional() private assignments?: AssignmentsService,
    @Optional() private rooms?: InterviewRoomRegistry,
  ) {}

  /* ------------------------------------------------------------------ */
  /* Response shaping                                                    */
  /* ------------------------------------------------------------------ */

  private async loadUsers(ids: (string | undefined)[], { withRegistration = false } = {}) {
    const unique = [...new Set(ids.filter((id): id is string => !!id))].filter(
      (id) => Types.ObjectId.isValid(id),
    );
    if (!unique.length) return new Map<string, InterviewParticipant & { registrationNumber?: string }>();
    const [users, profiles] = await Promise.all([
      this.userModel
        .find({ _id: { $in: unique } })
        .select('fullName email')
        .lean()
        .exec(),
      withRegistration && this.profileModel
        ? this.profileModel
            .find({ userId: { $in: unique } })
            .select('userId registrationNumber')
            .lean()
            .exec()
        : Promise.resolve([] as any[]),
    ]);
    const reg = new Map<string, string | undefined>(
      profiles.map((p: any) => [String(p.userId), p.registrationNumber]),
    );
    return new Map<string, InterviewParticipant & { registrationNumber?: string }>(
      users.map((u: any) => [
        String(u._id),
        {
          id: String(u._id),
          fullName: u.fullName,
          email: u.email,
          ...(reg.get(String(u._id)) ? { registrationNumber: reg.get(String(u._id)) } : {}),
        },
      ]),
    );
  }

  private toQuestion(q: any, viewer: Viewer): InterviewQuestion {
    return {
      id: String(q._id),
      text: q.text,
      category: q.category,
      asked: !!q.asked,
      ...(q.askedAt ? { askedAt: q.askedAt } : {}),
      ...(viewer === 'FACULTY' && q.feedback ? { feedback: q.feedback } : {}),
    };
  }

  private toFeedback(doc: any): InterviewFeedback {
    const { _id, __v, interviewId, facultyId, studentId, createdAt, updatedAt, ...rest } = doc;
    return {
      ...rest,
      id: String(_id),
      interviewId: String(interviewId),
      facultyId: String(facultyId),
      studentId: String(studentId),
      createdAt: new Date(createdAt).toISOString(),
      updatedAt: new Date(updatedAt).toISOString(),
    };
  }

  /**
   * Lean docs skip toJSON, so map `_id` to `id` and attach participants.
   * Students never receive private notes, question feedback or unasked questions.
   */
  private toInterview(
    doc: any,
    users: Map<string, InterviewParticipant>,
    viewer: Viewer = 'FACULTY',
    evaluation?: InterviewFeedback | null,
  ) {
    const { _id, __v, questions, facultyNotes, roomId, ...rest } = doc;
    const id = String(_id);
    const studentId = str(doc.studentId);
    const interviewerId = str(doc.interviewerId);
    const visibleQuestions = (questions ?? [])
      .filter((q: any) => viewer === 'FACULTY' || q.asked)
      .map((q: any) => this.toQuestion(q, viewer));
    return {
      ...rest,
      id,
      studentId,
      interviewerId,
      slotId: str(doc.slotId),
      questions: visibleQuestions,
      ...(viewer === 'FACULTY' ? { facultyNotes: facultyNotes ?? '' } : {}),
      ...(roomId ? { roomId, inAppRoom: true } : { inAppRoom: false }),
      ...(viewer === 'FACULTY' && this.rooms
        ? { studentWaiting: this.rooms.isStudentWaiting(id) }
        : {}),
      ...(evaluation !== undefined ? { evaluation } : {}),
      student: studentId ? (users.get(studentId) ?? null) : null,
      interviewer: interviewerId ? (users.get(interviewerId) ?? null) : null,
    };
  }

  private toSlot(
    doc: any,
    users: Map<string, InterviewParticipant>,
    { includeMeetingUrl }: { includeMeetingUrl: boolean },
  ) {
    const { _id, __v, meetingUrl, startsAt, ...rest } = doc;
    const interviewerId = str(doc.interviewerId);
    const bookedBy = str(doc.bookedBy);
    return {
      ...rest,
      id: String(_id),
      interviewerId,
      bookedBy,
      interviewId: str(doc.interviewId),
      startsAt: new Date(startsAt).toISOString(),
      ...(includeMeetingUrl ? { meetingUrl } : {}),
      interviewer: interviewerId ? (users.get(interviewerId) ?? null) : null,
      student: bookedBy ? (users.get(bookedBy) ?? null) : null,
    };
  }

  private async evaluationFor(interviewId: string) {
    if (!this.feedbackModel) return null;
    const doc = await this.feedbackModel.findOne({ interviewId }).lean().exec();
    return doc ? this.toFeedback(doc) : null;
  }

  /** Re-reads one interview and shapes it for the given viewer. */
  private async shapeOne(interviewId: unknown, viewer: Viewer) {
    const doc = await this.interviewModel.findById(interviewId).lean().exec();
    if (!doc) throw new NotFoundException('Interview not found');
    const users = await this.loadUsers(
      [str(doc.studentId), str(doc.interviewerId)],
      { withRegistration: viewer === 'FACULTY' },
    );
    return this.toInterview(doc, users, viewer, await this.evaluationFor(String(doc._id)));
  }

  /* ------------------------------------------------------------------ */
  /* Interviews (read endpoints)                                         */
  /* ------------------------------------------------------------------ */

  async getStudentInterviews(studentId: string) {
    const docs = await this.interviewModel
      .find({ studentId })
      .sort({ scheduledAt: -1 })
      .lean()
      .exec();
    const users = await this.loadUsers(docs.map((d) => str(d.interviewerId)));
    const evaluations = await this.evaluationsFor(docs.map((d) => String(d._id)));
    return docs.map((d) =>
      this.toInterview(d, users, 'STUDENT', evaluations.get(String(d._id)) ?? null),
    );
  }

  async getStudentInterviewById(interviewId: string, studentId: string) {
    const doc = await this.interviewModel
      .findOne({ _id: interviewId, studentId })
      .lean()
      .exec();
    if (!doc) throw new NotFoundException('Interview not found');
    const users = await this.loadUsers([str(doc.interviewerId)]);
    return this.toInterview(doc, users, 'STUDENT', await this.evaluationFor(interviewId));
  }

  async getFacultyInterviews(facultyId: string) {
    const docs = await this.interviewModel
      .find({ interviewerId: facultyId })
      .sort({ scheduledAt: -1 })
      .lean()
      .exec();
    const users = await this.loadUsers(docs.map((d) => str(d.studentId)), { withRegistration: true });
    const evaluations = await this.evaluationsFor(docs.map((d) => String(d._id)));
    return docs.map((d) =>
      this.toInterview(d, users, 'FACULTY', evaluations.get(String(d._id)) ?? null),
    );
  }

  async getFacultyInterviewById(interviewId: string, facultyId: string) {
    const doc = await this.interviewModel
      .findOne({ _id: interviewId, interviewerId: facultyId })
      .lean()
      .exec();
    if (!doc)
      throw new NotFoundException('Interview not found or unauthorized');
    const users = await this.loadUsers([str(doc.studentId)], { withRegistration: true });
    return this.toInterview(doc, users, 'FACULTY', await this.evaluationFor(interviewId));
  }

  private async evaluationsFor(interviewIds: string[]) {
    const map = new Map<string, InterviewFeedback>();
    if (!this.feedbackModel || !interviewIds.length) return map;
    const docs = await this.feedbackModel
      .find({ interviewId: { $in: interviewIds } })
      .lean()
      .exec();
    for (const doc of docs) map.set(String(doc.interviewId), this.toFeedback(doc));
    return map;
  }

  /** Dashboard counts for the faculty Interviews page. */
  async getFacultySummary(facultyId: string, now = Date.now()): Promise<FacultyInterviewSummary> {
    const docs = await this.interviewModel
      .find({ interviewerId: facultyId })
      .select('status scheduledAt durationMinutes endedAt')
      .lean()
      .exec();
    let upcoming = 0;
    let inProgress = 0;
    let completed = 0;
    let pendingEvaluations = 0;
    for (const d of docs) {
      if (d.status === MockInterviewStatus.COMPLETED) completed++;
      else if (d.status === MockInterviewStatus.IN_PROGRESS) {
        if (d.endedAt) pendingEvaluations++;
        else inProgress++;
      } else if (d.status === MockInterviewStatus.SCHEDULED) {
        const end = new Date(d.scheduledAt).getTime() + (d.durationMinutes ?? 60) * MINUTE;
        if (end > now) upcoming++;
        else pendingEvaluations++;
      }
    }
    return { total: docs.length, upcoming, inProgress, completed, pendingEvaluations };
  }

  getQuestionBank() {
    return QUESTION_BANK;
  }

  /* ------------------------------------------------------------------ */
  /* Faculty slots                                                       */
  /* ------------------------------------------------------------------ */

  async createSlot(facultyId: string, dto: CreateInterviewSlotDto) {
    const startsAt = new Date(dto.startsAt);
    if (Number.isNaN(startsAt.getTime()))
      throw new BadRequestException('Invalid start time');
    if (startsAt.getTime() < Date.now() + SLOT_MIN_LEAD_MS)
      throw new BadRequestException(
        'Slots must start at least 5 minutes from now',
      );

    const endsAt = startsAt.getTime() + dto.durationMinutes * MINUTE;
    const nearby = await this.slotModel
      .find({
        interviewerId: facultyId,
        status: { $in: [InterviewSlotStatus.OPEN, InterviewSlotStatus.BOOKED] },
        startsAt: {
          $gt: new Date(startsAt.getTime() - MAX_DURATION_MS),
          $lt: new Date(endsAt),
        },
      })
      .lean()
      .exec();
    const overlaps = nearby.some(
      (slot) =>
        new Date(slot.startsAt).getTime() + slot.durationMinutes * MINUTE >
        startsAt.getTime(),
    );
    if (overlaps)
      throw new ConflictException('This slot overlaps another of your slots');

    const slot = await this.slotModel.create({
      interviewerId: facultyId,
      type: dto.type,
      startsAt,
      durationMinutes: dto.durationMinutes,
      meetingUrl: dto.meetingUrl,
      notes: dto.notes,
      status: InterviewSlotStatus.OPEN,
    });
    return this.toSlot(slot.toObject(), new Map(), { includeMeetingUrl: true });
  }

  /** The faculty member's upcoming slots plus the last day, newest last. */
  async getFacultySlots(facultyId: string) {
    const docs = await this.slotModel
      .find({
        interviewerId: facultyId,
        startsAt: { $gte: new Date(Date.now() - 24 * 60 * MINUTE) },
      })
      .sort({ startsAt: 1 })
      .lean()
      .exec();
    const users = await this.loadUsers(docs.map((d) => str(d.bookedBy)));
    return docs.map((d) => this.toSlot(d, users, { includeMeetingUrl: true }));
  }

  async cancelSlot(slotId: string, facultyId: string, dto: CancelInterviewDto) {
    const slot = await this.slotModel
      .findOne({ _id: slotId, interviewerId: facultyId })
      .exec();
    if (!slot) throw new NotFoundException('Slot not found');
    if (slot.status === InterviewSlotStatus.CANCELLED)
      throw new BadRequestException('Slot is already cancelled');

    if (slot.status === InterviewSlotStatus.BOOKED && slot.interviewId) {
      const interview = await this.interviewModel
        .findOne({
          _id: slot.interviewId,
          status: MockInterviewStatus.SCHEDULED,
        })
        .exec();
      if (!interview)
        throw new BadRequestException(
          'This interview has already started or finished',
        );
      interview.status = MockInterviewStatus.CANCELLED;
      interview.cancelledAt = new Date().toISOString();
      interview.cancelledBy = 'FACULTY';
      interview.cancellationReason = dto.reason;
      await interview.save();
      this.eventEmitter?.emit('interview.cancelled', {
        interview,
        cancelledBy: 'FACULTY',
      });
    }

    slot.status = InterviewSlotStatus.CANCELLED;
    await slot.save();
    return this.toSlot(slot.toObject(), new Map(), { includeMeetingUrl: true });
  }

  /* ------------------------------------------------------------------ */
  /* Student booking                                                     */
  /* ------------------------------------------------------------------ */

  /** Open future slots. Meeting links are only revealed after booking. */
  async getOpenSlots() {
    const docs = await this.slotModel
      .find({
        status: InterviewSlotStatus.OPEN,
        startsAt: { $gt: new Date() },
      })
      .sort({ startsAt: 1 })
      .limit(200)
      .lean()
      .exec();
    const users = await this.loadUsers(docs.map((d) => str(d.interviewerId)));
    return docs.map((d) => this.toSlot(d, users, { includeMeetingUrl: false }));
  }

  async bookSlot(slotId: string, studentId: string) {
    const candidate = await this.slotModel.findById(slotId).lean().exec();
    if (!candidate) throw new NotFoundException('Slot not found');

    const now = Date.now();
    const upcoming = await this.interviewModel
      .find({
        studentId,
        status: { $in: ACTIVE_INTERVIEW },
      })
      .lean()
      .exec();
    const future = upcoming.filter(
      (iv) =>
        new Date(iv.scheduledAt).getTime() +
          (iv.durationMinutes ?? 60) * MINUTE >
        now,
    );
    if (future.length >= MAX_UPCOMING_BOOKINGS)
      throw new BadRequestException(
        `You can have at most ${MAX_UPCOMING_BOOKINGS} upcoming interviews`,
      );

    const start = new Date(candidate.startsAt).getTime();
    const end = start + candidate.durationMinutes * MINUTE;
    const clash = future.some((iv) => {
      const ivStart = new Date(iv.scheduledAt).getTime();
      const ivEnd = ivStart + (iv.durationMinutes ?? 60) * MINUTE;
      return ivStart < end && ivEnd > start;
    });
    if (clash)
      throw new ConflictException(
        'You already have an interview at this time',
      );

    // Atomic claim: only succeeds if the slot is still open and in the future.
    const slot = await this.slotModel
      .findOneAndUpdate(
        {
          _id: slotId,
          status: InterviewSlotStatus.OPEN,
          startsAt: { $gt: new Date() },
        },
        { $set: { status: InterviewSlotStatus.BOOKED, bookedBy: studentId } },
        { new: true },
      )
      .exec();
    if (!slot)
      throw new ConflictException('This slot is no longer available');

    let interview: MockInterviewDocument;
    try {
      interview = await this.interviewModel.create({
        studentId,
        interviewerId: slot.interviewerId,
        type: slot.type,
        scheduledAt: slot.startsAt.toISOString(),
        durationMinutes: slot.durationMinutes,
        meetingUrl: slot.meetingUrl,
        slotId: slot._id,
        roomId: newRoomId(),
        status: MockInterviewStatus.SCHEDULED,
      });
    } catch (error) {
      // Release the claim so the slot isn't stuck as BOOKED with no interview.
      await this.slotModel
        .updateOne(
          { _id: slot._id },
          {
            $set: { status: InterviewSlotStatus.OPEN },
            $unset: { bookedBy: 1 },
          },
        )
        .exec();
      throw error;
    }

    slot.interviewId = interview._id as any;
    await slot.save();

    this.eventEmitter?.emit('interview.booked', { interview });
    const users = await this.loadUsers([str(slot.interviewerId)]);
    return this.toInterview(interview.toObject(), users, 'STUDENT');
  }

  async cancelByStudent(
    interviewId: string,
    studentId: string,
    dto: CancelInterviewDto,
  ) {
    const interview = await this.interviewModel
      .findOne({ _id: interviewId, studentId })
      .exec();
    if (!interview) throw new NotFoundException('Interview not found');
    if (interview.status !== MockInterviewStatus.SCHEDULED)
      throw new BadRequestException('Only scheduled interviews can be cancelled');
    if (
      new Date(interview.scheduledAt).getTime() - Date.now() <
      STUDENT_CANCEL_CUTOFF_MS
    )
      throw new BadRequestException(
        'Interviews can only be cancelled up to 2 hours before they start',
      );

    interview.status = MockInterviewStatus.CANCELLED;
    interview.cancelledAt = new Date().toISOString();
    interview.cancelledBy = 'STUDENT';
    interview.cancellationReason = dto.reason;
    await interview.save();

    // Reopen the slot so another student can take it.
    if (interview.slotId) {
      await this.slotModel
        .updateOne(
          {
            _id: interview.slotId,
            status: InterviewSlotStatus.BOOKED,
            startsAt: { $gt: new Date() },
          },
          {
            $set: { status: InterviewSlotStatus.OPEN },
            $unset: { bookedBy: 1, interviewId: 1 },
          },
        )
        .exec();
    }

    this.eventEmitter?.emit('interview.cancelled', {
      interview,
      cancelledBy: 'STUDENT',
    });
    const users = await this.loadUsers([str(interview.interviewerId)]);
    return this.toInterview(interview.toObject(), users, 'STUDENT');
  }

  /* ------------------------------------------------------------------ */
  /* Faculty: direct scheduling                                          */
  /* ------------------------------------------------------------------ */

  /** Throws if faculty or student already has an active interview overlapping the window. */
  private async assertNoClash(
    { facultyId, studentId }: { facultyId: string; studentId: string },
    start: number,
    durationMinutes: number,
    excludeId?: string,
  ) {
    const end = start + durationMinutes * MINUTE;
    const nearby = await this.interviewModel
      .find({
        $or: [{ interviewerId: facultyId }, { studentId }],
        status: { $in: ACTIVE_INTERVIEW },
        scheduledAt: {
          $gt: new Date(start - MAX_DURATION_MS).toISOString(),
          $lt: new Date(end).toISOString(),
        },
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
      })
      .select('studentId interviewerId scheduledAt durationMinutes')
      .lean()
      .exec();
    for (const iv of nearby) {
      const ivStart = new Date(iv.scheduledAt).getTime();
      const ivEnd = ivStart + (iv.durationMinutes ?? 60) * MINUTE;
      if (ivStart < end && ivEnd > start) {
        throw new ConflictException(
          str(iv.interviewerId) === facultyId
            ? 'You already have an interview at this time'
            : 'The student already has an interview at this time',
        );
      }
    }
  }

  private parseFutureTime(value: string) {
    const at = new Date(value);
    if (Number.isNaN(at.getTime())) throw new BadRequestException('Invalid start time');
    if (at.getTime() < Date.now() + SCHEDULE_MIN_LEAD_MS)
      throw new BadRequestException('Interviews must start at least 5 minutes from now');
    return at;
  }

  private toQuestionDocs(questions: InterviewQuestionInputDto[] = []) {
    return questions.map((q) => ({
      _id: new Types.ObjectId(),
      text: q.text.trim(),
      category: q.category,
      asked: false,
    }));
  }

  async scheduleInterview(facultyId: string, dto: ScheduleInterviewDto) {
    const student = await this.userModel
      .findById(dto.studentId)
      .select('fullName role roles isActive')
      .lean()
      .exec();
    const roles: string[] = (student as any)?.roles?.length
      ? (student as any).roles
      : [(student as any)?.role];
    if (!student || !roles.includes(UserRole.STUDENT))
      throw new NotFoundException('Student not found');
    if (this.assignments && !(await this.assignments.isAssigned(facultyId, dto.studentId)))
      throw new ForbiddenException('You can only schedule interviews with students assigned to you');

    const at = this.parseFutureTime(dto.scheduledAt);
    await this.assertNoClash(
      { facultyId, studentId: dto.studentId },
      at.getTime(),
      dto.durationMinutes,
    );

    const interview = await this.interviewModel.create({
      studentId: dto.studentId,
      interviewerId: facultyId,
      title: dto.title.trim(),
      type: dto.type,
      scheduledAt: at.toISOString(),
      durationMinutes: dto.durationMinutes,
      instructions: dto.instructions?.trim() || undefined,
      questions: this.toQuestionDocs(dto.questions),
      roomId: newRoomId(),
      status: MockInterviewStatus.SCHEDULED,
    });
    this.eventEmitter?.emit('interview.scheduled', { interview });
    return this.shapeOne(interview._id, 'FACULTY');
  }

  async rescheduleInterview(interviewId: string, facultyId: string, dto: RescheduleInterviewDto) {
    const interview = await this.findForFaculty(interviewId, facultyId);
    if (interview.status !== MockInterviewStatus.SCHEDULED)
      throw new BadRequestException('Only scheduled interviews can be rescheduled');
    const at = this.parseFutureTime(dto.scheduledAt);
    const duration = dto.durationMinutes ?? interview.durationMinutes ?? 60;
    await this.assertNoClash(
      { facultyId, studentId: String(interview.studentId) },
      at.getTime(),
      duration,
      interviewId,
    );
    const previous = interview.scheduledAt;
    interview.scheduledAt = at.toISOString();
    interview.durationMinutes = duration;
    interview.rescheduledAt = new Date().toISOString();
    await interview.save();

    // A slot booking no longer matches its slot time once moved.
    if (interview.slotId) {
      await this.slotModel
        .updateOne({ _id: interview.slotId }, { $set: { startsAt: at, durationMinutes: duration } })
        .exec();
    }
    this.eventEmitter?.emit('interview.rescheduled', {
      interview,
      previousScheduledAt: previous,
      reason: dto.reason,
    });
    return this.shapeOne(interview._id, 'FACULTY');
  }

  async cancelByFaculty(interviewId: string, facultyId: string, dto: CancelInterviewDto) {
    const interview = await this.findForFaculty(interviewId, facultyId);
    if (interview.status !== MockInterviewStatus.SCHEDULED)
      throw new BadRequestException('Only scheduled interviews can be cancelled');
    interview.status = MockInterviewStatus.CANCELLED;
    interview.cancelledAt = new Date().toISOString();
    interview.cancelledBy = 'FACULTY';
    interview.cancellationReason = dto.reason;
    await interview.save();
    if (interview.slotId) {
      await this.slotModel
        .updateOne({ _id: interview.slotId }, { $set: { status: InterviewSlotStatus.CANCELLED } })
        .exec();
    }
    this.eventEmitter?.emit('interview.cancelled', { interview, cancelledBy: 'FACULTY' });
    return this.shapeOne(interview._id, 'FACULTY');
  }

  /* ------------------------------------------------------------------ */
  /* Faculty lifecycle                                                   */
  /* ------------------------------------------------------------------ */

  private async findForFaculty(interviewId: string, facultyId: string) {
    const interview = await this.interviewModel
      .findOne({ _id: interviewId, interviewerId: facultyId })
      .exec();
    if (!interview)
      throw new NotFoundException('Interview not found or unauthorized');
    return interview;
  }

  private assertWindowOpen(interview: MockInterviewDocument) {
    const opensAt = new Date(interview.scheduledAt).getTime() - START_WINDOW_MS;
    if (!(Date.now() >= opensAt))
      throw new BadRequestException(
        'This interview opens 15 minutes before its scheduled time',
      );
  }

  async startInterview(interviewId: string, facultyId: string) {
    const interview = await this.findForFaculty(interviewId, facultyId);
    if (interview.status !== MockInterviewStatus.SCHEDULED)
      throw new BadRequestException(
        `Cannot start an interview that is ${interview.status}`,
      );
    this.assertWindowOpen(interview);
    interview.status = MockInterviewStatus.IN_PROGRESS;
    interview.startedAt = new Date().toISOString();
    interview.roomId ??= newRoomId();
    await interview.save();
    this.eventEmitter?.emit('interview.started', { interview });
    return interview;
  }

  /** Ends the live call. The interview stays IN_PROGRESS until it is evaluated. */
  async endInterview(interviewId: string, facultyId: string) {
    const interview = await this.findForFaculty(interviewId, facultyId);
    if (interview.status !== MockInterviewStatus.IN_PROGRESS)
      throw new BadRequestException(`Cannot end an interview that is ${interview.status}`);
    if (!interview.endedAt) {
      interview.endedAt = new Date().toISOString();
      await interview.save();
      this.eventEmitter?.emit('interview.ended', { interview });
    }
    return this.shapeOne(interview._id, 'FACULTY');
  }

  async markNoShow(interviewId: string, facultyId: string) {
    const interview = await this.findForFaculty(interviewId, facultyId);
    if (!ACTIVE_INTERVIEW.includes(interview.status as any))
      throw new BadRequestException(
        `Cannot mark an interview that is ${interview.status} as a no-show`,
      );
    if (Date.now() < new Date(interview.scheduledAt).getTime())
      throw new BadRequestException(
        'A no-show can only be recorded after the start time',
      );
    interview.status = MockInterviewStatus.NO_SHOW;
    interview.completedAt = new Date().toISOString();
    interview.endedAt ??= interview.completedAt;
    await interview.save();
    this.eventEmitter?.emit('interview.ended', { interview });
    return interview;
  }

  /**
   * Saves the structured evaluation and completes the interview. The overall
   * score is always computed here, never taken from the client. The 1–5 scores
   * are also stored on the interview's 0–10 rubric so readiness keeps working.
   */
  async evaluateInterview(interviewId: string, facultyId: string, dto: EvaluateInterviewDto) {
    if (!this.feedbackModel) throw new Error('Feedback model is not registered');
    const interview = await this.findForFaculty(interviewId, facultyId);

    if (!ACTIVE_INTERVIEW.includes(interview.status as any))
      throw new BadRequestException(
        `Cannot evaluate an interview that is ${interview.status}`,
      );
    this.assertWindowOpen(interview);

    const overallScore = overallScoreOf(dto);
    const topics = [...new Set((dto.recommendedTopics ?? []).map((t) => t.trim()).filter(Boolean))];
    let feedback: InterviewFeedbackDocument;
    try {
      feedback = await this.feedbackModel.create({
        interviewId: interview._id,
        facultyId,
        studentId: interview.studentId,
        technicalKnowledge: dto.technicalKnowledge,
        problemSolving: dto.problemSolving,
        communication: dto.communication,
        conceptualUnderstanding: dto.conceptualUnderstanding,
        confidence: dto.confidence,
        overallScore,
        strengths: dto.strengths.trim(),
        improvements: dto.improvements.trim(),
        facultyComments: dto.facultyComments?.trim() || undefined,
        recommendedTopics: topics,
        assessment: dto.assessment,
      });
    } catch (error: any) {
      if (error?.code === 11000) throw new ConflictException('This interview has already been evaluated');
      throw error;
    }

    const now = new Date().toISOString();
    interview.rubricScores = {
      technicalKnowledge: dto.technicalKnowledge * 2,
      problemSolving: dto.problemSolving * 2,
      communication: dto.communication * 2,
      conceptualUnderstanding: dto.conceptualUnderstanding * 2,
      confidence: dto.confidence * 2,
    } as any;
    interview.feedback = dto.facultyComments?.trim() || dto.strengths.trim();
    interview.status = MockInterviewStatus.COMPLETED;
    interview.startedAt ??= now;
    interview.endedAt ??= now;
    interview.completedAt = now;
    try {
      await interview.save();
    } catch (error) {
      // Keep the two records consistent: no feedback without a completed interview.
      await this.feedbackModel.deleteOne({ _id: feedback._id }).exec();
      throw error;
    }

    this.eventEmitter?.emit('interview.ended', { interview });
    this.eventEmitter?.emit('interview.evaluated', { interview });
    return this.shapeOne(interview._id, 'FACULTY');
  }

  /* ------------------------------------------------------------------ */
  /* Questions and private notes                                         */
  /* ------------------------------------------------------------------ */

  private assertEditable(interview: MockInterviewDocument) {
    if (
      interview.status === MockInterviewStatus.CANCELLED ||
      interview.status === MockInterviewStatus.NO_SHOW
    )
      throw new BadRequestException(`This interview is ${interview.status}`);
  }

  async addQuestions(interviewId: string, facultyId: string, questions: InterviewQuestionInputDto[]) {
    const interview = await this.findForFaculty(interviewId, facultyId);
    this.assertEditable(interview);
    const current = interview.questions ?? [];
    if (current.length + questions.length > MAX_QUESTIONS)
      throw new BadRequestException(`An interview can have at most ${MAX_QUESTIONS} questions`);
    interview.questions = [...current, ...this.toQuestionDocs(questions)] as any;
    await interview.save();
    return this.questionsChanged(interview);
  }

  async updateQuestion(
    interviewId: string,
    facultyId: string,
    questionId: string,
    dto: UpdateInterviewQuestionDto,
  ) {
    const interview = await this.findForFaculty(interviewId, facultyId);
    this.assertEditable(interview);
    const question = (interview.questions ?? []).find((q) => String(q._id) === questionId);
    if (!question) throw new NotFoundException('Question not found');
    if (dto.asked !== undefined) {
      question.asked = dto.asked;
      question.askedAt = dto.asked ? (question.askedAt ?? new Date().toISOString()) : undefined;
    }
    if (dto.feedback !== undefined) question.feedback = dto.feedback.trim() || undefined;
    interview.markModified('questions');
    await interview.save();
    return this.questionsChanged(interview);
  }

  async removeQuestion(interviewId: string, facultyId: string, questionId: string) {
    const interview = await this.findForFaculty(interviewId, facultyId);
    this.assertEditable(interview);
    const before = interview.questions?.length ?? 0;
    interview.questions = (interview.questions ?? []).filter((q) => String(q._id) !== questionId) as any;
    if (interview.questions!.length === before) throw new NotFoundException('Question not found');
    await interview.save();
    return this.questionsChanged(interview);
  }

  private questionsChanged(interview: MockInterviewDocument) {
    const all = (interview.questions ?? []).map((q: any) => this.toQuestion(q, 'FACULTY'));
    this.eventEmitter?.emit('interview.questions-updated', {
      interviewId: String(interview._id),
      // Students only ever see questions that have been asked, without feedback.
      askedForStudent: (interview.questions ?? [])
        .filter((q) => q.asked)
        .map((q: any) => this.toQuestion(q, 'STUDENT')),
    });
    return all;
  }

  async updateNotes(interviewId: string, facultyId: string, notes: string) {
    const interview = await this.findForFaculty(interviewId, facultyId);
    this.assertEditable(interview);
    interview.facultyNotes = notes;
    await interview.save();
    return { facultyNotes: interview.facultyNotes ?? '', savedAt: new Date().toISOString() };
  }

  /* ------------------------------------------------------------------ */
  /* Video room access                                                   */
  /* ------------------------------------------------------------------ */

  /**
   * Resolves a room id to its interview and the caller's seat. Throws unless the
   * caller is the assigned faculty member or the invited student, and the
   * interview is still joinable.
   */
  async authorizeRoomAccess(roomId: string, userId: string, role: string) {
    if (typeof roomId !== 'string' || !/^[a-f0-9]{32}$/.test(roomId))
      throw new NotFoundException('Interview room not found');
    const interview = await this.interviewModel.findOne({ roomId }).lean().exec();
    if (!interview) throw new NotFoundException('Interview room not found');

    const facultyId = str(interview.interviewerId);
    const studentId = str(interview.studentId);
    let seat: InterviewRoomRole;
    if (role === UserRole.FACULTY && userId === facultyId) seat = 'FACULTY';
    else if (role === UserRole.STUDENT && userId === studentId) seat = 'STUDENT';
    else throw new ForbiddenException('You are not a participant in this interview');

    if (!ACTIVE_INTERVIEW.includes(interview.status as any) || interview.endedAt)
      throw new BadRequestException(
        interview.status === MockInterviewStatus.CANCELLED
          ? 'This interview was cancelled'
          : 'This interview has ended',
      );
    const opensAt = new Date(interview.scheduledAt).getTime() - START_WINDOW_MS;
    if (Date.now() < opensAt)
      throw new BadRequestException('The interview room opens 15 minutes before the start time');

    const users = await this.loadUsers([facultyId, studentId]);
    return {
      interview,
      seat,
      facultyId: facultyId!,
      studentId: studentId!,
      names: {
        FACULTY: users.get(facultyId!)?.fullName ?? 'Interviewer',
        STUDENT: users.get(studentId!)?.fullName ?? 'Student',
      } as Record<InterviewRoomRole, string>,
    };
  }

  /** Room details for the pre-join screen (same checks as the socket, minus the time window). */
  async getRoomDetails(roomId: string, userId: string, role: string) {
    if (typeof roomId !== 'string' || !/^[a-f0-9]{32}$/.test(roomId))
      throw new NotFoundException('Interview room not found');
    const interview = await this.interviewModel.findOne({ roomId }).select('_id interviewerId studentId').lean().exec();
    if (!interview) throw new NotFoundException('Interview room not found');
    if (role === UserRole.FACULTY && str(interview.interviewerId) === userId)
      return this.shapeOne(interview._id, 'FACULTY');
    if (role === UserRole.STUDENT && str(interview.studentId) === userId)
      return this.shapeOne(interview._id, 'STUDENT');
    throw new ForbiddenException('You are not a participant in this interview');
  }
}
