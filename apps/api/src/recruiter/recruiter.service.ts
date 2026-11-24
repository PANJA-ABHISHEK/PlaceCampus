import { BadRequestException, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RecruiterAccessService } from '../recruiter-access/recruiter-access.service.js';
import { DrivesService } from '../drives/drives.service.js';
import { ApplicationsService } from '../applications/applications.service.js';
import { StudentsService } from '../students/students.service.js';
import { resolvePreferences } from '../students/student-preferences.js';
import { AuditService } from '../audit/audit.service.js';
import { ApplicationStatus, UserRole } from '@placecampus/shared-types';
import { driveLifecycle } from './drive-lifecycle.js';

export const FUNNEL_STAGES = [ApplicationStatus.APPLIED, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.SHORTLISTED, ApplicationStatus.INTERVIEW_SCHEDULED, ApplicationStatus.OFFER_RELEASED, ApplicationStatus.SELECTED] as const;
const pct = (part: number, whole: number) => (whole ? Number(((part / whole) * 100).toFixed(1)) : 0);

/**
 * Funnel from current-status counts. `count` is how many applications sit at a stage now;
 * `reached` is how many active (non-rejected, non-withdrawn) applications are at that stage or
 * beyond, so `conversionFromPrevious` is never above 100%. Rejections are reported separately.
 */
export function buildFunnel(counts: Record<string, number>) {
  const total = Object.entries(counts).reduce((sum, [key, value]) => (key === 'total' ? sum : sum + (value || 0)), 0);
  let previousReached = 0;
  const stages = FUNNEL_STAGES.map((status, index) => {
    const reached = FUNNEL_STAGES.slice(index).reduce((sum, stage) => sum + (counts[stage] || 0), 0);
    const stage = { status, count: counts[status] || 0, reached, conversionFromPrevious: index === 0 ? 100 : pct(reached, previousReached) };
    previousReached = reached;
    return stage;
  });
  const selected = counts[ApplicationStatus.SELECTED] || 0;
  const rejected = counts[ApplicationStatus.REJECTED] || 0;
  return {
    totalApplications: total,
    stages,
    rejected,
    withdrawn: counts[ApplicationStatus.WITHDRAWN] || 0,
    selectionRate: pct(selected, total),
    rejectionRate: pct(rejected, total),
  };
}

@Injectable()
export class RecruiterService {
  constructor(
    private readonly recruiterAccessService: RecruiterAccessService,
    private readonly drivesService: DrivesService,
    private readonly applicationsService: ApplicationsService,
    private readonly studentsService: StudentsService,
    private readonly auditService: AuditService,
  ) {}

  async getDrives(recruiterId: string) {
    const grants = await this.recruiterAccessService.getMyActiveGrants(recruiterId);
    await this.logListing(recruiterId, 'VIEW_ACCESSIBLE_DRIVES', grants);
    return grants.map(g => ({
      grantId: g.id,
      drive: g.driveId,
      lifecycle: driveLifecycle(g.driveId),
      expiresAt: g.expiresAt,
      releasedFields: g.releasedFields,
      canManageApplications: Boolean(g.canManageApplications && g.isDemoData && process.env.DEMO_MODE === 'true'),
    }));
  }

  /** Aggregate dashboard values only over this recruiter's active access grants. */
  async getDashboardSummary(recruiterId: string) {
    const grants = await this.recruiterAccessService.getMyActiveGrants(recruiterId);
    await this.logListing(recruiterId, 'VIEW_DASHBOARD', grants);
    const driveIds = grants.map((grant: any) => String(grant.driveId?._id ?? grant.driveId));
    const countsByDrive = await this.applicationsService.getCountsByDrive(driveIds);
    return grants.map((grant: any) => {
      const drive = grant.driveId;
      const driveId = String(drive?._id ?? drive);
      const canSeeApplicationStatus = grant.releasedFields.includes('applicationStatus');
      const count: { total: number; [status: string]: number } = countsByDrive[driveId] ?? { total: 0 };
      const statusCounts = canSeeApplicationStatus
          ? {
            applied: count[ApplicationStatus.APPLIED] ?? 0,
            underReview: count[ApplicationStatus.UNDER_REVIEW] ?? 0,
            shortlisted: count[ApplicationStatus.SHORTLISTED] ?? 0,
            interviewScheduled: count[ApplicationStatus.INTERVIEW_SCHEDULED] ?? 0,
            offerReleased: count[ApplicationStatus.OFFER_RELEASED] ?? 0,
            selected: count[ApplicationStatus.SELECTED] ?? 0,
            rejected: count[ApplicationStatus.REJECTED] ?? 0,
            withdrawn: count[ApplicationStatus.WITHDRAWN] ?? 0,
          }
          : null;
      return {
        grantId: grant.id,
        drive,
        lifecycle: driveLifecycle(drive),
        expiresAt: grant.expiresAt,
        releasedFields: grant.releasedFields,
        candidateCount: count.total,
        statusCounts,
      };
    });
  }

