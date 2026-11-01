import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from '@placecampus/shared-types';
import { NotificationsService } from './notifications.service.js';

const idOf = (value: any) => String(value?.id ?? value?._id ?? value ?? '');

@Injectable()
export class NotificationsListener {
  constructor(private readonly notificationsService: NotificationsService) {}

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

  @OnEvent('preparation.created', { async: true })
  async preparationCreated({ plan }: { plan: any }) { await this.plan(plan, NotificationType.PREPARATION_PLAN_CREATED, 'Preparation plan created', 'Your preparation plan is ready.', `created`); }

  @OnEvent('preparation.completed', { async: true })
  async preparationCompleted({ plan }: { plan: any }) { await this.plan(plan, NotificationType.PREPARATION_PLAN_COMPLETED, 'Preparation plan completed', 'You completed your preparation plan.', `completed`); }

  private async plan(plan: any, type: NotificationType, title: string, message: string, suffix: string) {
    await this.notificationsService.createFromEvent({ recipientId: plan.studentId, type, title, message, actionUrl: `/student/preparation/${idOf(plan)}`, entityType: 'preparation-plan', entityId: idOf(plan), idempotencyKey: `preparation:${idOf(plan)}:${suffix}` });
  }
}
