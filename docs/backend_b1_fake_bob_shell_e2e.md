# Backend B1 — Fake Bob Shell E2E Harness

This slice adds a deterministic backend E2E harness that exercises the runtime API without spending IBM Bob Shell credits.

## What it validates

```text
POST /api/runs
→ public demo allowlist enforcement
→ shallow clone through git
→ fake Bob Shell command execution
→ JSON extraction and validation
→ run_state persistence
→ ready run with AnalysisResult
```

## Files

```text
scripts/fake-bob-shell.mjs
tests/fixtures/fake_bob_analysis.json
tests/fixtures/fake_bob_evaluation.json
tests/runtime/test_b1_fake_bob_shell_e2e.py
```

## Run only this slice

```bash
pnpm install
pnpm test:backend-e2e
```

## Run accumulated tests

```bash
pnpm install
pnpm test
pnpm --filter bobquest-runtime-api build
pnpm --filter bobquest-web build
```

## Manual fake Bob Shell env

```bash
export BOBSHELL_COMMAND="$(pwd)/scripts/fake-bob-shell.mjs"
export BOBQUEST_FAKE_BOB_ANALYSIS_PATH="$(pwd)/tests/fixtures/fake_bob_analysis.json"
export BOBQUEST_FAKE_BOB_EVALUATION_PATH="$(pwd)/tests/fixtures/fake_bob_evaluation.json"
```

This is a test harness only. It is not a product fallback and must not be surfaced in the UI.
