import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { RuntimeEnv } from '../env';
import { runtimeError } from './errorResponse';

export interface ActiveRunRecord {
  run_id: string;
  started_at: number;
}

export interface RuntimeLimitSnapshot {
  active_runs: Record<string, ActiveRunRecord>;
  total_runs: number;
  run_timestamps: number[];
  updated_at: string;
}

function emptySnapshot(): RuntimeLimitSnapshot {
  return {
    active_runs: {},
    total_runs: 0,
    run_timestamps: [],
    updated_at: new Date().toISOString()
  };
}

function normalizeSnapshot(raw: unknown): RuntimeLimitSnapshot {
  if (!raw || typeof raw !== 'object') return emptySnapshot();
  const candidate = raw as Partial<RuntimeLimitSnapshot>;
  const active: Record<string, ActiveRunRecord> = {};
  if (candidate.active_runs && typeof candidate.active_runs === 'object') {
    for (const [runId, record] of Object.entries(candidate.active_runs)) {
      if (!record || typeof record !== 'object') continue;
      const maybe = record as Partial<ActiveRunRecord>;
      if (typeof maybe.run_id === 'string' && Number.isFinite(maybe.started_at)) {
        active[runId] = { run_id: maybe.run_id, started_at: Number(maybe.started_at) };
      }
    }
  }
  return {
    active_runs: active,
    total_runs: Number.isFinite(candidate.total_runs) && Number(candidate.total_runs) >= 0 ? Number(candidate.total_runs) : 0,
    run_timestamps: Array.isArray(candidate.run_timestamps)
      ? candidate.run_timestamps.map(Number).filter((value) => Number.isFinite(value) && value > 0)
      : [],
    updated_at: typeof candidate.updated_at === 'string' ? candidate.updated_at : new Date().toISOString()
  };
}

function pruneHourlyTimestamps(snapshot: RuntimeLimitSnapshot, now = Date.now()): RuntimeLimitSnapshot {
  return {
    ...snapshot,
    run_timestamps: snapshot.run_timestamps.filter((timestamp) => now - timestamp < 60 * 60 * 1000)
  };
}

export class PersistentRuntimeLimitStore {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async initializeForBoot(): Promise<void> {
    await this.withLock(async () => {
      const snapshot = await this.readUnlocked();
      await this.writeUnlocked({
        ...snapshot,
        active_runs: {},
        updated_at: new Date().toISOString()
      });
    });
  }

  async reserveRun(env: RuntimeEnv, runId: string): Promise<RuntimeLimitSnapshot> {
    return this.withLock(async () => {
      const now = Date.now();
      const snapshot = pruneHourlyTimestamps(await this.readUnlocked(), now);
      const activeCount = Object.keys(snapshot.active_runs).length;
      if (activeCount >= env.max_concurrent_runs) {
        throw runtimeError('RUN_LIMIT_REACHED', 'Concurrent run limit reached.', 429);
      }
      if (snapshot.total_runs >= env.max_runs_total) {
        throw runtimeError('RUN_LIMIT_REACHED', 'Total run limit reached for this deployment.', 429);
      }
      if (snapshot.run_timestamps.length >= env.max_runs_per_hour) {
        throw runtimeError('RUN_LIMIT_REACHED', 'Hourly run limit reached for this deployment.', 429);
      }

      const updated: RuntimeLimitSnapshot = {
        active_runs: {
          ...snapshot.active_runs,
          [runId]: { run_id: runId, started_at: now }
        },
        total_runs: snapshot.total_runs + 1,
        run_timestamps: [...snapshot.run_timestamps, now],
        updated_at: new Date().toISOString()
      };
      await this.writeUnlocked(updated);
      return updated;
    });
  }

  async releaseRun(runId: string): Promise<RuntimeLimitSnapshot> {
    return this.withLock(async () => {
      const snapshot = await this.readUnlocked();
      const activeRuns = { ...snapshot.active_runs };
      delete activeRuns[runId];
      const updated: RuntimeLimitSnapshot = {
        ...snapshot,
        active_runs: activeRuns,
        updated_at: new Date().toISOString()
      };
      await this.writeUnlocked(updated);
      return updated;
    });
  }

  async snapshot(): Promise<RuntimeLimitSnapshot> {
    return this.withLock(async () => pruneHourlyTimestamps(await this.readUnlocked()));
  }

  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.queue;
    let release!: () => void;
    this.queue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous.catch(() => undefined);
    try {
      return await operation();
    } finally {
      release();
    }
  }

  private async readUnlocked(): Promise<RuntimeLimitSnapshot> {
    try {
      const text = await readFile(this.filePath, 'utf8');
      return normalizeSnapshot(JSON.parse(text));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptySnapshot();
      throw error;
    }
  }

  private async writeUnlocked(snapshot: RuntimeLimitSnapshot): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    await rename(tempPath, this.filePath);
  }
}
