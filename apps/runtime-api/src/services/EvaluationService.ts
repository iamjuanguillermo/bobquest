import { resolve } from 'node:path';
import { BobShellAdapter, extractAndParseJson, loadBobPrompt } from '@bobquest/bob-shell-runtime';
import {
  evaluateClosedInteraction,
  finishRunPhase,
  startRunPhase,
  validateEvaluationResult,
  withRunStateUpdate,
  type EvaluationResult,
  type InteractionAnswer,
  type RunState,
  type StarterMission
} from '@bobquest/onboarding-contracts';
import { FileRunStateStore } from '@bobquest/runtime-state';
import type { RuntimeEnv } from '../env';
import { BobProcessRegistry } from './BobProcessRegistry';
import { runtimeError } from '../security/errorResponse';
import { bobResultLogSummary, noopRuntimeLogger, runtimeLogFields, type RuntimeLogger } from '../observability/runtimeLogger';

export interface CompleteObjectiveBody {
  answer?: InteractionAnswer;
}

export interface EvaluateObjectiveBody {
  interaction_id: string;
  answer: string;
}

function findStarterMission(state: RunState, objectiveId: string): StarterMission {
  const mission = state.analysis_original?.flows.flatMap((flow) => flow.starter_missions).find((candidate) => candidate.id === objectiveId);
  if (!mission) throw runtimeError('INVALID_REQUEST', `Objective not found in IBM Bob analysis: ${objectiveId}`, 404);
  return mission;
}

function assertReadyRun(state: RunState): void {
  if (state.state !== 'ready') throw runtimeError('RUN_NOT_READY', 'Objective actions require a ready run.', 409);
  if (!state.analysis_original) throw runtimeError('RUN_NOT_READY', 'Objective actions require original IBM Bob analysis.', 409);
}

function resolveEvaluationWorkspace(state: RunState): string {
  const workspace = state.workspace;
  if (!workspace) throw runtimeError('WORKSPACE_UNAVAILABLE', 'Open-text evaluation requires the original repository workspace.', 409);
  if (workspace.status !== 'cloned') throw runtimeError('WORKSPACE_UNAVAILABLE', `Open-text evaluation requires a cloned workspace. Current workspace status: ${workspace.status}.`, 409);
  if (!workspace.repo_dir?.trim()) throw runtimeError('WORKSPACE_UNAVAILABLE', 'Open-text evaluation requires a persisted repository workspace path.', 409);
  return resolve(workspace.repo_dir);
}

export class EvaluationService {
  constructor(
    private readonly env: RuntimeEnv,
    private readonly bobShell: BobShellAdapter,
    private readonly stateStore: FileRunStateStore,
    private readonly projectRoot: string,
    private readonly processRegistry: BobProcessRegistry = new BobProcessRegistry(),
    private readonly logger: RuntimeLogger = noopRuntimeLogger
  ) {}

  async completeObjective(runId: string, objectiveId: string, body: CompleteObjectiveBody = {}): Promise<RunState> {
    const state = await this.stateStore.require(runId);
    assertReadyRun(state);
    const mission = findStarterMission(state, objectiveId);
    if (mission.interaction.type === 'open_text_evaluated_by_bob') {
      throw runtimeError('INVALID_REQUEST', 'Open-text objectives must be evaluated by IBM Bob Shell.', 400);
    }
    if (!body.answer) throw runtimeError('INVALID_REQUEST_BODY', 'Closed objective completion requires a local answer payload.', 400);

    const localResult = evaluateClosedInteraction(mission, body.answer);
    const updated = withRunStateUpdate(state, {
      objective_progress: {
        ...state.objective_progress,
        [objectiveId]: {
          objective_id: objectiveId,
          status: localResult.correct ? 'completed' : 'failed',
          evaluator: 'local',
          result: localResult,
          completed_at: new Date().toISOString()
        }
      }
    });
    this.logger.info(runtimeLogFields({ event: 'objective_completed_locally', run_id: runId, objective_id: objectiveId, correct: localResult.correct }), 'BobQuest objective completed locally');
    return this.stateStore.save(updated);
  }

