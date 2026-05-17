# Backend B8 — Minimal runtime observability

B8 adds minimal backend observability without turning BobQuest into a public runtime console.

## What is persisted

Each `run_state.json` now contains:

```json
{
  "observability": {
    "phase_timings": []
  }
}
```

Supported phases:

- `creating_workspace`
- `cloning_repo`
- `running_bob_analysis`
- `parsing_bob_output`
- `evaluating_answer`
- `workspace_cleanup`
- `localization`

Each phase records:

- status;
- started timestamp;
- finished timestamp;
- duration in milliseconds;
- optional error code.

## What is logged

The runtime API logs structured events with:

- `run_id`;
- `phase`;
- `repo` where safe;
- `objective_id` where applicable;
- `duration_ms`;
- `error_code`;
- Bob process exit code and timeout flag.

## Redaction rule

The backend must not log raw Bob Shell stdout, stderr, raw output, or prompts. It logs only byte counts:

- `stdout_bytes`
- `stderr_bytes`

Raw stdout/stderr are never returned to the frontend.
