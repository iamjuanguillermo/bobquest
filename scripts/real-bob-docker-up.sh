#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="${BOBQUEST_BOB_BASE_IMAGE:-bobquest-bob-shell-base:local}"

if ! docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
  echo "Missing BobQuest Bob Shell base image: $IMAGE_NAME" >&2
  echo "Run first:" >&2
  echo "  ./scripts/build-real-bob-base-image.sh" >&2
  exit 1
fi

exec docker compose -f docker-compose.real-bob.yml up --build
