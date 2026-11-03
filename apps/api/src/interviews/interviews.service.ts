import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
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
import { User, UserDocument } from '../users/schemas/user.schema.js';
import {
  MockInterviewStatus,
  InterviewSlotStatus,
  InterviewRubric,
  InterviewParticipant,
} from '@placecampus/shared-types';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type {
  CreateInterviewSlotDto,
  CancelInterviewDto,
} from './dto/interview-slot.dto.js';

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

const ACTIVE_INTERVIEW = [
  MockInterviewStatus.SCHEDULED,
  MockInterviewStatus.IN_PROGRESS,
];

const str = (value: unknown) =>
  value == null ? undefined : String((value as any)?._id ?? value);

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
  ) {}

  /* ------------------------------------------------------------------ */
  /* Response shaping                                                    */
  /* ------------------------------------------------------------------ */

  private async loadUsers(ids: (string | undefined)[]) {
    const unique = [...new Set(ids.filter((id): id is string => !!id))].filter(
      (id) => Types.ObjectId.isValid(id),
    );
    if (!unique.length) return new Map<string, InterviewParticipant>();
    const users = await this.userModel
      .find({ _id: { $in: unique } })
      .select('fullName email')
      .lean()
      .exec();
    return new Map<string, InterviewParticipant>(
      users.map((u: any) => [
        String(u._id),
        { id: String(u._id), fullName: u.fullName, email: u.email },
      ]),
    );
  }

  /** Lean docs skip toJSON, so map `_id` to `id` and attach participants. */
  private toInterview(doc: any, users: Map<string, InterviewParticipant>) {
    const { _id, __v, ...rest } = doc;
    const studentId = str(doc.studentId);
    const interviewerId = str(doc.interviewerId);
    return {
      ...rest,
      id: String(_id),
      studentId,
      interviewerId,
      slotId: str(doc.slotId),
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

  /* ------------------------------------------------------------------ */
  /* Interviews (existing read endpoints)                                */
  /* ------------------------------------------------------------------ */

  async getStudentInterviews(studentId: string) {
    const docs = await this.interviewModel
      .find({ studentId })
      .sort({ scheduledAt: -1 })
      .lean()
      .exec();
    const users = await this.loadUsers(docs.map((d) => str(d.interviewerId)));
    return docs.map((d) => this.toInterview(d, users));
  }

  async getStudentInterviewById(interviewId: string, studentId: string) {
    const doc = await this.interviewModel
      .findOne({ _id: interviewId, studentId })
      .lean()
      .exec();
    if (!doc) throw new NotFoundException('Interview not found');
    const users = await this.loadUsers([str(doc.interviewerId)]);
    return this.toInterview(doc, users);
  }

  async getFacultyInterviews(facultyId: string) {
    const docs = await this.interviewModel
      .find({ interviewerId: facultyId })
      .sort({ scheduledAt: -1 })
      .lean()
      .exec();
    const users = await this.loadUsers(docs.map((d) => str(d.studentId)));
    return docs.map((d) => this.toInterview(d, users));
  }

  async getFacultyInterviewById(interviewId: string, facultyId: string) {
    const doc = await this.interviewModel
      .findOne({ _id: interviewId, interviewerId: facultyId })
      .lean()
      .exec();
    if (!doc)
      throw new NotFoundException('Interview not found or unauthorized');
    const users = await this.loadUsers([str(doc.studentId)]);
    return this.toInterview(doc, users);
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
    return this.toInterview(interview.toObject(), users);
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
    return this.toInterview(interview.toObject(), users);
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
    await interview.save();
    return interview;
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
    await interview.save();
    return interview;
  }

  async evaluateInterview(
    interviewId: string,
    facultyId: string,
    payload: { rubricScores: InterviewRubric; feedback: string },
  ) {
    const interview = await this.findForFaculty(interviewId, facultyId);

    if (!ACTIVE_INTERVIEW.includes(interview.status as any))
      throw new BadRequestException(
        `Cannot evaluate an interview that is ${interview.status}`,
      );
    this.assertWindowOpen(interview);

    // Basic validation on rubric scores (0-10)
    for (const key of Object.keys(
      payload.rubricScores ?? {},
    ) as (keyof InterviewRubric)[]) {
      const score = payload.rubricScores[key];
      if (
        score !== undefined &&
        (score < 0 || score > 10 || !Number.isInteger(score))
      ) {
        throw new BadRequestException(
          `Score for ${key} must be an integer between 0 and 10`,
        );
      }
    }

    interview.rubricScores = payload.rubricScores as any;
    interview.feedback = payload.feedback;
    interview.status = MockInterviewStatus.COMPLETED;
    interview.startedAt ??= new Date().toISOString();
    interview.completedAt = new Date().toISOString();

    await interview.save();
    this.eventEmitter?.emit('interview.evaluated', { interview });
    return interview;
  }
}
