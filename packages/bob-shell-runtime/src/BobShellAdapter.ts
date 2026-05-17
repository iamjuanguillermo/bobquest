import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawn } from 'node:child_process';
import { sep } from 'node:path';
import {
  BobShellExecutionError,
  BobShellUnavailableError,
  BobShellNotConfiguredError,
  BobShellBinaryNotFoundError,
  BobShellPreflightFailedError,
  type BobShellCommandConfig,
  type BobShellExecutionRequest,
  type BobShellExecutionResult,
  type BobShellPromptMode
} from './bobShellTypes';
import type { BobShellStatusResult, BobShellStatus } from './bobShellStatus';

interface PreflightCache {
  result: BobShellStatusResult;
  timestamp: number;
  command: string;
  statusArgs: string;
}

export class BobShellAdapter {
  private preflightCache?: PreflightCache;
  private runtimeDisabled: boolean;

  constructor(
    private readonly config: BobShellCommandConfig & {
      status_args?: string[];
      status_timeout_ms?: number;
      analyze_args?: string[];
      evaluate_args?: string[];
      prompt_mode?: BobShellPromptMode;
      prompt_arg?: string;
      cache_ttl_ms?: number;
      runtime_disabled?: boolean;
    }
  ) {
    this.runtimeDisabled = config.runtime_disabled ?? false;
  }

  async status(forceCheck = false): Promise<BobShellStatusResult> {
    // 1. Check runtime disabled
    if (this.runtimeDisabled) {
      return {
        available: false,
        status: 'disabled',
        message: 'Runtime disabled by configuration.'
      };
    }

    // 2. Check command configured
    if (!this.config.command.trim()) {
      return {
        available: false,
        status: 'not_configured',
        message: 'BOBSHELL_COMMAND is not configured.'
      };
    }

    // 3. Check cache
    const statusArgs = this.config.status_args ?? ['--version'];
    const cacheKey = `${this.config.command}:${statusArgs.join(',')}`;
    
    if (!forceCheck && this.preflightCache && this.isCacheValid(cacheKey)) {
      return this.preflightCache.result;
    }

    // 4. Resolve binary path
    const resolvedPath = await this.resolveBinaryPath(this.config.command);
    if (!resolvedPath) {
      const result: BobShellStatusResult = {
        available: false,
        status: 'binary_not_found',
        message: `IBM Bob Shell command not found: ${this.config.command}`,
        command_path: this.config.command
      };
      this.updateCache(result, cacheKey);
      return result;
    }

    // 5. Run preflight
    const preflightResult = await this.runPreflight(resolvedPath, statusArgs);
    
    // 6. Cache and return
    this.updateCache(preflightResult, cacheKey);
    return preflightResult;
  }

  private async resolveBinaryPath(command: string): Promise<string | null> {
    // If absolute or relative path, verify directly
    if (command.includes(sep) || command.startsWith('.')) {
      try {
        await access(command, constants.X_OK);
        return command;
      } catch {
        return null;
      }
    }

    // Search in PATH
    const pathEnv = process.env.PATH || '';
    const pathSeparator = process.platform === 'win32' ? ';' : ':';
    const paths = pathEnv.split(pathSeparator).filter(Boolean);

    for (const dir of paths) {
      const candidate = `${dir}${sep}${command}`;
      try {
        await access(candidate, constants.X_OK);
        return candidate;
      } catch {
        // Continue searching
      }
    }

    return null;
  }

