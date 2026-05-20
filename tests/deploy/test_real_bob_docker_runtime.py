#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> None:
    base = (ROOT / "Dockerfile.bob-base").read_text(encoding="utf-8")
    dockerfile = (ROOT / "Dockerfile.real-bob").read_text(encoding="utf-8")
    compose = (ROOT / "docker-compose.real-bob.yml").read_text(encoding="utf-8")
    env_file = (ROOT / ".env.real-bob").read_text(encoding="utf-8")
    build_script = (ROOT / "scripts" / "build-real-bob-base-image.sh").read_text(encoding="utf-8")
    install_script = (ROOT / "scripts" / "install-bob-shell-from-local-tgz.sh").read_text(encoding="utf-8")
    publish_script = (ROOT / "scripts" / "publish-ghcr-bob-shell-base.sh").read_text(encoding="utf-8")
    up_script = (ROOT / "scripts" / "real-bob-docker-up.sh").read_text(encoding="utf-8")
    doc13 = (ROOT / "docs" / "backend_b13_real_bob_docker_runtime.md").read_text(encoding="utf-8")
    doc14 = (ROOT / "docs" / "backend_b14_reusable_real_bob_docker_base.md").read_text(encoding="utf-8")

    assert "https://bob.ibm.com/download/bobshell.sh" not in base, "Bob base image must not download Bob Shell externally"
    assert "bob-download" in base, "Bob base image must install from repo-local bob-download"
    assert "install-bob-shell-from-local-tgz.sh" in base, "Bob base image must use the local installer script"
    assert "command -v bob" in base, "Bob base image must verify bob binary exists"
    assert "corepack prepare pnpm@9.12.0 --activate" in base, "Bob base image must prepare pnpm"

    assert "sha256sum -c SHA256SUMS.txt" in install_script, "local installer must verify tarball checksum"
    assert "tar -xzf" in install_script and "--strip-components=1" in install_script, "local installer must unpack npm tarball directly"
    assert "bob --version" in install_script, "local installer must smoke-check the CLI"
    assert "bob.ibm.com/download/bobshell.sh" not in install_script, "local installer must not call external Bob download"

    assert "https://bob.ibm.com/download/bobshell.sh" not in publish_script, "GHCR publish script must not fetch Bob Shell externally"
    assert "docker build -f Dockerfile.bob-base" in publish_script, "GHCR publish script must reuse canonical local base Dockerfile"

    assert "https://bob.ibm.com/download/bobshell.sh" not in dockerfile, "project runtime Dockerfile must not download Bob Shell every repo build"
    assert "FROM ${BOBQUEST_BOB_BASE_IMAGE} AS build" in dockerfile, "build stage must reuse Bob Shell base image"
    assert "FROM ${BOBQUEST_BOB_BASE_IMAGE} AS runtime" in dockerfile, "runtime stage must reuse Bob Shell base image"
    assert "tests/run_all.py" not in dockerfile, "real Bob Docker build must not run the full E2E suite during image build"
    assert "RUN pnpm --filter bobquest-web build" in dockerfile, "web build must still happen at image build time"
    assert 'CMD ["pnpm", "--filter", "bobquest-runtime-api", "start"]' in dockerfile, "runtime startup must only start API"

    assert "BOBQUEST_BOB_BASE_IMAGE" in compose, "compose must pass configurable base image arg"
    assert "env_file:" in compose and ".env.real-bob" in compose, "real Bob compose must use .env.real-bob"
    assert "BOBSHELL_COMMAND=bob" in env_file, "real Bob env must use bob inside container"
    assert "BOBSHELL_API_KEY=PASTE_YOUR_BOB_SHELL_API_KEY_HERE" in env_file, "real Bob env must expose only placeholder API key"
    assert "BOBQUEST_REAL_BOB_SMOKE_ACK=" in env_file, "run-once ACK must be blank by default"

    assert "docker image inspect" in build_script, "base image script must reuse existing local image"
    assert "BOBQUEST_FORCE_REBUILD_BOB_BASE" in build_script, "base image script must support intentional rebuild"
    assert "docker build -f Dockerfile.bob-base" in build_script, "base image script must build Bob base explicitly"
    assert "local bob-download tarball" in build_script, "base image script must state local installer behavior"
    assert "Missing BobQuest Bob Shell base image" in up_script, "up script must fail clearly if base image is missing"
    assert "docker compose -f docker-compose.real-bob.yml up --build" in up_script, "up script must start real Bob compose"

    assert "Bob Shell is installed inside Docker" in doc13, "doc must state host does not need Bob Shell"
    assert "reusable base image" in doc13, "doc must explain reusable Bob base image"
    assert "bob-download" in doc13, "doc must explain local Bob Shell installer source"
    assert "bobquest-bob-shell-base:local" in doc14, "B14 doc must name reusable local image"
    assert "Future repos" in doc14, "B14 doc must explain future slice workflow"
    assert "bob-download" in doc14, "B14 doc must explain pinned local tarball"


if __name__ == "__main__":
    main()
