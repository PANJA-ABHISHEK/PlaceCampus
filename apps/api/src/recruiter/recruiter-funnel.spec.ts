import { describe, expect, it } from 'vitest';
import { buildFunnel } from './recruiter.service.js';
import { driveLifecycle } from './drive-lifecycle.js';

const DAY = 86_400_000;
const now = Date.UTC(2026, 10, 22);
const iso = (offsetDays: number) => new Date(now + offsetDays * DAY).toISOString();

describe('buildFunnel', () => {
  it('counts every application once and keeps conversions at or below 100%', () => {
    const funnel = buildFunnel({ total: 100, APPLIED: 30, UNDER_REVIEW: 20, SHORTLISTED: 15, INTERVIEW_SCHEDULED: 10, OFFER_RELEASED: 5, SELECTED: 5, REJECTED: 15 });
    expect(funnel.totalApplications).toBe(100);
    expect(funnel.stages.map((stage) => stage.reached)).toEqual([85, 55, 35, 20, 10, 5]);
    expect(funnel.stages.every((stage) => stage.conversionFromPrevious <= 100)).toBe(true);
    expect(funnel.stages[1].conversionFromPrevious).toBeCloseTo(64.7, 1);
    expect(funnel.selectionRate).toBe(5);
    expect(funnel.rejectionRate).toBe(15);
  });

  it('handles an empty pipeline without dividing by zero', () => {
    const funnel = buildFunnel({ total: 0 });
    expect(funnel.totalApplications).toBe(0);
    expect(funnel.selectionRate).toBe(0);
    expect(funnel.stages[2].conversionFromPrevious).toBe(0);
  });
});

describe('driveLifecycle', () => {
  it('classifies drives from dates and status', () => {
    expect(driveLifecycle({ status: 'PUBLISHED', applicationStart: iso(-10), applicationDeadline: iso(10) }, now)).toBe('ACTIVE');
    expect(driveLifecycle({ status: 'PUBLISHED', applicationStart: iso(5), applicationDeadline: iso(30) }, now)).toBe('UPCOMING');
    expect(driveLifecycle({ status: 'DRAFT' }, now)).toBe('UPCOMING');
    expect(driveLifecycle({ status: 'PUBLISHED', applicationStart: iso(-40), applicationDeadline: iso(-1) }, now)).toBe('EXPIRED');
    expect(driveLifecycle({ status: 'CLOSED', applicationDeadline: iso(-30) }, now)).toBe('COMPLETED');
    expect(driveLifecycle({ status: 'CLOSED', applicationDeadline: iso(-6), demoLifecycleStatus: 'EXPIRED' }, now)).toBe('EXPIRED');
    expect(driveLifecycle({ status: 'CANCELLED' }, now)).toBe('CANCELLED');
  });
});
