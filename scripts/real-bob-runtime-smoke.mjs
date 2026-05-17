#!/usr/bin/env node
/*
 * BobQuest real IBM Bob Shell smoke runner.
 * This script is intentionally guarded: status-only checks are safe, but run-once
 * requires an explicit acknowledgement because it may spend Bobcoins.
 */

const REQUIRED_ACK = 'I_ACCEPT_ONE_BOB_SHELL_RUNTIME_RUN';
const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8787';
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_POLL_INTERVAL_MS = 1000;

function usage() {
  console.log(`BobQuest real Bob Shell smoke runner

Usage:
  pnpm smoke:real-bob:status
  BOBQUEST_REAL_BOB_SMOKE_ACK=${REQUIRED_ACK} \\
  BOBQUEST_REAL_BOB_SMOKE_REPO_ID=owner/repo \\
  pnpm smoke:real-bob:run-once

Modes:
  --status-only   Check /api/healthz, /api/bob/status?force_check=true and /api/capabilities only.
  --run-once      Create exactly one runtime run and poll until ready/failed/cancelled.

Environment:
  BOBQUEST_REAL_BOB_SMOKE_API_BASE_URL   Default: ${DEFAULT_API_BASE_URL}
  BOBQUEST_REAL_BOB_SMOKE_REPO_ID        Preferred in public demo mode, e.g. owner/repo
  BOBQUEST_REAL_BOB_SMOKE_REPO_URL       Alternative full GitHub URL
  BOBQUEST_REAL_BOB_SMOKE_ACK            Required for --run-once: ${REQUIRED_ACK}
  BOBQUEST_REAL_BOB_SMOKE_TIMEOUT_MS     Default: ${DEFAULT_TIMEOUT_MS}
  BOBQUEST_REAL_BOB_SMOKE_POLL_MS        Default: ${DEFAULT_POLL_INTERVAL_MS}
`);
}

function hasArg(name) {
  return process.argv.slice(2).includes(name);
}

function env(name, fallback = '') {
  return process.env[name] || fallback;
}

