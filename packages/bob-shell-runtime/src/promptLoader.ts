import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export type BobPromptName = 'analyze_repo' | 'evaluate_answer' | 'repair_json';

const promptFiles: Record<BobPromptName, string> = {
  analyze_repo: 'analyze_repo.md',
  evaluate_answer: 'evaluate_answer.md',
  repair_json: 'repair_json.md'
};

export async function loadBobPrompt(rootDir: string, name: BobPromptName): Promise<string> {
  const file = resolve(rootDir, 'prompts', 'bob-shell', promptFiles[name]);
  return readFile(file, 'utf8');
}
