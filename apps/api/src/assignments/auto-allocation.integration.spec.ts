import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Model } from 'mongoose';
import { AssignmentsModule } from './assignments.module.js';
import { AutoAllocationService } from './auto-allocation.service.js';
import { AssignmentsService } from './assignments.service.js';
import { FacultyAssignment } from './schemas/faculty-assignment.schema.js';
import { User } from '../users/schemas/user.schema.js';
import { StudentProfile } from '../students/schemas/student-profile.schema.js';
import { AuditService } from '../audit/audit.service.js';

/**
 * Automatic mentor allocation against a real MongoDB (unique indexes included).
 *   MONGO_TEST_URI=mongodb://localhost:27999/pc_alloc_test pnpm vitest run auto-allocation.integration
 * Skipped without MONGO_TEST_URI. The test drops its database: never use a shared one.
 */
const URI = process.env.MONGO_TEST_URI;

(URI ? describe : describe.skip)('automatic mentor allocation (MongoDB)', () => {
  let moduleRef: TestingModule;
  let auto: AutoAllocationService;
  let users: Model<any>;
  let profiles: Model<any>;
  let assignments: Model<any>;
  const events: { name: string; payload: any }[] = [];
  const logAction = vi.fn();

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ AUTO_MENTOR_ALLOCATION_DEBOUNCE_MS: '10' })] }),
        EventEmitterModule.forRoot(),
        MongooseModule.forRoot(URI!),
        AssignmentsModule,
      ],
    })
      .overrideProvider(AuditService)
      .useValue({ logAction })
      .compile();
    await moduleRef.init();
    auto = moduleRef.get(AutoAllocationService);
    users = moduleRef.get(getModelToken(User.name));
    profiles = moduleRef.get(getModelToken(StudentProfile.name));
    assignments = moduleRef.get(getModelToken(FacultyAssignment.name));
    moduleRef.get(EventEmitter2).onAny((name: any, payload: any) => events.push({ name: String(name), payload }));
    await users.db.dropDatabase();
    await assignments.syncIndexes();
  }, 60_000);

  afterAll(async () => {
    if (!moduleRef) return;
    await users.db.dropDatabase();
    await moduleRef.close();
  });

  async function faculty(n: number, department: string) {
    return Promise.all(
      Array.from({ length: n }, (_, i) =>
        users.create({ email: `f${department}${i}@t.test`, fullName: `Faculty ${department} ${i}`, role: 'faculty', isActive: true, department, passwordHash: 'x' }),
      ),
    );
  }
  async function student(i: number, department?: string, school?: string, withProfile = true) {
    const u = await users.create({ email: `s${i}@t.test`, fullName: `Student ${i}`, role: 'student', isActive: true, passwordHash: 'x' });
    if (withProfile) await profiles.create({ userId: String(u._id), department, source: school ? { school } : undefined, registrationNumber: `R${String(i).padStart(4, '0')}` });
    return u;
  }
  const mentorOf = async (id: unknown): Promise<any> =>
    assignments.findOne({ studentId: String(id), status: 'ACTIVE', purposes: 'MENTOR' }).lean().exec();

  it('gives every mapped student one mentor from their own department, balanced', async () => {
    const scse = await faculty(3, 'SCSE');
    await faculty(1, 'SME');
    const scseStudents = await Promise.all(Array.from({ length: 9 }, (_, i) => student(i, 'SCSE', 'School of Computer Science and Engineering')));
    const unmapped = await student(100, undefined, 'School of Law');
    const selfRegistered = await student(101, undefined, undefined, false);

    auto.request('test');
    await auto.runNow();

    const scseIds = new Set(scse.map((f) => String(f._id)));
    const loads = new Map<string, number>();
    for (const s of scseStudents) {
      const m = await mentorOf(s._id);
      expect(m).toBeTruthy();
      expect(scseIds.has(m.facultyUserId)).toBe(true);
      expect(m.source).toBe('ALLOCATION');
      loads.set(m.facultyUserId, (loads.get(m.facultyUserId) ?? 0) + 1);
    }
    expect([...loads.values()]).toEqual([3, 3, 3]);
    expect(await mentorOf(unmapped._id)).toBeNull();
    expect(await mentorOf(selfRegistered._id)).toBeNull();

    // Each new pair notified the student and the mentor.
    const notices = events.filter((e) => e.name === 'assignment.changed');
    expect(notices).toHaveLength(9);
    expect(notices[0].payload).toMatchObject({ purposes: ['MENTOR'], newFacultyName: expect.stringContaining('Faculty SCSE') });
    // Audited as a system action (no user id, which the audit schema would reject as an ObjectId).
    expect(logAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'ASSIGNMENT_AUTO_ALLOCATED', actorId: undefined, actorRole: 'system' }));
  });

  it('is idempotent: a second run creates nothing and never double-assigns', async () => {
    const before = await assignments.countDocuments({ status: 'ACTIVE' });
    auto.request('again');
    await auto.runNow();
    expect(await assignments.countDocuments({ status: 'ACTIVE' })).toBe(before);
  });

  it('allocates students as soon as their department mapping is approved', async () => {
    const law: any = await profiles.findOne({ 'source.school': 'School of Law' }).lean().exec();
    await faculty(1, 'SOL');
    await profiles.updateOne({ _id: law._id }, { $set: { department: 'SOL' } });
    moduleRef.get(EventEmitter2).emit('org.mapping_applied', { type: 'DEPARTMENT', code: 'SOL', applied: { students: 1, faculty: 1 } });
    await new Promise((r) => setTimeout(r, 50));
    await auto.runNow();
    expect(await mentorOf(law.userId)).toBeTruthy();
  });

  it('exposes the mentor to the student', async () => {
    const s: any = await users.findOne({ email: 's0@t.test' }).lean().exec();
    const mentor = await moduleRef.get(AssignmentsService).mentorFor(String(s._id));
    expect(mentor).toMatchObject({ fullName: expect.stringContaining('Faculty SCSE'), department: 'SCSE' });
    const none: any = await users.findOne({ email: 's101@t.test' }).lean().exec();
    expect(await moduleRef.get(AssignmentsService).mentorFor(String(none._id))).toBeNull();
  });
});
