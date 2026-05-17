import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { BobShellAdapter, extractAndParseJson, loadBobPrompt } from '@bobquest/bob-shell-runtime';
import {
  createInitialRunState,
  failedRunState,
  finishRunPhase,
  startRunPhase,
  validateAnalysisResult,
  withRunStateUpdate,
  type AnalysisResult,
  type RunState,
  type RunStateWorkspace,
  type WorkspaceLifecycleStatus
} from '@bobquest/onboarding-contracts';
import type { WatsonxJsonRecoveryAssistant } from '@bobquest/optional-ibm-llm';
import { cleanupWorkspace, createWorkspace, shallowCloneRepo, type WorkspaceInfo } from '@bobquest/repo-workspace';
import { FileRunStateStore } from '@bobquest/runtime-state';
import type { RuntimeEnv } from '../env';
import { resolveRequestedRepo } from '../security/repoAllowlist';
import { normalizeRuntimeError, runtimeError } from '../security/errorResponse';
import { PersistentRuntimeLimitStore } from '../security/limits';
import { bobResultLogSummary, noopRuntimeLogger, runtimeLogFields, type RuntimeLogger } from '../observability/runtimeLogger';
import { BobProcessRegistry } from './BobProcessRegistry';

export interface CreateRunRequestBody {
  repo_url?: string;
  repo_id?: string;
}

function workspaceMetadata(workspace: WorkspaceInfo, status: WorkspaceLifecycleStatus = 'created'): RunStateWorkspace {
  const now = new Date().toISOString();
  return {
    workspace_id: workspace.workspace_id,
    root_dir: workspace.root_dir,
    repo_dir: workspace.repo_dir,
    status,
    created_at: workspace.created_at,
    clone_started_at: status === 'cloning' ? now : null,
    clone_finished_at: null,
    cleanup_started_at: null,
    cleanup_finished_at: null,
    cleanup_error: null
  };
}

function updateWorkspaceLifecycle(
  state: RunState,
  status: WorkspaceLifecycleStatus,
  patch: Partial<RunStateWorkspace> = {}
): RunStateWorkspace | null {
  if (!state.workspace) return null;
  return {
    ...state.workspace,
    ...patch,
    status
  };
}

export class RunService {
  constructor(
    private readonly env: RuntimeEnv,
    private readonly bobShell: BobShellAdapter,
    private readonly stateStore: FileRunStateStore,
    private readonly limitStore: PersistentRuntimeLimitStore,
    private readonly projectRoot: string,
    private readonly jsonRecoveryAssistant: WatsonxJsonRecoveryAssistant | null = null,
    private readonly processRegistry: BobProcessRegistry = new BobProcessRegistry(),
    private readonly logger: RuntimeLogger = noopRuntimeLogger
  ) {}

