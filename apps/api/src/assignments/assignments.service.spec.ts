import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EvidenceStatus, EvidenceType } from '@placecampus/shared-types';
import { AssignmentsService, addWorkingDays } from './assignments.service.js';
import { FacultyAssignment } from './schemas/faculty-assignment.schema.js';
import { Evidence } from '../evidence/schemas/evidence.schema.js';
import { User } from '../users/schemas/user.schema.js';
import { StudentProfile } from '../students/schemas/student-profile.schema.js';

const chain = (value: unknown) => ({
  select: vi.fn().mockReturnThis(),
  sort: vi.fn().mockReturnThis(),
  lean: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(value),
});

/** Just enough of MongoDB's query language for the router's user filters. */
function matches(doc: Record<string, any>, query: Record<string, any>): boolean {
  return Object.entries(query).every(([key, cond]) => {
    if (key === '$and') return cond.every((q: any) => matches(doc, q));
    if (key === '$or') return cond.some((q: any) => matches(doc, q));
    const value = key === 'roles' ? (doc.roles ?? []) : doc[key];
    if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
      if ('$in' in cond) return cond.$in.includes(value);
      if ('$nin' in cond) return !cond.$nin.includes(value);
      if ('$ne' in cond) return value !== cond.$ne;
    }
    return Array.isArray(value) ? value.includes(cond) : value === cond;
  });
}

type Faculty = { _id: string; department?: string; isDemoData?: boolean; employmentStatus?: string; accountStatus?: string; isActive?: boolean; role?: string };

describe('addWorkingDays', () => {
  it('skips weekends', () => {
    const friday = new Date('2026-11-06T10:00:00');
    expect(addWorkingDays(friday, 3).toDateString()).toBe(new Date('2026-11-11T10:00:00').toDateString());
  });
});

describe('AssignmentsService.routeReview', () => {
  let service: AssignmentsService;
  let evidence: any;
  let assignments: any[];
  let faculty: Faculty[];
  let load: { _id: string; open: number; last: Date }[];
  let profile: { department?: string; isDemoData?: boolean } | null;
  const emit = vi.fn();

  beforeEach(async () => {
    evidence = {
      _id: 'e1',
      studentId: 's1',
      title: 'AWS certificate',
      type: EvidenceType.CERTIFICATION,
      status: EvidenceStatus.NEEDS_REVIEW,
      save: vi.fn(),
    };
    assignments = [];
    faculty = [];
    load = [];
    profile = { department: 'CSE' };
    emit.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        { provide: EventEmitter2, useValue: { emit } },
        {
          provide: getModelToken(FacultyAssignment.name),
          useValue: { find: vi.fn(() => chain(assignments)) },
        },
        {
          provide: getModelToken(Evidence.name),
          useValue: {
            findById: vi.fn(() => ({ exec: vi.fn().mockResolvedValue(evidence) })),
            aggregate: vi.fn(() => ({ exec: vi.fn().mockResolvedValue(load) })),
          },
        },
        {
          provide: getModelToken(User.name),
          useValue: {
            find: vi.fn((query: any) =>
              chain(faculty.map((f) => ({ role: 'faculty', isActive: true, ...f })).filter((f) => matches(f, query))),
            ),
          },
        },
        {
          provide: getModelToken(StudentProfile.name),
          useValue: { findOne: vi.fn(() => chain(profile)) },
        },
      ],
    }).compile();
    service = moduleRef.get(AssignmentsService);
  });

  const assign = (facultyUserId: string, purposes: string[], conflictOfInterest = false) =>
    assignments.push({ facultyUserId, studentId: 's1', purposes, conflictOfInterest, status: 'ACTIVE' });

  it('routes to the assigned reviewer and sets a 3-working-day due date', async () => {
    faculty = [{ _id: 'f1' }, { _id: 'f2' }];
    assign('f1', ['EVIDENCE_REVIEWER']);
    expect(await service.routeReview('e1')).toBe('f1');
    expect(evidence.reviewerId).toBe('f1');
    expect(evidence.reviewDueAt.getTime()).toBe(addWorkingDays(evidence.reviewAssignedAt, 3).getTime());
    expect(emit).toHaveBeenCalledWith('review.assigned', expect.objectContaining({ reviewerId: 'f1' }));
  });

  it('prefers the project guide for projects', async () => {
    evidence.type = EvidenceType.PROJECT;
    faculty = [{ _id: 'mentor' }, { _id: 'guide' }];
    assign('mentor', ['MENTOR']);
    assign('guide', ['PROJECT_GUIDE']);
    expect(await service.routeReview('e1')).toBe('guide');
  });

  it('skips conflicted faculty and falls back to the department pool', async () => {
    faculty = [{ _id: 'conflicted', department: 'CSE' }, { _id: 'cse2', department: 'CSE' }, { _id: 'ece1', department: 'ECE' }];
    assign('conflicted', ['MENTOR'], true);
    expect(await service.routeReview('e1')).toBe('cse2');
  });

  it('picks the candidate with the fewest open reviews', async () => {
    faculty = [{ _id: 'busy' }, { _id: 'free' }];
    assign('busy', ['EVIDENCE_REVIEWER']);
    assign('free', ['EVIDENCE_REVIEWER']);
    load = [{ _id: 'busy', open: 4, last: new Date() }, { _id: 'free', open: 1, last: new Date() }];
    expect(await service.routeReview('e1')).toBe('free');
  });

  it('keeps a resubmitted item with its previous reviewer', async () => {
    faculty = [{ _id: 'f1' }, { _id: 'f2' }];
    assign('f1', ['EVIDENCE_REVIEWER']);
    assign('f2', ['EVIDENCE_REVIEWER']);
    load = [{ _id: 'f2', open: 5, last: new Date() }];
    evidence.reviewerId = 'f2';
    expect(await service.routeReview('e1')).toBe('f2');
  });

  it('never routes to relieved, on-leave or deactivated faculty', async () => {
    faculty = [
      { _id: 'relieved', department: 'CSE', employmentStatus: 'RELIEVED' },
      { _id: 'leave', department: 'CSE', employmentStatus: 'ON_LEAVE' },
      { _id: 'off', department: 'CSE', accountStatus: 'DEACTIVATED', isActive: false },
      { _id: 'ok', department: 'CSE' },
    ];
    assign('relieved', ['MENTOR']);
    expect(await service.routeReview('e1')).toBe('ok');
  });

  it('keeps demo and real records apart', async () => {
    faculty = [{ _id: 'demo-fac', department: 'CSE', isDemoData: true }, { _id: 'real-fac', department: 'CSE' }];
    expect(await service.routeReview('e1')).toBe('real-fac');
    profile = { department: 'CSE', isDemoData: true };
    evidence.reviewerId = undefined;
    expect(await service.routeReview('e1')).toBe('demo-fac');
  });

  it('sends the item to the Review Coordinator queue when nobody is available', async () => {
    faculty = [{ _id: 'ece1', department: 'ECE' }];
    expect(await service.routeReview('e1')).toBeNull();
    expect(evidence.reviewQueue).toBe('COORDINATOR');
    expect(evidence.reviewerId).toBeUndefined();
    expect(evidence.save).toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it('ignores items that no longer need review', async () => {
    evidence.status = EvidenceStatus.VERIFIED;
    expect(await service.routeReview('e1')).toBeNull();
    expect(evidence.save).not.toHaveBeenCalled();
  });
});
