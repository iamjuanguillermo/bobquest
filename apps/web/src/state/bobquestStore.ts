import { computed, reactive } from 'vue';
import { completeRuntimeObjective, createRuntimeRun, evaluateRuntimeObjective, getRuntimeCapabilities, getRuntimeRun, localizeRuntimeRun } from 'src/api/runtimeClient';
import { evaluateClosedInteraction, type AnalysisResult, type EvaluationResult, type FlowStep, type InteractionAnswer, type RepoFlow, type StarterMission } from '@bobquest/onboarding-contracts';

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

export interface ApprovedRepoOption {
  id: string;
  label: string;
  url: string;
}

export interface RuntimeCapabilities {
  publicDemoMode: boolean;
  allowedRepos: ApprovedRepoOption[];
  bobShellRuntime: {
    available: boolean;
    required: true;
    status: 'unknown' | 'ready' | 'not_configured' | 'binary_not_found' | 'preflight_failed' | 'auth_invalid' | 'disabled';
    message?: string;
  };
  optionalLlm: {
    available: boolean;
    localization: boolean;
  };
}

export interface RuntimeRunState {
  runId: string | null;
  status: RunStateStatus;
  repoUrl: string;
  selectedRepoId: string | null;
  message: string;
  error: string | null;
  ready: boolean;
  analysisOriginal: AnalysisResult | null;
  localizedAnalysis: Record<string, AnalysisResult>;
  activeLanguage: string;
}

export interface OnboardingUiState {
  activeFlowId: string | null;
  activeStepId: string | null;
  activeMissionId: string | null;
  evidenceDrawerOpen: boolean;
  explanationDrawerOpen: boolean;
  answers: Record<string, unknown>;
  evaluatingMissionId: string | null;
  translating: boolean;
  translationError: string | null;
  resultByMissionId: Record<string, EvaluationResult>;
  errorByMissionId: Record<string, string>;
}

export interface UiState {
  darkMode: boolean;
  loadingCapabilities: boolean;
  requestingRun: boolean;
  onboarding: OnboardingUiState;
}

export interface BobQuestState {
  capabilities: RuntimeCapabilities;
  run: RuntimeRunState;
  ui: UiState;
}

const defaultRepos: ApprovedRepoOption[] = [
  {
    id: 'ibm/bobquest-reference',
    label: 'ibm/bobquest-reference',
    url: 'https://github.com/ibm/bobquest-reference'
  }
];

function readInitialDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem('bobquest.darkMode') === 'true';
}

function parseAllowedRepos(raw: string | undefined): ApprovedRepoOption[] {
  const repos = String(raw ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((repo) => ({
      id: repo,
      label: repo,
      url: `https://github.com/${repo}`
    }));
  return repos.length ? repos : defaultRepos;
}

function readPublicMode(): boolean {
  const raw = String(import.meta.env.VITE_BOBQUEST_PUBLIC_DEMO_MODE ?? 'true').toLowerCase();
  return raw !== 'false';
}

function isApprovedRepoOption(value: unknown): value is ApprovedRepoOption {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { id?: unknown }).id === 'string' &&
    typeof (value as { label?: unknown }).label === 'string' &&
    typeof (value as { url?: unknown }).url === 'string'
  );
}

function normalizeAllowedRepos(payloadRepos: unknown): ApprovedRepoOption[] {
  if (!Array.isArray(payloadRepos)) return state.capabilities.allowedRepos;
  const repos = payloadRepos.filter(isApprovedRepoOption).map((item) => ({ id: item.id, label: item.label, url: item.url }));
  return repos.length ? repos : state.capabilities.allowedRepos;
}

function chooseInitialFlow(analysis: AnalysisResult | null): RepoFlow | null {
  if (!analysis?.flows?.length) return null;
  return analysis.flows.find((flow) => flow.id === analysis.recommended_first_flow_id) ?? analysis.flows[0] ?? null;
}

function chooseInitialStep(flow: RepoFlow | null): FlowStep | null {
  return flow?.steps?.[0] ?? null;
}

function chooseInitialMission(flow: RepoFlow | null): StarterMission | null {
  return flow?.starter_missions?.[0] ?? null;
}

