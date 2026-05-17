#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EVAL = ROOT / "packages" / "onboarding-contracts" / "src" / "evaluation.ts"
RUN_STATE = ROOT / "packages" / "onboarding-contracts" / "src" / "runState.ts"

REQUIRED_TOKENS = [
    "EvaluationResult",
    "ObjectiveProgress",
    "InteractionAnswer",
    "evaluateClosedInteraction",
    "validateEvaluationResult",
    "Open-text objectives must be evaluated by IBM Bob Shell",
    "arraysEqualAsSets",
    "expected_terms",
]


def main() -> None:
    text = EVAL.read_text(encoding="utf-8")
    missing = [token for token in REQUIRED_TOKENS if token not in text]
    assert not missing, f"evaluation contract missing tokens: {missing}"
    state_text = RUN_STATE.read_text(encoding="utf-8")
    assert "objective_progress" in state_text, "run state must persist objective progress"
    assert "Record<string, ObjectiveProgress>" in state_text, "objective progress must be keyed per objective"


if __name__ == "__main__":
    main()
