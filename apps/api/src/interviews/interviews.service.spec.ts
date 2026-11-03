import { Types } from 'mongoose';
import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  InterviewSlotStatus,
  MockInterviewStatus,
} from '@placecampus/shared-types';
import {
  InterviewsService,
  MAX_UPCOMING_BOOKINGS,
} from './interviews.service.js';

const MINUTE = 60_000;
const id = () => new Types.ObjectId().toString();
const inMinutes = (minutes: number) => new Date(Date.now() + minutes * MINUTE);

/** Chainable query mock: .sort/.select/.limit/.lean all return the chain. */
function query<T>(result: T) {
  const chain: any = {
    exec: vi.fn().mockResolvedValue(result),
  };
  for (const method of ['sort', 'select', 'limit', 'lean', 'populate'])
    chain[method] = vi.fn().mockReturnValue(chain);
  return chain;
}

function interviewDoc(overrides: Record<string, any> = {}) {
  const doc: any = {
    _id: new Types.ObjectId(),
    studentId: id(),
    interviewerId: id(),
    type: 'Technical',
    status: MockInterviewStatus.SCHEDULED,
    scheduledAt: inMinutes(-5).toISOString(),
    durationMinutes: 30,
    ...overrides,
  };
  doc.save = vi.fn().mockResolvedValue(doc);
  doc.toObject = () => ({ ...doc });
  return doc;
}

