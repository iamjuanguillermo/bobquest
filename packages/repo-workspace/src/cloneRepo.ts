import { spawn } from 'node:child_process';
import type { ValidatedGitHubRepo } from './githubUrl';

export interface CloneRepoOptions {
  repo: ValidatedGitHubRepo;
  destination_dir: string;
  timeout_ms: number;
  git_binary?: string;
}

export interface CloneRepoResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exit_code: number | null;
  timed_out: boolean;
}

export class CloneRepoError extends Error {
  override name = 'CloneRepoError';
}

export async function shallowCloneRepo(options: CloneRepoOptions): Promise<CloneRepoResult> {
  const git = options.git_binary || 'git';
  const args = ['clone', '--depth', '1', '--no-tags', options.repo.url, options.destination_dir];
  const child = spawn(git, args, {
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
      GCM_INTERACTIVE: 'never',
      GIT_ASKPASS: '',
      SSH_ASKPASS: ''
    }
  });
  let stdout = '';
  let stderr = '';
  let timedOut = false;

  const timeout = setTimeout(() => {
    timedOut = true;
    child.kill('SIGTERM');
    setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL');
    }, 1_000).unref();
  }, options.timeout_ms);

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    stdout += String(chunk);
  });
  child.stderr.on('data', (chunk) => {
    stderr += String(chunk);
  });

  return new Promise((resolve, reject) => {
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(new CloneRepoError(error.message));
    });
    child.on('close', (exitCode) => {
      clearTimeout(timeout);
      resolve({ ok: exitCode === 0 && !timedOut, stdout, stderr, exit_code: exitCode, timed_out: timedOut });
    });
  });
}
