import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ApplicationStatus, UserRole } from '@placecampus/shared-types';
import { RecruiterAccessService } from '../recruiter-access/recruiter-access.service.js';
import { ApplicationsService } from '../applications/applications.service.js';
import { StudentsService } from '../students/students.service.js';
import { AuditService } from '../audit/audit.service.js';
import { RecruiterService, buildFunnel } from './recruiter.service.js';
import { RecruiterInterview, RecruiterInterviewDocument } from './schemas/recruiter-interview.schema.js';
import { driveLifecycle } from './drive-lifecycle.js';

const asId = (value: any) => String(value?._id ?? value);
const DAY = 86_400_000;
const pct = (part: number, whole: number) => (whole ? Number(((part / whole) * 100).toFixed(1)) : 0);
/** Statuses that mean an application has at least reached the interview stage. */
const INTERVIEW_OR_LATER = new Set<string>([ApplicationStatus.INTERVIEW_SCHEDULED, ApplicationStatus.OFFER_RELEASED, ApplicationStatus.SELECTED]);
const SHORTLIST_OR_LATER = new Set<string>([ApplicationStatus.SHORTLISTED, ...INTERVIEW_OR_LATER]);

export interface CandidateListFilters {
  page: number;
  limit: number;
  driveId?: string;
  company?: string;
  status?: string;
  q?: string;
  department?: string;
  minCgpa?: number;
  maxCgpa?: number;
  graduationYear?: number;
  skill?: string;
}

export interface AnalyticsFilters {
  from?: Date;
  to?: Date;
  driveId?: string;
  company?: string;
  department?: string;
  status?: string;
}

@Injectable()
export class RecruiterInsightsService {
  constructor(
    @InjectModel(RecruiterInterview.name) private readonly interviewModel: Model<RecruiterInterviewDocument>,
    private readonly recruiterAccess: RecruiterAccessService,
    private readonly recruiterService: RecruiterService,
    private readonly applications: ApplicationsService,
    private readonly students: StudentsService,
    private readonly audit: AuditService,
  ) {}

  private async grants(recruiterId: string, scope: { driveId?: string; company?: string } = {}) {
    const grants = await this.recruiterAccess.getMyActiveGrants(recruiterId);
    if (scope.driveId && !grants.some((grant: any) => asId(grant.driveId) === scope.driveId)) {
      await this.audit.logAction({ actorId: recruiterId, actorRole: UserRole.RECRUITER, action: 'DENIED_CROSS_DRIVE_ACCESS', resourceType: 'PlacementDrive', resourceId: scope.driveId, driveId: scope.driveId, success: false });
      throw new ForbiddenException('You do not have active access to this drive');
    }
    return grants.filter((grant: any) => (!scope.driveId || asId(grant.driveId) === scope.driveId)
      && (!scope.company || grant.driveId?.companyName === scope.company));
  }

  private releasedOn(grants: any[], field: string) {
    return grants.filter((grant) => grant.releasedFields.includes(field)).map((grant) => asId(grant.driveId));
  }

  private async interviewCountsByDrive(driveIds: string[]) {
    if (!driveIds.length) return {} as Record<string, { total: number; scheduled: number; completed: number }>;
    const rows = await this.interviewModel.aggregate([
      { $match: { driveId: { $in: driveIds.map((id) => new Types.ObjectId(id)) } } },
      { $group: { _id: { driveId: '$driveId', status: '$status' }, count: { $sum: 1 } } },
    ]).exec();
    const result: Record<string, { total: number; scheduled: number; completed: number }> = {};
    for (const id of driveIds) result[id] = { total: 0, scheduled: 0, completed: 0 };
    for (const row of rows) {
      const entry = result[asId(row._id.driveId)];
      if (!entry || row._id.status === 'CANCELLED') continue;
      entry.total += row.count;
      if (row._id.status === 'SCHEDULED') entry.scheduled += row.count;
      if (row._id.status === 'COMPLETED') entry.completed += row.count;
    }
    return result;
  }

  /** Per-drive summary used by the dashboard and the assigned-drives page. */
  async getDriveSummaries(recruiterId: string) {
    const summaries = await this.recruiterService.getDashboardSummary(recruiterId);
    const interviews = await this.interviewCountsByDrive(summaries.map((item: any) => asId(item.drive)));
    return summaries.map((item: any) => ({ ...item, interviewCounts: interviews[asId(item.drive)] ?? { total: 0, scheduled: 0, completed: 0 } }));
  }