  async getDashboardStats(recruiterId: string) {
    const grants = await this.recruiterAccessService.getMyActiveGrants(recruiterId);
    const driveIds = grants.map((grant: any) => String(grant.driveId?._id ?? grant.driveId));
    const counts = await this.applicationsService.getCountsByDrive(driveIds);
    const totalApplications = Object.values(counts).reduce((sum: number, drive: any) => sum + (drive.total || 0), 0);
    const statusDriveIds = grants.filter((grant: any) => grant.releasedFields.includes('applicationStatus')).map((grant: any) => String(grant.driveId?._id ?? grant.driveId));
    const statusCounts = await this.applicationsService.getCountsByDrive(statusDriveIds);
    const totals = Object.values(statusCounts).reduce((all: any, drive: any) => {
      all.applications += drive.total || 0;
      for (const stage of Object.values(ApplicationStatus)) all[stage] = (all[stage] || 0) + (drive[stage] || 0);
      return all;
    }, { applications: 0 });
    const hasStatus = grants.some((grant: any) => grant.releasedFields.includes('applicationStatus'));
    return {
      demoMode: process.env.DEMO_MODE === 'true' && grants.some((grant: any) => grant.isDemoData),
      activeDrives: grants.filter((grant: any) => driveLifecycle(grant.driveId) === 'ACTIVE').length,
      totalApplications,
      uniqueApplicants: driveIds.length ? await this.applicationsService.countUniqueStudentsForDrives(driveIds) : 0,
      pendingReviews: hasStatus ? (totals[ApplicationStatus.APPLIED] || 0) + (totals[ApplicationStatus.UNDER_REVIEW] || 0) : null,
      underReview: hasStatus ? totals[ApplicationStatus.UNDER_REVIEW] || 0 : null,
      newApplications: hasStatus ? totals[ApplicationStatus.APPLIED] || 0 : null,
      shortlisted: hasStatus ? totals[ApplicationStatus.SHORTLISTED] || 0 : null,
      interviewsScheduled: hasStatus ? totals[ApplicationStatus.INTERVIEW_SCHEDULED] || 0 : null,
      offersReleased: hasStatus ? totals[ApplicationStatus.OFFER_RELEASED] || 0 : null,
      selected: hasStatus ? totals[ApplicationStatus.SELECTED] || 0 : null,
      rejected: hasStatus ? totals[ApplicationStatus.REJECTED] || 0 : null,
      statusShared: hasStatus,
      assignedDriveCount: grants.length,
      expiringDriveAccess: grants.filter((grant: any) => {
        const remaining = new Date(grant.expiresAt).getTime() - Date.now();
        return remaining >= 0 && remaining <= 48 * 60 * 60 * 1000;
      }).length,
    };
  }

  async getDashboardPipeline(recruiterId: string) {
    const grants = await this.recruiterAccessService.getMyActiveGrants(recruiterId);
    const driveIds = grants.map((grant: any) => String(grant.driveId?._id ?? grant.driveId));
    const sharedGrants = grants.filter((grant: any) => grant.releasedFields.includes('applicationStatus'));
    const statusDriveIds = sharedGrants.map((grant: any) => String(grant.driveId?._id ?? grant.driveId));
    if (!sharedGrants.length || !statusDriveIds.length) return { totalApplications: 0, stages: [], rejected: 0, selectionRate: 0, statusShared: false };
    const countsByDrive = await this.applicationsService.getCountsByDrive(statusDriveIds);
    const counts = Object.values(countsByDrive).reduce((all: any, drive: any) => {
      for (const stage of Object.values(ApplicationStatus)) all[stage] = (all[stage] || 0) + (drive[stage] || 0);
      all.total += drive.total || 0;
      return all;
    }, { total: 0 });
    return { ...buildFunnel(counts), statusShared: true, sharedDriveCount: sharedGrants.length, assignedDriveCount: driveIds.length };
  }

