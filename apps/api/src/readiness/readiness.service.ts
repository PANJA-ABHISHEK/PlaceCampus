import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReadinessScore, PreparationPlan } from './schemas/readiness.schema.js';
import { StudentsService } from '../students/students.service.js';

@Injectable()
export class ReadinessService {
  constructor(
    @InjectModel(ReadinessScore.name) private readinessScoreModel: Model<ReadinessScore>,
    @InjectModel(PreparationPlan.name) private preparationPlanModel: Model<PreparationPlan>,
    private studentsService: StudentsService,
  ) {}

  async getMyReadiness(userId: string): Promise<ReadinessScore> {
    let score = await this.readinessScoreModel.findOne({ studentId: userId }).exec();
    
    // If no score exists, generate a dummy one for the demo
    if (!score) {
      score = await this.generateReadinessScore(userId);
    }
    
    return score;
  }

  async getMyPreparationPlan(userId: string): Promise<PreparationPlan> {
    let plan = await this.preparationPlanModel.findOne({ studentId: userId }).exec();
    
    if (!plan) {
      plan = await this.generatePreparationPlan(userId, 'Software Engineer');
    }
    
    return plan;
  }

  async updateTaskStatus(userId: string, taskId: string, isCompleted: boolean) {
    const plan = await this.preparationPlanModel.findOne({ studentId: userId }).exec();
    if (!plan) throw new NotFoundException('Preparation plan not found');
    
    const taskIndex = plan.tasks.findIndex((t: any) => t._id.toString() === taskId);
    if (taskIndex === -1) throw new NotFoundException('Task not found');
    
    plan.tasks[taskIndex].isCompleted = isCompleted;
    return plan.save();
  }

  // Simulate AI generation
  async generateReadinessScore(userId: string): Promise<ReadinessScore> {
    const student = await this.studentsService.findByUserId(userId);
    
    // In a real app, we would send student profile/skills to OpenAI to generate this
    const score = new this.readinessScoreModel({
      studentId: userId,
      overallScore: 78,
      dimensions: [
        {
          name: 'Technical',
          score: 85,
          strengths: ['JavaScript', 'React', 'Problem Solving'],
          weaknesses: ['System Design', 'Cloud Deployment']
        },
        {
          name: 'Aptitude',
          score: 70,
          strengths: ['Logical Reasoning'],
          weaknesses: ['Quantitative Aptitude']
        },
        {
          name: 'Soft Skills',
          score: 80,
          strengths: ['Communication', 'Teamwork'],
          weaknesses: ['Leadership']
        }
      ],
      aiFeedback: 'You have a solid technical foundation, particularly in frontend technologies. Focus on improving your quantitative aptitude and understanding of system design concepts to excel in top-tier product company interviews.',
      lastCalculatedAt: new Date()
    });

    return score.save();
  }

  async generatePreparationPlan(userId: string, targetRole: string): Promise<PreparationPlan> {
    const plan = new this.preparationPlanModel({
      studentId: userId,
      targetRole,
      tasks: [
        {
          title: 'Complete System Design Basics',
          description: 'Read the "Grokking the System Design Interview" course.',
          type: 'COURSE',
          isCompleted: false,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // +7 days
        },
        {
          title: 'Practice Quantitative Aptitude',
          description: 'Solve 50 questions on Time and Work.',
          type: 'PRACTICE',
          isCompleted: false,
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // +3 days
        },
        {
          title: 'Mock Interview: Frontend',
          description: 'Schedule a mock interview focusing on React and JS fundamentals.',
          type: 'MOCK_INTERVIEW',
          isCompleted: false,
        }
      ]
    });

    return plan.save();
  }
}
