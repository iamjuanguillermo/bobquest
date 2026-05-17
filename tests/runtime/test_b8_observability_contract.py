#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def main() -> None:
    run_state = read("packages/onboarding-contracts/src/runState.ts")
    logger = read("apps/runtime-api/src/observability/runtimeLogger.ts")
    run_service = read("apps/runtime-api/src/services/RunService.ts")
    evaluation_service = read("apps/runtime-api/src/services/EvaluationService.ts")
    localization_service = read("apps/runtime-api/src/services/LocalizationService.ts")
    server = read("apps/runtime-api/src/server.ts")
    package = read("package.json")

    assert "export interface RunObservability" in run_state
    assert "phase_timings: RunPhaseTiming[]" in run_state
    assert "export function startRunPhase" in run_state
    assert "export function finishRunPhase" in run_state
    for phase in ["creating_workspace", "cloning_repo", "running_bob_analysis", "parsing_bob_output", "evaluating_answer", "workspace_cleanup", "localization"]:
        assert f"| '{phase}'" in run_state or f"'{phase}'" in run_state, f"missing observable phase {phase}"

    assert "bobResultLogSummary" in logger
    assert "stdout_bytes" in logger
    assert "stderr_bytes" in logger
    assert "stdout_redacted" in logger
    assert "stderr_redacted" in logger
    assert "raw_output_redacted" in logger
    assert "prompt_redacted" in logger

    combined = run_service + evaluation_service + localization_service
    assert "startRunPhase" in combined
    assert "finishRunPhase" in combined
    assert "runtimeLogFields" in combined
    assert "bobResultLogSummary" in run_service
    assert "bobResultLogSummary" in evaluation_service
    assert "stdout" not in run_service.split("bobResultLogSummary(bobResult)")[1].split("}), 'BobQuest IBM Bob analysis")[0], "raw stdout must not be logged in run service"
    assert "stderr" not in run_service.split("bobResultLogSummary(bobResult)")[1].split("}), 'BobQuest IBM Bob analysis")[0], "raw stderr must not be logged in run service"
    assert "app.log" in server
    assert "new RunService(env, bobShell, stateStore, limitStore, projectRoot, jsonRecoveryAssistant, processRegistry, app.log)" in server
    assert "new EvaluationService(env, bobShell, stateStore, projectRoot, processRegistry, app.log)" in server
    assert "new LocalizationService(env, stateStore, localizationLayer, app.log)" in server
    assert '"test:backend-observability"' in package


if __name__ == "__main__":
    main()
