import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ApplicationStatus,
  DriveStatus,
  EvidenceStatus,
  PreparationPlanStatus,
} from '@placecampus/shared-types';
import { User } from '../users/schemas/user.schema.js';
import { StudentProfile } from '../students/schemas/student-profile.schema.js';
import { StudentSkillProfile } from '../skills/schemas/student-skill-profile.schema.js';
import { ReadinessSnapshot } from '../readiness/schemas/readiness-snapshot.schema.js';
import { PlacementDrive } from '../drives/schemas/placement-drive.schema.js';
import { PlacementApplication } from '../applications/schemas/application.schema.js';
import { Evidence } from '../evidence/schemas/evidence.schema.js';
import { PreparationPlan } from '../preparation/schemas/preparation-plan.schema.js';
import { AnalyticsQueryDto } from './dto/analytics-query.dto.js';

const DEFINITIONS = {
  currentReadiness: 'Latest valid readiness snapshot per student; students without a snapshot are excluded.',
  publishedDrives: 'Placement drives whose current status is PUBLISHED.',
  evidencePercentage: 'Verified evidence divided by all stored evidence records in the selected scope.',
  applicationStatuses: 'Current PlacementApplication.status values; no offer or placement state is inferred.',
  preparationCompletion: 'Mean persisted PreparationPlan.completionPercentage; item status is calculated by the preparation module.',
};

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<any>,
    @InjectModel(StudentProfile.name) private readonly profileModel: Model<any>,
    @InjectModel(StudentSkillProfile.name) private readonly skillProfileModel: Model<any>,
    @InjectModel(ReadinessSnapshot.name) private readonly readinessModel: Model<any>,
    @InjectModel(PlacementDrive.name) private readonly driveModel: Model<any>,
    @InjectModel(PlacementApplication.name) private readonly applicationModel: Model<any>,
    @InjectModel(Evidence.name) private readonly evidenceModel: Model<any>,
    @InjectModel(PreparationPlan.name) private readonly preparationModel: Model<any>,
  ) {}

  async getOverview(query: AnalyticsQueryDto) {
    const match = this.dateMatch(query);
    const [registered, usableProfiles, readiness, published, applications, evidence, activePlans] = await Promise.all([
      this.userModel.countDocuments({ role: 'student' }).exec(),
      this.profileModel.countDocuments(this.profileFilter(query)).exec(),
      this.latestReadinessSummary(query),
      this.driveModel.countDocuments({ status: DriveStatus.PUBLISHED, ...this.dateFields('createdAt', query) }).exec(),
      this.applicationModel.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).exec(),
      this.evidenceModel.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).exec(),
      this.preparationModel.countDocuments({ status: PreparationPlanStatus.ACTIVE, ...this.dateFields('createdAt', query) }).exec(),
    ]);

    return {
      definitions: DEFINITIONS,
      students: {
        registered,
        usableProfiles,
        withReadinessSnapshots: readiness.students,
      },
      readiness: { average: readiness.average, byStatus: readiness.byStatus },
      drives: { published },
      applicationsByStatus: this.toRecord(applications),
      evidenceByStatus: this.toRecord(evidence),
      activePreparationPlans: activePlans,
    };
  }

  async getReadiness(query: AnalyticsQueryDto) {
    const latest = await this.latestReadiness(query);
    const scores = latest.map((item) => item.overallScore).filter((value) => typeof value === 'number');
    const factorMap = new Map<string, { score: number; contribution: number; coverage: number }>();
    for (const item of latest) {
      for (const factor of item.explanation?.factors || []) {
        const current = factorMap.get(factor.key) || { score: 0, contribution: 0, coverage: 0 };
        current.score += factor.score || 0;
        current.contribution += factor.contribution || 0;
        current.coverage += factor.coverage ? 1 : 0;
        factorMap.set(factor.key, current);
      }
    }
    const departments = new Map<string, { count: number; total: number }>();
    const graduationYears = new Map<string, { count: number; total: number }>();
    for (const item of latest) {
      const department = item.profile?.department || 'Unknown';
      const departmentValue = departments.get(department) || { count: 0, total: 0 };
      departmentValue.count += 1;
      departmentValue.total += item.overallScore;
      departments.set(department, departmentValue);
      const year = String(item.profile?.graduationYear || 'Unknown');
      const yearValue = graduationYears.get(year) || { count: 0, total: 0 };
      yearValue.count += 1;
      yearValue.total += item.overallScore;
      graduationYears.set(year, yearValue);
    }
    const statusCounts = this.countBy(latest, (item) => item.status);
    const missingFactors = latest.filter((item) => (item.coverageCount ?? 0) < 5).length;
    return {
      filters: query,
      studentsWithSnapshots: latest.length,
      mean: this.average(scores),
      median: this.median(scores),
      byStatus: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
      byDepartment: this.mapGrouped(departments),
      byGraduationYear: this.mapGrouped(graduationYears).map((item) => ({ graduationYear: item.group, count: item.count, average: item.average })),
      factorBreakdown: Array.from(factorMap.entries()).map(([key, value]) => ({
        key,
        averageScore: this.round(value.score / Math.max(latest.length, 1)),
        averageContribution: this.round(value.contribution / Math.max(latest.length, 1)),
        coverageCount: value.coverage,
      })),
      coverage: {
        averageFactorsPresent: this.round(latest.reduce((sum, item) => sum + (item.coverageCount || 0), 0) / Math.max(latest.length, 1)),
        studentsMissingFactors: missingFactors,
      },
      limitations: latest.length ? [] : ['No persisted readiness snapshots are available for the selected scope.'],
    };
  }

  async getSkills(query: AnalyticsQueryDto) {
    const driveMatch: any = { status: DriveStatus.PUBLISHED, ...this.dateFields('createdAt', query) };
    if (query.driveId) driveMatch._id = query.driveId;
    const demand = await this.driveModel.aggregate([
      { $match: driveMatch },
      { $unwind: '$requirements.skills' },
      { $group: {
        _id: '$requirements.skills.skillId',
        skillName: { $first: '$requirements.skills.skillName' },
        driveIds: { $addToSet: '$_id' },
        requiredDemand: { $sum: { $cond: ['$requirements.skills.isOptional', 0, 1] } },
        optionalDemand: { $sum: { $cond: ['$requirements.skills.isOptional', 1, 0] } },
        requiredLevels: { $push: { $cond: ['$requirements.skills.isOptional', null, '$requirements.skills.minimumLevel'] } },
      } },
    ]).exec();
    const supplied = await this.skillProfileModel.aggregate([
      { $unwind: '$skills' },
      { $match: { 'skills.verificationStatus': 'VERIFIED' } },
      { $lookup: { from: 'student_profiles', let: { student: { $toString: '$studentId' } }, pipeline: [{ $match: { $expr: { $eq: [{ $toString: '$userId' }, '$$student'] } } }], as: 'profile' } },
      { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
      { $match: this.profileMatchExpression(query) },
      { $group: { _id: '$skills.skillId', students: { $addToSet: { id: '$studentId', level: '$skills.level' } } } },
    ]).exec();
    const supplyMap = new Map(supplied.map((row: any) => [String(row._id), row.students || []]));
    return {
      filters: query,
      scope: 'Published drives in the selected reporting scope; required and optional demand are separated.',
      skills: demand.map((row: any) => {
        const levels = (row.requiredLevels || []).filter((value: number | null) => value !== null);
        const requiredLevel = levels.length ? Math.max(...levels) : 0;
        const students = supplyMap.get(String(row._id)) || [];
        const meeting = students.filter((student: any) => student.level >= requiredLevel).length;
        return {
          skillId: String(row._id),
          skillName: row.skillName || String(row._id),
          driveCount: row.driveIds?.length || 0,
          requiredDemand: row.requiredDemand || 0,
          optionalDemand: row.optionalDemand || 0,
          averageRequiredLevel: this.average(levels) ?? 0,
          verifiedStudents: students.length,
          studentsMeetingRequiredLevel: requiredLevel ? meeting : students.length,
          supplyGap: Math.max((row.requiredDemand || 0) - meeting, 0),
        };
      }).sort((a: any, b: any) => b.supplyGap - a.supplyGap),
      limitations: ['Supply is counted once per verified student and canonical skill. Skill requirements are measured as published-drive demand occurrences, not unique students.'],
    };
  }

  async getPlacements(query: AnalyticsQueryDto) {
    this.validateDateRange(query);
    const match = { ...this.dateFields('appliedAt', query), ...(query.driveId ? { driveId: query.driveId } : {}) };
    const [byStatus, byDrive, activity] = await Promise.all([
      this.applicationModel.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]).exec(),
      this.applicationModel.aggregate([{ $match: match }, { $group: { _id: '$driveId', count: { $sum: 1 }, statuses: { $push: '$status' } } }]).exec(),
      this.applicationModel.aggregate([{ $match: match }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$appliedAt' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]).exec(),
    ]);
    const departmentRows = await this.applicationModel.aggregate([
      { $match: match },
      { $lookup: { from: 'student_profiles', let: { student: { $toString: '$studentId' } }, pipeline: [{ $match: { $expr: { $eq: [{ $toString: '$userId' }, '$$student'] } } }], as: 'profile' } },
      { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
      { $group: { _id: { $ifNull: ['$profile.department', 'Unknown'] }, count: { $sum: 1 } } },
    ]).exec();
    const counts = this.toRecord(byStatus);
    return {
      filters: query,
      byStatus: Object.entries(counts).map(([status, count]) => ({ status, count })),
      byDrive: byDrive.map((row: any) => ({ driveId: String(row._id), count: row.count, statuses: this.countValues(row.statuses) })),
      byDepartment: departmentRows.map((row: any) => ({ department: row._id, count: row.count })),
      activity: activity.map((row: any) => ({ date: row._id, count: row.count })),
      conversion: {
        appliedToUnderReview: this.ratio(counts[ApplicationStatus.UNDER_REVIEW], counts[ApplicationStatus.APPLIED]),
        underReviewToShortlisted: this.ratio(counts[ApplicationStatus.SHORTLISTED], counts[ApplicationStatus.UNDER_REVIEW]),
      },
      limitations: ['Only current application status is persisted; historical funnel transitions and offers are not inferred.'],
    };
  }

  async getEvidence(query: AnalyticsQueryDto) {
    const match = this.dateMatch(query);
    const [total, verified, byStatus, byType] = await Promise.all([
      this.evidenceModel.countDocuments(match).exec(),
      this.evidenceModel.countDocuments({ ...match, status: EvidenceStatus.VERIFIED }).exec(),
      this.evidenceModel.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]).exec(),
      this.evidenceModel.aggregate([{ $match: match }, { $group: { _id: '$type', statuses: { $push: '$status' } } }]).exec(),
    ]);
    return {
      filters: query,
      total,
      verified,
      verifiedPercentage: total ? this.round((verified / total) * 100) : null,
      byStatus: byStatus.map((row: any) => ({ status: row._id, count: row.count })),
      byType: byType.map((row: any) => ({ type: row._id, statuses: this.countValues(row.statuses) })),
      limitations: total ? [] : ['No evidence records are available for the selected scope.'],
    };
  }

  async getPreparation(query: AnalyticsQueryDto) {
    const match = this.dateMatch(query);
    const [byStatus, completion, commonGaps, plans] = await Promise.all([
      this.preparationModel.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]).exec(),
      this.preparationModel.aggregate([{ $match: match }, { $group: { _id: null, average: { $avg: '$completionPercentage' } } }]).exec(),
      this.preparationModel.aggregate([{ $match: match }, { $unwind: '$items' }, { $group: { _id: { skillId: '$items.skillId', skillName: '$items.skillName' }, count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]).exec(),
      this.preparationModel.find(match).select('studentId createdAt updatedAt status completionPercentage').lean().exec(),
    ]);
    return {
      filters: query,
      byStatus: byStatus.map((row: any) => ({ status: row._id, count: row.count })),
      averageCompletionPercentage: completion[0]?.average == null ? null : this.round(completion[0].average),
      completionByDepartment: [],
      commonGaps: commonGaps.map((row: any) => ({ skillId: String(row._id.skillId), skillName: row._id.skillName, count: row.count })),
      observedReadinessChange: { available: false, sampleSize: 0, averageChange: null, explanation: 'Observed before/after readiness requires a completed plan and comparable persisted snapshots; this endpoint does not infer causation.' },
      limitations: plans.length ? ['Department completion is unavailable when preparation plans do not persist department ownership.'] : ['No preparation plans are available for the selected scope.'],
    };
  }

  private async latestReadinessSummary(query: AnalyticsQueryDto) {
    const latest = await this.latestReadiness(query);
    return { students: latest.length, average: this.average(latest.map((item) => item.overallScore)), byStatus: this.countBy(latest, (item) => item.status) };
  }

  private async latestReadiness(query: AnalyticsQueryDto) {
    return this.readinessModel.aggregate([
      { $match: this.dateMatch(query) },
      { $sort: { calculatedAt: -1 } },
      { $group: { _id: '$studentId', snapshot: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$snapshot' } },
      { $lookup: { from: 'student_profiles', let: { student: { $toString: '$studentId' } }, pipeline: [{ $match: { $expr: { $eq: [{ $toString: '$userId' }, '$$student'] } } }], as: 'profile' } },
      { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
      { $match: this.profileMatchExpression(query) },
      { $project: { overallScore: 1, status: 1, coverageCount: 1, explanation: 1, profile: 1 } },
    ]).exec();
  }

  private dateMatch(query: AnalyticsQueryDto) {
    this.validateDateRange(query);
    return this.dateFields('createdAt', query);
  }

  private validateDateRange(query: AnalyticsQueryDto) {
    if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
      throw new BadRequestException('from must be before or equal to to');
    }
  }

  private dateFields(field: string, query: AnalyticsQueryDto) {
    if (!query.from && !query.to) return {};
    const value: Record<string, Date> = {};
    if (query.from) value.$gte = new Date(query.from);
    if (query.to) value.$lte = new Date(query.to);
    return { [field]: value };
  }

  private profileFilter(query: AnalyticsQueryDto) {
    const filter: Record<string, unknown> = {};
    if (query.department) filter.department = query.department;
    if (query.graduationYear) filter.graduationYear = query.graduationYear;
    return filter;
  }

  private profileMatchExpression(query: AnalyticsQueryDto) {
    const expressions: any[] = [];
    if (query.department) expressions.push({ $eq: ['$profile.department', query.department] });
    if (query.graduationYear) expressions.push({ $eq: ['$profile.graduationYear', query.graduationYear] });
    return expressions.length ? { $expr: { $and: expressions } } : {};
  }

  private toRecord(rows: Array<{ _id: string; count: number }>) {
    return rows.reduce<Record<string, number>>((result, row) => {
      result[String(row._id)] = row.count;
      return result;
    }, {});
  }

  private countValues(values: string[]) {
    return values.reduce<Record<string, number>>((result, value) => {
      result[value] = (result[value] || 0) + 1;
      return result;
    }, {});
  }

  private countBy<T>(items: T[], getKey: (item: T) => string) {
    return items.reduce<Record<string, number>>((result, item) => {
      const key = getKey(item);
      result[key] = (result[key] || 0) + 1;
      return result;
    }, {});
  }

  private mapGrouped(groups: Map<string, { count: number; total: number }>) {
    return Array.from(groups.entries()).map(([group, value]) => ({ group, count: value.count, average: this.round(value.total / value.count) }));
  }

  private average(values: number[]) {
    return values.length ? this.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
  }

  private median(values: number[]) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return this.round(sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2);
  }

  private ratio(numerator = 0, denominator = 0) {
    return denominator ? this.round((numerator / denominator) * 100) : null;
  }

  private round(value: number) {
    return Math.round(value * 10) / 10;
  }
}