  async getDriveDetail(recruiterId: string, driveId: string) {
    await this.grants(recruiterId, { driveId });
    const summary = (await this.getDriveSummaries(recruiterId)).find((item: any) => asId(item.drive) === driveId);
    if (!summary) throw new NotFoundException('Drive not found');
    return summary;
  }

  /** Recent events on assigned drives, assembled from application and interview records. */
  async getActivities(recruiterId: string, limit = 10) {
    const grants = await this.grants(recruiterId);
    const driveIds = grants.map((grant: any) => asId(grant.driveId));
    if (!driveIds.length) return [];
    const grantByDrive = new Map(grants.map((grant: any) => [asId(grant.driveId), grant]));
    const statusDrives = this.releasedOn(grants, 'applicationStatus');
    const now = new Date();
    const [newApplications, decisions, interviews] = await Promise.all([
      this.applications.findLeanForDrives(driveIds, { appliedAt: { $lte: now } }).then((rows) => rows.sort((a: any, b: any) => +new Date(b.appliedAt) - +new Date(a.appliedAt)).slice(0, limit)),
      this.applications.findLeanForDrives(statusDrives, { reviewedAt: { $lte: now }, status: { $ne: ApplicationStatus.APPLIED } }).then((rows) => rows.sort((a: any, b: any) => +new Date(b.reviewedAt) - +new Date(a.reviewedAt)).slice(0, limit)),
      this.interviewModel.find({ driveId: { $in: driveIds.map((id) => new Types.ObjectId(id)) }, updatedAt: { $lte: now } }).sort({ updatedAt: -1 }).limit(limit).lean().exec(),
    ]);
    const name = async (studentId: string, driveId: string) => {
      const grant: any = grantByDrive.get(driveId);
      return grant?.releasedFields.includes('studentName') ? (await this.students.getFullNameByUserId(studentId)) || 'A candidate' : 'A candidate';
    };
    const driveLabel = (driveId: string) => {
      const drive: any = (grantByDrive.get(driveId) as any)?.driveId;
      return drive ? `${drive.companyName} · ${drive.roleTitle}` : 'an assigned drive';
    };
    const statusText: Record<string, string> = {
      UNDER_REVIEW: 'moved to review', SHORTLISTED: 'was shortlisted', INTERVIEW_SCHEDULED: 'moved to interviews',
      OFFER_RELEASED: 'received an offer', SELECTED: 'was selected', REJECTED: 'was not progressed', WITHDRAWN: 'withdrew',
    };
    const items = [
      ...await Promise.all(newApplications.map(async (app: any) => ({
        id: `application:${asId(app._id)}`, type: 'APPLICATION_SUBMITTED', title: 'New application',
        message: `${await name(app.studentId, app.driveId)} applied to ${driveLabel(app.driveId)}.`,
        at: app.appliedAt, href: `/recruiter/drives/${app.driveId}/candidates/${asId(app._id)}`,
      }))),
      ...await Promise.all(decisions.map(async (app: any) => ({
        id: `status:${asId(app._id)}`, type: `STATUS_${app.status}`, title: app.status.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase()),
        message: `${await name(app.studentId, app.driveId)} ${statusText[app.status] ?? 'was updated'} for ${driveLabel(app.driveId)}.`,
        at: app.reviewedAt, href: `/recruiter/drives/${app.driveId}/candidates/${asId(app._id)}`,
      }))),
      ...await Promise.all(interviews.map(async (interview: any) => {
        const driveId = asId(interview.driveId);
        const who = await name(asId(interview.studentId), driveId);
        const done = interview.status === 'COMPLETED';
        return {
          id: `interview:${asId(interview._id)}`, type: done ? 'INTERVIEW_COMPLETED' : `INTERVIEW_${interview.status}`,
          title: done ? 'Interview feedback submitted' : interview.status === 'CANCELLED' ? 'Interview cancelled' : 'Interview scheduled',
          message: `${interview.round} with ${who} for ${driveLabel(driveId)}${done ? '' : ` on ${new Date(interview.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}.`,
          at: interview.updatedAt, href: '/recruiter/interviews',
        };
      })),
    ];
    return items.sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, limit);
  }

  /** Candidates across every assigned drive (or one drive/company), honouring each grant's released fields. */
  async listCandidates(recruiterId: string, filters: CandidateListFilters) {
    const grants = await this.grants(recruiterId, { driveId: filters.driveId, company: filters.company });
    const page = Math.max(1, Math.floor(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Math.floor(filters.limit) || 25));
    if (!grants.length) return { candidates: [], total: 0, page, limit, totalPages: 0 };
    const grantByDrive = new Map(grants.map((grant: any) => [asId(grant.driveId), grant]));
    const { applications, total } = await this.applications.findScopedPaginated({
      driveIds: grants.map((grant: any) => asId(grant.driveId)),
      page,
      limit,
      status: filters.status ? { value: filters.status, driveIds: this.releasedOn(grants, 'applicationStatus') } : undefined,
      query: filters.q ? { text: filters.q, studentName: this.releasedOn(grants, 'studentName'), studentEmail: this.releasedOn(grants, 'studentEmail'), registrationNumber: this.releasedOn(grants, 'registrationNumber') } : undefined,
      department: filters.department ? { value: filters.department, driveIds: this.releasedOn(grants, 'department') } : undefined,
      cgpa: filters.minCgpa != null || filters.maxCgpa != null ? { min: filters.minCgpa, max: filters.maxCgpa, driveIds: this.releasedOn(grants, 'cgpa') } : undefined,
      graduationYear: filters.graduationYear != null ? { value: filters.graduationYear, driveIds: this.releasedOn(grants, 'graduationYear') } : undefined,
      skill: filters.skill ? { value: filters.skill, driveIds: this.releasedOn(grants, 'skills') } : undefined,
    });
    const candidates = await Promise.all(applications.map(async (application: any) => {
      const grant: any = grantByDrive.get(asId(application.driveId));
      const drive = grant.driveId;
      return {
        ...await this.recruiterService.mapCandidateData(application, grant.releasedFields),
        driveId: asId(drive),
        companyName: drive.companyName,
        roleTitle: drive.roleTitle,
        appliedAt: application.appliedAt,
        releasedFields: grant.releasedFields,
        canManageApplications: Boolean(grant.canManageApplications && grant.isDemoData && process.env.DEMO_MODE === 'true'),
      };
    }));
    await this.audit.logAction({
      actorId: recruiterId, actorRole: UserRole.RECRUITER, action: filters.status === ApplicationStatus.SHORTLISTED ? 'VIEW_SHORTLIST' : 'VIEW_CANDIDATE_LIST',
      resourceType: 'RecruiterAccessGrant',
      metadata: { page, shown: candidates.length, driveIds: [...grantByDrive.keys()], filters: Object.fromEntries(Object.entries(filters).filter(([key, value]) => !['page', 'limit'].includes(key) && value != null && value !== '').map(([key]) => [key, true])), applicationIds: applications.map((a: any) => asId(a._id)) },
    });
    return { candidates, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Candidate profile plus that student's applications and interviews on drives this recruiter can access. */
  async getCandidateProfile(recruiterId: string, applicationId: string) {
    if (!Types.ObjectId.isValid(applicationId)) throw new NotFoundException('Application not found');
    const application = await this.applications.findOne(applicationId);
    const driveId = asId(application.driveId);
    const detail = await this.recruiterService.getCandidateDetail(recruiterId, driveId, applicationId);
    const grants = await this.grants(recruiterId);
    const grantByDrive = new Map(grants.map((grant: any) => [asId(grant.driveId), grant]));
    const history = await this.applications.findByStudentForDrives(String(application.studentId), [...grantByDrive.keys()]);
    const interviews = await this.interviewModel.find({ applicationId: { $in: history.map((app: any) => app._id) } }).sort({ startsAt: 1 }).lean().exec();
    return {
      ...detail,
      driveId,
      applicationHistory: history.map((app: any) => {
        const grant: any = grantByDrive.get(asId(app.driveId));
        const drive = grant.driveId;
        const statusShared = grant.releasedFields.includes('applicationStatus');
        return {
          applicationId: asId(app._id), driveId: asId(drive), companyName: drive.companyName, roleTitle: drive.roleTitle,
          appliedAt: app.appliedAt, status: statusShared ? app.status : undefined, lastUpdated: statusShared ? app.updatedAt : undefined,
          interviews: interviews.filter((interview: any) => asId(interview.applicationId) === asId(app._id)).map((interview: any) => ({
            id: asId(interview._id), round: interview.round, startsAt: interview.startsAt, status: interview.status,
            recommendation: interview.feedback?.recommendation, technicalScore: interview.feedback?.technicalKnowledge, communicationScore: interview.feedback?.communication,
          })),
        };
      }),
    };
  }

  // ---------------------------------------------------------------------------
  // Analytics
  // ---------------------------------------------------------------------------

  private async analyticsScope(recruiterId: string, filters: AnalyticsFilters) {
    const grants = await this.grants(recruiterId, { driveId: filters.driveId, company: filters.company });
    const allDriveIds = grants.map((grant: any) => asId(grant.driveId));
    const statusDrives = new Set(this.releasedOn(grants, 'applicationStatus'));
    const departmentDrives = new Set(this.releasedOn(grants, 'department'));
    const match: Record<string, any> = {};
    if (filters.from || filters.to) match.appliedAt = { ...(filters.from ? { $gte: filters.from } : {}), ...(filters.to ? { $lte: filters.to } : {}) };
    // A status or branch filter can only be evaluated on drives that release that field.
    let driveIds = allDriveIds;
    if (filters.status) { driveIds = driveIds.filter((id) => statusDrives.has(id)); match.status = filters.status; }
    if (filters.department) driveIds = driveIds.filter((id) => departmentDrives.has(id));
    let rows: any[] = await this.applications.findLeanForDrives(driveIds, match);
    // Department is only resolved for students whose application sits on a drive that releases it.
    const departments = await this.students.getDepartmentsByUserIds([...new Set(rows
      .filter((row) => departmentDrives.has(String(row.driveId)))
      .map((row) => String(row.studentId)))]);
    if (filters.department) rows = rows.filter((row) => departments.get(String(row.studentId)) === filters.department);
    return { grants, driveIds, statusDrives, departmentDrives, rows, departments };
  }

  async getAnalytics(recruiterId: string, filters: AnalyticsFilters) {
    const scope = await this.analyticsScope(recruiterId, filters);
    const { grants, rows, statusDrives, departmentDrives, departments } = scope;
    const statusRows = rows.filter((row) => statusDrives.has(String(row.driveId)));
    const counts = statusRows.reduce<Record<string, number>>((acc, row) => ({ ...acc, [row.status]: (acc[row.status] ?? 0) + 1 }), {});
    const funnel = buildFunnel(counts);
    const reachedShortlist = statusRows.filter((row) => SHORTLIST_OR_LATER.has(row.status)).length;
    const reachedInterview = statusRows.filter((row) => INTERVIEW_OR_LATER.has(row.status)).length;
    const offers = statusRows.filter((row) => [ApplicationStatus.OFFER_RELEASED, ApplicationStatus.SELECTED].includes(row.status)).length;

    // Interviews on the same applications (so every filter applies to them as well).
    const now = Date.now();
    const interviewDocs = rows.length
      ? await this.interviewModel.find({ applicationId: { $in: rows.map((row) => row._id) }, status: { $ne: 'CANCELLED' } }).select('driveId status startsAt feedback.recommendation').lean().exec()
      : [];
    const completed = interviewDocs.filter((doc: any) => doc.status === 'COMPLETED');
    const advanced = completed.filter((doc: any) => doc.feedback?.recommendation === 'ADVANCE').length;
    const interviewStats = {
      total: interviewDocs.length,
      scheduled: interviewDocs.filter((doc: any) => doc.status === 'SCHEDULED').length,
      upcoming: interviewDocs.filter((doc: any) => doc.status === 'SCHEDULED' && +new Date(doc.startsAt) >= now).length,
      pendingFeedback: interviewDocs.filter((doc: any) => doc.status === 'SCHEDULED' && +new Date(doc.startsAt) < now).length,
      completed: completed.length,
      successRate: pct(advanced, completed.filter((doc: any) => doc.feedback?.recommendation).length),
    };

    // Daily trend for ranges up to ~3 months, weekly beyond that.
    const to = filters.to ? +filters.to : now;
    const earliest = rows.reduce((min, row) => Math.min(min, +new Date(row.appliedAt)), to);
    const from = filters.from ? +filters.from : Math.max(earliest, to - 90 * DAY);
    const bucketSize = to - from > 95 * DAY ? 7 * DAY : DAY;
    const startOfDay = (time: number) => { const d = new Date(time); d.setUTCHours(0, 0, 0, 0); return +d; };
    const buckets = new Map<number, { date: string; applications: number; shortlisted: number; selected: number; offers: number }>();
    for (let t = startOfDay(from); t <= to; t += bucketSize) buckets.set(t, { date: new Date(t).toISOString().slice(0, 10), applications: 0, shortlisted: 0, selected: 0, offers: 0 });
    const bucketFor = (time: number) => {
      const index = Math.floor((time - startOfDay(from)) / bucketSize);
      return buckets.get(startOfDay(from) + index * bucketSize);
    };
    for (const row of rows) {
      const applied = bucketFor(+new Date(row.appliedAt));
      if (applied) applied.applications += 1;
      if (!statusDrives.has(String(row.driveId)) || !row.reviewedAt) continue;
      const decided = bucketFor(+new Date(row.reviewedAt));
      if (!decided) continue;
      if (SHORTLIST_OR_LATER.has(row.status)) decided.shortlisted += 1;
      if (row.status === ApplicationStatus.SELECTED) decided.selected += 1;
      if (row.status === ApplicationStatus.OFFER_RELEASED || row.status === ApplicationStatus.SELECTED) decided.offers += 1;
    }

    const interviewsByDrive = interviewDocs.reduce<Record<string, number>>((acc, doc: any) => ({ ...acc, [asId(doc.driveId)]: (acc[asId(doc.driveId)] ?? 0) + 1 }), {});
    const driveStats = grants.filter((grant: any) => scope.driveIds.includes(asId(grant.driveId))).map((grant: any) => {
      const id = asId(grant.driveId);
      const driveRows = rows.filter((row) => String(row.driveId) === id);
      const shared = statusDrives.has(id);
      const by = (statuses: Set<string> | string[]) => (shared ? driveRows.filter((row) => (Array.isArray(statuses) ? statuses.includes(row.status) : statuses.has(row.status))).length : null);
      return {
        driveId: id, companyName: grant.driveId.companyName, roleTitle: grant.driveId.roleTitle, lifecycle: driveLifecycle(grant.driveId),
        applicants: driveRows.length, shortlisted: by(SHORTLIST_OR_LATER), interviews: interviewsByDrive[id] ?? 0,
        offers: by([ApplicationStatus.OFFER_RELEASED, ApplicationStatus.SELECTED]), selected: by([ApplicationStatus.SELECTED]), rejected: by([ApplicationStatus.REJECTED]),
      };
    }).sort((a, b) => b.applicants - a.applicants);

    const branchCounts = new Map<string, { branch: string; applications: number; students: Set<string>; selected: number }>();
    for (const row of rows) {
      if (!departmentDrives.has(String(row.driveId))) continue;
      const branch = departments.get(String(row.studentId)) ?? 'Not recorded';
      const entry = branchCounts.get(branch) ?? { branch, applications: 0, students: new Set<string>(), selected: 0 };
      entry.applications += 1;
      entry.students.add(String(row.studentId));
      if (statusDrives.has(String(row.driveId)) && row.status === ApplicationStatus.SELECTED) entry.selected += 1;
      branchCounts.set(branch, entry);
    }

    await this.audit.logAction({ actorId: recruiterId, actorRole: UserRole.RECRUITER, action: 'VIEW_RECRUITER_ANALYTICS', resourceType: 'RecruiterAccessGrant', metadata: { driveIds: scope.driveIds, filters: Object.keys(filters).filter((key) => (filters as any)[key] != null) } });

    return {
      overview: {
        totalApplications: rows.length,
        uniqueApplicants: new Set(rows.map((row) => String(row.studentId))).size,
        statusShared: statusDrives.size > 0,
        funnel,
        selection: {
          selected: counts[ApplicationStatus.SELECTED] ?? 0,
          offersReleased: offers,
          rejected: counts[ApplicationStatus.REJECTED] ?? 0,
          selectionRate: funnel.selectionRate,
          rejectionRate: funnel.rejectionRate,
          shortlistRate: pct(reachedShortlist, statusRows.length),
          interviewConversionRate: pct(offers, reachedInterview),
          offerAcceptanceRate: pct(counts[ApplicationStatus.SELECTED] ?? 0, offers),
        },
        interviews: interviewStats,
      },
      applications: { bucket: bucketSize === DAY ? 'day' : 'week', from: new Date(from).toISOString(), to: new Date(to).toISOString(), points: [...buckets.values()] },
      drives: driveStats,
      branches: {
        shared: departmentDrives.size > 0,
        items: [...branchCounts.values()].map((entry) => ({ branch: entry.branch, applications: entry.applications, students: entry.students.size, selected: entry.selected })).sort((a, b) => b.applications - a.applications),
      },
      filterOptions: {
        drives: (await this.grants(recruiterId)).map((grant: any) => ({ driveId: asId(grant.driveId), companyName: grant.driveId.companyName, roleTitle: grant.driveId.roleTitle })),
        departments: [...new Set(departments.values())].sort(),
      },
    };
  }
}
