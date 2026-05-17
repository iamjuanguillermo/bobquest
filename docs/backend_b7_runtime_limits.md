# Backend B7 — Persistent runtime limits

B7 completes deployment-level runtime limits without relying only on process memory.

## What is enforced

- `BOBQUEST_MAX_CONCURRENT_RUNS`
- `BOBQUEST_MAX_RUNS_TOTAL`
- `BOBQUEST_MAX_RUNS_PER_HOUR`
- `BOBQUEST_MAX_EVALUATIONS_PER_RUN`
- `BOBQUEST_MAX_LOCALIZATIONS_PER_RUN`
- `BOBQUEST_RUNTIME_DISABLED`

Run limits are persisted in:

```text
data/runtime/runs/_runtime_limits.json
```

The file records:

- active run ids;
- total runs used by the deployment;
- run timestamps used for hourly limits.

## Boot behavior

On backend boot, stale `active_runs` are cleared. This prevents a crashed process from permanently blocking the public demo. Total and hourly counters are preserved.

## Scope boundary

B7 does not add Redis, external rate limiting, IP-based quota, auth, or manager dashboards. It is a file-based deployment limiter suitable for the public hackathon demo constraints.