  async updateDemoApplication(recruiterId: string, driveId: string, applicationId: string, payload: { status?: string; recruiterNotes?: string }) {
    const grant = await this.recruiterAccessService.getActiveGrant(driveId, recruiterId);
    if (!grant) throw new ForbiddenException('You do not have active access to this drive');
    if (!grant.isDemoData || !grant.canManageApplications || process.env.DEMO_MODE !== 'true') {
      throw new ForbiddenException('Application updates are not enabled for this recruiter grant');
    }
    const drive = await this.drivesService.findOne(driveId);
    const application = await this.applicationsService.findOne(applicationId);
    if (!drive.isDemoData || !application.isDemoData || String(application.driveId) !== driveId) {
      throw new ForbiddenException('Demo recruiters can only update demonstration applications assigned to them');
    }
    if (payload.recruiterNotes !== undefined) {
      if (typeof payload.recruiterNotes !== 'string' || payload.recruiterNotes.length > 2000) throw new BadRequestException('Recruiter notes must be 2,000 characters or fewer');
      application.recruiterNotes = payload.recruiterNotes.trim();
    }
    if (payload.status !== undefined) {
      const transitions: Record<string, string[]> = {
        [ApplicationStatus.APPLIED]: [ApplicationStatus.UNDER_REVIEW, ApplicationStatus.REJECTED],
        [ApplicationStatus.UNDER_REVIEW]: [ApplicationStatus.SHORTLISTED, ApplicationStatus.REJECTED],
        [ApplicationStatus.SHORTLISTED]: [ApplicationStatus.INTERVIEW_SCHEDULED, ApplicationStatus.REJECTED],
        [ApplicationStatus.INTERVIEW_SCHEDULED]: [ApplicationStatus.OFFER_RELEASED, ApplicationStatus.REJECTED],
        [ApplicationStatus.OFFER_RELEASED]: [ApplicationStatus.SELECTED, ApplicationStatus.REJECTED],
      };
      if (!Object.values(ApplicationStatus).includes(payload.status as any)) throw new BadRequestException('Invalid application status');
      if (!(transitions[application.status] || []).includes(payload.status)) throw new BadRequestException(`Cannot move an application from ${application.status} to ${payload.status}`);
      application.status = payload.status as ApplicationStatus;
      application.reviewedBy = recruiterId;
      application.reviewedAt = new Date();
    }
    if (payload.status === undefined && payload.recruiterNotes === undefined) throw new BadRequestException('Provide an application status or recruiter note');
    await application.save();
    await this.auditService.logAction({ actorId: recruiterId, actorRole: UserRole.RECRUITER, action: payload.status ? 'UPDATE_DEMO_APPLICATION_STATUS' : 'UPDATE_DEMO_RECRUITER_NOTE', resourceType: 'Application', resourceId: applicationId, driveId, studentId: String(application.studentId), metadata: { status: payload.status ?? application.status, noteUpdated: payload.recruiterNotes !== undefined } });
    return { applicationId, status: application.status, recruiterNotes: application.recruiterNotes, updatedAt: (application as any).updatedAt };
  }

