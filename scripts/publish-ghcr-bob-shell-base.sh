#!/usr/bin/env bash
set -euo pipefail

GHCR_OWNER="${GHCR_OWNER:-iamjuanguillermo}"
IMAGE="ghcr.io/${GHCR_OWNER}/bobquest-bob-shell-base:latest"

echo "Building ${IMAGE} from Dockerfile.bob-base"
docker build -f Dockerfile.bob-base -t "$IMAGE" .

echo "Pushing ${IMAGE}"
docker push "$IMAGE"

echo "Published ${IMAGE}"
