#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="${BOBQUEST_BOB_BASE_IMAGE:-bobquest-bob-shell-base:local}"
FORCE="${BOBQUEST_FORCE_REBUILD_BOB_BASE:-false}"

if docker image inspect "$IMAGE_NAME" >/dev/null 2>&1 && [ "$FORCE" != "true" ]; then
  echo "BobQuest Bob Shell base image already exists: $IMAGE_NAME"
  echo "Skipping rebuild. Set BOBQUEST_FORCE_REBUILD_BOB_BASE=true to rebuild it."
  exit 0
fi

echo "Building BobQuest Bob Shell base image: $IMAGE_NAME"
echo "This installs IBM Bob Shell from the local bob-download tarball; no bob.ibm.com download is performed."
docker build -f Dockerfile.bob-base -t "$IMAGE_NAME" .

echo "Built: $IMAGE_NAME"
