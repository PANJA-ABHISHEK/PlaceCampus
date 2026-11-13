import { PreparationService, scheduleCheckpoints } from './preparation.service.js';
import {
  GapPriority,
  PreparationItemStatus,
  PreparationPlanStatus,
} from '@placecampus/shared-types';

describe('PreparationService', () => {
  const matchingService = { calculateForStudent: vi.fn() };
  const assessmentsService = { getActiveAssessments: vi.fn() };
  const eventEmitter = { emit: vi.fn() };
  const drivesService = { findOne: vi.fn().mockResolvedValue({ applicationDeadline: null }) };
  const model: any = {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
  };
  const service = new PreparationService(
    model,
    matchingService as any,
    assessmentsService as any,
    drivesService as any,
    eventEmitter as any,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    assessmentsService.getActiveAssessments.mockResolvedValue([]);
  });

  it('creates deterministic items from the existing MatchingService and excludes satisfied skills', async () => {
    matchingService.calculateForStudent.mockResolvedValue({
      skills: [
        {
          skillId: 'satisfied', skillName: 'TypeScript', requiredLevel: 2,
          studentLevel: 3, gapLevel: 0, isOptional: false,
          status: 'SATISFIED', explanation: 'Satisfied',
        },
        {
          skillId: 'optional', skillName: 'Docker', requiredLevel: 4,
          studentLevel: 2, gapLevel: 2, isOptional: true,
          priority: GapPriority.LOW, status: 'OPTIONAL_GAP', explanation: 'Optional gap',
        },
        {
          skillId: 'required', skillName: 'React', requiredLevel: 5,
          gapLevel: 5, isOptional: false, priority: GapPriority.HIGH,
          status: 'MISSING', explanation: 'Required gap',
        },
      ],
    });
    const created = { id: 'plan-1', items: [] };
    model.findOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(null) });
    model.create.mockResolvedValue(created);

    const result = await service.createForDrive('drive-1', 'student-1');

    expect(matchingService.calculateForStudent).toHaveBeenCalledWith('drive-1', 'student-1');
    expect(model.create).toHaveBeenCalledWith(expect.objectContaining({
      studentId: 'student-1', driveId: 'drive-1', status: PreparationPlanStatus.ACTIVE,
      completionPercentage: 0,
      items: expect.arrayContaining([
        expect.objectContaining({ skillId: 'required', priority: GapPriority.HIGH }),
        expect.objectContaining({ skillId: 'optional', priority: GapPriority.LOW, isOptional: true }),
      ]),
    }));
    const items = model.create.mock.calls[0][0].items;
    expect(items.map((item: any) => item.skillId)).toEqual(['required', 'optional']);
    expect(result).toBe(created);
    expect(eventEmitter.emit).toHaveBeenCalledWith('preparation.created', { plan: created });
  });

  it('returns an existing active plan instead of creating a duplicate', async () => {
    const existing = { id: 'existing' };
    model.findOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(existing) });
    await expect(service.createForDrive('drive-1', 'student-1')).resolves.toBe(existing);
    expect(model.create).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('updates item status and calculates progress without verifying skills', async () => {
    const save = vi.fn().mockResolvedValue({ id: 'plan-1', completionPercentage: 50 });
    const plan: any = {
      id: 'plan-1', status: PreparationPlanStatus.ACTIVE,
      items: [
        { itemId: 'react-5', status: PreparationItemStatus.TODO },
        { itemId: 'docker-4', status: PreparationItemStatus.TODO },
      ], save,
    };
    model.findOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(plan) });
    await service.updateItemStatus('plan-1', 'react-5', 'student-1', PreparationItemStatus.COMPLETED);
    expect(plan.items[0].status).toBe(PreparationItemStatus.COMPLETED);
    expect(plan.completionPercentage).toBe(50);
    expect(plan.status).toBe(PreparationPlanStatus.ACTIVE);
    expect(save).toHaveBeenCalled();
  });

  it('keeps empty plans at zero progress', async () => {
    const save = vi.fn().mockResolvedValue(true);
    const plan: any = { id: 'plan-1', status: PreparationPlanStatus.ACTIVE, items: [], save };
    model.findOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(plan) });
    await expect(service.updateItemStatus('plan-1', 'missing', 'student-1', PreparationItemStatus.COMPLETED)).rejects.toThrow('Preparation item not found');
  });

  it('does not allow archived history to be mutated', async () => {
    const plan: any = {
      id: 'plan-1', status: PreparationPlanStatus.ARCHIVED,
      items: [{ itemId: 'react-5', status: PreparationItemStatus.TODO }],
      save: vi.fn(),
    };
    model.findOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(plan) });
    await expect(
      service.updateItemStatus('plan-1', 'react-5', 'student-1', PreparationItemStatus.COMPLETED),
    ).rejects.toThrow('Archived preparation plans cannot be changed');
    expect(plan.save).not.toHaveBeenCalled();
  });

  describe('dated checkpoints', () => {
    const DAY = 24 * 60 * 60 * 1000;
    const start = new Date(2026, 10, 9, 10, 0);
    const items = [
      { priority: GapPriority.HIGH },
      { priority: GapPriority.MEDIUM },
      { priority: GapPriority.LOW },
    ];
    const daysAfter = (d: Date) => Math.round((d.getTime() - new Date(2026, 10, 9, 23, 59).getTime()) / DAY);

    it('gives every item a later checkpoint by priority when there is no deadline', () => {
      const { items: scheduled, targetDate } = scheduleCheckpoints(items, start);
      expect(scheduled.map((i) => daysAfter(i.dueDate))).toEqual([7, 12, 15]);
      expect(targetDate).toEqual(scheduled[2].dueDate);
    });

    it('compresses the schedule to finish before the drive deadline', () => {
      const deadline = new Date(2026, 10, 20, 18, 0); // 11 days away
      const { items: scheduled, targetDate } = scheduleCheckpoints(items, start, deadline);
      const days = scheduled.map((i) => daysAfter(i.dueDate));
      expect(days).toEqual([...days].sort((a, b) => a - b));
      expect(targetDate!.getTime()).toBeLessThan(deadline.getTime());
    });

    it('keeps one day per item even when the deadline is very close', () => {
      const { items: scheduled } = scheduleCheckpoints(items, start, new Date(2026, 10, 10, 12));
      expect(scheduled.map((i) => daysAfter(i.dueDate))).toEqual([1, 2, 3]);
    });

    it('stores checkpoint dates and a target date on new plans', async () => {
      matchingService.calculateForStudent.mockResolvedValue({
        skills: [
          { skillId: 'a', skillName: 'SQL', requiredLevel: 2, gapLevel: 2, isOptional: false, priority: GapPriority.HIGH, status: 'MISSING', explanation: '' },
        ],
      });
      model.findOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(null) });
      model.create.mockResolvedValue({ id: 'p' });
      await service.createForDrive('drive-1', 'student-1');
      const created = model.create.mock.calls[0][0];
      expect(created.items[0].dueDate).toBeInstanceOf(Date);
      expect(created.targetDate).toEqual(created.items[0].dueDate);
    });
  });
});
