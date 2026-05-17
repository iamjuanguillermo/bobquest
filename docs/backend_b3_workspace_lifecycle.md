# Backend B3 — Workspace metadata and lifecycle

B3 completes the first workspace lifecycle layer before any Bob IDE work.

## Scope

- Persist workspace metadata inside `run_state.json`.
- Track clone lifecycle timestamps.
- Keep successful workspaces for later open-answer evaluation.
- Cleanup workspaces on cancel/failure.
- Cleanup expired workspaces on runtime startup using `BOBQUEST_WORKSPACE_TTL_MS`.

## Runtime fields

Each run may contain:

```json
{
  "workspace": {
    "workspace_id": "run_xxx",
    "root_dir": "/abs/path/data/runtime/workspaces/run_xxx",
    "repo_dir": "/abs/path/data/runtime/workspaces/run_xxx/repo",
    "status": "cloned",
    "created_at": "...",
    "clone_started_at": "...",
    "clone_finished_at": "...",
    "cleanup_started_at": null,
    "cleanup_finished_at": null,
    "cleanup_error": null
  }
}
```

## Invariants

- BobQuest never runs code from the cloned repo.
- Successful runs keep the workspace so later Bob Shell evaluation can use the same repo checkout.
- Cancelled/failed runs attempt workspace cleanup.
- Cleanup failure is recorded as metadata; it does not create a fallback flow.
- Startup TTL cleanup removes old workspace directories only.

## Test command

```bash
pnpm test:backend-workspace
```

## Accumulated command

```bash
pnpm test
pnpm --filter bobquest-runtime-api build
pnpm --filter bobquest-web build
```
