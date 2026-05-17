# BobQuest v0.23 Local Runtime Setup

BobQuest v0.23 runs a Quasar frontend against a Node/Fastify runtime API. The runtime API is the only service allowed to invoke IBM Bob Shell.

## Required local configuration

Create `.env` from `.env.example` and configure:

```bash
BOBQUEST_PUBLIC_DEMO_MODE=false
BOBQUEST_RUNTIME_DISABLED=false
BOBSHELL_COMMAND=/absolute/path/to/bob-shell
BOBSHELL_ARGS=
BOBSHELL_TIMEOUT_MS=180000
BOBQUEST_RUNTIME_DATA_DIR=data/runtime/runs
BOBQUEST_WORKSPACE_DIR=data/runtime/workspaces
```

When `BOBSHELL_COMMAND` is empty or not executable, `/api/bob/status` reports unavailable and runs fail clearly. BobQuest does not continue with generated placeholder data.

## Optional IBM LLM configuration

The optional LLM is IBM-only and does not replace Bob Shell. It can only run JSON recovery and localization.

```bash
BOBQUEST_OPTIONAL_LLM_ENABLED=true
BOBQUEST_OPTIONAL_LLM_PROVIDER=watsonx
BOBQUEST_OPTIONAL_LLM_JSON_RECOVERY=true
BOBQUEST_OPTIONAL_LLM_LOCALIZATION=true
WATSONX_API_KEY=...
WATSONX_PROJECT_ID=...
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL_ID=ibm/granite-3-2b-instruct
WATSONX_MAX_OUTPUT_TOKENS=2048
WATSONX_TEMPERATURE=0
WATSONX_TOP_P=1
BOBQUEST_OPTIONAL_LLM_TIMEOUT_MS=30000
BOBQUEST_OPTIONAL_LLM_MAX_RETRIES=1
```

If the optional IBM LLM is disabled or missing credentials, JSON recovery/localization do not appear as available capabilities.

## Local commands

```bash
pnpm install
pnpm --filter bobquest-runtime-api dev
pnpm --filter bobquest-web dev
```

Run validation:

```bash
python3 -u tests/run_all.py
```

## Docker local runtime

The Docker image installs dependencies and builds the Quasar frontend during image build. Container startup does not reinstall dependencies.

```bash
docker compose up --build bobquest-runtime-api
```
