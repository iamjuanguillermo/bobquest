#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ANALYSIS = ROOT / "packages" / "onboarding-contracts" / "src" / "analysis.ts"
BOB_VALIDATORS = ROOT / "packages" / "bob-shell-runtime" / "src" / "validators.ts"
RUN_SERVICE = ROOT / "apps" / "runtime-api" / "src" / "services" / "RunService.ts"

REQUIRED_SEMANTIC_GATES = [
    "recommended_first_flow_id must reference an existing flow id",
    "flow_step_id must reference a step in the same flow",
    "correct_option_id must reference an existing option id",
    "correct_option_ids must reference existing option ids",
    "contains duplicate id",
    ".path is required",
    ".command is required",
    "must not contain local answer keys or local success/failure messages",
    "validateRepoReferences",
    "validateTestReferences",
    "validateOptions",
    "validateStringArray",
    "assertUniqueStrings",
]

FORBIDDEN_WEAK_VALIDATION = [
    "path or command is required",
]


def main() -> None:
    assert ANALYSIS.exists(), "analysis contract missing"
    text = ANALYSIS.read_text(encoding="utf-8")
    missing = [token for token in REQUIRED_SEMANTIC_GATES if token not in text]
    assert not missing, f"semantic validation gates missing: {missing}"

    forbidden = [token for token in FORBIDDEN_WEAK_VALIDATION if token in text]
    assert not forbidden, f"weak shape-only validation remains: {forbidden}"

    assert BOB_VALIDATORS.exists(), "bob-shell-runtime validator bridge missing"
    assert "validateAnalysisResult" in BOB_VALIDATORS.read_text(encoding="utf-8")

    run_service_text = RUN_SERVICE.read_text(encoding="utf-8")
    assert "validateAnalysisResult(extracted.parsed)" in run_service_text
    assert "validation.errors.join('; ')" in run_service_text
    assert "INVALID_BOB_JSON" in run_service_text


if __name__ == "__main__":
    main()
