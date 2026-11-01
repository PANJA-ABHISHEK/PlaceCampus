import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentsService } from './assessments.service.js';
import { getModelToken } from '@nestjs/mongoose';
import { Assessment } from './schemas/assessment.schema.js';
import { AssessmentAttempt } from './schemas/assessment-attempt.schema.js';
import { Types } from 'mongoose';
import { AssessmentAttemptStatus } from '@placecampus/shared-types';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('AssessmentsService', () => {
  let service: AssessmentsService;

  const mockAssessmentModel = {
    find: vi.fn(),
    findOne: vi.fn(),
    findById: vi.fn(),
  };
  const mockAttemptModel = { find: vi.fn(), findOne: vi.fn() };
  const mockEventEmitter = { emit: vi.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentsService,
        {
          provide: getModelToken(Assessment.name),
          useValue: mockAssessmentModel,
        },
        {
          provide: getModelToken(AssessmentAttempt.name),
          useValue: mockAttemptModel,
        },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<AssessmentsService>(AssessmentsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should list active assessments', async () => {
    mockAssessmentModel.find.mockReturnValue({
      select: vi
        .fn()
        .mockReturnValue({
          lean: vi
            .fn()
            .mockReturnValue({ exec: vi.fn().mockResolvedValue([]) }),
        }),
    });
    await service.getActiveAssessments();
    expect(mockAssessmentModel.find).toHaveBeenCalledWith({ active: true });
  });

  it('should start an assessment idempotently', async () => {
    const studentId = new Types.ObjectId().toString();
    const assessmentId = new Types.ObjectId().toString();

    mockAssessmentModel.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue({ _id: assessmentId }),
    });

    // Existing attempt
    const existingAttempt = {
      _id: 'attempt1',
      status: AssessmentAttemptStatus.IN_PROGRESS,
    };
    mockAttemptModel.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue(existingAttempt),
    });

    const result = await service.startAssessment(assessmentId, studentId);
    expect(result).toBe(existingAttempt);
  });

  it('should submit an assessment and calculate score server-side', async () => {
    const studentId = new Types.ObjectId().toString();
    const assessmentId = new Types.ObjectId().toString();
    const attemptId = new Types.ObjectId().toString();

    const attempt = {
      _id: attemptId,
      studentId,
      assessmentId,
      status: AssessmentAttemptStatus.IN_PROGRESS,
      startedAt: new Date(Date.now() - 60000).toISOString(),
      save: vi.fn().mockResolvedValue(true),
    };
    mockAttemptModel.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue(attempt),
    });

    const assessment = {
      _id: assessmentId,
      passingScore: 60,
      questions: [
        { id: 'q1', type: 'MCQ', correctAnswer: 'A' },
        { id: 'q2', type: 'MCQ', correctAnswer: 'C' },
      ],
    };
    mockAssessmentModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue(assessment),
    });

    const payload = {
      answers: {
        q1: 'A', // correct
        q2: 'B', // incorrect
      },
    };

    const result = await service.submitAssessment(
      attemptId,
      studentId,
      payload,
    );

    expect(result.score).toBe(1);
    expect(result.percentage).toBe(50);
    expect(result.passed).toBe(false);
    expect(result.status).toBe(AssessmentAttemptStatus.EVALUATED);
    expect(attempt.save).toHaveBeenCalled();
    expect(mockEventEmitter.emit).toHaveBeenCalledWith('assessment.evaluated', { attempt });
  });
});
