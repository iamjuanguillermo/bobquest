#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def main() -> None:
    registry = read("apps/runtime-api/src/services/BobProcessRegistry.ts")
    run_service = read("apps/runtime-api/src/services/RunService.ts")
    adapter = read("packages/bob-shell-runtime/src/BobShellAdapter.ts")
    types = read("packages/bob-shell-runtime/src/bobShellTypes.ts")

    assert "class BobProcessRegistry" in registry
    assert "register(runId" in registry
    assert "cancel(runId" in registry
    assert "SIGTERM" in registry
    assert "SIGKILL" in registry
    assert "escalation_timer" in registry
    assert "unregister(runId" in registry

    assert "BobProcessRegistry" in run_service
    assert "processRegistry.cancel(runId)" in run_service
    assert "on_process_spawn" in run_service
    assert "processRegistry.register(runId, 'analyze_repo'" in run_service
    assert "if (current.state === 'cancelled') return" in run_service
    assert "isRunCancelled" in run_service

    assert "on_process_spawn?:" in types
    assert "request.on_process_spawn?.(child)" in adapter
    assert "timeoutKillEscalation" in adapter
    assert "child.kill('SIGTERM')" in adapter
    assert "child.kill('SIGKILL')" in adapter


if __name__ == "__main__":
    main()