function resetOnboardingSelection() {
  state.ui.onboarding.activeFlowId = null;
  state.ui.onboarding.activeStepId = null;
  state.ui.onboarding.activeMissionId = null;
  state.ui.onboarding.evidenceDrawerOpen = false;
  state.ui.onboarding.explanationDrawerOpen = false;
  state.ui.onboarding.answers = {};
  state.ui.onboarding.evaluatingMissionId = null;
  state.ui.onboarding.translating = false;
  state.ui.onboarding.translationError = null;
  state.ui.onboarding.resultByMissionId = {};
  state.ui.onboarding.errorByMissionId = {};
}

function syncOnboardingSelection(analysis: AnalysisResult | null) {
  const flow = chooseInitialFlow(analysis);
  const step = chooseInitialStep(flow);
  const mission = chooseInitialMission(flow);
  state.ui.onboarding.activeFlowId = flow?.id ?? null;
  state.ui.onboarding.activeStepId = step?.id ?? null;
  state.ui.onboarding.activeMissionId = mission?.id ?? null;
  state.ui.onboarding.evidenceDrawerOpen = false;
  state.ui.onboarding.explanationDrawerOpen = false;
  state.ui.onboarding.answers = {};
  state.ui.onboarding.evaluatingMissionId = null;
  state.ui.onboarding.translating = false;
  state.ui.onboarding.translationError = null;
  state.ui.onboarding.resultByMissionId = {};
  state.ui.onboarding.errorByMissionId = {};
}

function applyServerCapabilities(payload: any) {
  const allowedRepos = normalizeAllowedRepos(payload.allowed_repos);
  state.capabilities.publicDemoMode = Boolean(payload.public_demo_mode);
  state.capabilities.allowedRepos = allowedRepos;
  state.capabilities.bobShellRuntime = {
    available: Boolean(payload.bob_shell_runtime?.available),
    required: true,
    status: payload.bob_shell_runtime?.status ?? 'unknown',
    message: payload.bob_shell_runtime?.message
  };
  state.capabilities.optionalLlm = {
    available: Boolean(payload.optional_llm?.available),
    localization: Boolean(payload.optional_llm?.features?.localization)
  };
  if (!state.run.selectedRepoId && allowedRepos[0]) {
    state.run.selectedRepoId = allowedRepos[0].id;
    state.run.repoUrl = allowedRepos[0].url;
  }
}

function applyRunState(payload: any) {
  const previousRunId = state.run.runId;
  const wasReady = state.run.ready;
  state.run.runId = payload.run_id ?? null;
  state.run.status = payload.state ?? 'idle';
  state.run.ready = payload.state === 'ready';
  state.run.repoUrl = payload.repo?.url ?? state.run.repoUrl;
  state.run.error = payload.error?.message ?? null;
  state.run.analysisOriginal = payload.analysis_original ?? null;
  state.run.localizedAnalysis = payload.localized_analysis ?? {};
  state.run.activeLanguage = payload.active_language ?? 'en';

  if (previousRunId !== state.run.runId && state.run.runId) resetOnboardingSelection();
  if (state.run.ready) {
    if (!wasReady || !state.ui.onboarding.activeFlowId) syncOnboardingSelection(state.run.analysisOriginal);
    state.run.message = 'IBM Bob analysis is ready. Open the flow-guided onboarding surface.';
  } else if (payload.state === 'failed') {
    resetOnboardingSelection();
    state.run.message = 'Runtime failed clearly. No product fallback was executed.';
  } else if (payload.state === 'cancelled') {
    resetOnboardingSelection();
    state.run.message = 'Run cancelled. No generated onboarding surface was shown.';
  } else {
    state.run.message = `Runtime state: ${payload.state}`;
  }
}

const initialAllowedRepos = parseAllowedRepos(import.meta.env.VITE_BOBQUEST_ALLOWED_REPOS);

