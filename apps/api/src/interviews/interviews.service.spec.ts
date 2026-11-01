import { Test, TestingModule } from '@nestjs/testing';
import { InterviewsService } from './interviews.service.js';
import { getModelToken } from '@nestjs/mongoose';
import { MockInterview } from './schemas/mock-interview.schema.js';
import { Types } from 'mongoose';
import { MockInterviewStatus } from '@placecampus/shared-types';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('InterviewsService', () => {
  let service: InterviewsService;

  const mockInterviewModel = { find: vi.fn(), findOne: vi.fn() };
  const mockEventEmitter = { emit: vi.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewsService,
        {
          provide: getModelToken(MockInterview.name),
          useValue: mockInterviewModel,
        },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<InterviewsService>(InterviewsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should evaluate an interview with valid rubric scores', async () => {
    const facultyId = new Types.ObjectId().toString();
    const interviewId = new Types.ObjectId().toString();

    const interview = {
      _id: interviewId,
      interviewerId: facultyId,
      status: MockInterviewStatus.SCHEDULED,
      save: vi.fn().mockResolvedValue(true),
    };
    mockInterviewModel.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue(interview),
    });

    const payload = {
      rubricScores: {
        technicalKnowledge: 8,
        problemSolving: 7,
      },
      feedback: 'Good.',
    };

    const result = await service.evaluateInterview(
      interviewId,
      facultyId,
      payload,
    );

    expect(result.rubricScores?.technicalKnowledge).toBe(8);
    expect(result.status).toBe(MockInterviewStatus.COMPLETED);
    expect(interview.save).toHaveBeenCalled();
    expect(mockEventEmitter.emit).toHaveBeenCalledWith('interview.evaluated', { interview });
  });

  it('should reject invalid rubric scores', async () => {
    const facultyId = new Types.ObjectId().toString();
    const interviewId = new Types.ObjectId().toString();

    const interview = {
      _id: interviewId,
      interviewerId: facultyId,
      status: MockInterviewStatus.SCHEDULED,
    };
    mockInterviewModel.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue(interview),
    });

    const payload = {
      rubricScores: {
        technicalKnowledge: 11, // invalid
      },
      feedback: 'Good.',
    };

    await expect(
      service.evaluateInterview(interviewId, facultyId, payload),
    ).rejects.toThrow(BadRequestException);
  });
});