  async getCandidates(
    recruiterId: string,
    driveId: string,
    page = 1,
    limit = 10,
    status?: string,
    query?: string,
    filters: { department?: string; minCgpa?: number; maxCgpa?: number; graduationYear?: number; skill?: string } = {},
  ) {
    const grant = await this.recruiterAccessService.getActiveGrant(driveId, recruiterId);
    if (!grant) {
      await this.auditService.logAction({
        actorId: recruiterId, actorRole: UserRole.RECRUITER, action: 'DENIED_CROSS_DRIVE_ACCESS',
        resourceType: 'PlacementDrive', resourceId: driveId, driveId, success: false,
      });
      throw new ForbiddenException('You do not have active access to this drive');
    }

    const released = new Set(grant.releasedFields);
    const safeStatus = released.has('applicationStatus') ? status : undefined;
    const safeFilters = {
      ...(released.has('department') ? { department: filters.department } : {}),
      ...(released.has('cgpa') ? { minCgpa: filters.minCgpa, maxCgpa: filters.maxCgpa } : {}),
      ...(released.has('graduationYear') ? { graduationYear: filters.graduationYear } : {}),
      ...(released.has('skills') ? { skill: filters.skill } : {}),
    };
    const searchFields = {
      studentName: released.has('studentName'),
      studentEmail: released.has('studentEmail'),
      registrationNumber: released.has('registrationNumber'),
    };
    const searchQuery = Object.values(searchFields).some(Boolean) ? query : undefined;
    const pageNum = Math.max(1, Math.floor(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Math.floor(limit) || 10));
    const { applications, total } =
      await this.applicationsService.findAllForDrivePaginated(
        driveId,
        pageNum,
        limitNum,
        safeStatus,
        searchQuery,
        safeFilters,
        searchFields,
      );

    const candidates = await Promise.all(applications.map(async (app) => {
      return { ...await this.mapCandidateData(app, grant.releasedFields), canManageApplications: Boolean(grant.canManageApplications && grant.isDemoData && process.env.DEMO_MODE === 'true') };
    }));

    await this.auditService.logAction({
      actorId: recruiterId, actorRole: UserRole.RECRUITER, action: 'VIEW_CANDIDATE_LIST',
      resourceType: 'PlacementDrive', resourceId: driveId, driveId,
      metadata: { page: pageNum, shown: candidates.length, filters: { status: !!safeStatus, searchFields: Object.keys(searchFields).filter((field) => searchFields[field as keyof typeof searchFields]), ...Object.fromEntries(Object.entries(safeFilters).map(([key, value]) => [key, value != null])) }, applicationIds: applications.map((a: any) => String(a.id ?? a._id)) },
    });

    return { candidates, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
  }

  async getCandidateDetail(recruiterId: string, driveId: string, applicationId: string) {
    const grant = await this.recruiterAccessService.getActiveGrant(driveId, recruiterId);
    if (!grant) {
      await this.auditService.logAction({
        actorId: recruiterId, actorRole: UserRole.RECRUITER, action: 'DENIED_EXPIRED_ACCESS',
        resourceType: 'Application', resourceId: applicationId, driveId, success: false,
      });
      throw new ForbiddenException('You do not have active access to this drive');
    }

    const application = await this.applicationsService.findOne(applicationId);
    if (application.driveId.toString() !== driveId) {
      await this.auditService.logAction({
        actorId: recruiterId, actorRole: UserRole.RECRUITER, action: 'DENIED_UNAUTHORIZED_APPLICATION_ACCESS',
        resourceType: 'Application', resourceId: applicationId, driveId, success: false,
      });
      throw new ForbiddenException('This application does not belong to the requested drive');
    }

    const mapped = await this.mapCandidateData(application, grant.releasedFields);

    await this.auditService.logAction({
      actorId: recruiterId, actorRole: UserRole.RECRUITER, action: 'VIEW_CANDIDATE_DETAIL',
      resourceType: 'Application', resourceId: applicationId, driveId, studentId: application.studentId.toString(),
    });

    return { ...mapped, expiresAt: grant.expiresAt, releasedFields: grant.releasedFields, canManageApplications: Boolean(grant.canManageApplications && grant.isDemoData && process.env.DEMO_MODE === 'true') };
  }

  async exportCandidatesCsv(recruiterId: string, driveId: string, status?: string) {
    const grant = await this.recruiterAccessService.getActiveGrant(driveId, recruiterId);
    if (!grant) throw new ForbiddenException('You do not have active access to this drive');
    if (status && !grant.releasedFields.includes('applicationStatus')) {
      throw new ForbiddenException('Application status is not shared for this drive');
    }
    const firstPage = await this.getCandidates(recruiterId, driveId, 1, 100, status);
    if (firstPage.total > 10_000) {
      throw new BadRequestException('This drive exceeds the 10,000-row CSV export limit.');
    }
    const candidates = [...firstPage.candidates];
    for (let page = 2; page <= firstPage.totalPages; page += 1) {
      const result = await this.getCandidates(recruiterId, driveId, page, 100, status);
      candidates.push(...result.candidates);
    }

    const columns: { key: string; label: string }[] = [
      { key: 'id', label: 'Application ID' },
      { key: 'studentName', label: 'Candidate name' },
      { key: 'studentEmail', label: 'Email' },
      { key: 'registrationNumber', label: 'Registration number' },
      { key: 'department', label: 'Department' },
      { key: 'cgpa', label: 'CGPA' },
      { key: 'graduationYear', label: 'Graduation year' },
      { key: 'applicationStatus', label: 'Application status' },
      { key: 'skillMatchCoverage', label: 'Skill match coverage' },
      { key: 'skills', label: 'Matched skills' },
    ];
    const keys = new Set(['id', ...(firstPage.candidates[0] ? Object.keys(firstPage.candidates[0]) : [])]);
    const allowedColumns = columns.filter(({ key }) => keys.has(key));
    const escape = (value: unknown) => {
      const raw = String(value ?? '');
      const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
      return `"${safe.replaceAll('"', '""')}"`;
    };
    const valueFor = (candidate: any, key: string) => key === 'skills'
      ? (candidate.skills ?? []).map((skill: any) => skill.skillName).join('; ')
      : candidate[key];
    const csv = [
      allowedColumns.map(({ label }) => escape(label)).join(','),
      ...candidates.map((candidate) => allowedColumns.map(({ key }) => escape(valueFor(candidate, key))).join(',')),
    ].join('\r\n');
    await this.auditService.logAction({
      actorId: recruiterId,
      actorRole: UserRole.RECRUITER,
      action: 'EXPORT_CANDIDATE_LIST',
      resourceType: 'PlacementDrive',
      resourceId: driveId,
      driveId,
      metadata: { rowCount: candidates.length, status: status ?? null, columns: allowedColumns.map(({ key }) => key) },
    });
    return `\uFEFF${csv}`;
  }

  /** Overview reads touch no student data, but are logged so the trail is complete. */
  private logListing(recruiterId: string, action: string, grants: any[]) {
    return this.auditService.logAction({
      actorId: recruiterId,
      actorRole: UserRole.RECRUITER,
      action,
      resourceType: 'RecruiterAccessGrant',
      metadata: { driveIds: grants.map((g) => String(g.driveId?._id ?? g.driveId)) },
    });
  }

  /** Maps an application to only the fields released by the drive grant. */
  async mapCandidateData(application: any, releasedFields: string[]) {
    const student = await this.studentsService.getProfileByUserId(application.studentId.toString());
    const studentName = releasedFields.includes('studentName')
      ? await this.studentsService.getFullNameByUserId(application.studentId.toString())
      : undefined;
    const mapped: any = {
      id: application.id,
    };

    if (releasedFields.includes('studentName')) {
      mapped.studentName = studentName || 'Confidential candidate';
    }
    if (releasedFields.includes('studentEmail')) {
      mapped.studentEmail = await this.studentsService.getEmailByUserId(application.studentId.toString());
    }
    if (releasedFields.includes('registrationNumber')) {
      mapped.registrationNumber = student.registrationNumber;
    }
    if (releasedFields.includes('department')) {
      mapped.department = student.department;
    }
    if (releasedFields.includes('graduationYear')) {
      mapped.graduationYear = student.graduationYear;
    }
    if (releasedFields.includes('cgpa')) {
      mapped.cgpa = student.cgpa;
    }
    if (releasedFields.includes('skills')) {
      mapped.skills = application.matchSnapshot?.skills || [];
    }
    if (releasedFields.includes('projects')) mapped.projects = student.projects || [];
    if (releasedFields.includes('internshipExperience')) mapped.internshipExperience = student.internshipExperience || [];
    if (releasedFields.includes('resumeUrl')) mapped.resumeUrl = student.resumeUrl;
    if (releasedFields.includes('skillMatchCoverage')) {
      mapped.skillMatchCoverage = application.matchSnapshot?.requiredSkillCoverage;
    }
    if (releasedFields.includes('applicationStatus')) {
      mapped.applicationStatus = application.status;
      mapped.recruiterNotes = application.recruiterNotes;
    }
    // Personal links also need the student's own consent (Settings > Privacy).
    const privacy = resolvePreferences((student as any).preferences).privacy;
    if (releasedFields.includes('linkedinUrl') && privacy.shareProfileLinks && privacy.showLinkedin) {
      mapped.linkedinUrl = student.linkedinUrl;
    }
    if (releasedFields.includes('githubUrl') && privacy.shareProfileLinks && privacy.showGithub) {
      mapped.githubUrl = student.githubUrl;
    }
    if (releasedFields.includes('portfolioUrl') && privacy.shareProfileLinks && privacy.showPortfolio) {
      mapped.portfolioUrl = student.portfolioUrl;
    }

    return mapped;
  }
}