function intEnv(name, fallback) {
  const parsed = Number.parseInt(env(name), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function requestJson(method, url, body) {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  return { status: response.status, ok: response.ok, payload };
}

function assertNoFakeBob(statusPayload) {
  const commandPath = String(statusPayload.command_path || '');
  if (commandPath.includes('fake-bob-shell')) {
    throw new Error('Refusing real Bob smoke against scripts/fake-bob-shell.mjs. Configure BOBSHELL_COMMAND to IBM Bob Shell real CLI first.');
  }
}

function printJson(label, payload) {
  console.log(`\n${label}`);
  console.log(JSON.stringify(payload, null, 2));
}

async function checkStatus(apiBaseUrl) {
  const health = await requestJson('GET', `${apiBaseUrl}/api/healthz`);
  if (!health.ok || health.payload.ok !== true) {
    printJson('healthz failed', health.payload);
    throw new Error(`Runtime API is not healthy: HTTP ${health.status}`);
  }

  const bobStatus = await requestJson('GET', `${apiBaseUrl}/api/bob/status?force_check=true`);
  printJson('bob/status?force_check=true', bobStatus.payload);
  if (!bobStatus.ok) throw new Error(`Bob status failed: HTTP ${bobStatus.status}`);
  assertNoFakeBob(bobStatus.payload);

  const capabilities = await requestJson('GET', `${apiBaseUrl}/api/capabilities`);
  printJson('capabilities', capabilities.payload);
  if (!capabilities.ok) throw new Error(`Capabilities failed: HTTP ${capabilities.status}`);

  const runtime = capabilities.payload.bob_shell_runtime || {};
  if (runtime.status !== 'ready' || runtime.available !== true) {
    throw new Error(`IBM Bob Shell is not ready. Status: ${runtime.status || bobStatus.payload.status || 'unknown'}`);
  }

  return { bobStatus: bobStatus.payload, capabilities: capabilities.payload };
}

function buildRunBody() {
  const repoId = env('BOBQUEST_REAL_BOB_SMOKE_REPO_ID').trim();
  const repoUrl = env('BOBQUEST_REAL_BOB_SMOKE_REPO_URL').trim();
  if (repoId) return { repo_id: repoId };
  if (repoUrl) return { repo_url: repoUrl };
  throw new Error('Set BOBQUEST_REAL_BOB_SMOKE_REPO_ID=owner/repo or BOBQUEST_REAL_BOB_SMOKE_REPO_URL=https://github.com/owner/repo before --run-once.');
}

async function runOnce(apiBaseUrl) {
  if (env('BOBQUEST_REAL_BOB_SMOKE_ACK') !== REQUIRED_ACK) {
    throw new Error(`Refusing to create a real Bob Shell runtime run. Set BOBQUEST_REAL_BOB_SMOKE_ACK=${REQUIRED_ACK} to confirm exactly one run.`);
  }

  await checkStatus(apiBaseUrl);

  const runBody = buildRunBody();
  console.log('\nCreating exactly one BobQuest runtime run...');
  const created = await requestJson('POST', `${apiBaseUrl}/api/runs`, runBody);
  printJson('POST /api/runs response', created.payload);
  if (!created.ok || !created.payload.run_id) {
    throw new Error(`Run creation failed: HTTP ${created.status}`);
  }

  const runId = created.payload.run_id;
  const timeoutMs = intEnv('BOBQUEST_REAL_BOB_SMOKE_TIMEOUT_MS', DEFAULT_TIMEOUT_MS);
  const pollMs = intEnv('BOBQUEST_REAL_BOB_SMOKE_POLL_MS', DEFAULT_POLL_INTERVAL_MS);
  const deadline = Date.now() + timeoutMs;
  let latest = created.payload;

  while (Date.now() < deadline) {
    const response = await requestJson('GET', `${apiBaseUrl}/api/runs/${encodeURIComponent(runId)}`);
    if (!response.ok) {
      printJson(`GET /api/runs/${runId} failed`, response.payload);
      throw new Error(`Run poll failed: HTTP ${response.status}`);
    }
    latest = response.payload;
    const state = latest.state;
    process.stdout.write(`run ${runId}: ${state}\n`);
    if (state === 'ready' || state === 'failed' || state === 'cancelled') break;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  printJson('final run state', latest);
  if (latest.state !== 'ready') {
    throw new Error(`Real Bob Shell smoke run did not finish ready. Final state: ${latest.state}`);
  }

  const analysis = latest.analysis_original || {};
  console.log('\nReal Bob Shell smoke run completed successfully.');
  console.log(`Run ID: ${runId}`);
  console.log(`Repo: ${analysis.repo?.url || latest.repo?.url || 'unknown'}`);
  console.log(`Flows: ${Array.isArray(analysis.flows) ? analysis.flows.length : 0}`);
  console.log(`Recommended first flow: ${analysis.recommended_first_flow_id || 'not provided'}`);
}

async function main() {
  if (hasArg('--help') || hasArg('-h')) {
    usage();
    return;
  }

  const apiBaseUrl = env('BOBQUEST_REAL_BOB_SMOKE_API_BASE_URL', DEFAULT_API_BASE_URL).replace(/\/+$/, '');
  const runMode = hasArg('--run-once');
  const statusOnly = hasArg('--status-only') || !runMode;

  if (statusOnly && runMode) throw new Error('Choose either --status-only or --run-once, not both.');
  if (runMode) {
    await runOnce(apiBaseUrl);
  } else {
    await checkStatus(apiBaseUrl);
    console.log('\nStatus-only smoke passed. No runtime run was created.');
  }
}

main().catch((error) => {
  console.error(`\nReal Bob Shell smoke failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
