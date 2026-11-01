import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Assessment, AssessmentDocument } from './schemas/assessment.schema.js';
import {
  AssessmentAttempt,
  AssessmentAttemptDocument,
} from './schemas/assessment-attempt.schema.js';
import { AssessmentAttemptStatus } from '@placecampus/shared-types';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AssessmentsService {
  private readonly logger = new Logger(AssessmentsService.name);

  constructor(
    @InjectModel(Assessment.name)
    private assessmentModel: Model<AssessmentDocument>,
    @InjectModel(AssessmentAttempt.name)
    private attemptModel: Model<AssessmentAttemptDocument>,
    @Optional() private eventEmitter?: EventEmitter2,
  ) {}

  async getActiveAssessments() {
    return this.assessmentModel
      .find({ active: true })
      .select('-questions.correctAnswer -questions.explanation')
      .lean()
      .exec();
  }

  async getAssessmentById(id: string) {
    const assessment = await this.assessmentModel
      .findOne({ _id: id, active: true })
      .select('-questions.correctAnswer -questions.explanation')
      .lean()
      .exec();
    if (!assessment) throw new NotFoundException('Assessment not found');
    return assessment;
  }

  async getStudentAttemptHistory(studentId: string) {
    return this.attemptModel
      .find({ studentId })
      .sort({ createdAt: -1 })
      .populate('assessmentId', 'title type difficulty')
      .lean()
      .exec();
  }

  async getAttemptById(attemptId: string, studentId: string) {
    const attempt = await this.attemptModel
      .findOne({ _id: attemptId, studentId })
      .populate('assessmentId', 'title type difficulty')
      .lean()
      .exec();
    if (!attempt) throw new NotFoundException('Assessment attempt not found');
    return attempt;
  }

  async startAssessment(assessmentId: string, studentId: string) {
    const assessment = await this.assessmentModel
      .findOne({ _id: assessmentId, active: true })
      .exec();
    if (!assessment) throw new NotFoundException('Assessment not found');

    // Check for an existing IN_PROGRESS attempt
    let activeAttempt = await this.attemptModel
      .findOne({
        assessmentId,
        studentId,
        status: AssessmentAttemptStatus.IN_PROGRESS,
      })
      .exec();

    if (activeAttempt) {
      return activeAttempt; // Resume
    }

    // Create new attempt
    const newAttempt = new this.attemptModel({
      assessmentId,
      studentId,
      status: AssessmentAttemptStatus.IN_PROGRESS,
      startedAt: new Date().toISOString(),
      answers: {},
    });

    return newAttempt.save();
  }

  async submitAssessment(
    attemptId: string,
    studentId: string,
    payload: { answers: Record<string, string> },
  ) {
    const attempt = await this.attemptModel
      .findOne({ _id: attemptId, studentId })
      .exec();
    if (!attempt) throw new NotFoundException('Assessment attempt not found');

    if (attempt.status !== AssessmentAttemptStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Cannot submit attempt in status: ${attempt.status}`,
      );
    }

    const assessment = await this.assessmentModel
      .findById(attempt.assessmentId)
      .exec();
    if (!assessment) throw new NotFoundException('Assessment not found');

    // Calculate score server-side
    let correctCount = 0;
    const totalQuestions = assessment.questions.length;

    for (const question of assessment.questions) {
      const submittedAnswer = payload.answers[question.id as string];
      if (
        question.type === 'MCQ' &&
        submittedAnswer &&
        question.correctAnswer
      ) {
        if (submittedAnswer === question.correctAnswer) {
          correctCount++;
        }
      }
    }

    const percentage =
      totalQuestions > 0
        ? Math.round((correctCount / totalQuestions) * 100)
        : 0;
    const passed = percentage >= assessment.passingScore;

    const started = attempt.startedAt
      ? new Date(attempt.startedAt)
      : new Date();
    const durationSeconds = Math.floor((Date.now() - started.getTime()) / 1000);

    attempt.answers = payload.answers;
    attempt.score = correctCount;
    attempt.percentage = percentage;
    attempt.passed = passed;
    attempt.status = AssessmentAttemptStatus.EVALUATED; // Auto-evaluate MCQ
    attempt.submittedAt = new Date().toISOString();
    attempt.durationSeconds = durationSeconds;

    await attempt.save();
    this.eventEmitter?.emit('assessment.evaluated', { attempt });

    return attempt;
  }
}
