# Backend B12 — Real Bob Shell CLI prompt mode

## Purpose

B12 closes the adapter gap between the existing BobQuest runtime and the documented IBM Bob Shell non-interactive CLI shape.

IBM Bob Shell documentation shows non-interactive usage with a prompt argument:

```bash
bob -p "Explain this project"
```

and API-key automation usage with:

```bash
bob --auth-method api-key -p "Explain this project"
```

BobQuest now supports both execution styles:

```text
stdin    — existing default; generated prompt is written to child stdin.
argument — generated prompt is appended to the command as `<prompt_arg> <prompt>`.
```

## New env vars

```bash
BOBSHELL_PROMPT_MODE=stdin|argument
BOBSHELL_PROMPT_ARG=-p
```

Defaults:

```bash
BOBSHELL_PROMPT_MODE=stdin
BOBSHELL_PROMPT_ARG=-p
```

## Recommended real Bob Shell profile

For the first real runtime smoke with IBM Bob Shell:

```bash
BOBSHELL_COMMAND=bob
BOBSHELL_STATUS_ARGS=--version
BOBSHELL_ANALYZE_ARGS=--auth-method,api-key
BOBSHELL_EVALUATE_ARGS=--auth-method,api-key
BOBSHELL_PROMPT_MODE=argument
BOBSHELL_PROMPT_ARG=-p
BOBSHELL_API_KEY=...
```

The adapter will execute analysis/evaluation conceptually as:

```bash
bob --auth-method api-key -p "<generated BobQuest prompt>"
```

## Notes

- B12 does not execute IBM Bob Shell real during tests.
- B12 does not spend Bobcoins.
- B12 does not add fallback/sample/mock/import flows.
- B12 keeps stdin mode as the default so the existing fake Bob Shell and prior tests remain compatible.
- Prompt-as-argument mode may expose the generated prompt to local process-list tooling on the host. Use only in the controlled runtime environment required for the hackathon smoke.

## Validation

Slice-specific:

```bash
pnpm test:backend-real-bob-cli-mode
```

Accumulated:

```bash
pnpm test
pnpm --filter bobquest-runtime-api build
pnpm --filter bobquest-web build
```
