#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PKG = ROOT / "packages" / "repo-workspace" / "src"
TOKENS = [
    "normalizeGitHubRepoUrl",
    "assertRepoAllowed",
    "Only HTTPS GitHub repository URLs are accepted",
    "localhost",
    "private network",
    "'clone', '--depth', '1'",
    "shell: false",
    "cleanupWorkspace",
    "GIT_TERMINAL_PROMPT",
    "GCM_INTERACTIVE",
    "GIT_ASKPASS",
    "SSH_ASKPASS",
]


def main() -> None:
    assert PKG.exists(), "repo-workspace package missing"
    text = "\n".join(path.read_text(encoding="utf-8", errors="ignore") for path in PKG.rglob("*.ts"))
    missing = [token for token in TOKENS if token not in text]
    assert not missing, f"repo-workspace missing tokens: {missing}"
    assert "npm install" not in text and "pnpm install" not in text, "repo-workspace must not execute repo dependencies"


if __name__ == "__main__":
    main()
