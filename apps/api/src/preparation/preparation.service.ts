import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  GapPriority,
  PreparationItemStatus,
  PreparationPlanStatus,
  SkillMatchItem,
} from '@placecampus/shared-types';
import { AssessmentsService } from '../assessments/assessments.service.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MatchingService } from '../matching/matching.service.js';
import {
  PreparationPlan,
  PreparationPlanDocument,
} from './schemas/preparation-plan.schema.js';

const PRIORITY_ORDER: Record<GapPriority, number> = {
  [GapPriority.HIGH]: 0,
  [GapPriority.MEDIUM]: 1,
  [GapPriority.LOW]: 2,
};

@Injectable()
export class PreparationService {
  constructor(
    @InjectModel(PreparationPlan.name)
    private readonly planModel: Model<PreparationPlanDocument>,
    private readonly matchingService: MatchingService,
    private readonly assessmentsService: AssessmentsService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {}

  async createForDrive(driveId: string, studentId: string) {
    const existing = await this.planModel
      .findOne({ driveId, studentId, status: PreparationPlanStatus.ACTIVE })
      .exec();
    if (existing) return existing;

    const plan = await this.createPlan(driveId, studentId);
    this.eventEmitter?.emit('preparation.created', { plan });
    return plan;
  }

  async getMine(studentId: string) {
    return this.planModel.find({ studentId }).sort({ updatedAt: -1 }).exec();
  }

  async getOwnedPlan(id: string, studentId: string) {
    const plan = await this.planModel.findOne({ _id: id, studentId }).exec();
    if (!plan) throw new NotFoundException('Preparation plan not found');
    return plan;
  }

  async updateItemStatus(
    id: string,
    itemId: string,
    studentId: string,
    status: PreparationItemStatus,
  ) {
    const plan = await this.getOwnedPlan(id, studentId);
    if (plan.status === PreparationPlanStatus.ARCHIVED) {
      throw new BadRequestException('Archived preparation plans cannot be changed');
    }
    const item = plan.items.find((candidate) => candidate.itemId === itemId);
    if (!item) throw new NotFoundException('Preparation item not found');

    item.status = status;
    item.completedAt = status === PreparationItemStatus.COMPLETED ? new Date() : undefined;
    plan.completionPercentage = this.calculateCompletion(plan.items);
    const wasCompleted = plan.status === PreparationPlanStatus.COMPLETED;
    if (plan.items.length > 0 && plan.completionPercentage === 100) {
      plan.status = PreparationPlanStatus.COMPLETED;
    } else if (plan.status === PreparationPlanStatus.COMPLETED) {
      plan.status = PreparationPlanStatus.ACTIVE;
    }
    const saved = await plan.save();
    if (!wasCompleted && saved.status === PreparationPlanStatus.COMPLETED) this.eventEmitter?.emit('preparation.completed', { plan: saved });
    return saved;
  }

  async regenerate(id: string, studentId: string) {
    const previous = await this.getOwnedPlan(id, studentId);
    previous.status = PreparationPlanStatus.ARCHIVED;
    await previous.save();
    return this.createPlan(previous.driveId, studentId, previous.id);
  }

  private async createPlan(
    driveId: string,
    studentId: string,
    previousPlanId?: string,
  ) {
    const match = await this.matchingService.calculateForStudent(driveId, studentId);
    const assessments = await this.assessmentsService.getActiveAssessments();
    const assessmentBySkill = new Map(
      (assessments as any[])
        .filter((assessment) => assessment.targetSkillId)
        .map((assessment) => [assessment.targetSkillId.toString(), assessment]),
    );
    const items = this.buildItems(match.skills, assessmentBySkill);

    try {
      return await this.planModel.create({
        studentId,
        driveId,
        source: 'DRIVE_MATCH',
        status: PreparationPlanStatus.ACTIVE,
        items,
        completionPercentage: 0,
        previousPlanId,
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        const existing = await this.planModel
          .findOne({ driveId, studentId, status: PreparationPlanStatus.ACTIVE })
          .exec();
        if (existing) return existing;
        throw new ConflictException('An active preparation plan already exists');
      }
      throw error;
    }
  }

  private buildItems(skills: SkillMatchItem[], assessmentBySkill: Map<string, any>) {
    return skills
      .filter((skill) => skill.status !== 'SATISFIED')
      .map((skill) => {
        const priority = skill.priority ?? GapPriority.LOW;
        const currentLevel = skill.studentLevel ?? 0;
        const assessment = assessmentBySkill.get(skill.skillId.toString());
        return {
          itemId: `${skill.skillId}-${skill.requiredLevel}`,
          skillId: skill.skillId,
          skillName: skill.skillName,
          currentLevel,
          requiredLevel: skill.requiredLevel,
          gapAmount: skill.gapLevel || skill.requiredLevel,
          priority,
          isOptional: skill.isOptional,
          explanation: skill.explanation,
          status: PreparationItemStatus.TODO,
          recommendedActions: this.recommendations(skill, currentLevel),
          assessmentCheckpoint: assessment
            ? {
                assessmentId: (assessment.id ?? assessment._id).toString(),
                title: assessment.title,
              }
            : undefined,
        };
      })
      .sort((a, b) => {
        const priorityDifference = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (priorityDifference !== 0) return priorityDifference;
        if (a.isOptional !== b.isOptional) return a.isOptional ? 1 : -1;
        if (b.gapAmount !== a.gapAmount) return b.gapAmount - a.gapAmount;
        return a.skillName.localeCompare(b.skillName) || a.skillId.localeCompare(b.skillId);
      });
  }

  private recommendations(skill: SkillMatchItem, currentLevel: number) {
    const actions = [
      `Learn the ${skill.skillName} fundamentals for the gap from Level ${currentLevel} to Level ${skill.requiredLevel}.`,
      `Complete guided practice exercises focused on ${skill.skillName}.`,
      `Build a small project that demonstrates ${skill.skillName} at the required level.`,
    ];
    if (skill.priority === GapPriority.HIGH) {
      actions.unshift(`Prioritize ${skill.skillName} before lower-priority preparation work.`);
    }
    return actions;
  }

  private calculateCompletion(items: Array<{ status: PreparationItemStatus }>) {
    if (items.length === 0) return 0;
    const completed = items.filter((item) => item.status === PreparationItemStatus.COMPLETED).length;
    return Math.round((completed / items.length) * 1000) / 10;
  }
}
