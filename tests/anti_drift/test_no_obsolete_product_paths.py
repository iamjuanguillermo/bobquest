#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PRODUCT_DIRS = [ROOT / "apps" / "web" / "src", ROOT / "apps"]
FORBIDDEN_FILES_OR_DIRS = [
    ROOT / "apps" / "api",
    ROOT / "apps" / "web" / "src" / "fixtures",
    ROOT / "examples",
    ROOT / "data" / "submission",
]
FORBIDDEN_PHRASES_IN_UI = [
    "ArtifactImportPanel",
    "Import IBM Bob analysis JSON",
    "Use sample analysis",
    "sample analysis",
    "sample fallback",
    "mock Bob analysis",
    "startMockBobAnalysis",
    "mock_bob_analysis",
    "fixture catalog",
    "ZIP upload",
    "suggested repo",
    "static artifact",
    "Submission readiness",
    "Runtime console",
    "evidence console",
    "manager dashboard",
    "PR agent",
    "autonomous coding",
]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def main() -> None:
    existing = [path for path in FORBIDDEN_FILES_OR_DIRS if path.exists()]
    assert not existing, f"obsolete product paths still exist: {existing}"

    scanned_files: list[Path] = []
    for directory in PRODUCT_DIRS:
        if not directory.exists():
            continue
        for path in directory.rglob("*"):
            if path.is_file() and path.suffix in {".vue", ".ts", ".js", ".json", ".scss", ".mjs"}:
                scanned_files.append(path)

    violations: list[str] = []
    for path in scanned_files:
        text = read_text(path)
        for phrase in FORBIDDEN_PHRASES_IN_UI:
            if phrase.lower() in text.lower():
                violations.append(f"{path.relative_to(ROOT)} contains forbidden phrase: {phrase}")
    assert not violations, "\n".join(violations)


if __name__ == "__main__":
    main()
