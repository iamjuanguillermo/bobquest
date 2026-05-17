#!/usr/bin/env bash
set -euo pipefail

GHCR_OWNER="${GHCR_OWNER:-iamjuanguillermo}"
IMAGE="ghcr.io/${GHCR_OWNER}/bobquest-bob-shell-base:latest"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

cat > "$TMP_DIR/Dockerfile" <<'DOCKERFILE'
FROM node:22-bookworm-slim

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:/usr/local/bin:/root/.local/bin:/root/.bob/bin:$PATH

RUN apt-get update \
    && apt-get install -y --no-install-recommends bash ca-certificates curl git python3 findutils \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@9.12.0 --activate

RUN echo "Installing IBM Bob Shell..." \
    && curl -fsSL https://bob.ibm.com/download/bobshell.sh | bash \
    && echo "Searching for bob binary..." \
    && find / -type f -name bob 2>/dev/null | head -20 \
    && if ! command -v bob >/dev/null 2>&1; then \
         BOB_PATH="$(find / -type f -name bob 2>/dev/null | head -1)"; \
         if [ -n "$BOB_PATH" ]; then ln -sf "$BOB_PATH" /usr/local/bin/bob; fi; \
       fi \
    && command -v bob \
    && bob --version
DOCKERFILE

echo "Building ${IMAGE}"
docker build -t "$IMAGE" "$TMP_DIR"

echo "Pushing ${IMAGE}"
docker push "$IMAGE"

echo "Published ${IMAGE}"
