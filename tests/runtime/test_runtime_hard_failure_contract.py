#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RUN_SERVICE = ROOT / "apps" / "runtime-api" / "src" / "services" / "RunService.ts"
CAPABILITY = ROOT / "apps" / "runtime-api" / "src" / "services" / "CapabilityService.ts"
STORE = ROOT / "apps" / "web" / "src" / "state" / "bobquestStore.ts"


def main() -> None:
    run_text = RUN_SERVICE.read_text(encoding="utf-8")
    capability_text = CAPABILITY.read_text(encoding="utf-8")
    store_text = STORE.read_text(encoding="utf-8")
    assert "failedRunState" in run_text, "runtime must persist failed run state"
    assert "IBM Bob Shell returned invalid BobQuest JSON" in run_text, "invalid Bob JSON must fail clearly"
    assert "Runtime disabled by configuration" in capability_text, "disabled runtime must be exposed as capability failure"
    assert "No product fallback" in store_text, "UI must keep hard no-fallback copy"
    assert "createRuntimeRun" in store_text, "UI must call runtime route instead of local execution"


if __name__ == "__main__":
    main()