  async createRun(body: CreateRunRequestBody): Promise<RunState> {
    if (this.env.runtime_disabled) throw runtimeError('RUNTIME_DISABLED', 'BobQuest runtime is disabled by configuration.', 503);

    // Verify Bob Shell is ready before accepting run
    const bobStatus = await this.bobShell.status();
    if (!bobStatus.available || bobStatus.status !== 'ready') {
      throw runtimeError('BOB_UNAVAILABLE', `IBM Bob Shell is not ready. Status: ${bobStatus.status}. ${bobStatus.message}`, 503);
    }

    const repo = resolveRequestedRepo(this.env, body);
    const runId = `run_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    await this.limitStore.reserveRun(this.env, runId);
    let state = createInitialRunState(runId);
    state = startRunPhase(
      withRunStateUpdate(state, {
        state: 'creating_workspace',
        repo: {
          owner: repo.owner,
          name: repo.name,
          url: repo.url
        }
      }),
      'creating_workspace'
    );
    try {
      this.processRegistry.clearCancellationRequest(runId);
      await this.stateStore.save(state);
      this.logger.info(runtimeLogFields({ event: 'run_accepted', run_id: runId, repo: repo.repo_id, phase: 'creating_workspace' }), 'BobQuest run accepted');
      void this.executeRun(state.run_id, repo).finally(() => this.limitStore.releaseRun(state.run_id));
      return state;
    } catch (error) {
      await this.limitStore.releaseRun(runId);
      throw error;
    }
  }

  async getRun(runId: string): Promise<RunState | null> {
    return this.stateStore.get(runId);
  }

  async cancelRun(runId: string): Promise<RunState> {
    const state = await this.stateStore.require(runId);
    if (state.state === 'ready' || state.state === 'failed' || state.state === 'cancelled') {
      return state;
    }

    this.processRegistry.cancel(runId);
    let cancelled = withRunStateUpdate(state, { state: 'cancelled', error: null });
    if (state.state === 'evaluating_answer') {
      cancelled = finishRunPhase(cancelled, 'evaluating_answer', 'cancelled', 'BOB_PROCESS_CANCELLED');
    } else if (state.state === 'running_bob_analysis') {
      cancelled = finishRunPhase(cancelled, 'running_bob_analysis', 'cancelled', 'BOB_PROCESS_CANCELLED');
    }
    this.logger.warn(runtimeLogFields({ event: 'run_cancelled', run_id: runId, phase: state.state, error_code: 'BOB_PROCESS_CANCELLED' }), 'BobQuest run cancelled');
    const cleaned = await this.cleanupRunWorkspace(cancelled);
    await this.releaseRunSlot(runId);
    return this.stateStore.save(cleaned);
  }

  private async isRunCancelled(runId: string): Promise<boolean> {
    const state = await this.stateStore.require(runId);
    return state.state === 'cancelled';
  }

  private async isRunCancellationRequestedOrPersisted(runId: string): Promise<boolean> {
    if (this.processRegistry.wasCancellationRequested(runId)) return true;
    return this.isRunCancelled(runId);
  }

  private async releaseRunSlot(runId: string): Promise<void> {
    try {
      await this.limitStore.releaseRun(runId);
    } catch (error) {
      this.logger.warn(
        runtimeLogFields({ event: 'run_limit_release_failed', run_id: runId, error_code: 'RUN_LIMIT_RELEASE_FAILED' }),
        'BobQuest run limit release failed'
      );
    }
  }

  private async cleanupRunWorkspace(state: RunState): Promise<RunState> {
    if (!state.workspace || state.workspace.status === 'cleaned') return state;
    const cleanupStarted = new Date().toISOString();
    let cleanupState = startRunPhase(
      withRunStateUpdate(state, {
        workspace: updateWorkspaceLifecycle(state, 'cleanup_pending', {
          cleanup_started_at: cleanupStarted,
          cleanup_error: null
        })
      }),
      'workspace_cleanup'
    );
    await this.stateStore.save(cleanupState);
    this.logger.info(runtimeLogFields({ event: 'workspace_cleanup_started', run_id: state.run_id, phase: 'workspace_cleanup' }), 'BobQuest workspace cleanup started');

    try {
      await cleanupWorkspace({ root_dir: state.workspace.root_dir });
      cleanupState = finishRunPhase(
        withRunStateUpdate(cleanupState, {
          workspace: updateWorkspaceLifecycle(cleanupState, 'cleaned', {
            cleanup_finished_at: new Date().toISOString(),
            cleanup_error: null
          })
        }),
        'workspace_cleanup',
        'completed'
      );
      this.logger.info(runtimeLogFields({ event: 'workspace_cleanup_completed', run_id: state.run_id, phase: 'workspace_cleanup' }), 'BobQuest workspace cleanup completed');
      return cleanupState;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Workspace cleanup failed.';
      this.logger.warn(runtimeLogFields({ event: 'workspace_cleanup_failed', run_id: state.run_id, phase: 'workspace_cleanup', error_code: 'WORKSPACE_CLEANUP_FAILED' }), 'BobQuest workspace cleanup failed');
      return finishRunPhase(
        withRunStateUpdate(cleanupState, {
          workspace: updateWorkspaceLifecycle(cleanupState, 'cleanup_failed', {
            cleanup_finished_at: new Date().toISOString(),
            cleanup_error: message
          })
        }),
        'workspace_cleanup',
        'failed',
        'WORKSPACE_CLEANUP_FAILED'
      );
    }
  }

  private async validateOrRecoverBobAnalysis(rawOutput: string, runId: string): Promise<AnalysisResult> {
    try {
      const extracted = extractAndParseJson(rawOutput);
      const validation = validateAnalysisResult(extracted.parsed);
      if (validation.valid) return validation.data;
      if (!this.env.optional_llm_enabled || !this.env.optional_llm_json_recovery || !this.jsonRecoveryAssistant) {
        throw runtimeError('INVALID_BOB_JSON', `IBM Bob Shell returned invalid BobQuest JSON: ${validation.errors.join('; ')}`, 502);
      }
      this.logger.warn(runtimeLogFields({ event: 'json_recovery_started', run_id: runId, phase: 'parsing_bob_output', error_code: 'INVALID_BOB_JSON' }), 'BobQuest JSON recovery started');
      const recoveredText = await this.jsonRecoveryAssistant.recoverJson({ raw_output: rawOutput, validation_errors: validation.errors });
      const recovered = extractAndParseJson(recoveredText);
      const recoveredValidation = validateAnalysisResult(recovered.parsed);
      if (!recoveredValidation.valid) {
        throw runtimeError('INVALID_BOB_JSON', `IBM watsonx JSON recovery failed validation: ${recoveredValidation.errors.join('; ')}`, 502);
      }
      this.logger.info(runtimeLogFields({ event: 'json_recovery_completed', run_id: runId, phase: 'parsing_bob_output' }), 'BobQuest JSON recovery completed');
      return recoveredValidation.data;
    } catch (error) {
      if (!this.env.optional_llm_enabled || !this.env.optional_llm_json_recovery || !this.jsonRecoveryAssistant) throw error;
      const message = error instanceof Error ? error.message : 'JSON extraction failed';
      this.logger.warn(runtimeLogFields({ event: 'json_recovery_started', run_id: runId, phase: 'parsing_bob_output', error_code: 'INVALID_BOB_JSON' }), 'BobQuest JSON recovery started');
      const recoveredText = await this.jsonRecoveryAssistant.recoverJson({ raw_output: rawOutput, validation_errors: [message] });
      const recovered = extractAndParseJson(recoveredText);
      const recoveredValidation = validateAnalysisResult(recovered.parsed);
      if (!recoveredValidation.valid) {
        throw runtimeError('INVALID_BOB_JSON', `IBM watsonx JSON recovery failed validation: ${recoveredValidation.errors.join('; ')}`, 502);
      }
      this.logger.info(runtimeLogFields({ event: 'json_recovery_completed', run_id: runId, phase: 'parsing_bob_output' }), 'BobQuest JSON recovery completed');
      return recoveredValidation.data;
    }
  }

  private async failRunWithCleanup(runId: string, error: unknown): Promise<void> {
    const current = await this.stateStore.require(runId);
    if (current.state === 'cancelled') return;
    const normalized = normalizeRuntimeError(error);
    this.logger.error(runtimeLogFields({ event: 'run_failed', run_id: runId, phase: current.state, error_code: normalized.code }), 'BobQuest run failed');
    let failedBase = current;
    if (current.state === 'creating_workspace') failedBase = finishRunPhase(current, 'creating_workspace', 'failed', normalized.code);
    if (current.state === 'cloning_repo') failedBase = finishRunPhase(current, 'cloning_repo', 'failed', normalized.code);
    if (current.state === 'running_bob_analysis') failedBase = finishRunPhase(current, 'running_bob_analysis', 'failed', normalized.code);
    if (current.state === 'parsing_bob_output') failedBase = finishRunPhase(current, 'parsing_bob_output', 'failed', normalized.code);
    const cleaned = await this.cleanupRunWorkspace(failedBase);
    await this.releaseRunSlot(runId);
    await this.stateStore.save(failedRunState(cleaned, normalized.code, normalized.message));
  }

  private async executeRun(runId: string, repo: ReturnType<typeof resolveRequestedRepo>): Promise<void> {
    let state = await this.stateStore.require(runId);
    try {
      const workspace = await createWorkspace(this.env.workspace_dir, runId, repo);
      state = finishRunPhase(
        withRunStateUpdate(state, {
          state: 'cloning_repo',
          workspace: workspaceMetadata(workspace, 'cloning')
        }),
        'creating_workspace',
        'completed'
      );
      state = startRunPhase(state, 'cloning_repo');
      await this.stateStore.save(state);
      this.logger.info(runtimeLogFields({ event: 'phase_started', run_id: runId, phase: 'cloning_repo', repo: repo.repo_id }), 'BobQuest cloning repo');

      const cloneResult = await shallowCloneRepo({ repo, destination_dir: workspace.repo_dir, timeout_ms: this.env.clone_timeout_ms });
      if (!cloneResult.ok) {
        throw runtimeError('INVALID_REPO', cloneResult.timed_out ? 'GitHub repository clone timed out.' : 'GitHub repository clone failed.', 400);
      }
      if (await this.isRunCancelled(runId)) return;

      const clonedState = await this.stateStore.require(runId);
      state = finishRunPhase(
        withRunStateUpdate(clonedState, {
          state: 'running_bob_analysis',
          workspace: updateWorkspaceLifecycle(clonedState, 'cloned', {
            clone_finished_at: new Date().toISOString()
          })
        }),
        'cloning_repo',
        'completed'
      );
      state = startRunPhase(state, 'running_bob_analysis');
      await this.stateStore.save(state);
      this.logger.info(runtimeLogFields({ event: 'phase_started', run_id: runId, phase: 'running_bob_analysis', repo: repo.repo_id }), 'BobQuest running IBM Bob analysis');

      const promptTemplate = await loadBobPrompt(this.projectRoot, 'analyze_repo');
      const prompt = `${promptTemplate}\n\nRepository workspace: ${resolve(workspace.repo_dir)}\nRepository URL: ${repo.url}\n`;
      const bobResult = await this.bobShell.execute({
        prompt,
        workspace_dir: workspace.repo_dir,
        purpose: 'analyze_repo',
        on_process_spawn: (child) => this.processRegistry.register(runId, 'analyze_repo', child)
      });
      this.processRegistry.unregister(runId);
      this.logger.info(runtimeLogFields({ event: 'bob_shell_completed', run_id: runId, phase: 'running_bob_analysis', ...bobResultLogSummary(bobResult) }), 'BobQuest IBM Bob analysis process completed');
      if (await this.isRunCancellationRequestedOrPersisted(runId)) return;
      if (!bobResult.ok) {
        throw runtimeError('BOB_UNAVAILABLE', bobResult.error_message || 'IBM Bob Shell analysis failed.', 503);
      }

      state = finishRunPhase(withRunStateUpdate(await this.stateStore.require(runId), { state: 'parsing_bob_output' }), 'running_bob_analysis', 'completed');
      state = startRunPhase(state, 'parsing_bob_output');
      await this.stateStore.save(state);

      const analysis = await this.validateOrRecoverBobAnalysis(bobResult.stdout, runId);
      if (await this.isRunCancelled(runId)) return;

      state = finishRunPhase(
        withRunStateUpdate(await this.stateStore.require(runId), {
          state: 'ready',
          analysis_original: analysis,
          localized_analysis: {},
          active_language: 'en',
          error: null,
          objective_progress: {}
        }),
        'parsing_bob_output',
        'completed'
      );
      await this.releaseRunSlot(runId);
      await this.stateStore.save(state);
      this.logger.info(runtimeLogFields({ event: 'run_ready', run_id: runId, phase: 'ready', repo: repo.repo_id }), 'BobQuest run ready');
    } catch (error) {
      this.processRegistry.unregister(runId);
      if (this.processRegistry.wasCancellationRequested(runId)) return;
      const current = await this.stateStore.require(runId);
      if (current.state === 'cancelled') return;
      await this.failRunWithCleanup(runId, error);
    }
  }
}
