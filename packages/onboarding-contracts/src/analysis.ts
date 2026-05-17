export type RiskLevel = 'low' | 'medium' | 'high';
export type ComplexityLevel = 'low' | 'medium' | 'high';
export type OnboardingSuitability = 'starter' | 'later' | 'locked';

export type RepoFlowType =
  | 'user_action_flow'
  | 'api_request_flow'
  | 'mutation_flow'
  | 'data_flow'
  | 'event_flow'
  | 'background_job_flow'
  | 'command_flow'
  | 'build_deploy_flow'
  | 'auth_session_flow'
  | 'error_handling_flow';

export interface RepoReference {
  path: string;
  reason: string;
}

export interface TestReference {
  command: string;
  reason: string;
}

export interface FlowStep {
  id: string;
  title: string;
  summary: string;
  risk: RiskLevel;
  files: RepoReference[];
  tests: TestReference[];
  bob_explanation: string;
  evidence: RepoReference[];
}

export interface SingleChoiceInteraction {
  type: 'single_choice';
  prompt: string;
  options: Array<{ id: string; label: string }>;
  correct_option_id: string;
  success_message: string;
  failure_message: string;
}

export interface MultiChoiceInteraction {
  type: 'multi_choice';
  prompt: string;
  options: Array<{ id: string; label: string }>;
  correct_option_ids: string[];
  success_message: string;
  failure_message: string;
}

export interface ShortTextInteraction {
  type: 'short_text';
  prompt: string;
  expected_terms: string[];
  success_message: string;
  failure_message: string;
}

export interface ConfirmUnderstandingInteraction {
  type: 'confirm_understanding';
  prompt: string;
  confirmation_label: string;
  success_message: string;
}

export interface FileFocusInteraction {
  type: 'file_focus';
  prompt: string;
  required_paths: string[];
  success_message: string;
}

export interface OpenTextEvaluatedByBobInteraction {
  type: 'open_text_evaluated_by_bob';
  prompt: string;
  evaluation_guidance: string;
}

export type Interaction =
  | SingleChoiceInteraction
  | MultiChoiceInteraction
  | ShortTextInteraction
  | ConfirmUnderstandingInteraction
  | FileFocusInteraction
  | OpenTextEvaluatedByBobInteraction;

export interface StarterMission {
  id: string;
  title: string;
  flow_step_id: string;
  risk: RiskLevel;
  why_enabled: string;
  files_to_understand: RepoReference[];
  validation_commands: TestReference[];
  interaction: Interaction;
}

export interface LockedOrLaterIssue {
  title: string;
  risk: RiskLevel;
  reason: string;
}

export interface RepoFlow {
  id: string;
  title: string;
  type: RepoFlowType;
  summary: string;
  why_it_matters: string;
  risk: RiskLevel;
  complexity: ComplexityLevel;
  onboarding_suitability: OnboardingSuitability;
  steps: FlowStep[];
  starter_missions: StarterMission[];
  locked_or_later_issues: LockedOrLaterIssue[];
}

export interface AnalysisResult {
  schema_version: '0.23';
  repo: {
    name: string;
    url: string;
    summary: string;
  };
  flows: RepoFlow[];
  recommended_first_flow_id: string;
}

const flowTypes = new Set<RepoFlowType>([
  'user_action_flow',
  'api_request_flow',
  'mutation_flow',
  'data_flow',
  'event_flow',
  'background_job_flow',
  'command_flow',
  'build_deploy_flow',
  'auth_session_flow',
  'error_handling_flow'
]);

