import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationType, UserRole } from '@placecampus/shared-types';
import { RecruiterAccessService } from '../recruiter-access/recruiter-access.service.js';
import { ApplicationsService } from '../applications/applications.service.js';
import { StudentsService } from '../students/students.service.js';
import { UsersService } from '../users/users.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { AuditService } from '../audit/audit.service.js';
import { ScheduleRecruiterInterviewDto, RecruiterInterviewFeedbackDto, RescheduleRecruiterInterviewDto, CancelRecruiterInterviewDto } from './dto/recruiter-interview.dto.js';
import { RecruiterInterview, RecruiterInterviewDocument } from './schemas/recruiter-interview.schema.js';

const MIN_LEAD_MS = 5 * 60_000;
const asId = (value: any) => String(value?._id ?? value);

@Injectable()
export class RecruiterInterviewsService {
  constructor(
    @InjectModel(RecruiterInterview.name) private readonly interviewModel: Model<RecruiterInterviewDocument>,
    private readonly recruiterAccess: RecruiterAccessService,
    private readonly applications: ApplicationsService,
    private readonly students: StudentsService,
    private readonly users: UsersService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  private async activeGrant(recruiterId: string, driveId: string) {
    const grant = await this.recruiterAccess.getActiveGrant(driveId, recruiterId);
    if (!grant) throw new ForbiddenException('You do not have active access to this drive');
    return grant;
  }

  private async assertOwner(interview: RecruiterInterviewDocument, recruiterId: string) {
    if (asId(interview.recruiterId) !== recruiterId) {
      throw new ForbiddenException('Only the recruiter who scheduled this interview can change it');
    }
    await this.activeGrant(recruiterId, asId(interview.driveId));
  }

  private validateStartsAt(value: string | Date) {
    const startsAt = new Date(value);
    if (!Number.isFinite(startsAt.getTime()) || startsAt.getTime() < Date.now() + MIN_LEAD_MS) {
      throw new BadRequestException('Choose an interview time at least five minutes in the future');
    }
    return startsAt;
  }

  async list(recruiterId: string) {
    const grants = await this.recruiterAccess.getMyActiveGrants(recruiterId);
    const driveIds = grants.map((grant: any) => asId(grant.driveId));
    if (!driveIds.length) return [];
    const grantByDrive = new Map(grants.map((grant: any) => [asId(grant.driveId), grant]));
    const docs = await this.interviewModel.find({ driveId: { $in: driveIds } }).sort({ startsAt: 1, _id: 1 }).lean().exec();
    const records = await Promise.all(docs.map(async (doc: any) => {
      const grant: any = grantByDrive.get(asId(doc.driveId));
      const studentName = grant?.releasedFields?.includes('studentName')
        ? await this.students.getFullNameByUserId(asId(doc.studentId))
        : undefined;
      const interviewer = await this.users.findById(asId(doc.interviewerId)).catch(() => null);
      const { _id, __v, studentId: _studentId, ...safeDoc } = doc;
      return {
        ...safeDoc,
        id: asId(_id),
        driveId: asId(doc.driveId),
        applicationId: asId(doc.applicationId),
        recruiterId: asId(doc.recruiterId),
        interviewerId: asId(doc.interviewerId),
        drive: grant?.driveId ? { companyName: grant.driveId.companyName, roleTitle: grant.driveId.roleTitle } : null,
        candidateName: studentName || 'Confidential candidate',
        interviewerName: interviewer?.fullName || 'Assigned interviewer',
        canManage: asId(doc.recruiterId) === recruiterId,
        canSubmitFeedback: [asId(doc.recruiterId), asId(doc.interviewerId)].includes(recruiterId),
        feedback: doc.feedback ?? null,
      };
    }));
    await this.audit.logAction({
      actorId: recruiterId,
      actorRole: UserRole.RECRUITER,
      action: 'VIEW_RECRUITER_INTERVIEWS',
      resourceType: 'RecruiterInterview',
      metadata: { driveIds, rowCount: records.length },
    });
    return records;
  }

  async schedule(recruiterId: string, dto: ScheduleRecruiterInterviewDto) {
    const grant = await this.activeGrant(recruiterId, dto.driveId);
    const application = await this.applications.findOne(dto.applicationId);
    if (asId(application.driveId) !== dto.driveId) {
      throw new ForbiddenException('The selected candidate application does not belong to this drive');
    }
    if (['REJECTED', 'WITHDRAWN'].includes(application.status)) {
      throw new BadRequestException('This application is no longer eligible for interview scheduling');
    }
    const duplicate = await this.interviewModel.findOne({ applicationId: dto.applicationId, round: dto.round.trim(), status: 'SCHEDULED' }).lean().exec();
    if (duplicate) throw new ConflictException('A scheduled interview already exists for this candidate and round');
    const interviewerId = dto.interviewerId || recruiterId;
    if (interviewerId !== recruiterId) {
      const interviewer = await this.users.findById(interviewerId);
      if (interviewer?.role !== UserRole.RECRUITER || !(await this.recruiterAccess.getActiveGrant(dto.driveId, interviewerId))) {
        throw new ForbiddenException('The interviewer must be a recruiter with active access to this drive');
      }
    }
    let interview: RecruiterInterviewDocument;
    try {
      interview = await this.interviewModel.create({
        driveId: dto.driveId,
        applicationId: dto.applicationId,
        studentId: application.studentId,
        recruiterId,
        interviewerId,
        startsAt: this.validateStartsAt(dto.startsAt),
        round: dto.round.trim(),
        instructions: dto.instructions?.trim() ?? '',
        meetingUrl: dto.meetingUrl?.trim(),
        status: 'SCHEDULED',
      });
    } catch (error: any) {
      if (error?.code === 11000) throw new ConflictException('A scheduled interview already exists for this candidate and round');
      throw error;
    }
    await this.notifyRecruiters([recruiterId, interviewerId], NotificationType.INTERVIEW_SCHEDULED, interview, 'Interview scheduled', `A ${interview.round} interview has been scheduled for ${interview.startsAt.toLocaleString()}.`);
    await this.audit.logAction({ actorId: recruiterId, actorRole: UserRole.RECRUITER, action: 'SCHEDULE_RECRUITER_INTERVIEW', resourceType: 'RecruiterInterview', resourceId: interview.id, driveId: dto.driveId, studentId: asId(application.studentId), metadata: { applicationId: dto.applicationId, interviewerId, startsAt: interview.startsAt, round: interview.round } });
    return interview;
  }

  async reschedule(recruiterId: string, interviewId: string, dto: RescheduleRecruiterInterviewDto) {
    const interview = await this.findOne(interviewId);
    await this.assertOwner(interview, recruiterId);
    if (interview.status !== 'SCHEDULED') throw new BadRequestException('Only scheduled interviews can be rescheduled');
    interview.startsAt = this.validateStartsAt(dto.startsAt);
    await interview.save();
    await this.notifyRecruiters([asId(interview.recruiterId), asId(interview.interviewerId)], NotificationType.INTERVIEW_SCHEDULED, interview, 'Interview rescheduled', `The ${interview.round} interview has been moved to ${interview.startsAt.toLocaleString()}.`);
    await this.audit.logAction({ actorId: recruiterId, actorRole: UserRole.RECRUITER, action: 'RESCHEDULE_RECRUITER_INTERVIEW', resourceType: 'RecruiterInterview', resourceId: interviewId, driveId: asId(interview.driveId), studentId: asId(interview.studentId), metadata: { startsAt: interview.startsAt } });
    return interview;
  }

  async cancel(recruiterId: string, interviewId: string, dto: CancelRecruiterInterviewDto) {
    const interview = await this.findOne(interviewId);
    await this.assertOwner(interview, recruiterId);
    if (interview.status !== 'SCHEDULED') throw new BadRequestException('Only scheduled interviews can be cancelled');
    interview.status = 'CANCELLED';
    interview.cancellationReason = dto.reason?.trim();
    await interview.save();
    await this.notifyRecruiters([asId(interview.recruiterId), asId(interview.interviewerId)], NotificationType.INTERVIEW_CANCELLED, interview, 'Interview cancelled', `The ${interview.round} interview was cancelled.${dto.reason ? ` Reason: ${dto.reason.trim()}` : ''}`);
    await this.audit.logAction({ actorId: recruiterId, actorRole: UserRole.RECRUITER, action: 'CANCEL_RECRUITER_INTERVIEW', resourceType: 'RecruiterInterview', resourceId: interviewId, driveId: asId(interview.driveId), studentId: asId(interview.studentId), metadata: { reasonProvided: !!dto.reason } });
    return interview;
  }

  async submitFeedback(recruiterId: string, interviewId: string, dto: RecruiterInterviewFeedbackDto) {
    const interview = await this.findOne(interviewId);
    await this.activeGrant(recruiterId, asId(interview.driveId));
    if (![asId(interview.recruiterId), asId(interview.interviewerId)].includes(recruiterId)) {
      throw new ForbiddenException('You are not assigned to this interview');
    }
    if (interview.status !== 'SCHEDULED' && interview.status !== 'COMPLETED') {
      throw new BadRequestException('Feedback is unavailable for cancelled interviews');
    }
    if (interview.startsAt.getTime() > Date.now()) {
      throw new BadRequestException('Feedback can be submitted after the scheduled interview time');
    }
    interview.feedback = { ...dto, submittedAt: new Date() };
    interview.status = 'COMPLETED';
    await interview.save();
    await this.audit.logAction({ actorId: recruiterId, actorRole: UserRole.RECRUITER, action: 'SUBMIT_RECRUITER_INTERVIEW_FEEDBACK', resourceType: 'RecruiterInterview', resourceId: interviewId, driveId: asId(interview.driveId), studentId: asId(interview.studentId), metadata: { recommendation: dto.recommendation } });
    return interview;
  }

  private async findOne(id: string) {
    const interview = await this.interviewModel.findById(id).exec();
    if (!interview) throw new NotFoundException('Interview not found');
    return interview;
  }

  private async notifyRecruiters(recipients: string[], type: NotificationType, interview: RecruiterInterviewDocument, title: string, message: string) {
    await this.notifications.createForRecipients([...new Set(recipients)], {
      type,
      title,
      message: message.slice(0, 500),
      actionUrl: '/recruiter/interviews',
      entityType: 'RecruiterInterview',
      entityId: interview.id,
      idempotencyKeyPrefix: `${type}:${interview.id}:${new Date().getTime()}`,
    });
  }
}