export const state = reactive<BobQuestState>({
  capabilities: {
    publicDemoMode: readPublicMode(),
    allowedRepos: initialAllowedRepos,
    bobShellRuntime: {
      available: false,
      required: true,
      status: 'unknown'
    },
    optionalLlm: {
      available: false,
      localization: false
    }
  },
  run: {
    runId: null,
    status: 'idle',
    repoUrl: initialAllowedRepos[0]?.url ?? '',
    selectedRepoId: initialAllowedRepos[0]?.id ?? null,
    message: 'Connect the runtime API to run IBM Bob analysis.',
    error: null,
    ready: false,
    analysisOriginal: null,
    localizedAnalysis: {},
    activeLanguage: 'en'
  },
  ui: {
    darkMode: readInitialDarkMode(),
    loadingCapabilities: false,
    requestingRun: false,
    onboarding: {
      activeFlowId: null,
      activeStepId: null,
      activeMissionId: null,
      evidenceDrawerOpen: false,
      explanationDrawerOpen: false,
      answers: {},
      evaluatingMissionId: null,
      translating: false,
      translationError: null,
      resultByMissionId: {},
      errorByMissionId: {}
    }
  }
});

export const activeAnalysis = computed(() => {
  if (state.run.activeLanguage !== 'en' && state.run.localizedAnalysis[state.run.activeLanguage]) {
    return state.run.localizedAnalysis[state.run.activeLanguage];
  }
  return state.run.analysisOriginal;
});

export const activeFlow = computed<RepoFlow | null>(() => {
  const analysis = activeAnalysis.value;
  if (!analysis?.flows?.length) return null;
  return analysis.flows.find((flow) => flow.id === state.ui.onboarding.activeFlowId) ?? chooseInitialFlow(analysis);
});

export const activeStep = computed<FlowStep | null>(() => {
  const flow = activeFlow.value;
  if (!flow?.steps?.length) return null;
  return flow.steps.find((step) => step.id === state.ui.onboarding.activeStepId) ?? flow.steps[0] ?? null;
});

export const activeMission = computed<StarterMission | null>(() => {
  const flow = activeFlow.value;
  if (!flow?.starter_missions?.length) return null;
  return flow.starter_missions.find((mission) => mission.id === state.ui.onboarding.activeMissionId) ?? flow.starter_missions[0] ?? null;
});

export function setDarkMode(enabled: boolean) {
  state.ui.darkMode = enabled;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('bobquest.darkMode', enabled ? 'true' : 'false');
  }
}

export function toggleDarkMode() {
  setDarkMode(!state.ui.darkMode);
}


export function canLocalize(): boolean {
  return Boolean(state.run.runId && state.run.ready && state.capabilities.optionalLlm.available && state.capabilities.optionalLlm.localization);
}

export async function changeLanguage(language: string) {
  if (!canLocalize()) return;
  if (!state.run.runId) return;
  if (language === state.run.activeLanguage) return;
  state.ui.onboarding.translationError = null;
  if (language === 'en') {
    state.run.activeLanguage = 'en';
    syncOnboardingSelection(activeAnalysis.value);
    return;
  }
  state.ui.onboarding.translating = true;
  try {
    const payload = await localizeRuntimeRun(state.run.runId, language);
    applyRunState(payload);
    syncOnboardingSelection(activeAnalysis.value);
  } catch (error) {
    state.ui.onboarding.translationError = error instanceof Error ? error.message : 'Localization failed. Previous language was preserved.';
  } finally {
    state.ui.onboarding.translating = false;
  }
}

export function selectedRepo(): ApprovedRepoOption | null {
  return state.capabilities.allowedRepos.find((repo) => repo.id === state.run.selectedRepoId) ?? null;
}

export function selectAllowedRepo(repoId: string) {
  const repo = state.capabilities.allowedRepos.find((candidate) => candidate.id === repoId);
  if (!repo) return;
  state.run.selectedRepoId = repo.id;
  state.run.repoUrl = repo.url;
  state.run.error = null;
  state.run.message = 'Repository selected. Runtime execution will use the approved backend allowlist.';
}

export function setSelfHostedRepoUrl(url: string) {
  state.run.repoUrl = url;
  state.run.selectedRepoId = null;
  state.run.error = null;
  state.run.message = 'Repository URL captured. Runtime execution will validate the GitHub target server-side.';
}

export function canRequestRun(): boolean {
  return Boolean(state.run.repoUrl.trim()) && state.capabilities.bobShellRuntime.available && !state.ui.requestingRun;
}

