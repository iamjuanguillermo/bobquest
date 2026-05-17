#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTRACT = ROOT / "packages" / "onboarding-contracts" / "src" / "analysis.ts"

REQUIRED_TOKENS = [
    "schema_version: '0.23'",
    "user_action_flow",
    "api_request_flow",
    "mutation_flow",
    "data_flow",
    "event_flow",
    "background_job_flow",
    "command_flow",
    "build_deploy_flow",
    "auth_session_flow",
    "error_handling_flow",
    "single_choice",
    "multi_choice",
    "short_text",
    "confirm_understanding",
    "file_focus",
    "open_text_evaluated_by_bob",
    "recommended_first_flow_id",
    "locked_or_later_issues",
]


def main() -> None:
    assert CONTRACT.exists(), "analysis contract missing"
    text = CONTRACT.read_text(encoding="utf-8")
    missing = [token for token in REQUIRED_TOKENS if token not in text]
    assert not missing, f"analysis contract missing tokens: {missing}"


if __name__ == "__main__":
    main()
