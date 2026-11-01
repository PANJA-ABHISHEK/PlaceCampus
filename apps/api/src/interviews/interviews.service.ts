import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  MockInterview,
  MockInterviewDocument,
} from './schemas/mock-interview.schema.js';
import {
  MockInterviewStatus,
  InterviewRubric,
} from '@placecampus/shared-types';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class InterviewsService {
  private readonly logger = new Logger(InterviewsService.name);

  constructor(
    @InjectModel(MockInterview.name)
    private interviewModel: Model<MockInterviewDocument>,
    @Optional() private eventEmitter?: EventEmitter2,
  ) {}

  async getStudentInterviews(studentId: string) {
    return this.interviewModel
      .find({ studentId })
      .sort({ scheduledAt: -1 })
      .populate('interviewerId', 'fullName email')
      .lean()
      .exec();
  }

  async getStudentInterviewById(interviewId: string, studentId: string) {
    const interview = await this.interviewModel
      .findOne({ _id: interviewId, studentId })
      .populate('interviewerId', 'fullName email')
      .lean()
      .exec();
    if (!interview) throw new NotFoundException('Interview not found');
    return interview;
  }

  async getFacultyInterviews(facultyId: string) {
    // A faculty can see interviews assigned to them
    return this.interviewModel
      .find({ interviewerId: facultyId })
      .sort({ scheduledAt: -1 })
      .populate('studentId', 'userId')
      .lean()
      .exec();
  }

  async getFacultyInterviewById(interviewId: string, facultyId: string) {
    const interview = await this.interviewModel
      .findOne({ _id: interviewId, interviewerId: facultyId })
      .populate('studentId', 'userId')
      .lean()
      .exec();
    if (!interview)
      throw new NotFoundException('Interview not found or unauthorized');
    return interview;
  }

  async evaluateInterview(
    interviewId: string,
    facultyId: string,
    payload: { rubricScores: InterviewRubric; feedback: string },
  ) {
    const interview = await this.interviewModel
      .findOne({ _id: interviewId, interviewerId: facultyId })
      .exec();
    if (!interview)
      throw new NotFoundException('Interview not found or unauthorized');

    // Basic validation on rubric scores (0-10)
    for (const key of Object.keys(
      payload.rubricScores,
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
    interview.completedAt = new Date().toISOString();

    await interview.save();
    this.eventEmitter?.emit('interview.evaluated', { interview });
    return interview;
  }
}
