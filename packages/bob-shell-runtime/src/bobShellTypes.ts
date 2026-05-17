import type { ChildProcessWithoutNullStreams } from 'node:child_process';

export type BobShellPromptMode = 'stdin' | 'argument';

export interface BobShellCommandConfig {
  command: string;
  args: string[];
  analyze_args?: string[];
  evaluate_args?: string[];
  prompt_mode?: BobShellPromptMode;
  prompt_arg?: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeout_ms: number;
}

export interface BobShellExecutionRequest {
  prompt: string;
  workspace_dir: string;
  purpose: 'analyze_repo' | 'evaluate_answer' | 'repair_json';
  on_process_spawn?: (child: ChildProcessWithoutNullStreams) => void;
}

export interface BobShellExecutionResult {
  ok: boolean;
  exit_code: number | null;
  stdout: string;
  stderr: string;
  duration_ms: number;
  timed_out: boolean;
  error_message?: string;
}

export interface ExtractedJsonResult {
  raw_text: string;
  extracted_text: string;
  parsed: unknown;
}

export class BobShellUnavailableError extends Error {
  override name = 'BobShellUnavailableError';
}

export class BobShellExecutionError extends Error {
  override name = 'BobShellExecutionError';
}

export class BobJsonExtractionError extends Error {
  override name = 'BobJsonExtractionError';
}

export class BobShellNotConfiguredError extends Error {
  override name = 'BobShellNotConfiguredError';
}

export class BobShellBinaryNotFoundError extends Error {
  override name = 'BobShellBinaryNotFoundError';
}

export class BobShellPreflightFailedError extends Error {
  override name = 'BobShellPreflightFailedError';
}