const risks = new Set<RiskLevel>(['low', 'medium', 'high']);
const complexities = new Set<ComplexityLevel>(['low', 'medium', 'high']);
const suitabilities = new Set<OnboardingSuitability>(['starter', 'later', 'locked']);
const interactionTypes = new Set<Interaction['type']>([
  'single_choice',
  'multi_choice',
  'short_text',
  'confirm_understanding',
  'file_focus',
  'open_text_evaluated_by_bob'
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasUnexpectedAnswerKey(value: Record<string, unknown>): boolean {
  return (
    'correct_option_id' in value ||
    'correct_option_ids' in value ||
    'expected_terms' in value ||
    'required_paths' in value ||
    'confirmation_label' in value ||
    'success_message' in value ||
    'failure_message' in value
  );
}

function assertUniqueStrings(values: string[], field: string, errors: string[]): void {
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = value.trim();
    if (seen.has(normalized)) errors.push(`${field} contains duplicate id: ${normalized}`);
    seen.add(normalized);
  }
}

function validateRepoReferences(value: unknown, field: string, errors: string[], options: { minItems?: number } = {}): void {
  if (!Array.isArray(value)) {
    errors.push(`${field} must be an array`);
    return;
  }
  if (options.minItems && value.length < options.minItems) errors.push(`${field} must contain at least ${options.minItems} item(s)`);
  value.forEach((item, index) => {
    if (!isRecord(item)) {
      errors.push(`${field}[${index}] must be an object`);
      return;
    }
    if (!isNonEmptyString(item.path)) errors.push(`${field}[${index}].path is required`);
    if (!isNonEmptyString(item.reason)) errors.push(`${field}[${index}].reason is required`);
  });
}

function validateTestReferences(value: unknown, field: string, errors: string[], options: { minItems?: number } = {}): void {
  if (!Array.isArray(value)) {
    errors.push(`${field} must be an array`);
    return;
  }
  if (options.minItems && value.length < options.minItems) errors.push(`${field} must contain at least ${options.minItems} item(s)`);
  value.forEach((item, index) => {
    if (!isRecord(item)) {
      errors.push(`${field}[${index}] must be an object`);
      return;
    }
    if (!isNonEmptyString(item.command)) errors.push(`${field}[${index}].command is required`);
    if (!isNonEmptyString(item.reason)) errors.push(`${field}[${index}].reason is required`);
  });
}

function validateOptions(value: unknown, path: string, errors: string[]): string[] {
  const optionIds: string[] = [];
  if (!Array.isArray(value) || value.length < 2) {
    errors.push(`${path}.options must contain at least two options`);
    return optionIds;
  }
  value.forEach((option, optionIndex) => {
    const optionPath = `${path}.options[${optionIndex}]`;
    if (!isRecord(option)) {
      errors.push(`${optionPath} must be an object`);
      return;
    }
    if (!isNonEmptyString(option.id)) {
      errors.push(`${optionPath}.id is required`);
      return;
    }
    optionIds.push(option.id.trim());
    if (!isNonEmptyString(option.label)) errors.push(`${optionPath}.label is required`);
  });
  assertUniqueStrings(optionIds, `${path}.options`, errors);
  return optionIds;
}

function validateStringArray(value: unknown, path: string, errors: string[], options: { minItems?: number; unique?: boolean } = {}): string[] {
  const items: string[] = [];
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return items;
  }
  if (options.minItems && value.length < options.minItems) errors.push(`${path} must contain at least ${options.minItems} item(s)`);
  value.forEach((item, index) => {
    if (!isNonEmptyString(item)) {
      errors.push(`${path}[${index}] must be a non-empty string`);
      return;
    }
    items.push(item.trim());
  });
  if (options.unique) assertUniqueStrings(items, path, errors);
  return items;
}

