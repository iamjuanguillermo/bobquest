# BobQuest v0.23.7 Backend B7

BobQuest is a flow-guided developer onboarding product powered by IBM Bob Shell runtime.

> [!IMPORTANT]
> **IBM Bob subscription required.** This repository depends on the real IBM Bob Shell runtime.
> To run repository analysis, the operator must have an active IBM Bob subscription/account and a valid Bob Shell API key.
> Without an active subscription and API key, local Docker, Railway deployment and `POST /api/runs` can boot successfully but Bob analysis will fail.
> BobQuest does not include a fallback analyzer, mock Bob runtime, or substitute static onboarding path.


The v0.23 runtime rule is strict:

- IBM Bob Shell is the runtime brain.
- BobQuest clones an approved GitHub repo into an isolated temporary workspace.
- BobQuest asks IBM Bob Shell for strict JSON output.
- BobQuest validates the JSON contract deterministically.
- BobQuest stores `run_state.json` file-based.
- If IBM Bob Shell is unavailable or returns invalid output, the run fails clearly.
- No static import, generated substitute, hidden fixture path, or product fallback is allowed.

## Current status

Implemented through this slice:

- `apps/runtime-api` Fastify backend.
- Runtime endpoints for health, capabilities, Bob status, runs, objectives and localization.
- `packages/bob-shell-runtime` with spawn-based adapter, stdout/stderr capture, timeout, JSON extraction and validation handoff.
- `packages/repo-workspace` with GitHub URL validation, allowlist enforcement, shallow clone and cleanup lifecycle.
- `packages/runtime-state` with file-based run state persistence.
- `packages/optional-ibm-llm` with IBM watsonx-only JSON Recovery Assistant and Localization Layer.
- UI runtime shell with public restricted repo select and self-hosted GitHub URL mode.
- Flow/step/starter mission onboarding renderer from `analysis_original`.
- Local validation for closed interactions.
- IBM Bob Shell evaluation route for open-text interactions.
- Optional language selector only when watsonx localization is available.
- Full-screen translation overlay that preserves original IBM Bob analysis.
- Docker/VPS hardening: dependencies and Quasar build happen during image build, not every container startup.

## Optional IBM LLM boundary

The optional LLM is IBM-only and does not replace Bob Shell. It can only do:

1. JSON Recovery Assistant after deterministic JSON failure.
2. Localization of already-rendered dynamic BobQuest onboarding content.

It cannot analyze repositories, classify issues, rank starter missions, evaluate understanding as the primary judge or replace Bob Shell.

## Local validation

```bash
pnpm install
pnpm test
pnpm --filter bobquest-runtime-api build
pnpm --filter bobquest-web build
```

The Python-only accumulated suite is still available:

```bash
python3 -u tests/run_all.py
```

## Development commands

Run runtime API:

```bash
pnpm --filter bobquest-runtime-api dev
```

Run web app:

```bash
pnpm --filter bobquest-web dev
```

Run both:

```bash
pnpm dev
```

## Docker local

```bash
docker compose up --build bobquest-runtime-api
```

## IBM Bob Shell configuration

Configure Bob Shell outside this repository execution:

```bash
BOBSHELL_COMMAND=/path/to/bob-shell
BOBSHELL_ARGS=
BOBSHELL_TIMEOUT_MS=180000
```

If `BOBSHELL_COMMAND` is empty or unavailable, `/api/bob/status` reports missing and `POST /api/runs` fails clearly. BobQuest does not continue with substitute onboarding content.

## Backend B7 status

Backend B7 adds persistent runtime limits for public demo protection:

- `BOBQUEST_MAX_CONCURRENT_RUNS` enforced through active run reservation;
- `BOBQUEST_MAX_RUNS_TOTAL` persisted across backend restarts;
- `BOBQUEST_MAX_RUNS_PER_HOUR` persisted across backend restarts;
- stale active runs are cleared on boot so crashes do not deadlock the deployment;
- evaluation/localization limits remain persisted per run in `run_state.json`.

The limiter state is stored in `data/runtime/runs/_runtime_limits.json`.
