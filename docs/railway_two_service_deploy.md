# Railway two-service deployment

BobQuest deploys as two Railway services from the same GitHub repo:

- `bobquest-api`: Dockerfile `Dockerfile.railway-api`, public HTTP service, port from `PORT`, default 8787.
- `bobquest-web`: Dockerfile `Dockerfile.railway-web`, public HTTP service, port from `PORT`, default 9000.

The browser must call the public API URL. Set the web service variable:

```env
BOBQUEST_RUNTIME_API_URL=https://<bobquest-api-domain>
VITE_BOBQUEST_RUNTIME_API_URL=https://<bobquest-api-domain>
```

The API service must receive Bob Shell credentials and runtime limits. The web service must not receive `BOBSHELL_API_KEY`.

Cloudflared is not used with Railway. Railway public domains are the public ingress.
