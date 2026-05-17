import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { RunState } from '@bobquest/onboarding-contracts';
import { runStatePath } from './runStatePaths';

function isEnoent(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT');
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export class FileRunStateStore {
  constructor(private readonly baseDir: string) {}

  async save(state: RunState): Promise<RunState> {
    const file = runStatePath(this.baseDir, state.run_id);
    await mkdir(dirname(file), { recursive: true });
    const payload = `${JSON.stringify(state, null, 2)}\n`;
    const tempFile = `${file}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempFile, payload, 'utf8');
    await rename(tempFile, file);
    return state;
  }

  async get(runId: string): Promise<RunState | null> {
    const file = runStatePath(this.baseDir, runId);
    let lastParseError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const text = await readFile(file, 'utf8');
        return JSON.parse(text) as RunState;
      } catch (error) {
        if (isEnoent(error)) return null;
        if (error instanceof SyntaxError) {
          lastParseError = error;
          await delay(10 * (attempt + 1));
          continue;
        }
        throw error;
      }
    }
    throw lastParseError instanceof Error ? lastParseError : new Error('Run state JSON could not be parsed.');
  }

  async require(runId: string): Promise<RunState> {
    const state = await this.get(runId);
    if (!state) {
      const error = new Error(`Run state not found: ${runId}`) as Error & { code?: string; statusCode?: number };
      error.code = 'RUN_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }
    return state;
  }

  async remove(runId: string): Promise<void> {
    await rm(runStatePath(this.baseDir, runId), { force: true });
  }
}
