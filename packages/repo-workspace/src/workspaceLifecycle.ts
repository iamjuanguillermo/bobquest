import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { ValidatedGitHubRepo } from './githubUrl';

export interface WorkspaceInfo {
  run_id: string;
  workspace_id: string;
  root_dir: string;
  repo_dir: string;
  repo: ValidatedGitHubRepo;
  created_at: string;
}

export interface WorkspaceCleanupSummary {
  scanned: number;
  removed: number;
  skipped: number;
  failed: number;
  failures: Array<{ path: string; message: string }>;
}

export async function createWorkspace(baseDir: string, runId: string, repo: ValidatedGitHubRepo): Promise<WorkspaceInfo> {
  const safeRunId = runId.replace(/[^A-Za-z0-9_-]/g, '_');
  const root_dir = resolve(baseDir, safeRunId);
  const repo_dir = join(root_dir, 'repo');
  await mkdir(repo_dir, { recursive: true });
  return {
    run_id: safeRunId,
    workspace_id: safeRunId,
    root_dir,
    repo_dir,
    repo,
    created_at: new Date().toISOString()
  };
}

export async function cleanupWorkspace(workspace: Pick<WorkspaceInfo, 'root_dir'>): Promise<void> {
  await rm(workspace.root_dir, { recursive: true, force: true });
}

export async function cleanupExpiredWorkspaces(baseDir: string, ttlMs: number, nowMs: number = Date.now()): Promise<WorkspaceCleanupSummary> {
  const summary: WorkspaceCleanupSummary = { scanned: 0, removed: 0, skipped: 0, failed: 0, failures: [] };
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) return summary;

  let entries: Array<{ name: string; isDirectory(): boolean }>;
  try {
    entries = await readdir(baseDir, { withFileTypes: true, encoding: 'utf8' });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return summary;
    throw error;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      summary.skipped += 1;
      continue;
    }
    const fullPath = join(baseDir, entry.name);
    summary.scanned += 1;
    try {
      const info = await stat(fullPath);
      const ageMs = nowMs - info.mtimeMs;
      if (ageMs < ttlMs) {
        summary.skipped += 1;
        continue;
      }
      await rm(fullPath, { recursive: true, force: true });
      summary.removed += 1;
    } catch (error) {
      summary.failed += 1;
      summary.failures.push({ path: fullPath, message: error instanceof Error ? error.message : 'workspace cleanup failed' });
    }
  }

  return summary;
}
