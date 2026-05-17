#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTRACT = ROOT / "packages" / "onboarding-contracts" / "src" / "runState.ts"
FORBIDDEN_STATES = ["sample_ready", "mock_ready", "static_import_ready", "fixture_ready"]
REQUIRED_STATES = [
    "idle",
    "creating_workspace",
    "cloning_repo",
    "running_bob_analysis",
    "parsing_bob_output",
    "ready",
    "evaluating_answer",
    "failed",
    "cancelled",
]


def main() -> None:
    assert CONTRACT.exists(), "run state contract missing"
    text = CONTRACT.read_text(encoding="utf-8")
    missing = [state for state in REQUIRED_STATES if f"'{state}'" not in text]
    forbidden = [state for state in FORBIDDEN_STATES if state in text]
    assert not missing, f"run state contract missing states: {missing}"
    assert not forbidden, f"obsolete run states present: {forbidden}"
    assert "analysis_original" in text, "run state must preserve original analysis"
    assert "localized_analysis" in text, "run state must support localized copies"


if __name__ == "__main__":
    main()
