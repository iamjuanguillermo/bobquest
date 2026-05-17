import { resolve } from 'node:path';

export function sanitizeRunId(runId: string): string {
  return runId.replace(/[^A-Za-z0-9_-]/g, '_');
}

export function runStatePath(baseDir: string, runId: string): string {
  return resolve(baseDir, sanitizeRunId(runId), 'run_state.json');
}
