import type { Interaction, StarterMission } from './analysis';

export interface EvaluationResult {
  objective_id: string;
  interaction_id: string;
  status: 'passed' | 'failed' | 'needs_review';
  correct: boolean;
  confidence: 'low' | 'medium' | 'high';
  feedback: string;
  evidence: Array<{
    path: string;
    reason: string;
  }>;
}

export interface ObjectiveProgress {
  objective_id: string;
  status: 'completed' | 'failed' | 'needs_review';
  evaluator: 'local' | 'bob_shell';
  result: EvaluationResult;
  completed_at: string;
}

export type InteractionAnswer =
  | { type: 'single_choice'; selected_option_id: string }
  | { type: 'multi_choice'; selected_option_ids: string[] }
  | { type: 'short_text'; answer: string }
  | { type: 'confirm_understanding'; confirmed: boolean }
  | { type: 'file_focus'; reviewed_paths: string[] }
  | { type: 'open_text_evaluated_by_bob'; answer: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function arraysEqualAsSets(left: string[], right: string[]): boolean {
  const a = [...new Set(left)].sort();
  const b = [...new Set(right)].sort();
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

function includesAllTerms(answer: string, terms: string[]): boolean {
  const normalized = answer.toLowerCase();
  return terms.every((term) => normalized.includes(term.toLowerCase()));
}

export function validateEvaluationResult(value: unknown): { valid: true; data: EvaluationResult } | { valid: false; errors: string[] } {
  const errors: string[] = [];
  if (!isRecord(value)) return { valid: false, errors: ['evaluation result must be an object'] };
  if (!isNonEmptyString(value.objective_id)) errors.push('objective_id is required');
  if (!isNonEmptyString(value.interaction_id)) errors.push('interaction_id is required');
  if (!['passed', 'failed', 'needs_review'].includes(String(value.status))) errors.push('status is unsupported');
  if (typeof value.correct !== 'boolean') errors.push('correct must be boolean');
  if (!['low', 'medium', 'high'].includes(String(value.confidence))) errors.push('confidence is unsupported');
  if (!isNonEmptyString(value.feedback)) errors.push('feedback is required');
  if (!Array.isArray(value.evidence)) {
    errors.push('evidence must be an array');
  } else {
    value.evidence.forEach((item, index) => {
      if (!isRecord(item)) {
        errors.push(`evidence[${index}] must be an object`);
        return;
      }
      if (!isNonEmptyString(item.path)) errors.push(`evidence[${index}].path is required`);
      if (!isNonEmptyString(item.reason)) errors.push(`evidence[${index}].reason is required`);
    });
  }
  return errors.length ? { valid: false, errors } : { valid: true, data: value as unknown as EvaluationResult };
}

export function evaluateClosedInteraction(mission: StarterMission, answer: InteractionAnswer): EvaluationResult {
  const interaction: Interaction = mission.interaction;
  if (interaction.type === 'open_text_evaluated_by_bob') {
    throw new Error('Open-text objectives must be evaluated by IBM Bob Shell.');
  }
  let correct = false;
  let feedback = 'The answer did not match the IBM Bob-generated checkpoint.';

  if (interaction.type === 'single_choice' && answer.type === 'single_choice') {
    correct = answer.selected_option_id === interaction.correct_option_id;
    feedback = correct ? interaction.success_message : interaction.failure_message;
  }
  if (interaction.type === 'multi_choice' && answer.type === 'multi_choice') {
    correct = arraysEqualAsSets(answer.selected_option_ids, interaction.correct_option_ids);
    feedback = correct ? interaction.success_message : interaction.failure_message;
  }
  if (interaction.type === 'short_text' && answer.type === 'short_text') {
    correct = includesAllTerms(answer.answer, interaction.expected_terms);
    feedback = correct ? interaction.success_message : interaction.failure_message;
  }
  if (interaction.type === 'confirm_understanding' && answer.type === 'confirm_understanding') {
    correct = answer.confirmed === true;
    feedback = correct ? interaction.success_message : 'Confirm the checkpoint when you are ready.';
  }
  if (interaction.type === 'file_focus' && answer.type === 'file_focus') {
    correct = arraysEqualAsSets(answer.reviewed_paths, interaction.required_paths);
    feedback = correct ? interaction.success_message : 'Review every required file before completing this checkpoint.';
  }

  return {
    objective_id: mission.id,
    interaction_id: `${mission.id}:${interaction.type}`,
    status: correct ? 'passed' : 'failed',
    correct,
    confidence: 'high',
    feedback,
    evidence: mission.files_to_understand.map((file) => ({ path: file.path, reason: file.reason }))
  };
}
