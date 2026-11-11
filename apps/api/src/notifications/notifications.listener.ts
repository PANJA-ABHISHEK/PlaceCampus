import { Injectable, Optional } from '@nestjs/common';
import { UsersService } from '../users/users.service.js';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from '@placecampus/shared-types';
import { NotificationsService } from './notifications.service.js';

const idOf = (value: any) => String(value?.id ?? value?._id ?? value ?? '');

@Injectable()
export class NotificationsListener {
  constructor(
    private readonly notificationsService: NotificationsService,
    @Optional() private readonly usersService?: UsersService,
  ) {}

  @OnEvent('assignment.changed', { async: true })
  async assignmentChanged(e: { studentId: string; studentName: string; newFacultyId: string; newFacultyName: string; previousFacultyId?: string; previousFacultyName?: string; purposes: string[] }) {
    const role = e.purposes.includes('MENTOR') ? 'mentor' : 'assigned faculty member';
    const stamp = Date.now();
    await this.notificationsService.createFromEvent({
      recipientId: e.studentId, type: NotificationType.MENTOR_ASSIGNED,
      title: e.previousFacultyId ? `Your ${role} has changed` : `Your ${role} has been assigned`,
      message: `${e.newFacultyName} is now your ${role}.`, actionUrl: '/student/profile',
      entityType: 'faculty-assignment', entityId: e.studentId, idempotencyKey: `assignment:${e.studentId}:${e.newFacultyId}:${stamp}`,
    });
    await this.notificationsService.createFromEvent({
      recipientId: e.newFacultyId, type: NotificationType.MENTOR_ASSIGNED, title: 'New student assigned',
      message: `${e.studentName} has been assigned to you as ${role}.`, actionUrl: `/faculty/students/${e.studentId}`,
      entityType: 'faculty-assignment', entityId: e.studentId, idempotencyKey: `assignment:new:${e.studentId}:${e.newFacultyId}:${stamp}`,
    });
    if (e.previousFacultyId) {
      await this.notificationsService.createFromEvent({
        recipientId: e.previousFacultyId, type: NotificationType.MENTOR_ASSIGNED, title: 'Student reassigned',
        message: `${e.studentName} has been reassigned to ${e.newFacultyName}.`, actionUrl: '/faculty/students',
        entityType: 'faculty-assignment', entityId: e.studentId, idempotencyKey: `assignment:old:${e.studentId}:${e.previousFacultyId}:${stamp}`,
      });
    }
  }

  @OnEvent('review.assigned', { async: true })
  async reviewAssigned({ evidenceId, reviewerId, title, dueAt }: { evidenceId: string; reviewerId: string; title: string; dueAt: Date }) {
    await this.notificationsService.createFromEvent({
      recipientId: reviewerId,
      type: NotificationType.REVIEW_ASSIGNED,
      title: 'Verification requested',
      message: `“${title}” is waiting for your review (due ${new Date(dueAt).toDateString()}).`,
      actionUrl: `/faculty/reviews/${evidenceId}`,
      entityType: 'evidence',
      entityId: evidenceId,
      idempotencyKey: `review:${evidenceId}:${reviewerId}:${new Date(dueAt).getTime()}`,
    });
  }

  @OnEvent('evidence.decision', { async: true })
  async evidenceDecision({ evidence }: { evidence: any }) {
    const type = evidence.status === 'VERIFIED'
      ? NotificationType.EVIDENCE_VERIFIED
      : evidence.status === 'REJECTED'
        ? NotificationType.EVIDENCE_REJECTED
        : NotificationType.EVIDENCE_RESUBMISSION_REQUESTED;
    await this.notificationsService.createFromEvent({
      recipientId: evidence.studentId,
      type,
      title: 'Evidence review updated',
      message: `Your evidence “${evidence.title}” is ${evidence.status.toLowerCase().replaceAll('_', ' ')}.`,
      actionUrl: `/student/evidence/${idOf(evidence)}`,
      entityType: 'evidence',
      entityId: idOf(evidence),
      idempotencyKey: `evidence:${idOf(evidence)}:${evidence.status}`,
    });
  }

