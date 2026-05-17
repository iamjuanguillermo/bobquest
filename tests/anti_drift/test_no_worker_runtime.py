#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> None:
    assert not (ROOT / "apps" / "api").exists(), "Cloudflare Worker runtime app must not exist"
    package_text = (ROOT / "package.json").read_text(encoding="utf-8")
    compose_text = (ROOT / "docker-compose.yml").read_text(encoding="utf-8")
    assert "wrangler" not in package_text.lower(), "root package scripts must not reference wrangler"
    assert "wrangler" not in compose_text.lower(), "compose must not run wrangler"
    assert "worker.mjs" not in package_text, "root scripts must not reference worker.mjs"


if __name__ == "__main__":
    main()
