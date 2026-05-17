#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
API = ROOT / "apps" / "runtime-api"

REQUIRED_FILES = [
    "package.json",
    "src/server.ts",
    "src/env.ts",
    "src/routes/health.ts",
    "src/routes/capabilities.ts",
    "src/routes/bob.ts",
    "src/routes/runs.ts",
    "src/routes/objectives.ts",
    "src/routes/localization.ts",
    "src/services/RunService.ts",
    "src/services/CapabilityService.ts",
    "src/security/repoAllowlist.ts",
    "src/security/limits.ts",
]
REQUIRED_TOKENS = [
    "Fastify",
    "@fastify/cors",
    "GET /api/healthz",
    "POST /api/runs",
    "BobShellAdapter",
    "FileRunStateStore",
    "resolveRequestedRepo",
    "PersistentRuntimeLimitStore",
]


def main() -> None:
    missing = [path for path in REQUIRED_FILES if not (API / path).exists()]
    assert not missing, f"runtime-api missing files: {missing}"
    text = "\n".join(path.read_text(encoding="utf-8", errors="ignore") for path in API.rglob("*.ts"))
    missing_tokens = [token for token in REQUIRED_TOKENS if token not in text]
    assert not missing_tokens, f"runtime-api missing tokens: {missing_tokens}"
    package_text = (API / "package.json").read_text(encoding="utf-8")
    assert "fastify" in package_text, "runtime-api must use Fastify"
    assert "wrangler" not in package_text.lower(), "runtime-api must not use Wrangler"


if __name__ == "__main__":
    main()