describe('InterviewsService', () => {
  let interviewModel: any;
  let slotModel: any;
  let userModel: any;
  let emitter: { emit: ReturnType<typeof vi.fn> };
  let service: InterviewsService;

  beforeEach(() => {
    interviewModel = {
      find: vi.fn().mockReturnValue(query([])),
      findOne: vi.fn(),
      create: vi.fn(),
    };
    slotModel = {
      find: vi.fn().mockReturnValue(query([])),
      findOne: vi.fn(),
      findById: vi.fn(),
      findOneAndUpdate: vi.fn(),
      updateOne: vi.fn().mockReturnValue(query({ modifiedCount: 1 })),
      create: vi.fn(),
    };
    userModel = { find: vi.fn().mockReturnValue(query([])) };
    emitter = { emit: vi.fn() };
    service = new InterviewsService(
      interviewModel,
      slotModel,
      userModel,
      emitter as any,
    );
  });

  describe('evaluateInterview', () => {
    const payload = {
      rubricScores: { technicalKnowledge: 8, problemSolving: 7 },
      feedback: 'Good.',
    };

    it('completes an interview with valid rubric scores', async () => {
      const interview = interviewDoc();
      interviewModel.findOne.mockReturnValue(query(interview));

      const result = await service.evaluateInterview(
        String(interview._id),
        interview.interviewerId,
        payload,
      );

      expect(result.status).toBe(MockInterviewStatus.COMPLETED);
      expect(result.rubricScores).toEqual(payload.rubricScores);
      expect(emitter.emit).toHaveBeenCalledWith('interview.evaluated', {
        interview,
      });
    });

    it('rejects scores outside 0-10', async () => {
      interviewModel.findOne.mockReturnValue(query(interviewDoc()));
      await expect(
        service.evaluateInterview(id(), id(), {
          rubricScores: { technicalKnowledge: 11 },
          feedback: 'x',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a cancelled interview', async () => {
      interviewModel.findOne.mockReturnValue(
        query(interviewDoc({ status: MockInterviewStatus.CANCELLED })),
      );
      await expect(
        service.evaluateInterview(id(), id(), payload),
      ).rejects.toThrow(/CANCELLED/);
    });

    it('rejects evaluation long before the scheduled time', async () => {
      interviewModel.findOne.mockReturnValue(
        query(interviewDoc({ scheduledAt: inMinutes(60).toISOString() })),
      );
      await expect(
        service.evaluateInterview(id(), id(), payload),
      ).rejects.toThrow(/opens 15 minutes/);
    });
  });

  describe('bookSlot', () => {
    const studentId = id();

    function openSlot(overrides: Record<string, any> = {}) {
      const slot: any = {
        _id: new Types.ObjectId(),
        interviewerId: id(),
        type: 'Technical',
        startsAt: inMinutes(24 * 60),
        durationMinutes: 30,
        meetingUrl: 'https://meet.example.com/abc',
        status: InterviewSlotStatus.OPEN,
        ...overrides,
      };
      slot.save = vi.fn().mockResolvedValue(slot);
      return slot;
    }

    it('claims the slot atomically and creates a scheduled interview', async () => {
      const slot = openSlot();
      slotModel.findById.mockReturnValue(query(slot));
      slotModel.findOneAndUpdate.mockReturnValue(
        query({ ...slot, status: InterviewSlotStatus.BOOKED }),
      );
      const created = interviewDoc({
        studentId,
        interviewerId: slot.interviewerId,
        scheduledAt: slot.startsAt.toISOString(),
      });
      interviewModel.create.mockResolvedValue(created);
      userModel.find.mockReturnValue(
        query([{ _id: slot.interviewerId, fullName: 'Dr Rao', email: 'r@x' }]),
      );

      const result = await service.bookSlot(String(slot._id), studentId);

      // Only an OPEN, future slot can be claimed.
      expect(slotModel.findOneAndUpdate.mock.calls[0][0]).toMatchObject({
        status: InterviewSlotStatus.OPEN,
      });
      expect(interviewModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId,
          meetingUrl: slot.meetingUrl,
          status: MockInterviewStatus.SCHEDULED,
        }),
      );
      expect(result.id).toBe(String(created._id));
      expect(result.interviewer).toEqual({
        id: slot.interviewerId,
        fullName: 'Dr Rao',
        email: 'r@x',
      });
      expect(emitter.emit).toHaveBeenCalledWith('interview.booked', {
        interview: created,
      });
    });

    it('rejects a slot someone else just booked', async () => {
      slotModel.findById.mockReturnValue(query(openSlot()));
      slotModel.findOneAndUpdate.mockReturnValue(query(null));

      await expect(service.bookSlot(id(), studentId)).rejects.toThrow(
        ConflictException,
      );
      expect(interviewModel.create).not.toHaveBeenCalled();
    });

    it('rejects a slot that clashes with an existing booking', async () => {
      const slot = openSlot();
      slotModel.findById.mockReturnValue(query(slot));
      interviewModel.find.mockReturnValue(
        query([
          interviewDoc({
            scheduledAt: new Date(slot.startsAt.getTime() + 10 * MINUTE).toISOString(),
          }),
        ]),
      );

      await expect(
        service.bookSlot(String(slot._id), studentId),
      ).rejects.toThrow(/already have an interview/);
      expect(slotModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it(`limits a student to ${MAX_UPCOMING_BOOKINGS} upcoming interviews`, async () => {
      slotModel.findById.mockReturnValue(query(openSlot()));
      interviewModel.find.mockReturnValue(
        query(
          Array.from({ length: MAX_UPCOMING_BOOKINGS }, (_, i) =>
            interviewDoc({ scheduledAt: inMinutes(60 * (i + 2) * 24 * 3).toISOString() }),
          ),
        ),
      );

      await expect(service.bookSlot(id(), studentId)).rejects.toThrow(
        /at most/,
      );
    });

    it('releases the slot if creating the interview fails', async () => {
      const slot = openSlot();
      slotModel.findById.mockReturnValue(query(slot));
      slotModel.findOneAndUpdate.mockReturnValue(query(slot));
      interviewModel.create.mockRejectedValue(new Error('db down'));

      await expect(
        service.bookSlot(String(slot._id), studentId),
      ).rejects.toThrow('db down');
      expect(slotModel.updateOne).toHaveBeenCalledWith(
        { _id: slot._id },
        expect.objectContaining({
          $set: { status: InterviewSlotStatus.OPEN },
        }),
      );
    });
  });

  describe('cancelByStudent', () => {
    it('refuses within 2 hours of the start', async () => {
      interviewModel.findOne.mockReturnValue(
        query(interviewDoc({ scheduledAt: inMinutes(90).toISOString() })),
      );
      await expect(service.cancelByStudent(id(), id(), {})).rejects.toThrow(
        /2 hours/,
      );
    });

    it('cancels, reopens the slot and notifies', async () => {
      const slotId = new Types.ObjectId();
      const interview = interviewDoc({
        scheduledAt: inMinutes(24 * 60).toISOString(),
        slotId,
      });
      interviewModel.findOne.mockReturnValue(query(interview));

      const result = await service.cancelByStudent(
        String(interview._id),
        interview.studentId,
        { reason: 'Exam clash' },
      );

      expect(result.status).toBe(MockInterviewStatus.CANCELLED);
      expect(result.cancelledBy).toBe('STUDENT');
      expect(slotModel.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: slotId }),
        expect.objectContaining({ $set: { status: InterviewSlotStatus.OPEN } }),
      );
      expect(emitter.emit).toHaveBeenCalledWith('interview.cancelled', {
        interview,
        cancelledBy: 'STUDENT',
      });
    });
  });

  describe('faculty slots', () => {
    const dto = {
      type: 'Technical' as const,
      startsAt: inMinutes(24 * 60).toISOString(),
      durationMinutes: 30,
      meetingUrl: 'https://meet.example.com/abc',
    };

    it('rejects a slot in the past', async () => {
      await expect(
        service.createSlot(id(), { ...dto, startsAt: inMinutes(-10).toISOString() }),
      ).rejects.toThrow(/5 minutes/);
    });

    it('rejects a slot overlapping another of the same faculty', async () => {
      slotModel.find.mockReturnValue(
        query([
          {
            startsAt: new Date(new Date(dto.startsAt).getTime() - 15 * MINUTE),
            durationMinutes: 30,
          },
        ]),
      );
      await expect(service.createSlot(id(), dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('cancelling a booked slot cancels the interview and notifies', async () => {
      const interview = interviewDoc({
        scheduledAt: inMinutes(24 * 60).toISOString(),
      });
      const slot: any = {
        _id: new Types.ObjectId(),
        status: InterviewSlotStatus.BOOKED,
        interviewId: interview._id,
        startsAt: inMinutes(24 * 60),
      };
      slot.save = vi.fn().mockResolvedValue(slot);
      slot.toObject = () => ({ ...slot });
      slotModel.findOne.mockReturnValue(query(slot));
      interviewModel.findOne.mockReturnValue(query(interview));

      const result = await service.cancelSlot(String(slot._id), id(), {
        reason: 'Unwell',
      });

      expect(result.status).toBe(InterviewSlotStatus.CANCELLED);
      expect(interview.status).toBe(MockInterviewStatus.CANCELLED);
      expect(interview.cancelledBy).toBe('FACULTY');
      expect(emitter.emit).toHaveBeenCalledWith('interview.cancelled', {
        interview,
        cancelledBy: 'FACULTY',
      });
    });
  });

  it('startInterview only opens 15 minutes before the start time', async () => {
    interviewModel.findOne.mockReturnValue(
      query(interviewDoc({ scheduledAt: inMinutes(30).toISOString() })),
    );
    await expect(service.startInterview(id(), id())).rejects.toThrow(
      /opens 15 minutes/,
    );

    const ready = interviewDoc({ scheduledAt: inMinutes(10).toISOString() });
    interviewModel.findOne.mockReturnValue(query(ready));
    const started = await service.startInterview(id(), id());
    expect(started.status).toBe(MockInterviewStatus.IN_PROGRESS);
  });

  it('returns student interviews with string ids and the interviewer', async () => {
    const interviewerId = id();
    const doc = { ...interviewDoc({ interviewerId: new Types.ObjectId(interviewerId) }) };
    delete doc.save;
    delete doc.toObject;
    interviewModel.find.mockReturnValue(query([doc]));
    userModel.find.mockReturnValue(
      query([{ _id: interviewerId, fullName: 'Dr Rao', email: 'r@x' }]),
    );

    const [interview] = await service.getStudentInterviews(doc.studentId);

    expect(interview.id).toBe(String(doc._id));
    expect(interview.interviewerId).toBe(interviewerId);
    expect(interview.interviewer?.fullName).toBe('Dr Rao');
  });
});
