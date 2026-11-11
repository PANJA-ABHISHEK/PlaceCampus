import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { AssignmentAdminService } from './assignment-admin.service.js';

/**
 * Keeps every allocatable student with an active primary mentor without
 * waiting for someone to press "Allocate".
 *
 * Triggers (debounced into one run):
 * - a student or faculty import commits (`import.committed`);
 * - an admin approves a school -> department mapping (`org.mapping_applied`);
 * - a self-registered student's profile is created (`student.profile_created`);
 * - a periodic sweep (default every 30 minutes) and once shortly after start-up,
 *   which also picks up faculty who became available again.
 *
 * Each run is the same deterministic, department-scoped, least-loaded plan the
 * admin preview shows (Master Plan §24 `faculty_assignments`, 1 : ~40 target).
 * Students it cannot place stay in the admin exception queue with a reason.
 *
 * Config: AUTO_MENTOR_ALLOCATION=false disables it;
 * AUTO_MENTOR_ALLOCATION_INTERVAL_MINUTES=0 disables only the sweep.
 */
@Injectable()
export class AutoAllocationService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AutoAllocationService.name);
  readonly enabled: boolean;
  private readonly intervalMs: number;
  private readonly debounceMs: number;
  private debounceTimer?: NodeJS.Timeout;
  private sweepTimer?: NodeJS.Timeout;
  private startupTimer?: NodeJS.Timeout;
  private running: Promise<void> | null = null;
  private pendingTriggers = new Set<string>();

  constructor(
    private readonly admin: AssignmentAdminService,
    config: ConfigService,
  ) {
    this.enabled = config.get<string>('AUTO_MENTOR_ALLOCATION', 'true') !== 'false';
    const minutes = Number(config.get('AUTO_MENTOR_ALLOCATION_INTERVAL_MINUTES') ?? 30);
    this.intervalMs = Number.isFinite(minutes) && minutes > 0 ? minutes * 60_000 : 0;
    this.debounceMs = Number(config.get('AUTO_MENTOR_ALLOCATION_DEBOUNCE_MS') ?? 5_000);
  }

  onApplicationBootstrap() {
    if (!this.enabled) {
      this.logger.log('Automatic mentor allocation is off (AUTO_MENTOR_ALLOCATION=false).');
      return;
    }
    // Not during unit tests that compile a module without a running app.
    if (process.env.VITEST) return;
    this.startupTimer = setTimeout(() => this.request('startup'), 15_000);
    this.startupTimer.unref?.();
    if (this.intervalMs) {
      this.sweepTimer = setInterval(() => this.request('sweep'), this.intervalMs);
      this.sweepTimer.unref?.();
    }
    this.logger.log(
      `Automatic mentor allocation on${this.intervalMs ? ` (sweep every ${this.intervalMs / 60_000} min)` : ''}.`,
    );
  }

  onModuleDestroy() {
    clearTimeout(this.debounceTimer);
    clearTimeout(this.startupTimer);
    clearInterval(this.sweepTimer);
  }

  @OnEvent('import.committed')
  onImport(e: { kind?: string }) {
    this.request(`import:${e?.kind ?? 'unknown'}`);
  }

  @OnEvent('org.mapping_applied')
  onMapping() {
    this.request('department-mapping');
  }

  @OnEvent('student.profile_created')
  onProfileCreated() {
    this.request('student-profile');
  }

  /** Coalesces bursts of triggers into one allocation run. */
  request(trigger: string) {
    if (!this.enabled) return;
    this.pendingTriggers.add(trigger);
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => void this.runNow(), this.debounceMs);
    this.debounceTimer.unref?.();
  }

  /** Runs once; if triggers arrive while running, runs again afterwards. Never throws. */
  async runNow(): Promise<void> {
    if (this.running) {
      await this.running;
      if (!this.pendingTriggers.size) return;
    }
    const triggers = [...this.pendingTriggers];
    this.pendingTriggers.clear();
    const trigger = triggers.join(',') || 'manual';
    this.running = (async () => {
      try {
        const result = await this.admin.autoAllocate(trigger);
        if (result.created || result.skipped) {
          this.logger.log(
            `Auto-allocated ${result.created} mentor(s) [${trigger}]; ${result.totals.unassigned} student(s) still need attention.`,
          );
        }
      } catch (error: any) {
        this.logger.error(`Automatic mentor allocation failed [${trigger}]: ${error.message}`);
      }
    })();
    try {
      await this.running;
    } finally {
      this.running = null;
    }
    if (this.pendingTriggers.size) await this.runNow();
  }
}
