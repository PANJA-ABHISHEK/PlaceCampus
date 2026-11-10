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
import { DrivesService } from '../drives/drives.service.js';
import {
  PreparationPlan,
  PreparationPlanDocument,
} from './schemas/preparation-plan.schema.js';

const PRIORITY_ORDER: Record<GapPriority, number> = {
  [GapPriority.HIGH]: 0,
  [GapPriority.MEDIUM]: 1,
  [GapPriority.LOW]: 2,
};

const DAY = 24 * 60 * 60 * 1000;
/** Working time per item when the drive leaves room: bigger gaps get longer. */
const DAYS_FOR: Record<GapPriority, number> = {
  [GapPriority.HIGH]: 7,
  [GapPriority.MEDIUM]: 5,
  [GapPriority.LOW]: 3,
};

/**
 * Gives every item a dated checkpoint, in plan order. Items get 7/5/3 days by
 * priority; when that would run past the drive's application deadline, the
 * schedule is compressed to finish the day before it (at least one day each).
 */
export function scheduleCheckpoints<T extends { priority: GapPriority }>(
  items: T[],
  start: Date,
  deadline?: Date | null,
): { items: (T & { dueDate: Date })[]; targetDate?: Date } {
  if (!items.length) return { items: [] };
  const natural = items.map((i) => DAYS_FOR[i.priority] ?? 5);
  const total = natural.reduce((a, b) => a + b, 0);
  const available = deadline ? Math.floor((deadline.getTime() - start.getTime()) / DAY) - 1 : Infinity;
  const scale = available >= total ? 1 : Math.max(available, items.length) / total;
  // Checkpoints fall at the end of a day, counted from the end of the start day.
  const base = new Date(start);
  base.setHours(23, 59, 0, 0);
  let elapsed = 0;
  const scheduled = items.map((item, i) => {
    elapsed += natural[i] * scale;
    const days = Math.max(i + 1, Math.round(elapsed));
    return { ...item, dueDate: new Date(base.getTime() + days * DAY) };
  });
  return { items: scheduled, targetDate: scheduled[scheduled.length - 1].dueDate };
}

@Injectable()
export class PreparationService {
  constructor(
    @InjectModel(PreparationPlan.name)
    private readonly planModel: Model<PreparationPlanDocument>,
    private readonly matchingService: MatchingService,
    private readonly assessmentsService: AssessmentsService,
    private readonly drivesService: DrivesService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {}

  /** Future application deadline of the drive, if it has one. */
  private async deadlineFor(driveId: string, after: Date): Promise<Date | null> {
    const drive: any = await this.drivesService.findOne(driveId).catch(() => null);
    const deadline = drive?.applicationDeadline ? new Date(drive.applicationDeadline) : null;
    return deadline && deadline > after ? deadline : null;
  }

  /** Plans made before checkpoints existed get dates from their creation day. */
  private async withCheckpoints(plan: PreparationPlanDocument) {
    if (!plan.items.length || plan.items.every((item) => item.dueDate)) return plan;
    const start = (plan as any).createdAt ? new Date((plan as any).createdAt) : new Date();
    const { items, targetDate } = scheduleCheckpoints(
      plan.items.map((item) => ({ priority: item.priority, itemId: item.itemId })),
      start,
      await this.deadlineFor(plan.driveId, start),
    );
    const due = new Map(items.map((i) => [i.itemId, i.dueDate]));
    for (const item of plan.items) item.dueDate = due.get(item.itemId);
    plan.targetDate = targetDate;
    await plan.save();
    return plan;
  }

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
    const plans = await this.planModel.find({ studentId }).sort({ updatedAt: -1 }).exec();
    return Promise.all(
      plans.map((plan) =>
        plan.status === PreparationPlanStatus.ARCHIVED ? plan : this.withCheckpoints(plan),
      ),
    );
  }

  async getOwnedPlan(id: string, studentId: string) {
    const plan = await this.planModel.findOne({ _id: id, studentId }).exec();
    if (!plan) throw new NotFoundException('Preparation plan not found');
    return plan.status === PreparationPlanStatus.ARCHIVED ? plan : this.withCheckpoints(plan);
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
    const now = new Date();
    const { items, targetDate } = scheduleCheckpoints(
      this.buildItems(match.skills, assessmentBySkill),
      now,
      await this.deadlineFor(driveId, now),
    );

    try {
      return await this.planModel.create({
        studentId,
        driveId,
        source: 'DRIVE_MATCH',
        status: PreparationPlanStatus.ACTIVE,
        items,
        completionPercentage: 0,
        previousPlanId,
        targetDate,
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
