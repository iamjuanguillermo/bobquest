#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PKG = ROOT / "packages" / "bob-shell-runtime" / "src"

REQUIRED = [
    "BobShellAdapter.ts",
    "jsonExtraction.ts",
    "promptLoader.ts",
    "validators.ts",
    "bobShellTypes.ts",
]
TOKENS = [
    "spawn(",
    "shell: false",
    "stdout",
    "stderr",
    "timeout_ms",
    "extractAndParseJson",
    "stripMarkdownCodeFence",
    "validateAnalysisResult",
    "BobShellUnavailableError",
]


def main() -> None:
    missing = [name for name in REQUIRED if not (PKG / name).exists()]
    assert not missing, f"bob-shell-runtime missing files: {missing}"
    text = "\n".join(path.read_text(encoding="utf-8", errors="ignore") for path in PKG.rglob("*.ts"))
    missing_tokens = [token for token in TOKENS if token not in text]
    assert not missing_tokens, f"bob-shell-runtime missing tokens: {missing_tokens}"
    assert "OpenAI" not in text, "BobShell runtime must not introduce OpenAI"


if __name__ == "__main__":
    main()
