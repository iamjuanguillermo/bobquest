# Backend B11 — Real Bob Shell readiness pack

B11 prepares a controlled real IBM Bob Shell smoke path without running Bob Shell automatically and without spending Bobcoins by default.

## What B11 adds

- `.env.real-bob.example` with a real-runtime profile.
- `scripts/real-bob-runtime-smoke.mjs`.
- `pnpm smoke:real-bob:status` for safe status/capabilities checks.
- `pnpm smoke:real-bob:run-once` for exactly one guarded runtime run.
- Anti-drift tests that verify the smoke script is guarded and does not use the fake Bob Shell path.

## Safety model

Status-only mode calls:

```text
GET /api/healthz
GET /api/bob/status?force_check=true
GET /api/capabilities
```

It creates no run.

Run-once mode calls `POST /api/runs` exactly once and polls `GET /api/runs/:run_id` until terminal state. It refuses to run unless:

```bash
BOBQUEST_REAL_BOB_SMOKE_ACK=I_ACCEPT_ONE_BOB_SHELL_RUNTIME_RUN
```

The script also refuses to run against `scripts/fake-bob-shell.mjs` for real smoke.

## First real smoke checklist

1. Pick one small public repo and put it in `BOBQUEST_ALLOWED_REPOS`.
2. Configure `BOBSHELL_COMMAND` to the real IBM Bob Shell CLI.
3. Configure `BOBSHELL_STATUS_ARGS` to a lightweight command such as `--version` only if the real CLI supports it without analysis.
4. Start with optional IBM LLM disabled.
5. Start the runtime API.
6. Run status-only smoke.
7. Only if status is `ready`, run one real runtime run.
8. Do not run repeated attempts unless you are intentionally spending Bobcoins.

## Commands

```bash
cp .env.real-bob.example .env.real-bob
# edit .env.real-bob
set -a
source .env.real-bob
set +a
pnpm --filter bobquest-runtime-api start
```

In another terminal:

```bash
set -a
source .env.real-bob
set +a
pnpm smoke:real-bob:status
```

When ready to spend exactly one runtime analysis:

```bash
set -a
source .env.real-bob
set +a
pnpm smoke:real-bob:run-once
```

## Non-goals

B11 does not:

- install IBM Bob Shell;
- discover real Bob Shell CLI syntax automatically;
- run Bob Shell real during tests;
- add retries;
- add new telemetry;
- add UI changes;
- add fallback/sample/mock product flows.


## FIX1 note — capabilities hard-failure compatibility

B11 FIX1 keeps `bob_shell_runtime.message` in `/api/capabilities` so runtime-disabled deployments still expose a clear user-facing failure reason. When `BOBQUEST_RUNTIME_DISABLED=true`, capabilities include `Runtime disabled by configuration` and no product fallback is allowed.