  @OnEvent('application.created', { async: true })
  async applicationCreated({ application }: { application: any }) {
    await this.notificationsService.createFromEvent({
      recipientId: application.studentId,
      type: NotificationType.APPLICATION_SUBMITTED,
      title: 'Application submitted',
      message: 'Your placement application was submitted successfully.',
      actionUrl: `/student/applications/${idOf(application)}`,
      entityType: 'application',
      entityId: idOf(application),
      idempotencyKey: `application:${idOf(application)}:created`,
    });
  }

  @OnEvent('application.status-changed', { async: true })
  async applicationStatusChanged({ application, previousStatus }: { application: any; previousStatus: string }) {
    await this.notificationsService.createFromEvent({
      recipientId: application.studentId,
      type: NotificationType.APPLICATION_STATUS_CHANGED,
      title: 'Application status updated',
      message: `Your application is now ${application.status.replaceAll('_', ' ').toLowerCase()}.`,
      actionUrl: `/student/applications/${idOf(application)}`,
      entityType: 'application',
      entityId: idOf(application),
      idempotencyKey: `application:${idOf(application)}:${previousStatus}:${application.status}`,
    });
  }

  @OnEvent('assessment.evaluated', { async: true })
  async assessmentEvaluated({ attempt }: { attempt: any }) {
    const assessmentId = idOf(attempt.assessmentId);
    await this.notificationsService.createFromEvent({
      recipientId: attempt.studentId,
      type: NotificationType.ASSESSMENT_EVALUATED,
      title: 'Assessment evaluated',
      message: `Your assessment result is available${typeof attempt.percentage === 'number' ? `: ${attempt.percentage}%` : '.'}`,
      actionUrl: assessmentId ? `/student/assessments/${assessmentId}/attempt` : '/student/assessments',
      entityType: 'assessment-attempt', entityId: idOf(attempt),
      idempotencyKey: `assessment:${idOf(attempt)}:evaluated`,
    });
  }

  @OnEvent('interview.evaluated', { async: true })
  async interviewEvaluated({ interview }: { interview: any }) {
    await this.notificationsService.createFromEvent({
      recipientId: interview.studentId,
      type: NotificationType.INTERVIEW_FEEDBACK,
      title: 'Mock interview feedback available',
      message: 'Your mock interview feedback is now available.',
      actionUrl: '/student/interviews',
      entityType: 'mock-interview', entityId: idOf(interview),
      idempotencyKey: `interview:${idOf(interview)}:evaluated`,
    });
  }

  // Times are left out of messages: the server can't know each recipient's
  // timezone, and the linked page shows the time in local time.
  @OnEvent('interview.booked', { async: true })
  async interviewBooked({ interview }: { interview: any }) {
    const id = idOf(interview);
    await this.notificationsService.createFromEvent({
      recipientId: idOf(interview.studentId),
      type: NotificationType.INTERVIEW_SCHEDULED,
      title: 'Mock interview booked',
      message: `Your ${interview.type} mock interview is confirmed. Open Interviews for the time and meeting link.`,
      actionUrl: '/student/interviews',
      entityType: 'mock-interview', entityId: id,
      idempotencyKey: `interview:${id}:booked:student`,
    });
    await this.notificationsService.createFromEvent({
      recipientId: idOf(interview.interviewerId),
      type: NotificationType.INTERVIEW_SCHEDULED,
      title: 'New mock interview booking',
      message: `A student booked your ${interview.type} interview slot.`,
      actionUrl: `/faculty/interviews/${id}`,
      entityType: 'mock-interview', entityId: id,
      idempotencyKey: `interview:${id}:booked:faculty`,
    });
  }

  @OnEvent('interview.scheduled', { async: true })
  async interviewScheduled({ interview }: { interview: any }) {
    const id = idOf(interview);
    await this.notificationsService.createFromEvent({
      recipientId: idOf(interview.studentId),
      type: NotificationType.INTERVIEW_SCHEDULED,
      title: 'Mock interview scheduled',
      message: `Your interviewer scheduled a ${interview.type} mock interview${interview.title ? ` (“${interview.title}”)` : ''}. Open Interviews for the time and instructions.`,
      actionUrl: '/student/interviews',
      entityType: 'mock-interview', entityId: id,
      idempotencyKey: `interview:${id}:scheduled`,
    });
  }

