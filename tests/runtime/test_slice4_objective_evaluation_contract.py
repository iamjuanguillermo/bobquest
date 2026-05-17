#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SERVICE = ROOT / "apps" / "runtime-api" / "src" / "services" / "EvaluationService.ts"
ROUTE = ROOT / "apps" / "runtime-api" / "src" / "routes" / "objectives.ts"
CLIENT = ROOT / "apps" / "web" / "src" / "api" / "runtimeClient.ts"
STORE = ROOT / "apps" / "web" / "src" / "state" / "bobquestStore.ts"


def main() -> None:
    service = SERVICE.read_text(encoding="utf-8")
    route = ROUTE.read_text(encoding="utf-8")
    client = CLIENT.read_text(encoding="utf-8")
    store = STORE.read_text(encoding="utf-8")

    assert "findStarterMission" in service, "backend must verify objective exists in Bob analysis"
    assert "evaluateClosedInteraction" in service, "closed objective completion must use local validation contract"
    assert "Closed objectives are validated locally" in service, "closed interactions must not call Bob Shell evaluation"
    assert "open_text_evaluated_by_bob" in service, "open text interaction gate missing"
    assert "max_evaluations_per_run" in service and "Evaluation limit reached for this run" in service, "evaluation limit missing"
    assert "validateEvaluationResult" in service, "Bob evaluation JSON must be deterministically validated"
    assert "objective_progress" in service, "backend must persist objective completion/evaluation progress"
    assert "state: 'evaluating_answer'" in service, "run state must reflect open answer evaluation"
    assert "state: 'ready'" in service, "run state must return to ready after evaluation attempt"

    assert "/api/runs/:run_id/objectives/:objective_id/complete" in route, "complete route missing"
    assert "/api/runs/:run_id/objectives/:objective_id/evaluate" in route, "evaluate route missing"
    assert "completeRuntimeObjective" in client and "evaluateRuntimeObjective" in client, "frontend runtime client missing objective calls"
    assert "completeActiveClosedMission" in store, "UI store missing closed interaction completion"
    assert "evaluateActiveOpenMission" in store, "UI store missing open interaction Bob evaluation"
    assert "No product fallback" in store, "evaluation failures must not trigger fallback"


if __name__ == "__main__":
    main()