  async evaluateOpenAnswer(runId: string, objectiveId: string, body: EvaluateObjectiveBody): Promise<EvaluationResult> {
    const state = await this.stateStore.require(runId);
    assertReadyRun(state);
    const mission = findStarterMission(state, objectiveId);
    if (mission.interaction.type !== 'open_text_evaluated_by_bob') {
      throw runtimeError('INVALID_REQUEST', 'Closed objectives are validated locally and must not call IBM Bob Shell evaluation.', 400);
    }
    if (!body?.interaction_id?.trim()) throw runtimeError('INVALID_REQUEST_BODY', 'Interaction id is required for open answer evaluation.', 400);
    if (!body.answer?.trim()) throw runtimeError('INVALID_REQUEST_BODY', 'Open answer text is required.', 400);
    if (state.usage.evaluations_used >= this.env.max_evaluations_per_run) throw runtimeError('EVALUATION_LIMIT_REACHED', 'Evaluation limit reached for this run.', 429);

    const workspaceDir = resolveEvaluationWorkspace(state);
    const evaluating = startRunPhase(
      withRunStateUpdate(state, {
        state: 'evaluating_answer',
        usage: { ...state.usage, evaluations_used: state.usage.evaluations_used + 1 }
      }),
      'evaluating_answer'
    );
    await this.stateStore.save(evaluating);
    this.logger.info(runtimeLogFields({ event: 'phase_started', run_id: runId, phase: 'evaluating_answer', objective_id: objectiveId }), 'BobQuest open answer evaluation started');

    try {
      const promptTemplate = await loadBobPrompt(this.projectRoot, 'evaluate_answer');
      const prompt = `${promptTemplate}\n\nRepository workspace: ${workspaceDir}\nRun ID: ${runId}\nRun context JSON:\n${JSON.stringify(state.analysis_original)}\n\nObjective JSON:\n${JSON.stringify(mission)}\n\nObjective ID: ${objectiveId}\nInteraction ID: ${body.interaction_id}\nDeveloper answer:\n${body.answer}\n`;
      const bobResult = await this.bobShell.execute({
        prompt,
        workspace_dir: workspaceDir,
        purpose: 'evaluate_answer',
        on_process_spawn: (child) => this.processRegistry.register(runId, 'evaluate_answer', child)
      });
      this.processRegistry.unregister(runId);
      this.logger.info(runtimeLogFields({ event: 'bob_shell_completed', run_id: runId, phase: 'evaluating_answer', objective_id: objectiveId, ...bobResultLogSummary(bobResult) }), 'BobQuest IBM Bob evaluation process completed');
      if (!bobResult.ok) throw runtimeError('BOB_UNAVAILABLE', bobResult.error_message || 'IBM Bob Shell evaluation failed.', 503);

      const parsed = extractAndParseJson(bobResult.stdout).parsed;
      const validation = validateEvaluationResult(parsed);
      if (!validation.valid) {
        throw runtimeError('INVALID_BOB_JSON', `IBM Bob Shell returned invalid evaluation JSON: ${validation.errors.join('; ')}`, 502);
      }

      const normalized: EvaluationResult = {
        ...validation.data,
        objective_id: objectiveId,
        interaction_id: body.interaction_id
      };
      await this.stateStore.save(
        finishRunPhase(
          withRunStateUpdate(evaluating, {
            state: 'ready',
            objective_progress: {
              ...state.objective_progress,
              [objectiveId]: {
                objective_id: objectiveId,
                status: normalized.correct ? 'completed' : normalized.status === 'needs_review' ? 'needs_review' : 'failed',
                evaluator: 'bob_shell',
                result: normalized,
                completed_at: new Date().toISOString()
              }
            }
          }),
          'evaluating_answer',
          'completed'
        )
      );
      this.logger.info(runtimeLogFields({ event: 'objective_evaluated_by_bob', run_id: runId, objective_id: objectiveId, status: normalized.status, correct: normalized.correct }), 'BobQuest objective evaluated by IBM Bob Shell');
      return normalized;
    } catch (error) {
      this.processRegistry.unregister(runId);
      const latest = await this.stateStore.require(runId);
      if (latest.state === 'cancelled') throw error;
      await this.stateStore.save(finishRunPhase(withRunStateUpdate(latest, { state: 'ready' }), 'evaluating_answer', 'failed', error && typeof error === 'object' && 'code' in error ? String(error.code) : 'BOBQUEST_RUNTIME_ERROR'));
      throw error;
    }
  }
}
