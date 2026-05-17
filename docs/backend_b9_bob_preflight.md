# Backend B9 — Bob Shell Real Preflight

B9 implements configurable preflight validation for IBM Bob Shell runtime, allowing the backend to determine if Bob Shell is correctly configured and operational before accepting runs.

## What it validates

```text
GET /api/bob/status
GET /api/capabilities
POST /api/runs
```

All endpoints now reflect the actual operational status of IBM Bob Shell through a real preflight check.

## Preflight flow

```text
1. Check if runtime is disabled → status: disabled
2. Check if BOBSHELL_COMMAND is configured → status: not_configured
3. Resolve binary path (absolute, relative, or PATH) → status: binary_not_found
4. Execute preflight command with timeout → analyze result
5. Exit code 0 → status: ready
6. Exit code != 0 + auth keywords in stderr → status: auth_invalid
7. Exit code != 0 → status: preflight_failed
8. Timeout → status: preflight_failed
```

## Status values

```typescript
type BobShellStatus =
  | 'ready'              // Preflight passed, Bob Shell operational
  | 'not_configured'     // BOBSHELL_COMMAND is empty
  | 'binary_not_found'   // Command configured but binary not found
  | 'preflight_failed'   // Binary exists but preflight failed
  | 'auth_invalid'       // Preflight suggests authentication issue
  | 'disabled'           // BOBQUEST_RUNTIME_DISABLED=true
  | 'unknown';           // Preserved for compatibility
```

## Environment variables

### New variables

```bash
# Args for preflight/status check (default: --version)
BOBSHELL_STATUS_ARGS=--version

# Timeout for preflight (default: 5000ms)
BOBSHELL_STATUS_TIMEOUT_MS=5000

# Cache TTL for preflight results (default: 60000ms)
BOBSHELL_PREFLIGHT_CACHE_TTL_MS=60000

# Purpose-specific args (optional, for future granularity)
BOBSHELL_ANALYZE_ARGS=
BOBSHELL_EVALUATE_ARGS=
```

### Existing variables (preserved)

```bash
BOBSHELL_COMMAND=                    # Base command (required)
BOBSHELL_ARGS=                       # General args (fallback)
BOBSHELL_TIMEOUT_MS=180000           # Timeout for real operations
BOBQUEST_RUNTIME_DISABLED=false      # Global kill switch
```

## API behavior

### GET /api/bob/status

Returns detailed preflight status:

```json
{
  "available": true,
  "status": "ready",
  "message": "IBM Bob Shell preflight passed.",
  "version": "1.2.3",
  "command_path": "/usr/local/bin/bob",
  "preflight_duration_ms": 123,
  "last_check_at": "2026-05-17T00:00:00.000Z"
}
```

Query parameter:
- `?force_check=true` — Bypass cache and force fresh preflight

### GET /api/capabilities

Reflects Bob Shell status:

```json
{
  "bob_shell_runtime": {
    "available": true,
    "required": true,
    "status": "ready",
    "version": "1.2.3",
    "last_check_at": "2026-05-17T00:00:00.000Z"
  }
}
```

### POST /api/runs

Validates Bob Shell status before accepting run:

```text
1. Check Bob Shell status (uses cache if valid)
2. If status !== 'ready', reject with 503 BOB_UNAVAILABLE
3. Otherwise, proceed with run creation
```

Error response when not ready:

```json
{
  "error": {
    "code": "BOB_UNAVAILABLE",
    "message": "IBM Bob Shell is not ready. Status: binary_not_found. ..."
  }
}
```

## Preflight cache

- **TTL**: Configurable via `BOBSHELL_PREFLIGHT_CACHE_TTL_MS` (default 60 seconds)
- **Invalidation**: Cache invalidates if `BOBSHELL_COMMAND` or `BOBSHELL_STATUS_ARGS` change
- **Force check**: `/api/bob/status?force_check=true` bypasses cache
- **Scope**: In-memory per process (not persisted)

