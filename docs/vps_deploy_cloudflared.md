# BobQuest v0.23 VPS + Cloudflared Deployment

BobQuest runtime must run on a VPS or Docker host because IBM Bob Shell execution needs filesystem access, `git`, child processes and temporary workspaces. Do not move runtime execution to a Cloudflare Worker.

## Runtime environment

Set production variables on the VPS:

```bash
BOBQUEST_PUBLIC_DEMO_MODE=true
BOBQUEST_ALLOWED_REPOS=owner/repo1,owner/repo2
BOBQUEST_MAX_CONCURRENT_RUNS=1
BOBQUEST_MAX_RUNS_TOTAL=10
BOBQUEST_MAX_RUNS_PER_HOUR=2
BOBQUEST_MAX_EVALUATIONS_PER_RUN=5
BOBQUEST_MAX_LOCALIZATIONS_PER_RUN=2
BOBQUEST_RUNTIME_DISABLED=false
BOBSHELL_COMMAND=/usr/local/bin/bob-shell
BOBSHELL_ARGS=
BOBSHELL_TIMEOUT_MS=180000
BOBQUEST_RUNTIME_DATA_DIR=data/runtime/runs
BOBQUEST_WORKSPACE_DIR=data/runtime/workspaces
```

`BOBSHELL_COMMAND` is required for real analysis. If it is unavailable, BobQuest reports a hard runtime failure and does not show a generated onboarding path.

## Optional IBM LLM

Optional IBM watsonx.ai / Granite can be enabled only for JSON recovery and localization:

```bash
BOBQUEST_OPTIONAL_LLM_ENABLED=true
BOBQUEST_OPTIONAL_LLM_PROVIDER=watsonx
BOBQUEST_OPTIONAL_LLM_JSON_RECOVERY=true
BOBQUEST_OPTIONAL_LLM_LOCALIZATION=true
WATSONX_API_KEY=...
WATSONX_PROJECT_ID=...
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL_ID=ibm/granite-3-2b-instruct
BOBQUEST_OPTIONAL_LLM_TIMEOUT_MS=30000
BOBQUEST_OPTIONAL_LLM_MAX_RETRIES=1
```

The optional IBM LLM cannot analyze repositories, rank missions, evaluate understanding as primary judge or replace Bob Shell.

## Deploy

```bash
docker compose up --build -d bobquest-runtime-api
```

Expose the API through Cloudflare Tunnel:

```bash
cloudflared tunnel --url http://localhost:8787
```

The image builds the Quasar frontend at Docker build time. Startup runs the runtime API directly and does not run `pnpm install` again.
