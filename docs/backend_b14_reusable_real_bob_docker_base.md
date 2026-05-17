# Backend B14 — Reusable Real Bob Docker base image

B14 fixes the Docker runtime workflow for iterative development.

The repository can be deleted and re-unzipped between slices, while the local Docker daemon keeps a reusable image:

```text
bobquest-bob-shell-base:local
```

That base image contains:

- Node 22 runtime;
- pnpm/corepack;
- git/python/curl/bash;
- IBM Bob Shell binary.

`Dockerfile.real-bob` no longer downloads Bob Shell on every project image build. It uses the reusable base image for both build and runtime stages.

## First-time setup on a machine

Run once:

```bash
./scripts/build-real-bob-base-image.sh
```

This can take several minutes because it downloads and installs IBM Bob Shell.

## Future repos / future slices

After unzipping a new BobQuest repo, do not rebuild the base image unless you want to update Bob Shell.

Run:

```bash
./scripts/real-bob-docker-up.sh
```

or directly:

```bash
docker compose -f docker-compose.real-bob.yml up --build
```

As long as `bobquest-bob-shell-base:local` exists in Docker, the project image reuses it and does not download Bob Shell again.

## Force rebuild Bob Shell base

Only when intentionally updating Bob Shell:

```bash
BOBQUEST_FORCE_REBUILD_BOB_BASE=true ./scripts/build-real-bob-base-image.sh
```

## Custom base tag

```bash
BOBQUEST_BOB_BASE_IMAGE=my-bobquest-bob-base:local ./scripts/build-real-bob-base-image.sh
BOBQUEST_BOB_BASE_IMAGE=my-bobquest-bob-base:local ./scripts/real-bob-docker-up.sh
```

## Safety

- Host laptop does not need `bob` installed.
- Bob Shell is in the Docker base image.
- Container startup does not install Bob Shell.
- Project image build does not download Bob Shell.
- `.env.real-bob` still controls API key, allowed repo, limits and smoke ACK.
