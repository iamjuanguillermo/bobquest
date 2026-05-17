export interface JsonRecoveryAssistant {
  recoverJson(input: { raw_output: string; validation_errors: string[] }): Promise<string>;
}

export async function maybeRecoverJson(input: {
  raw_output: string;
  validation_errors: string[];
  assistant?: JsonRecoveryAssistant | null;
}): Promise<string | null> {
  if (!input.assistant) return null;
  return input.assistant.recoverJson({ raw_output: input.raw_output, validation_errors: input.validation_errors });
}
