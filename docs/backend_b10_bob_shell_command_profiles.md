# Backend B10 — Bob Shell Command Profiles

B10 closes the configuration gap left after B9: `BOBSHELL_ANALYZE_ARGS` and `BOBSHELL_EVALUATE_ARGS` are now actually wired into `BobShellAdapter.execute()`.

## Behavior

BobQuest still uses one base command:

```bash
BOBSHELL_COMMAND=/path/to/bob
```

Then each runtime purpose can use separate arguments:

```bash
BOBSHELL_STATUS_ARGS=--version
BOBSHELL_ANALYZE_ARGS=analyze,--json
BOBSHELL_EVALUATE_ARGS=evaluate,--json
```

Selection rule:

- `analyze_repo` uses `BOBSHELL_ANALYZE_ARGS` when non-empty.
- `evaluate_answer` uses `BOBSHELL_EVALUATE_ARGS` when non-empty.
- any empty purpose-specific args fall back to `BOBSHELL_ARGS`.
- prompts are still delivered through stdin.
- `BOBQUEST_BOB_PURPOSE` is still set in the child environment for test harnesses and adapters that need it.

## Non-goals

B10 does not discover the real IBM Bob Shell command automatically, does not execute Bob Shell real, does not spend Bobcoins, and does not add product fallback.
