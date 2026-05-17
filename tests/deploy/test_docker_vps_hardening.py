#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOCKERFILE = ROOT / "Dockerfile"
COMPOSE = ROOT / "docker-compose.yml"
DOCS = [ROOT / "docs" / "local_runtime_setup.md", ROOT / "docs" / "vps_deploy_cloudflared.md"]


def main() -> None:
    dockerfile = DOCKERFILE.read_text(encoding="utf-8")
    compose = COMPOSE.read_text(encoding="utf-8")
    assert "AS build" in dockerfile and "AS runtime" in dockerfile, "Dockerfile must use build/runtime stages"
    assert "pnpm --filter bobquest-web build" in dockerfile, "Quasar frontend must build at Docker build time"
    assert "pnpm install" in dockerfile, "dependencies must install during image build"
    assert "CMD [\"pnpm\", \"--filter\", \"bobquest-runtime-api\", \"start\"]" in dockerfile, "container startup must run runtime API without reinstalling"
    assert "pnpm install" not in compose, "compose startup must not reinstall dependencies every boot"
    assert "BOBQUEST_OPTIONAL_LLM_PROVIDER" in compose and "watsonx" in compose, "compose must expose IBM-only optional LLM config"
    for doc in DOCS:
        text = doc.read_text(encoding="utf-8")
        assert "BOBSHELL_COMMAND" in text, f"{doc.name} must document Bob Shell command config"
        assert "BOBQUEST_OPTIONAL_LLM" in text, f"{doc.name} must document optional IBM LLM config"


if __name__ == "__main__":
    main()