function validateInteraction(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return;
  }
  if (!interactionTypes.has(value.type as Interaction['type'])) errors.push(`${path}.type is unsupported`);
  if (!isNonEmptyString(value.prompt)) errors.push(`${path}.prompt is required`);

  if (value.type === 'single_choice') {
    const optionIds = validateOptions(value.options, path, errors);
    if (!isNonEmptyString(value.correct_option_id)) {
      errors.push(`${path}.correct_option_id is required`);
    } else if (optionIds.length > 0 && !optionIds.includes(value.correct_option_id.trim())) {
      errors.push(`${path}.correct_option_id must reference an existing option id`);
    }
    if (!isNonEmptyString(value.success_message)) errors.push(`${path}.success_message is required`);
    if (!isNonEmptyString(value.failure_message)) errors.push(`${path}.failure_message is required`);
  }

  if (value.type === 'multi_choice') {
    const optionIds = validateOptions(value.options, path, errors);
    const correctIds = validateStringArray(value.correct_option_ids, `${path}.correct_option_ids`, errors, { minItems: 1, unique: true });
    for (const correctId of correctIds) {
      if (optionIds.length > 0 && !optionIds.includes(correctId)) errors.push(`${path}.correct_option_ids must reference existing option ids`);
    }
    if (!isNonEmptyString(value.success_message)) errors.push(`${path}.success_message is required`);
    if (!isNonEmptyString(value.failure_message)) errors.push(`${path}.failure_message is required`);
  }

  if (value.type === 'short_text') {
    validateStringArray(value.expected_terms, `${path}.expected_terms`, errors, { minItems: 1, unique: true });
    if (!isNonEmptyString(value.success_message)) errors.push(`${path}.success_message is required`);
    if (!isNonEmptyString(value.failure_message)) errors.push(`${path}.failure_message is required`);
  }

  if (value.type === 'confirm_understanding') {
    if (!isNonEmptyString(value.confirmation_label)) errors.push(`${path}.confirmation_label is required`);
    if (!isNonEmptyString(value.success_message)) errors.push(`${path}.success_message is required`);
  }

  if (value.type === 'file_focus') {
    validateStringArray(value.required_paths, `${path}.required_paths`, errors, { minItems: 1, unique: true });
    if (!isNonEmptyString(value.success_message)) errors.push(`${path}.success_message is required`);
  }

  if (value.type === 'open_text_evaluated_by_bob') {
    if (!isNonEmptyString(value.evaluation_guidance)) errors.push(`${path}.evaluation_guidance is required`);
    if (hasUnexpectedAnswerKey(value)) errors.push(`${path} must not contain local answer keys or local success/failure messages`);
  }
}

