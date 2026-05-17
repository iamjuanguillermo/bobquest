import { extractAndParseJson } from '@bobquest/bob-shell-runtime';
import type { WatsonxClient } from './WatsonxClient';

export interface JsonRecoveryInput {
  raw_output: string;
  validation_errors: string[];
}

export class WatsonxJsonRecoveryAssistant {
  constructor(private readonly client: WatsonxClient) {}

  async recoverJson(input: JsonRecoveryInput): Promise<string> {
    const prompt = [
      'You are BobQuest JSON Recovery Assistant.',
      'Return JSON only. No markdown. No code fences. No commentary.',
      'Your task is only to recover or clean the existing IBM Bob Shell JSON output.',
      'Do not analyze the repository. Do not add semantic content. Do not invent fields.',
      'If a field is missing, leave the existing content as close as possible and do not fabricate repository facts.',
      'The deterministic BobQuest validator will decide if the recovered JSON is acceptable.',
      '',
      'Validation errors:',
      JSON.stringify(input.validation_errors, null, 2),
      '',
      'Raw IBM Bob Shell output:',
      input.raw_output
    ].join('\n');
    const generated = await this.client.generate({ prompt, purpose: 'json_recovery' });
    return extractAndParseJson(generated).extracted_text;
  }
}
