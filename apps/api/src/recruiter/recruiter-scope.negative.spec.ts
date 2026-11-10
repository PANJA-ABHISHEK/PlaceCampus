/**
 * Negative tests: a recruiter can never reach a student outside a drive they
 * hold an active, unexpired grant for, and every attempt — allowed or
 * denied — is written to the audit log.
 */
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@placecampus/shared-types';
import { RecruiterService } from './recruiter.service.js';
import { RecruiterController, RecruiterDashboardController } from './recruiter.controller.js';
import { RecruiterAccessService } from '../recruiter-access/recruiter-access.service.js';
import { RecruiterAccessController, RecruiterAccessGlobalController } from '../recruiter-access/recruiter-access.controller.js';
import { RecruiterAccessLogController } from '../audit/audit.controller.js';
import { MatchingController } from '../matching/matching.controller.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';

const APPROVED = 'drive-approved';
const OTHER = 'drive-other';

function setup() {
  const audit = { logAction: vi.fn() };
  const access = {
    // Only the approved drive has an active grant for this recruiter.
    getActiveGrant: vi.fn(async (driveId: string, recruiterId: string) =>
      driveId === APPROVED && recruiterId === 'rec-1' ? { releasedFields: ['studentName'], expiresAt: new Date() } : null,
    ),
    getMyActiveGrants: vi.fn().mockResolvedValue([{ id: 'g1', driveId: { _id: APPROVED }, releasedFields: [] }]),
  };
  const applications = {
    findAllForDrivePaginated: vi.fn().mockResolvedValue({ applications: [{ id: 'app-1', studentId: 'stu-1' }], total: 1 }),
    findOne: vi.fn(async (id: string) => ({
      id,
      studentId: id === 'app-other' ? 'stu-9' : 'stu-1',
      driveId: id === 'app-other' ? OTHER : APPROVED,
    })),
    countForDrive: vi.fn().mockResolvedValue(1),
  };
  const students = { getProfileByUserId: vi.fn().mockResolvedValue({ userId: { fullName: 'Asha' } }) };
  const service = new RecruiterService(access as any, {} as any, applications as any, students as any, audit as any);
  const logged = () => audit.logAction.mock.calls.map(([entry]) => entry);
  return { service, audit, access, applications, students, logged };
}

describe('Recruiter scope — denied paths', () => {
  it('refuses the candidate list of a drive without a grant, before reading any application', async () => {
    const { service, applications, students, logged } = setup();
    await expect(service.getCandidates('rec-1', OTHER)).rejects.toThrow(ForbiddenException);
    expect(applications.findAllForDrivePaginated).not.toHaveBeenCalled();
    expect(students.getProfileByUserId).not.toHaveBeenCalled();
    expect(logged()).toEqual([
      expect.objectContaining({ action: 'DENIED_CROSS_DRIVE_ACCESS', actorId: 'rec-1', driveId: OTHER, success: false }),
    ]);
  });

  it('refuses a candidate profile on a drive without a grant, before loading the application', async () => {
    const { service, applications, logged } = setup();
    await expect(service.getCandidateDetail('rec-1', OTHER, 'app-other')).rejects.toThrow(ForbiddenException);
    expect(applications.findOne).not.toHaveBeenCalled();
    expect(logged()[0]).toMatchObject({ actorId: 'rec-1', driveId: OTHER, resourceId: 'app-other', success: false });
  });

  it('refuses a student from another drive requested through the approved drive', async () => {
    const { service, students, logged } = setup();
    await expect(service.getCandidateDetail('rec-1', APPROVED, 'app-other')).rejects.toThrow(
      'This application does not belong to the requested drive',
    );
    expect(students.getProfileByUserId).not.toHaveBeenCalled();
    expect(logged()).toEqual([
      expect.objectContaining({ action: 'DENIED_UNAUTHORIZED_APPLICATION_ACCESS', resourceId: 'app-other', success: false }),
    ]);
  });

  it("refuses another recruiter's approved drive", async () => {
    const { service, logged } = setup();
    await expect(service.getCandidates('rec-2', APPROVED)).rejects.toThrow(ForbiddenException);
    expect(logged()[0]).toMatchObject({ actorId: 'rec-2', success: false });
  });

  it('only treats ACTIVE, unexpired grants as access (revoked and expired grants fail)', async () => {
    const findOne = vi.fn().mockResolvedValue(null);
    const service = new RecruiterAccessService({ findOne } as any, {} as any, {} as any, {} as any);
    const before = Date.now();
    await service.getActiveGrant(APPROVED, 'rec-1');
    const filter = findOne.mock.calls[0][0];
    expect(filter).toMatchObject({ driveId: APPROVED, recruiterId: 'rec-1', status: 'ACTIVE' });
    expect(filter.expiresAt.$gt.getTime()).toBeGreaterThanOrEqual(before);
  });
});

describe('Recruiter scope — allowed paths are logged too', () => {
  it('logs the candidate list with the drive and the applications shown', async () => {
    const { service, logged } = setup();
    await service.getCandidates('rec-1', APPROVED);
    expect(logged()).toEqual([
      expect.objectContaining({
        action: 'VIEW_CANDIDATE_LIST',
        driveId: APPROVED,
        metadata: expect.objectContaining({ applicationIds: ['app-1'] }),
      }),
    ]);
  });

  it('logs each candidate profile with the student it exposed', async () => {
    const { service, logged } = setup();
    await service.getCandidateDetail('rec-1', APPROVED, 'app-1');
    expect(logged()).toEqual([
      expect.objectContaining({ action: 'VIEW_CANDIDATE_DETAIL', driveId: APPROVED, studentId: 'stu-1' }),
    ]);
  });

  it('logs the drive list and dashboard reads', async () => {
    const { service, logged } = setup();
    await service.getDrives('rec-1');
    await service.getDashboardSummary('rec-1');
    expect(logged().map((e) => e.action)).toEqual(['VIEW_ACCESSIBLE_DRIVES', 'VIEW_DASHBOARD']);
    expect(logged()[0].metadata).toEqual({ driveIds: [APPROVED] });
  });
});

describe('Recruiter scope — role guard', () => {
  const guard = new RolesGuard(new Reflector());
  const can = (controller: any, method: string, role: string) =>
    guard.canActivate({
      getHandler: () => controller.prototype[method],
      getClass: () => controller,
      switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    } as unknown as ExecutionContext);

  it.each([UserRole.STUDENT, UserRole.FACULTY, UserRole.PLACEMENT_OFFICER, UserRole.ADMIN])(
    'keeps %s out of the recruiter portal',
    (role) => {
      expect(can(RecruiterController, 'getCandidates', role)).toBe(false);
      expect(can(RecruiterController, 'getCandidateDetail', role)).toBe(false);
      expect(can(RecruiterDashboardController, 'getSummary', role)).toBe(false);
    },
  );

  it('keeps recruiters out of staff-only student data and access controls', () => {
    const r = UserRole.RECRUITER;
    expect(can(MatchingController, 'getStudentGapAnalysis', r)).toBe(false);
    expect(can(MatchingController, 'getMatchingSummary', r)).toBe(false);
    expect(can(RecruiterAccessController, 'grantAccess', r)).toBe(false);
    expect(can(RecruiterAccessGlobalController, 'revokeAccess', r)).toBe(false);
    expect(can(RecruiterAccessLogController, 'list', r)).toBe(false);
  });

  it('lets a recruiter use the recruiter portal', () => {
    expect(can(RecruiterController, 'getCandidates', UserRole.RECRUITER)).toBe(true);
  });
});
