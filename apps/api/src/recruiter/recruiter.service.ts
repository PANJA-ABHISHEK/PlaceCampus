import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RecruiterAccessService } from '../recruiter-access/recruiter-access.service.js';
import { DrivesService } from '../drives/drives.service.js';
import { ApplicationsService } from '../applications/applications.service.js';
import { StudentsService } from '../students/students.service.js';
import { resolvePreferences } from '../students/student-preferences.js';
import { AuditService } from '../audit/audit.service.js';
import { ApplicationStatus, UserRole } from '@placecampus/shared-types';

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
      expiresAt: g.expiresAt,
      releasedFields: g.releasedFields,
    }));
  }

  /** Aggregate dashboard values only over this recruiter's active access grants. */
  async getDashboardSummary(recruiterId: string) {
    const grants = await this.recruiterAccessService.getMyActiveGrants(recruiterId);
    await this.logListing(recruiterId, 'VIEW_DASHBOARD', grants);
    return Promise.all(grants.map(async (grant: any) => {
      const drive = grant.driveId;
      const driveId = String(drive?._id ?? drive);
      const canSeeApplicationStatus = grant.releasedFields.includes('applicationStatus');
      const [candidateCount, shortlistedCount] = await Promise.all([
        this.applicationsService.countForDrive(driveId),
        canSeeApplicationStatus
          ? this.applicationsService.countForDrive(driveId, ApplicationStatus.SHORTLISTED)
          : Promise.resolve(null),
      ]);
      return {
        grantId: grant.id,
        drive,
        expiresAt: grant.expiresAt,
        releasedFields: grant.releasedFields,
        candidateCount,
        shortlistedCount,
      };
    }));
  }

  async getCandidates(recruiterId: string, driveId: string, page = 1, limit = 10, status?: string, query?: string) {
    const grant = await this.recruiterAccessService.getActiveGrant(driveId, recruiterId);
    if (!grant) {
      await this.auditService.logAction({
        actorId: recruiterId, actorRole: UserRole.RECRUITER, action: 'DENIED_CROSS_DRIVE_ACCESS',
        resourceType: 'PlacementDrive', resourceId: driveId, driveId, success: false,
      });
      throw new ForbiddenException('You do not have active access to this drive');
    }

    const searchQuery = grant.releasedFields.includes('studentName')
      ? query
      : undefined;
    const { applications, total } =
      await this.applicationsService.findAllForDrivePaginated(
        driveId,
        page,
        limit,
        status,
        searchQuery,
      );

    const candidates = await Promise.all(applications.map(async (app) => {
      return this.mapCandidateData(app, grant.releasedFields);
    }));

    await this.auditService.logAction({
      actorId: recruiterId, actorRole: UserRole.RECRUITER, action: 'VIEW_CANDIDATE_LIST',
      resourceType: 'PlacementDrive', resourceId: driveId, driveId,
      metadata: { page, shown: candidates.length, applicationIds: applications.map((a: any) => String(a.id ?? a._id)) },
    });

    return { candidates, total, page, limit, totalPages: Math.ceil(total / limit) };
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

    return { ...mapped, expiresAt: grant.expiresAt };
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

  private async mapCandidateData(application: any, releasedFields: string[]) {
    const student = await this.studentsService.getProfileByUserId(application.studentId.toString());
    const mapped: any = {
      id: application.id,
      studentId: application.studentId,
    };

    if (releasedFields.includes('studentName')) {
      // Need user full name, or assume studentService populates user?
      mapped.studentName = (student as any).userId?.fullName || 'Hidden Name';
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
    if (releasedFields.includes('skillMatchCoverage')) {
      mapped.skillMatchCoverage = application.matchSnapshot?.requiredSkillCoverage;
    }
    if (releasedFields.includes('applicationStatus')) {
      mapped.applicationStatus = application.status;
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
