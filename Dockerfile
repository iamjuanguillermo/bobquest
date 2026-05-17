FROM node:22-bookworm-slim AS build

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends bash ca-certificates git python3 \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@9.12.0 --activate

WORKDIR /workspace
COPY . .
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter bobquest-web build
RUN python3 -u tests/run_all.py

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=8787 \
    HOST=0.0.0.0 \
    BOBQUEST_PROJECT_ROOT=/workspace

RUN apt-get update \
    && apt-get install -y --no-install-recommends bash ca-certificates git python3 \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@9.12.0 --activate

WORKDIR /workspace
COPY --from=build /workspace /workspace

EXPOSE 8787
CMD ["pnpm", "--filter", "bobquest-runtime-api", "start"]