  private async runPreflight(commandPath: string, statusArgs: string[]): Promise<BobShellStatusResult> {
    const startedAt = Date.now();
    const timeoutMs = this.config.status_timeout_ms ?? 5000;

    return new Promise((resolve) => {
      const child = spawn(commandPath, statusArgs, {
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        setTimeout(() => {
          if (child.exitCode === null && child.signalCode === null) {
            child.kill('SIGKILL');
          }
        }, 2500);
      }, timeoutMs);

      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk) => {
        stdout += String(chunk);
      });
      child.stderr.on('data', (chunk) => {
        stderr += String(chunk);
      });

      child.on('error', () => {
        clearTimeout(timeout);
        resolve({
          available: false,
          status: 'preflight_failed',
          message: 'IBM Bob Shell preflight command failed to execute.',
          command_path: commandPath,
          preflight_duration_ms: Date.now() - startedAt,
          last_check_at: new Date().toISOString()
        });
      });

      child.on('close', (exitCode) => {
        clearTimeout(timeout);
        const durationMs = Date.now() - startedAt;
        const timestamp = new Date().toISOString();

        if (timedOut) {
          resolve({
            available: false,
            status: 'preflight_failed',
            message: 'IBM Bob Shell preflight timed out.',
            command_path: commandPath,
            preflight_duration_ms: durationMs,
            last_check_at: timestamp
          });
          return;
        }

        if (exitCode === 0) {
          const version = this.extractVersion(stdout);
          resolve({
            available: true,
            status: 'ready',
            message: 'IBM Bob Shell preflight passed.',
            version,
            command_path: commandPath,
            preflight_duration_ms: durationMs,
            last_check_at: timestamp
          });
          return;
        }

        // Check for auth-related errors
        const stderrLower = stderr.toLowerCase();
        const authKeywords = ['auth', 'authentication', 'credential', 'credentials', 'unauthorized', 'token'];
        const isAuthError = authKeywords.some(keyword => stderrLower.includes(keyword));

        if (isAuthError) {
          resolve({
            available: false,
            status: 'auth_invalid',
            message: 'IBM Bob Shell preflight failed. Authentication may be invalid.',
            command_path: commandPath,
            preflight_duration_ms: durationMs,
            last_check_at: timestamp
          });
          return;
        }

        resolve({
          available: false,
          status: 'preflight_failed',
          message: `IBM Bob Shell preflight failed with exit code ${exitCode}.`,
          command_path: commandPath,
          preflight_duration_ms: durationMs,
          last_check_at: timestamp
        });
      });
    });
  }

  private extractVersion(stdout: string): string | undefined {
    // Try to parse as JSON first
    try {
      const json = JSON.parse(stdout);
      if (json.version) return String(json.version);
    } catch {
      // Not JSON, continue with regex
    }

    // Try common version patterns
    const patterns = [
      /version[:\s]+([0-9]+\.[0-9]+\.[0-9]+[^\s]*)/i,
      /v([0-9]+\.[0-9]+\.[0-9]+[^\s]*)/i,
      /([0-9]+\.[0-9]+\.[0-9]+[^\s]*)/
    ];

    for (const pattern of patterns) {
      const match = stdout.match(pattern);
      if (match) return match[1];
    }

    return undefined;
  }

  private isCacheValid(cacheKey: string): boolean {
    if (!this.preflightCache) return false;
    
    const cacheTtl = this.config.cache_ttl_ms ?? 60000;
    const age = Date.now() - this.preflightCache.timestamp;
    
    if (age > cacheTtl) return false;
    
    const currentKey = `${this.config.command}:${(this.config.status_args ?? ['--version']).join(',')}`;
    return this.preflightCache.statusArgs === currentKey;
  }

  private updateCache(result: BobShellStatusResult, cacheKey: string): void {
    this.preflightCache = {
      result,
      timestamp: Date.now(),
      command: this.config.command,
      statusArgs: cacheKey
    };
  }

  private argsForPurpose(purpose: BobShellExecutionRequest['purpose']): string[] {
    if (purpose === 'analyze_repo' && this.config.analyze_args && this.config.analyze_args.length > 0) {
      return [...this.config.analyze_args];
    }
    if (purpose === 'evaluate_answer' && this.config.evaluate_args && this.config.evaluate_args.length > 0) {
      return [...this.config.evaluate_args];
    }
    return [...this.config.args];
  }

  private buildExecutionArgs(request: BobShellExecutionRequest): { args: string[]; promptMode: BobShellPromptMode; stdinPayload: string | null } {
    const baseArgs = this.argsForPurpose(request.purpose);
    const promptMode = this.config.prompt_mode ?? 'stdin';
    if (promptMode === 'argument') {
      const promptArg = this.config.prompt_arg || '-p';
      return { args: [...baseArgs, promptArg, request.prompt], promptMode, stdinPayload: null };
    }
    return { args: baseArgs, promptMode, stdinPayload: request.prompt };
  }

  async execute(request: BobShellExecutionRequest): Promise<BobShellExecutionResult> {
    const currentStatus = await this.status();
    if (!currentStatus.available || currentStatus.status !== 'ready') {
      throw new BobShellUnavailableError(currentStatus.message);
    }

    const startedAt = Date.now();
    const { args, stdinPayload } = this.buildExecutionArgs(request);
    const child = spawn(this.config.command, args, {
      cwd: request.workspace_dir || this.config.cwd,
      env: {
        ...process.env,
        ...this.config.env,
        BOBQUEST_BOB_PURPOSE: request.purpose
      },
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    request.on_process_spawn?.(child);

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let timeoutKillEscalation: NodeJS.Timeout | undefined;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      timeoutKillEscalation = setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) {
          child.kill('SIGKILL');
        }
      }, 2500);
      timeoutKillEscalation.unref?.();
    }, this.config.timeout_ms);
    timeout.unref?.();

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    if (stdinPayload !== null) {
      child.stdin.write(stdinPayload);
    }
    child.stdin.end();

    return new Promise((resolve, reject) => {
      child.on('error', (error) => {
        clearTimeout(timeout);
        if (timeoutKillEscalation) clearTimeout(timeoutKillEscalation);
        reject(new BobShellExecutionError(error.message));
      });
      child.on('close', (exitCode) => {
        clearTimeout(timeout);
        if (timeoutKillEscalation) clearTimeout(timeoutKillEscalation);
        resolve({
          ok: exitCode === 0 && !timedOut,
          exit_code: exitCode,
          stdout,
          stderr,
          duration_ms: Date.now() - startedAt,
          timed_out: timedOut,
          error_message: timedOut ? 'IBM Bob Shell execution timed out.' : undefined
        });
      });
    });
  }
}

// Made with Bob
