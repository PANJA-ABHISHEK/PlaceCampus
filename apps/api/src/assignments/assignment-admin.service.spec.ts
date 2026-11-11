import { Test } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssignmentAdminService } from './assignment-admin.service.js';
import { FacultyAssignment } from './schemas/faculty-assignment.schema.js';
import { User } from '../users/schemas/user.schema.js';
import { StudentProfile } from '../students/schemas/student-profile.schema.js';
import { Evidence } from '../evidence/schemas/evidence.schema.js';
import { MockInterview } from '../interviews/schemas/mock-interview.schema.js';
import { AuditService } from '../audit/audit.service.js';

const chain = (value: unknown) => ({
  select: vi.fn().mockReturnThis(),
  sort: vi.fn().mockReturnThis(),
  lean: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(value),
});

interface Student { id: string; department?: string; isDemoData?: boolean; accountStatus?: string; school?: string; noProfile?: boolean }
interface Fac { id: string; department?: string; isDemoData?: boolean; employmentStatus?: string; accountStatus?: string }

describe('AssignmentAdminService.plan (mentor allocation)', () => {
  let service: AssignmentAdminService;
  let students: Student[];
  let faculty: Fac[];
  let activeMentors: { studentId: string; facultyUserId: string }[];
  let conflicts: { studentId: string; facultyUserId: string }[];

  beforeEach(async () => {
    students = [];
    faculty = [];
    activeMentors = [];
    conflicts = [];
    const userFind = vi.fn((query: any) => {
      if (query.role === 'student') {
        return chain(students.map((s) => ({ _id: s.id, fullName: `Student ${s.id}`, accountStatus: s.accountStatus ?? 'INVITED' })));
      }
      return chain(faculty.map((f) => ({ _id: f.id, fullName: `Faculty ${f.id}`, role: 'faculty', isActive: false, accountStatus: 'INVITED', ...f })));
    });
    const moduleRef = await Test.createTestingModule({
      providers: [
        AssignmentAdminService,
        { provide: EventEmitter2, useValue: { emit: vi.fn() } },
        { provide: AuditService, useValue: { logAction: vi.fn() } },
        { provide: getConnectionToken(), useValue: {} },
        { provide: getModelToken(User.name), useValue: { find: userFind } },
        {
          provide: getModelToken(StudentProfile.name),
          useValue: {
            find: vi.fn(() =>
              chain(students.filter((s) => !s.noProfile).map((s) => ({ userId: s.id, registrationNumber: `R${s.id}`, department: s.department, isDemoData: s.isDemoData, source: { school: s.school } }))),
            ),
          },
        },
        {
          provide: getModelToken(FacultyAssignment.name),
          useValue: {
            aggregate: vi.fn(() => {
              const counts = new Map<string, number>();
              for (const m of activeMentors) counts.set(m.facultyUserId, (counts.get(m.facultyUserId) ?? 0) + 1);
              return { exec: vi.fn().mockResolvedValue([...counts].map(([id, n]) => ({ _id: id, mentees: n, last: new Date(0) }))) };
            }),
            find: vi.fn((query: any) => chain(query.conflictOfInterest ? conflicts : activeMentors)),
          },
        },
        { provide: getModelToken(Evidence.name), useValue: {} },
        { provide: getModelToken(MockInterview.name), useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(AssignmentAdminService);
  });

  const range = (n: number, make: (i: number) => Student) => Array.from({ length: n }, (_, i) => make(i));

  it('gives every eligible student exactly one mentor and balances the load', async () => {
    students = range(100, (i) => ({ id: `s${i}`, department: 'CSE' }));
    faculty = [{ id: 'f1', department: 'CSE' }, { id: 'f2', department: 'CSE' }, { id: 'f3', department: 'CSE' }];
    const plan = await service.plan();
    expect(plan.planned).toHaveLength(100);
    expect(new Set(plan.planned.map((p) => p.studentId)).size).toBe(100);
    const loads = plan.workload.map((w) => w.total).sort();
    expect(Math.max(...loads) - Math.min(...loads)).toBeLessThanOrEqual(1);
  });

  it('keeps unmapped departments and faculty-less departments in the exception queue', async () => {
    students = [
      { id: 'a', department: 'CSE' },
      { id: 'b', school: 'School of AI and Emerging Technologies' },
      { id: 'c', department: 'LAW' },
    ];
    faculty = [{ id: 'f1', department: 'CSE' }];
    const plan = await service.plan();
    expect(plan.planned.map((p) => p.studentId)).toEqual(['a']);
    expect(Object.fromEntries(plan.unassigned.map((u) => [u.studentId, u.reason]))).toEqual({ b: 'DEPARTMENT_UNMAPPED', c: 'NO_FACULTY_IN_DEPARTMENT' });
    expect(plan.unmappedDepartments).toEqual([{ school: 'School of AI and Emerging Technologies', students: 1 }]);
  });

  it('never pairs demo faculty with real students (or the reverse)', async () => {
    students = [{ id: 'real', department: 'CSE' }, { id: 'demo', department: 'CSE', isDemoData: true }];
    faculty = [{ id: 'demo-fac', department: 'CSE', isDemoData: true }];
    const plan = await service.plan();
    expect(plan.planned).toEqual([{ studentId: 'demo', facultyUserId: 'demo-fac', department: 'CSE' }]);
    expect(plan.unassigned.find((u) => u.studentId === 'real')?.reason).toBe('NO_FACULTY_IN_DEPARTMENT');
  });

  it('skips conflicted pairs, relieved and on-leave faculty', async () => {
    students = [{ id: 's1', department: 'CSE' }, { id: 's2', department: 'CSE' }];
    faculty = [{ id: 'gone', department: 'CSE', employmentStatus: 'RELIEVED' }, { id: 'away', department: 'CSE', employmentStatus: 'ON_LEAVE' }, { id: 'f1', department: 'CSE' }];
    conflicts = [{ studentId: 's2', facultyUserId: 'f1' }];
    const plan = await service.plan();
    expect(plan.planned).toEqual([{ studentId: 's1', facultyUserId: 'f1', department: 'CSE' }]);
    expect(plan.unassigned.find((u) => u.studentId === 's2')?.reason).toBe('ONLY_CONFLICTED_FACULTY');
    expect(plan.totals.unavailableFaculty).toBe(2);
  });

  it('leaves students who already have a mentor untouched and counts them', async () => {
    students = [{ id: 's1', department: 'CSE' }, { id: 's2', department: 'CSE' }];
    faculty = [{ id: 'f1', department: 'CSE' }, { id: 'f2', department: 'CSE' }];
    activeMentors = [{ studentId: 's1', facultyUserId: 'f1' }];
    const plan = await service.plan();
    expect(plan.totals.alreadyAssigned).toBe(1);
    // s2 goes to the less-loaded f2, not f1 (which already mentors s1).
    expect(plan.planned).toEqual([{ studentId: 's2', facultyUserId: 'f2', department: 'CSE' }]);
  });

  it('treats the 40-mentee target as soft and flags faculty over it', async () => {
    students = range(90, (i) => ({ id: `s${i}`, department: 'CSE' }));
    faculty = [{ id: 'f1', department: 'CSE' }, { id: 'f2', department: 'CSE' }];
    const plan = await service.plan({ target: 40 });
    expect(plan.planned).toHaveLength(90);
    expect(plan.totals.facultyOverTarget).toBe(2);
  });

  it('can be limited to selected departments', async () => {
    students = [{ id: 'a', department: 'CSE' }, { id: 'b', department: 'MBA' }];
    faculty = [{ id: 'f1', department: 'CSE' }, { id: 'f2', department: 'MBA' }];
    const plan = await service.plan({ departmentCodes: ['MBA'] });
    expect(plan.planned.map((p) => p.studentId)).toEqual(['b']);
  });

  it('counts students without a profile and reports them instead of dropping them', async () => {
    students = [{ id: 'a', department: 'CSE' }, { id: 'self', noProfile: true }];
    faculty = [{ id: 'f1', department: 'CSE' }];
    const plan = await service.plan();
    expect(plan.totals.students).toBe(2);
    expect(plan.planned.map((p) => p.studentId)).toEqual(['a']);
    expect(plan.unassigned).toEqual([expect.objectContaining({ studentId: 'self', reason: 'NO_STUDENT_RECORD' })]);
  });
});
