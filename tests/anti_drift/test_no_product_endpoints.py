#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RUNTIME_API = ROOT / "apps" / "runtime-api" / "src"
FORBIDDEN_ENDPOINTS = [
    "/packs",
    "/imports",
    "/submission/readiness",
    "/repo-intake/samples",
    "/bob-analysis-input/samples",
]
REQUIRED_ENDPOINTS = [
    "/api/healthz",
    "/api/capabilities",
    "/api/bob/status",
    "/api/runs",
    "/api/runs/:run_id",
    "/api/runs/:run_id/cancel",
    "/api/runs/:run_id/objectives/:objective_id/complete",
    "/api/runs/:run_id/objectives/:objective_id/evaluate",
    "/api/runs/:run_id/localize",
]


def main() -> None:
    assert RUNTIME_API.exists(), "runtime-api source missing"
    text = "\n".join(path.read_text(encoding="utf-8", errors="ignore") for path in RUNTIME_API.rglob("*.ts"))
    forbidden = [endpoint for endpoint in FORBIDDEN_ENDPOINTS if endpoint in text]
    missing = [endpoint for endpoint in REQUIRED_ENDPOINTS if endpoint not in text]
    assert not forbidden, f"forbidden product endpoints present: {forbidden}"
    assert not missing, f"required runtime endpoints missing: {missing}"


if __name__ == "__main__":
    main()
