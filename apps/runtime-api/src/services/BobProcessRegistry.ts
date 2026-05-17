import type { ChildProcessWithoutNullStreams } from 'node:child_process';

export interface RegisteredBobProcess {
  run_id: string;
  purpose: string;
  started_at: string;
  child: ChildProcessWithoutNullStreams;
  escalation_timer?: NodeJS.Timeout;
}

export interface CancelBobProcessResult {
  found: boolean;
  signal_sent: 'SIGTERM' | null;
  escalation_scheduled: boolean;
  message: string;
}

export class BobProcessRegistry {
  private readonly active = new Map<string, RegisteredBobProcess>();
  private readonly cancellationRequested = new Set<string>();

  constructor(private readonly killGraceMs = 2500) {}

  register(runId: string, purpose: string, child: ChildProcessWithoutNullStreams): void {
    const existing = this.active.get(runId);
    if (existing && existing.child !== child) {
      this.cancel(runId);
      this.unregister(runId, existing.child);
    }

    const entry: RegisteredBobProcess = {
      run_id: runId,
      purpose,
      started_at: new Date().toISOString(),
      child
    };

    this.active.set(runId, entry);

    child.once('close', () => {
      this.unregister(runId, child);
    });
    child.once('error', () => {
      this.unregister(runId, child);
    });
  }

  unregister(runId: string, child?: ChildProcessWithoutNullStreams): void {
    const entry = this.active.get(runId);
    if (!entry) return;
    if (child && entry.child !== child) return;
    if (entry.escalation_timer) clearTimeout(entry.escalation_timer);
    this.active.delete(runId);
  }

  hasActiveProcess(runId: string): boolean {
    return this.active.has(runId);
  }

  wasCancellationRequested(runId: string): boolean {
    return this.cancellationRequested.has(runId);
  }

  clearCancellationRequest(runId: string): void {
    this.cancellationRequested.delete(runId);
  }

  cancel(runId: string): CancelBobProcessResult {
    this.cancellationRequested.add(runId);
    const entry = this.active.get(runId);
    if (!entry) {
      return {
        found: false,
        signal_sent: null,
        escalation_scheduled: false,
        message: 'No active IBM Bob Shell process is registered for this run.'
      };
    }

    if (entry.escalation_timer) clearTimeout(entry.escalation_timer);

    entry.child.kill('SIGTERM');
    entry.escalation_timer = setTimeout(() => {
      if (entry.child.exitCode === null && entry.child.signalCode === null) {
        entry.child.kill('SIGKILL');
      }
      this.unregister(runId, entry.child);
    }, this.killGraceMs);
    entry.escalation_timer.unref?.();

    return {
      found: true,
      signal_sent: 'SIGTERM',
      escalation_scheduled: true,
      message: 'IBM Bob Shell process cancellation requested.'
    };
  }
}
