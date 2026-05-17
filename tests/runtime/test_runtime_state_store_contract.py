#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PKG = ROOT / "packages" / "runtime-state" / "src"
TOKENS = [
    "FileRunStateStore",
    "run_state.json",
    "JSON.stringify(state, null, 2)",
    "analysis_original",
    "localized_analysis",
    "rename(tempFile, file)",
    "SyntaxError",
]


def main() -> None:
    assert PKG.exists(), "runtime-state package missing"
    text = "\n".join(path.read_text(encoding="utf-8", errors="ignore") for path in PKG.rglob("*.ts"))
    contract = (ROOT / "packages" / "onboarding-contracts" / "src" / "runState.ts").read_text(encoding="utf-8")
    combined = text + "\n" + contract
    missing = [token for token in TOKENS if token not in combined]
    assert not missing, f"runtime-state missing tokens: {missing}"


if __name__ == "__main__":
    main()
