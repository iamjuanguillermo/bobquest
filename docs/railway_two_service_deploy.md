# Railway two-service deployment

BobQuest deploys as two Railway services from the same GitHub repo:

- `bobquest-api`: Dockerfile `Dockerfile.railway-api`, public HTTP service, port from `PORT`, default 8787.
- `bobquest-web`: Dockerfile `Dockerfile.railway-web`, public HTTP service, port from `PORT`, default 9000.

The API image installs Bob Shell from the local bob-download tarball committed in this repo:

```text
bob-download/bobshell-1.0.4.tgz
bob-download/SHA256SUMS.txt
```

`Dockerfile.railway-api` verifies the checksum and does not call `https://bob.ibm.com/download/bobshell.sh` or depend on a GHCR Bob base image. Railway can rebuild directly from GitHub using the files in this repository.

The browser must call the public API URL. Set the web service variable:

```env
BOBQUEST_RUNTIME_API_URL=https://<bobquest-api-domain>
VITE_BOBQUEST_RUNTIME_API_URL=https://<bobquest-api-domain>
```

The API service must receive Bob Shell credentials and runtime limits. At minimum, set:

```env
BOBSHELL_API_KEY=<your key>
BOBQUEST_ALLOWED_REPOS=<owner/repo allowlist>
BOBQUEST_PUBLIC_DEMO_MODE=true
```

The API Dockerfile already sets these runtime defaults for the installed CLI:

```env
BOBSHELL_COMMAND=bob
BOBSHELL_STATUS_ARGS=--version
BOBSHELL_ANALYZE_ARGS=--auth-method,api-key
BOBSHELL_EVALUATE_ARGS=--auth-method,api-key
BOBSHELL_PROMPT_MODE=argument
BOBSHELL_PROMPT_ARG=-p
```

The web service must not receive `BOBSHELL_API_KEY`.

Cloudflared is not used with Railway. Railway public domains are the public ingress.
