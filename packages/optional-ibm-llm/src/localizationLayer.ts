import { extractAndParseJson } from '@bobquest/bob-shell-runtime';
import { validateAnalysisResult, type AnalysisResult, type RepoFlow, type StarterMission, type FlowStep } from '@bobquest/onboarding-contracts';
import type { WatsonxClient } from './WatsonxClient';

const supportedLanguages = new Set(['en', 'es', 'pt']);

function ensureLanguage(language: string): string {
  const normalized = language.trim().toLowerCase();
  if (!supportedLanguages.has(normalized)) throw new Error(`Unsupported localization language: ${language}`);
  return normalized;
}

function restoreStepProtectedFields(original: FlowStep, translated: FlowStep): FlowStep {
  return {
    ...translated,
    id: original.id,
    risk: original.risk,
    files: original.files,
    tests: original.tests,
    evidence: original.evidence
  };
}

function restoreMissionProtectedFields(original: StarterMission, translated: StarterMission): StarterMission {
  const restoredInteraction = {
    ...translated.interaction,
    type: original.interaction.type,
    prompt: translated.interaction.prompt
  } as StarterMission['interaction'];

  if (original.interaction.type === 'single_choice' && restoredInteraction.type === 'single_choice') {
    restoredInteraction.correct_option_id = original.interaction.correct_option_id;
    restoredInteraction.options = original.interaction.options.map((option, index) => ({
      id: option.id,
      label: restoredInteraction.options?.[index]?.label ?? option.label
    }));
  }
  if (original.interaction.type === 'multi_choice' && restoredInteraction.type === 'multi_choice') {
    restoredInteraction.correct_option_ids = original.interaction.correct_option_ids;
    restoredInteraction.options = original.interaction.options.map((option, index) => ({
      id: option.id,
      label: restoredInteraction.options?.[index]?.label ?? option.label
    }));
  }
  if (original.interaction.type === 'short_text' && restoredInteraction.type === 'short_text') {
    restoredInteraction.expected_terms = original.interaction.expected_terms;
  }
  if (original.interaction.type === 'file_focus' && restoredInteraction.type === 'file_focus') {
    restoredInteraction.required_paths = original.interaction.required_paths;
  }

  return {
    ...translated,
    id: original.id,
    flow_step_id: original.flow_step_id,
    risk: original.risk,
    files_to_understand: original.files_to_understand,
    validation_commands: original.validation_commands,
    interaction: restoredInteraction
  };
}

function restoreFlowProtectedFields(original: RepoFlow, translated: RepoFlow): RepoFlow {
  return {
    ...translated,
    id: original.id,
    type: original.type,
    risk: original.risk,
    complexity: original.complexity,
    onboarding_suitability: original.onboarding_suitability,
    steps: original.steps.map((step, index) => restoreStepProtectedFields(step, translated.steps?.[index] ?? step)),
    starter_missions: original.starter_missions.map((mission, index) => restoreMissionProtectedFields(mission, translated.starter_missions?.[index] ?? mission)),
    locked_or_later_issues: original.locked_or_later_issues.map((issue, index) => ({
      ...translated.locked_or_later_issues?.[index],
      title: translated.locked_or_later_issues?.[index]?.title ?? issue.title,
      reason: translated.locked_or_later_issues?.[index]?.reason ?? issue.reason,
      risk: issue.risk
    }))
  };
}

export function preserveAnalysisProtectedFields(original: AnalysisResult, translated: AnalysisResult): AnalysisResult {
  return {
    ...translated,
    schema_version: original.schema_version,
    repo: {
      name: original.repo.name,
      url: original.repo.url,
      summary: translated.repo?.summary ?? original.repo.summary
    },
    recommended_first_flow_id: original.recommended_first_flow_id,
    flows: original.flows.map((flow, index) => restoreFlowProtectedFields(flow, translated.flows?.[index] ?? flow))
  };
}

export class WatsonxLocalizationLayer {
  constructor(private readonly client: WatsonxClient) {}

  async localizeAnalysis(original: AnalysisResult, language: string): Promise<AnalysisResult> {
    const targetLanguage = ensureLanguage(language);
    if (targetLanguage === 'en') return original;
    const prompt = [
      'You are BobQuest Localization Layer.',
      'Return JSON only. No markdown. No code fences. No commentary.',
      `Translate user-facing dynamic text to ${targetLanguage}.`,
      'Do not analyze the repository. Do not replace IBM Bob analysis. Do not add new facts.',
      'Do not translate JSON keys, ids, enum values, file paths, commands, URLs, package names, function names, class names or component names.',
      'Translate only titles, summaries, explanations, evidence reasons, interaction prompts, feedback messages and issue reasons.',
      '',
      'AnalysisResult JSON:',
      JSON.stringify(original)
    ].join('\n');
    const generated = await this.client.generate({ prompt, purpose: 'localization' });
    const parsed = extractAndParseJson(generated).parsed;
    const validation = validateAnalysisResult(parsed);
    if (!validation.valid) throw new Error(`Localized BobQuest JSON failed validation: ${validation.errors.join('; ')}`);
    const restored = preserveAnalysisProtectedFields(original, validation.data);
    const restoredValidation = validateAnalysisResult(restored);
    if (!restoredValidation.valid) throw new Error(`Protected localized BobQuest JSON failed validation: ${restoredValidation.errors.join('; ')}`);
    return restoredValidation.data;
  }
}
