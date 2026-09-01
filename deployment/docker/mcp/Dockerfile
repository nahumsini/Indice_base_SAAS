# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS build
WORKDIR /workspace/integrations/indice-mcp

COPY integrations/indice-mcp/package.json integrations/indice-mcp/package-lock.json ./
RUN --mount=type=cache,id=indice-mcp-build-npm,target=/root/.npm \
    set -eux; \
    for attempt in 1 2 3; do \
      rm -rf node_modules; \
      if npm ci --include=dev --no-audit --no-fund; then \
        exit 0; \
      fi; \
      rm -rf /root/.npm/_cacache/tmp; \
      sleep 5; \
    done; \
    exit 1

COPY integrations/indice-mcp/tsconfig.json ./
COPY integrations/indice-mcp/src ./src
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app

LABEL org.opencontainers.image.title="Indice MCP"
LABEL org.opencontainers.image.description="Private model-agnostic business tools for Indice"

COPY integrations/indice-mcp/package.json integrations/indice-mcp/package-lock.json ./
RUN --mount=type=cache,id=indice-mcp-runtime-npm,target=/root/.npm \
    set -eux; \
    for attempt in 1 2 3; do \
      rm -rf node_modules; \
      if npm ci --omit=dev --no-audit --no-fund; then \
        exit 0; \
      fi; \
      rm -rf /root/.npm/_cacache/tmp; \
      sleep 5; \
    done; \
    exit 1
COPY --from=build --chown=node:node /workspace/integrations/indice-mcp/dist ./dist

ENV NODE_ENV=production
USER node

CMD ["node", "dist/server.js"]
