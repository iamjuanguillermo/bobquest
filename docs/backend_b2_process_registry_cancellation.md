# Backend B2 — Bob Shell process registry and real cancellation

B2 completes runtime cancellation for IBM Bob Shell analysis processes.

## What changed

- Added `apps/runtime-api/src/services/BobProcessRegistry.ts`.
- `RunService` now registers the active Bob Shell child process by `run_id` when analysis starts.
- `POST /api/runs/:run_id/cancel` now requests cancellation of the active process instead of only editing `run_state`.
- Cancellation sends `SIGTERM` and schedules `SIGKILL` escalation after a short grace window.
- `BobShellAdapter` accepts an `on_process_spawn` hook and escalates timed-out executions from `SIGTERM` to `SIGKILL`.
- If a cancelled Bob process later exits with a non-zero code, `RunService` preserves `state: cancelled` and does not overwrite it as `failed`.
- The fake Bob Shell supports `BOBQUEST_FAKE_BOB_SLEEP_MS` so cancellation can be tested without spending Bobcoins.

## Boundaries

B2 does not add IBM Bob Shell real command knowledge. It only makes the backend capable of managing and cancelling the process once configured.

B2 does not add workspace cleanup; that is B3.

B2 does not add richer HTTP schemas/errors; that is B5.

## Slice test

```bash
pnpm test:backend-cancel
```

## Accumulated tests

```bash
pnpm test
pnpm --filter bobquest-runtime-api build
pnpm --filter bobquest-web build
```
