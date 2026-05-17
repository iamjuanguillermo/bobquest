#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def main() -> None:
    limits = read("apps/runtime-api/src/security/limits.ts")
    server = read("apps/runtime-api/src/server.ts")
    run_service = read("apps/runtime-api/src/services/RunService.ts")
    package = read("package.json")

    assert "export class PersistentRuntimeLimitStore" in limits
    assert "reserveRun(env: RuntimeEnv, runId: string)" in limits
    assert "releaseRun(runId: string)" in limits
    assert "initializeForBoot()" in limits
    assert "active_runs: {}" in limits, "active runs must be cleared on boot to avoid crash deadlocks"
    assert "_runtime_limits.json" in server
    assert "await limitStore.initializeForBoot()" in server
    assert "new RunService(env, bobShell, stateStore, limitStore" in server
    assert "await this.limitStore.reserveRun(this.env, runId)" in run_service
    assert ".finally(() => this.limitStore.releaseRun(state.run_id))" in run_service
    assert "createRuntimeCounters" not in server + run_service
    assert "RuntimeCounters" not in run_service
    assert '"test:backend-limits"' in package


if __name__ == "__main__":
    main()
