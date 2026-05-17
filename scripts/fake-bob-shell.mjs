#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readStdin() {
  return new Promise((resolveText) => {
    let text = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      text += chunk;
    });
    process.stdin.on('end', () => resolveText(text));
  });
}

function readPromptFromArgs() {
  const promptArg = process.env.BOBQUEST_FAKE_BOB_PROMPT_ARG || '-p';
  const args = process.argv.slice(2);
  const index = args.indexOf(promptArg);
  if (index < 0) return null;
  return args[index + 1] || '';
}

function validateExpectedPromptMode(promptFromArgs) {
  const expected = process.env.BOBQUEST_FAKE_BOB_EXPECT_PROMPT_MODE;
  if (!expected) return;
  if (expected === 'argument' && promptFromArgs === null) {
    console.error('Expected prompt to be passed as a command argument.');
    process.exit(7);
  }
  if (expected === 'stdin' && promptFromArgs !== null) {
    console.error('Expected prompt to be passed over stdin, not as a command argument.');
    process.exit(8);
  }
}


async function sleep(ms) {
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function readJson(pathEnv, fallbackPath) {
  const target = process.env[pathEnv] || fallbackPath;
  return readFileSync(resolve(target), 'utf8');
}


function requireExpectedArgs(pathEnv) {
  const expected = process.env[pathEnv];
  if (!expected) return;
  const actualArgs = process.argv.slice(2);
  const required = expected
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const missing = required.filter((item) => !actualArgs.includes(item));
  if (missing.length > 0) {
    console.error(`Missing expected fake Bob Shell args for ${pathEnv}: ${missing.join(', ')}. Actual args: ${actualArgs.join(' ')}`);
    process.exit(6);
  }
}

function requireCwdFile(pathEnv) {
  const expected = process.env[pathEnv];
  if (!expected) return;
  if (!existsSync(resolve(process.cwd(), expected))) {
    console.error(`Expected ${expected} to exist under fake Bob Shell cwd: ${process.cwd()}`);
    process.exit(4);
  }
}


async function maybeHandleStatusPreflight() {
  const args = process.argv.slice(2);
  const isStatusPreflight = process.env.BOBQUEST_FAKE_BOB_STATUS_MODE === 'true' || args.includes('--version');
  if (!isStatusPreflight) return false;

  if (process.env.BOBQUEST_FAKE_BOB_STATUS_SLEEP_MS) {
    await sleep(Number(process.env.BOBQUEST_FAKE_BOB_STATUS_SLEEP_MS));
  }

  if (process.env.BOBQUEST_FAKE_BOB_STATUS_STDERR) {
    process.stderr.write(process.env.BOBQUEST_FAKE_BOB_STATUS_STDERR);
  }

  const stdout = process.env.BOBQUEST_FAKE_BOB_STATUS_STDOUT || 'BobQuest fake Bob Shell version: 0.0.0-test\n';
  if (stdout) process.stdout.write(stdout);

  process.exit(Number(process.env.BOBQUEST_FAKE_BOB_STATUS_EXIT_CODE || '0'));
}

await maybeHandleStatusPreflight();

const promptFromArgs = readPromptFromArgs();
validateExpectedPromptMode(promptFromArgs);
const prompt = promptFromArgs === null ? await readStdin() : promptFromArgs;
const purpose = process.env.BOBQUEST_BOB_PURPOSE || 'analyze_repo';

if (process.env.BOBQUEST_FAKE_BOB_EXIT_CODE) {
  console.error('Configured fake Bob Shell failure.');
  process.exit(Number(process.env.BOBQUEST_FAKE_BOB_EXIT_CODE));
}

if (process.env.BOBQUEST_FAKE_BOB_STDERR) {
  console.error(process.env.BOBQUEST_FAKE_BOB_STDERR);
}

if (process.env.BOBQUEST_FAKE_BOB_SLEEP_MS) {
  await sleep(Number(process.env.BOBQUEST_FAKE_BOB_SLEEP_MS));
}

if (purpose === 'evaluate_answer') {
  requireExpectedArgs('BOBQUEST_FAKE_BOB_EXPECT_EVALUATE_ARGS');
  requireCwdFile('BOBQUEST_FAKE_BOB_EXPECT_EVALUATE_CWD_FILE');
  if (!prompt.includes('Repository workspace:')) {
    console.error('Expected repository workspace in evaluate prompt.');
    process.exit(5);
  }
  process.stdout.write(readJson('BOBQUEST_FAKE_BOB_EVALUATION_PATH', 'tests/fixtures/fake_bob_evaluation.json'));
  process.exit(0);
}

if (purpose === 'analyze_repo') {
  requireExpectedArgs('BOBQUEST_FAKE_BOB_EXPECT_ANALYZE_ARGS');
  if (!prompt.includes('Repository workspace:')) {
    console.error('Expected repository workspace in analyze prompt.');
    process.exit(2);
  }
  process.stdout.write(readJson('BOBQUEST_FAKE_BOB_ANALYSIS_PATH', 'tests/fixtures/fake_bob_analysis.json'));
  process.exit(0);
}

console.error(`Unsupported fake Bob Shell purpose: ${purpose}`);
process.exit(3);