## Binary resolution

Resolves `BOBSHELL_COMMAND` safely without shell:

1. If absolute or relative path → verify with `fs.access(X_OK)`
2. If simple name → search `process.env.PATH` manually
3. Execute with `spawn(command, args, { shell: false })`

**Never uses**: `which`, `where`, `sh -c`, or shell interpolation.

## Version detection

Best-effort extraction from preflight stdout:

1. Try parsing as JSON → extract `version` field
2. Try regex patterns: `version: X.Y.Z`, `vX.Y.Z`, `X.Y.Z`
3. If not detected → omit from response

## Error codes

New error codes added:

- `BOB_NOT_CONFIGURED` — BOBSHELL_COMMAND not set
- `BOB_BINARY_NOT_FOUND` — Binary not found in PATH
- `BOB_PREFLIGHT_FAILED` — Preflight command failed

Existing codes preserved:

- `BOB_UNAVAILABLE` — Generic unavailability (used by POST /api/runs)
- `RUNTIME_DISABLED` — Runtime disabled by config

## Security

- **No stdout/stderr exposure**: Raw output never returned in HTTP responses
- **No shell execution**: All commands use `spawn(..., { shell: false })`
- **Timeout enforcement**: Preflight has strict timeout (default 5s)
- **Auth detection**: Conservative heuristic, falls back to generic failure

## Files modified

```text
packages/bob-shell-runtime/src/bobShellStatus.ts          (new)
packages/bob-shell-runtime/src/bobShellTypes.ts           (error classes)
packages/bob-shell-runtime/src/BobShellAdapter.ts         (preflight logic)
packages/bob-shell-runtime/src/index.ts                   (exports)
packages/onboarding-contracts/src/capabilities.ts         (status values)
apps/runtime-api/src/env.ts                               (new env vars)
apps/runtime-api/src/server.ts                            (config passing)
apps/runtime-api/src/routes/bob.ts                        (force_check)
apps/runtime-api/src/services/CapabilityService.ts        (status fields)
apps/runtime-api/src/services/RunService.ts               (preflight check)
apps/runtime-api/src/security/errorResponse.ts            (error codes)
.env.example                                              (documentation)
```

## Tests added

```text
tests/runtime/test_b9_bob_preflight_contract.py
tests/runtime/test_b9_bob_preflight_e2e.py
```

Run with:

```bash
pnpm test:backend-bob-preflight
```

## Test scenarios covered

- `not_configured` — Empty BOBSHELL_COMMAND
- `binary_not_found` — Nonexistent binary path
- `preflight_failed` — Exit code != 0
- `auth_invalid` — Auth keywords in stderr
- `ready` — Successful preflight
- `disabled` — Runtime disabled
- Version detection — Best-effort parsing
- Timeout — Preflight exceeds timeout
- Force check — Bypass cache
- Cache — Reuse recent results
- Capabilities — Reflects status correctly
- POST /api/runs — Rejects when not ready
- No stdout/stderr leak — Raw output not exposed

## Run accumulated tests

```bash
pnpm test
pnpm --filter bobquest-runtime-api build
pnpm --filter bobquest-web build
```

## What B9 does NOT do

- Does NOT execute repo analysis during preflight
- Does NOT spend Bobcoins
- Does NOT add fallback to fake Bob Shell in production
- Does NOT add sample mode or mock flows
- Does NOT use shell commands for binary resolution
- Does NOT expose raw stdout/stderr in HTTP responses
- Does NOT add multiple runtime providers
- Does NOT add telemetry or external metrics

## Next steps

After B9, the backend is ready for:

- **B10**: Micro-slice for real IBM Bob Shell CLI quirks (if needed)
- **B11**: Smoke test with real Bob Shell on 1 allowlisted repo

B9 is the final preparation slice before using IBM Bob Shell in production.