export function selectFlow(flowId: string) {
  const flow = activeAnalysis.value?.flows.find((candidate) => candidate.id === flowId) ?? null;
  if (!flow) return;
  state.ui.onboarding.activeFlowId = flow.id;
  state.ui.onboarding.activeStepId = flow.steps[0]?.id ?? null;
  state.ui.onboarding.activeMissionId = flow.starter_missions[0]?.id ?? null;
  state.ui.onboarding.evidenceDrawerOpen = false;
  state.ui.onboarding.explanationDrawerOpen = false;
  state.ui.onboarding.answers = {};
  state.ui.onboarding.evaluatingMissionId = null;
  state.ui.onboarding.translating = false;
  state.ui.onboarding.translationError = null;
  state.ui.onboarding.resultByMissionId = {};
  state.ui.onboarding.errorByMissionId = {};
}

export function selectStep(stepId: string) {
  const flow = activeFlow.value;
  if (!flow?.steps.some((step) => step.id === stepId)) return;
  state.ui.onboarding.activeStepId = stepId;
  state.ui.onboarding.evidenceDrawerOpen = false;
  state.ui.onboarding.explanationDrawerOpen = false;
  state.ui.onboarding.answers = {};
  state.ui.onboarding.evaluatingMissionId = null;
  state.ui.onboarding.translating = false;
  state.ui.onboarding.translationError = null;
  state.ui.onboarding.resultByMissionId = {};
  state.ui.onboarding.errorByMissionId = {};
}

export function selectMission(missionId: string) {
  const flow = activeFlow.value;
  if (!flow?.starter_missions.some((mission) => mission.id === missionId)) return;
  state.ui.onboarding.activeMissionId = missionId;
}

export function openEvidenceDrawer() {
  state.ui.onboarding.evidenceDrawerOpen = true;
}

export function closeEvidenceDrawer() {
  state.ui.onboarding.evidenceDrawerOpen = false;
}

export function openExplanationDrawer() {
  state.ui.onboarding.explanationDrawerOpen = true;
}

export function closeExplanationDrawer() {
  state.ui.onboarding.explanationDrawerOpen = false;
}

export async function loadCapabilities() {
  state.ui.loadingCapabilities = true;
  try {
    applyServerCapabilities(await getRuntimeCapabilities());
    state.run.message = state.capabilities.bobShellRuntime.available
      ? 'Runtime API connected. IBM Bob Shell can be requested.'
      : 'Runtime API connected, but IBM Bob Shell is unavailable. No product fallback will run.';
  } catch (error) {
    state.capabilities.bobShellRuntime.status = 'not_configured';
    state.capabilities.bobShellRuntime.message = 'IBM Bob Shell runtime unavailable.';
    state.capabilities.bobShellRuntime.available = false;
    state.run.error = error instanceof Error ? error.message : 'Runtime API connection failed.';
    state.run.message = 'Runtime API unavailable. No product fallback was executed.';
  } finally {
    state.ui.loadingCapabilities = false;
  }
}

export async function requestRuntimeRun() {
  if (!state.capabilities.bobShellRuntime.available) {
    state.run.status = 'failed';
    state.run.ready = false;
    state.run.analysisOriginal = null;
    resetOnboardingSelection();
    state.run.error = 'IBM Bob Shell runtime is not connected. BobQuest will not continue with generated placeholder data.';
    state.run.message = 'Runtime unavailable. No product fallback was executed.';
    return;
  }

  state.ui.requestingRun = true;
  state.run.error = null;
  state.run.analysisOriginal = null;
  resetOnboardingSelection();
  try {
    const payload = await createRuntimeRun(
      state.capabilities.publicDemoMode ? { repo_id: state.run.selectedRepoId ?? undefined } : { repo_url: state.run.repoUrl }
    );
    applyRunState(payload);
    if (state.run.runId) void pollRun(state.run.runId);
  } catch (error) {
    state.run.status = 'failed';
    state.run.ready = false;
    state.run.analysisOriginal = null;
    resetOnboardingSelection();
    state.run.error = error instanceof Error ? error.message : 'Runtime run request failed.';
    state.run.message = 'Run failed clearly. No product fallback was executed.';
  } finally {
    state.ui.requestingRun = false;
  }
}