  @OnEvent('interview.rescheduled', { async: true })
  async interviewRescheduled({ interview, reason }: { interview: any; reason?: string }) {
    const id = idOf(interview);
    await this.notificationsService.createFromEvent({
      recipientId: idOf(interview.studentId),
      type: NotificationType.INTERVIEW_SCHEDULED,
      title: 'Mock interview rescheduled',
      message: `Your ${interview.type} mock interview has a new time${reason ? `: ${reason}` : '.'} Open Interviews to see it.`,
      actionUrl: '/student/interviews',
      entityType: 'mock-interview', entityId: id,
      // One notification per move.
      idempotencyKey: `interview:${id}:rescheduled:${interview.scheduledAt}`,
    });
  }

  @OnEvent('interview.started', { async: true })
  async interviewStarted({ interview }: { interview: any }) {
    if (!interview.roomId) return;
    const id = idOf(interview);
    await this.notificationsService.createFromEvent({
      recipientId: idOf(interview.studentId),
      type: NotificationType.INTERVIEW_SCHEDULED,
      title: 'Your interviewer is ready',
      message: `Your ${interview.type} mock interview has started. Join the waiting room now.`,
      actionUrl: `/student/interviews/room/${interview.roomId}`,
      entityType: 'mock-interview', entityId: id,
      idempotencyKey: `interview:${id}:started`,
    });
  }

  @OnEvent('interview.cancelled', { async: true })
  async interviewCancelled({ interview, cancelledBy }: { interview: any; cancelledBy: 'STUDENT' | 'FACULTY' }) {
    const id = idOf(interview);
    const byStudent = cancelledBy === 'STUDENT';
    await this.notificationsService.createFromEvent({
      recipientId: byStudent ? idOf(interview.interviewerId) : idOf(interview.studentId),
      type: NotificationType.INTERVIEW_CANCELLED,
      title: 'Mock interview cancelled',
      message: byStudent
        ? `A student cancelled their ${interview.type} interview.${interview.slotId ? " The slot is open again." : ""}`
        : `Your ${interview.type} mock interview was cancelled by the interviewer${interview.cancellationReason ? `: ${interview.cancellationReason}` : '.'}`,
      actionUrl: byStudent ? '/faculty/interviews' : '/student/interviews',
      entityType: 'mock-interview', entityId: id,
      idempotencyKey: `interview:${id}:cancelled`,
    });
  }

  @OnEvent('drive.published', { async: true })
  async drivePublished({ drive }: { drive: any }) {
    if (!this.usersService) return;
    const studentIds = await this.usersService.findActiveStudentIds();
    await this.notificationsService.createForRecipients(studentIds, {
      type: NotificationType.DRIVE_PUBLISHED,
      title: `New placement drive: ${drive.companyName}`,
      message: `${drive.companyName} is hiring for ${drive.roleTitle}. Check your eligibility and skill match.`,
      actionUrl: `/student/drives/${idOf(drive)}`,
      entityType: 'placement-drive',
      entityId: idOf(drive),
      idempotencyKeyPrefix: `drive:${idOf(drive)}:published`,
    });
  }

  @OnEvent('preparation.created', { async: true })
  async preparationCreated({ plan }: { plan: any }) { await this.plan(plan, NotificationType.PREPARATION_PLAN_CREATED, 'Preparation plan created', 'Your preparation plan is ready.', `created`); }

  @OnEvent('preparation.completed', { async: true })
  async preparationCompleted({ plan }: { plan: any }) { await this.plan(plan, NotificationType.PREPARATION_PLAN_COMPLETED, 'Preparation plan completed', 'You completed your preparation plan.', `completed`); }

  private async plan(plan: any, type: NotificationType, title: string, message: string, suffix: string) {
    await this.notificationsService.createFromEvent({ recipientId: plan.studentId, type, title, message, actionUrl: `/student/preparation/${idOf(plan)}`, entityType: 'preparation-plan', entityId: idOf(plan), idempotencyKey: `preparation:${idOf(plan)}:${suffix}` });
  }
}