export function validateAnalysisResult(value: unknown): { valid: true; data: AnalysisResult } | { valid: false; errors: string[] } {
  const errors: string[] = [];
  const flowIds: string[] = [];
  const missionIds: string[] = [];

  if (!isRecord(value)) return { valid: false, errors: ['analysis must be an object'] };
  if (value.schema_version !== '0.23') errors.push('schema_version must be 0.23');
  if (!isRecord(value.repo)) errors.push('repo must be an object');
  if (isRecord(value.repo)) {
    if (!isNonEmptyString(value.repo.name)) errors.push('repo.name is required');
    if (!isNonEmptyString(value.repo.url)) errors.push('repo.url is required');
    if (!isNonEmptyString(value.repo.summary)) errors.push('repo.summary is required');
  }

  if (!Array.isArray(value.flows) || value.flows.length < 1) {
    errors.push('flows must contain at least one flow');
  } else {
    value.flows.forEach((flow, flowIndex) => {
      const flowPath = `flows[${flowIndex}]`;
      if (!isRecord(flow)) {
        errors.push(`${flowPath} must be an object`);
        return;
      }
      if (!isNonEmptyString(flow.id)) {
        errors.push(`${flowPath}.id is required`);
      } else {
        flowIds.push(flow.id.trim());
      }
      if (!isNonEmptyString(flow.title)) errors.push(`${flowPath}.title is required`);
      if (!flowTypes.has(flow.type as RepoFlowType)) errors.push(`${flowPath}.type is unsupported`);
      if (!isNonEmptyString(flow.summary)) errors.push(`${flowPath}.summary is required`);
      if (!isNonEmptyString(flow.why_it_matters)) errors.push(`${flowPath}.why_it_matters is required`);
      if (!risks.has(flow.risk as RiskLevel)) errors.push(`${flowPath}.risk is unsupported`);
      if (!complexities.has(flow.complexity as ComplexityLevel)) errors.push(`${flowPath}.complexity is unsupported`);
      if (!suitabilities.has(flow.onboarding_suitability as OnboardingSuitability)) errors.push(`${flowPath}.onboarding_suitability is unsupported`);

      const stepIds: string[] = [];
      if (!Array.isArray(flow.steps) || flow.steps.length < 1) {
        errors.push(`${flowPath}.steps must contain at least one step`);
      } else {
        flow.steps.forEach((step, stepIndex) => {
          const stepPath = `${flowPath}.steps[${stepIndex}]`;
          if (!isRecord(step)) {
            errors.push(`${stepPath} must be an object`);
            return;
          }
          if (!isNonEmptyString(step.id)) {
            errors.push(`${stepPath}.id is required`);
          } else {
            stepIds.push(step.id.trim());
          }
          if (!isNonEmptyString(step.title)) errors.push(`${stepPath}.title is required`);
          if (!isNonEmptyString(step.summary)) errors.push(`${stepPath}.summary is required`);
          if (!risks.has(step.risk as RiskLevel)) errors.push(`${stepPath}.risk is unsupported`);
          validateRepoReferences(step.files, `${stepPath}.files`, errors, { minItems: 1 });
          validateTestReferences(step.tests, `${stepPath}.tests`, errors);
          if (!isNonEmptyString(step.bob_explanation)) errors.push(`${stepPath}.bob_explanation is required`);
          validateRepoReferences(step.evidence, `${stepPath}.evidence`, errors, { minItems: 1 });
        });
        assertUniqueStrings(stepIds, `${flowPath}.steps`, errors);
      }

      if (!Array.isArray(flow.starter_missions)) {
        errors.push(`${flowPath}.starter_missions must be an array`);
      } else {
        flow.starter_missions.forEach((mission, missionIndex) => {
          const missionPath = `${flowPath}.starter_missions[${missionIndex}]`;
          if (!isRecord(mission)) {
            errors.push(`${missionPath} must be an object`);
            return;
          }
          if (!isNonEmptyString(mission.id)) {
            errors.push(`${missionPath}.id is required`);
          } else {
            missionIds.push(mission.id.trim());
          }
          if (!isNonEmptyString(mission.title)) errors.push(`${missionPath}.title is required`);
          if (!isNonEmptyString(mission.flow_step_id)) {
            errors.push(`${missionPath}.flow_step_id is required`);
          } else if (stepIds.length > 0 && !stepIds.includes(mission.flow_step_id.trim())) {
            errors.push(`${missionPath}.flow_step_id must reference a step in the same flow`);
          }
          if (!risks.has(mission.risk as RiskLevel)) errors.push(`${missionPath}.risk is unsupported`);
          if (!isNonEmptyString(mission.why_enabled)) errors.push(`${missionPath}.why_enabled is required`);
          validateRepoReferences(mission.files_to_understand, `${missionPath}.files_to_understand`, errors);
          validateTestReferences(mission.validation_commands, `${missionPath}.validation_commands`, errors);
          validateInteraction(mission.interaction, `${missionPath}.interaction`, errors);
        });
      }

      if (!Array.isArray(flow.locked_or_later_issues)) {
        errors.push(`${flowPath}.locked_or_later_issues must be an array`);
      } else {
        flow.locked_or_later_issues.forEach((issue, issueIndex) => {
          const issuePath = `${flowPath}.locked_or_later_issues[${issueIndex}]`;
          if (!isRecord(issue)) {
            errors.push(`${issuePath} must be an object`);
            return;
          }
          if (!isNonEmptyString(issue.title)) errors.push(`${issuePath}.title is required`);
          if (!risks.has(issue.risk as RiskLevel)) errors.push(`${issuePath}.risk is unsupported`);
          if (!isNonEmptyString(issue.reason)) errors.push(`${issuePath}.reason is required`);
        });
      }
    });
    assertUniqueStrings(flowIds, 'flows', errors);
    assertUniqueStrings(missionIds, 'starter_missions', errors);
  }

  if (!isNonEmptyString(value.recommended_first_flow_id)) {
    errors.push('recommended_first_flow_id is required');
  } else if (flowIds.length > 0 && !flowIds.includes(value.recommended_first_flow_id.trim())) {
    errors.push('recommended_first_flow_id must reference an existing flow id');
  }

  return errors.length ? { valid: false, errors } : { valid: true, data: value as unknown as AnalysisResult };
}
