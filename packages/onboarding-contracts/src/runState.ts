import type { AnalysisResult } from './analysis';
import type { ObjectiveProgress } from './evaluation';

export type RunStateStatus =
  | 'idle'
  | 'creating_workspace'
  | 'cloning_repo'
  | 'running_bob_analysis'
  | 'parsing_bob_output'
  | 'ready'
  | 'evaluating_answer'
  | 'failed'
  | 'cancelled';

export interface RunStateError {
  code: string;
  message: string;
  recoverable: false;
}

export interface RunStateRepo {
  owner: string;
  name: string;
  url: string;
  clone_ref?: string;
}

export type WorkspaceLifecycleStatus =
  | 'created'
  | 'cloning'
  | 'cloned'
  | 'cleanup_pending'
  | 'cleaned'
  | 'cleanup_failed';

export interface RunStateWorkspace {
  workspace_id: string;
  root_dir: string;
  repo_dir: string;
  status: WorkspaceLifecycleStatus;
  created_at: string;
  clone_started_at: string | null;
  clone_finished_at: string | null;
  cleanup_started_at: string | null;
  cleanup_finished_at: string | null;
  cleanup_error: string | null;
}

export type RunPhaseStatus = 'started' | 'completed' | 'failed' | 'cancelled';

export type RunObservablePhase =
  | 'creating_workspace'
  | 'cloning_repo'
  | 'running_bob_analysis'
  | 'parsing_bob_output'
  | 'evaluating_answer'
  | 'workspace_cleanup'
  | 'localization';

export interface RunPhaseTiming {
  phase: RunObservablePhase;
  status: RunPhaseStatus;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  error_code: string | null;
}

export interface RunObservability {
  phase_timings: RunPhaseTiming[];
}

export interface RunState {
  run_id: string;
  state: RunStateStatus;
  repo: RunStateRepo | null;
  workspace: RunStateWorkspace | null;
  created_at: string;
  updated_at: string;
  error: RunStateError | null;
  analysis_original: AnalysisResult | null;
  localized_analysis: Record<string, AnalysisResult>;
  active_language: string;
  usage: {
    evaluations_used: number;
    localizations_used: number;
  };
  objective_progress: Record<string, ObjectiveProgress>;
  observability: RunObservability;
}

export function createInitialRunState(runId: string): RunState {
  const now = new Date().toISOString();
  return {
    run_id: runId,
    state: 'idle',
    repo: null,
    workspace: null,
    created_at: now,
    updated_at: now,
    error: null,
    analysis_original: null,
    localized_analysis: {},
    active_language: 'en',
    usage: {
      evaluations_used: 0,
      localizations_used: 0
    },
    objective_progress: {},
    observability: {
      phase_timings: []
    }
  };
}

export function withRunStateUpdate(state: RunState, patch: Partial<RunState>): RunState {
  return {
    ...state,
    ...patch,
    updated_at: new Date().toISOString()
  };
}

export function startRunPhase(state: RunState, phase: RunObservablePhase): RunState {
  const now = new Date().toISOString();
  const observability = state.observability ?? { phase_timings: [] };
  return withRunStateUpdate(state, {
    observability: {
      ...observability,
      phase_timings: [
        ...observability.phase_timings,
        {
          phase,
          status: 'started',
          started_at: now,
          finished_at: null,
          duration_ms: null,
          error_code: null
        }
      ]
    }
  });
}

export function finishRunPhase(
  state: RunState,
  phase: RunObservablePhase,
  status: Exclude<RunPhaseStatus, 'started'> = 'completed',
  errorCode: string | null = null
): RunState {
  const now = new Date().toISOString();
  const observability = state.observability ?? { phase_timings: [] };
  const phaseTimings = [...observability.phase_timings];
  for (let index = phaseTimings.length - 1; index >= 0; index -= 1) {
    const timing = phaseTimings[index];
    if (timing.phase === phase && timing.finished_at === null) {
      const startedMs = Date.parse(timing.started_at);
      const finishedMs = Date.parse(now);
      phaseTimings[index] = {
        ...timing,
        status,
        finished_at: now,
        duration_ms: Number.isFinite(startedMs) && Number.isFinite(finishedMs) ? Math.max(0, finishedMs - startedMs) : null,
        error_code: errorCode
      };
      return withRunStateUpdate(state, {
        observability: {
          ...observability,
          phase_timings: phaseTimings
        }
      });
    }
  }
  return withRunStateUpdate(state, {
    observability: {
      ...observability,
      phase_timings: [
        ...phaseTimings,
        {
          phase,
          status,
          started_at: now,
          finished_at: now,
          duration_ms: 0,
          error_code: errorCode
        }
      ]
    }
  });
}

export function failedRunState(state: RunState, code: string, message: string): RunState {
  return withRunStateUpdate(state, {
    state: 'failed',
    error: {
      code,
      message,
      recoverable: false
    }
  });
}