async function pollRun(runId: string) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 1500));
    const payload = await getRuntimeRun(runId);
    applyRunState(payload);
    if (state.run.ready || state.run.status === 'failed' || state.run.status === 'cancelled') return;
  }
}


export function missionResult(missionId: string | null | undefined): EvaluationResult | null {
  if (!missionId) return null;
  return state.ui.onboarding.resultByMissionId[missionId] ?? null;
}

export function missionError(missionId: string | null | undefined): string | null {
  if (!missionId) return null;
  return state.ui.onboarding.errorByMissionId[missionId] ?? null;
}

export function missionAnswer(missionId: string): unknown {
  return state.ui.onboarding.answers[missionId];
}

export function setMissionAnswer(missionId: string, answer: unknown) {
  state.ui.onboarding.answers[missionId] = answer;
  delete state.ui.onboarding.errorByMissionId[missionId];
}

function answerForMission(mission: StarterMission): InteractionAnswer {
  const raw = state.ui.onboarding.answers[mission.id];
  const interaction = mission.interaction;
  if (interaction.type === 'single_choice') return { type: 'single_choice', selected_option_id: String(raw ?? '') };
  if (interaction.type === 'multi_choice') return { type: 'multi_choice', selected_option_ids: Array.isArray(raw) ? raw.map(String) : [] };
  if (interaction.type === 'short_text') return { type: 'short_text', answer: String(raw ?? '') };
  if (interaction.type === 'confirm_understanding') return { type: 'confirm_understanding', confirmed: raw === true };
  if (interaction.type === 'file_focus') return { type: 'file_focus', reviewed_paths: Array.isArray(raw) ? raw.map(String) : [] };
  return { type: 'open_text_evaluated_by_bob', answer: String(raw ?? '') };
}

export async function completeActiveClosedMission() {
  const mission = activeMission.value;
  if (!mission) return;
  if (mission.interaction.type === 'open_text_evaluated_by_bob') {
    state.ui.onboarding.errorByMissionId[mission.id] = 'This checkpoint must be evaluated by IBM Bob Shell.';
    return;
  }
  const answer = answerForMission(mission);
  const result = evaluateClosedInteraction(mission, answer);
  state.ui.onboarding.resultByMissionId[mission.id] = result;
  if (!result.correct) return;
  if (!state.run.runId) {
    state.ui.onboarding.errorByMissionId[mission.id] = 'Run ID missing. Completion was not persisted.';
    return;
  }
  try {
    const payload = await completeRuntimeObjective(state.run.runId, mission.id, answer);
    applyRunState(payload);
  } catch (error) {
    state.ui.onboarding.errorByMissionId[mission.id] = error instanceof Error ? error.message : 'Objective completion failed.';
  }
}

export async function evaluateActiveOpenMission() {
  const mission = activeMission.value;
  if (!mission) return;
  if (mission.interaction.type !== 'open_text_evaluated_by_bob') {
    state.ui.onboarding.errorByMissionId[mission.id] = 'Closed checkpoints are validated locally.';
    return;
  }
  if (!state.run.runId) {
    state.ui.onboarding.errorByMissionId[mission.id] = 'Run ID missing. Evaluation cannot be requested.';
    return;
  }
  const answer = String(state.ui.onboarding.answers[mission.id] ?? '').trim();
  if (!answer) {
    state.ui.onboarding.errorByMissionId[mission.id] = 'Write an answer before asking IBM Bob Shell to evaluate it.';
    return;
  }
  state.ui.onboarding.evaluatingMissionId = mission.id;
  delete state.ui.onboarding.errorByMissionId[mission.id];
  try {
    const result = await evaluateRuntimeObjective(state.run.runId, mission.id, {
      interaction_id: `${mission.id}:open_text_evaluated_by_bob`,
      answer
    });
    state.ui.onboarding.resultByMissionId[mission.id] = result as EvaluationResult;
  } catch (error) {
    state.ui.onboarding.errorByMissionId[mission.id] = error instanceof Error ? error.message : 'IBM Bob Shell evaluation failed clearly. No product fallback was executed.';
  } finally {
    state.ui.onboarding.evaluatingMissionId = null;
  }
}
