import type { BobShellExecutionResult } from '@bobquest/bob-shell-runtime';

export interface RuntimeLogger {
  info(payload: Record<string, unknown>, message?: string): void;
  warn(payload: Record<string, unknown>, message?: string): void;
  error(payload: Record<string, unknown>, message?: string): void;
}

export const REDACTED_BOB_LOG_FIELDS = ['stdout_redacted', 'stderr_redacted', 'raw_output_redacted', 'prompt_redacted'] as const;

export const noopRuntimeLogger: RuntimeLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined
};

export function bobResultLogSummary(result: BobShellExecutionResult): Record<string, unknown> {
  return {
    exit_code: result.exit_code,
    duration_ms: result.duration_ms,
    timed_out: result.timed_out,
    stdout_bytes: Buffer.byteLength(result.stdout || '', 'utf8'),
    stderr_bytes: Buffer.byteLength(result.stderr || '', 'utf8')
  };
}

export function runtimeLogFields(fields: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (key === 'stdout' || key === 'stderr' || key === 'raw_output' || key === 'prompt') {
      sanitized[`${key}_redacted`] = true;
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
}
