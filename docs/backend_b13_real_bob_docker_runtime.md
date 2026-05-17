# Backend B13/B14 — Real Bob Shell Docker runtime

The real Bob Shell runtime is Docker-first.

The repository includes:

- `Dockerfile.bob-base` — reusable local image that installs IBM Bob Shell once.
- `Dockerfile.real-bob` — project runtime image that reuses the base image.
- `docker-compose.real-bob.yml` — runtime compose file.
- `.env.real-bob` — editable runtime env file.
- `scripts/build-real-bob-base-image.sh` — first-time Bob Shell base build.
- `scripts/real-bob-docker-up.sh` — safe Docker startup that requires the base image.

## First time on this machine

```bash
unzip BobQuest_v0.23.14_BackendB14_ReusableRealBobDockerBase.zip
cd bobquest_slice5_work
corepack enable
pnpm install
pnpm test
pnpm --filter bobquest-runtime-api build
pnpm --filter bobquest-web build
nano .env.real-bob
./scripts/build-real-bob-base-image.sh
./scripts/real-bob-docker-up.sh
```

Fill only:

```text
BOBSHELL_API_KEY=...
```

Optionally adjust:

```text
BOBQUEST_ALLOWED_REPOS=...
BOBQUEST_REAL_BOB_SMOKE_REPO_ID=...
```

## Future repos / slices

If `bobquest-bob-shell-base:local` already exists in Docker, do **not** rebuild it.

After unzipping a future repo:

```bash
cd bobquest_slice5_work
corepack enable
pnpm install
nano .env.real-bob
./scripts/real-bob-docker-up.sh
```

The project image will reuse the local Bob Shell base image.

## Status-only smoke

In another terminal:

```bash
set -a
source .env.real-bob
set +a
pnpm smoke:real-bob:status
```

## One intentional runtime run

```bash
set -a
source .env.real-bob
set +a
export BOBQUEST_REAL_BOB_SMOKE_ACK=I_ACCEPT_ONE_BOB_SHELL_RUNTIME_RUN
pnpm smoke:real-bob:run-once
```

## Safety

- Bob Shell is installed inside Docker, not required on the host laptop.
- Bob Shell is installed in a reusable base image, not in every repo build.
- Container startup does not install dependencies or Bob Shell.
- `POST /api/runs` still fails closed unless Bob Shell preflight is ready.
- Public demo mode uses allowlist and strict limits.
- Optional watsonx remains disabled by default.

## Build-time test policy

`Dockerfile.real-bob` intentionally does not run `tests/run_all.py` during image build. The full accumulated suite must be run on the host before building the runtime image:

```bash
pnpm test
pnpm --filter bobquest-runtime-api build
pnpm --filter bobquest-web build
```
