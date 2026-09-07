# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS build
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
RUN npm run build && npm prune --omit=dev --no-audit --no-fund

FROM alpine:3.24
WORKDIR /app

LABEL org.opencontainers.image.title="Indice MCP"
LABEL org.opencontainers.image.description="Private model-agnostic business tools for Indice"

RUN apk add --no-cache libstdc++ ca-certificates \
    && apk upgrade --no-cache \
    && addgroup -g 1000 node \
    && adduser -D -u 1000 -G node node

COPY --from=build /usr/local/bin/node /usr/local/bin/node
COPY --from=build --chown=node:node /workspace/integrations/indice-mcp/package.json ./
COPY --from=build --chown=node:node /workspace/integrations/indice-mcp/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/integrations/indice-mcp/dist ./dist

ENV NODE_ENV=production
USER node

CMD ["node", "dist/server.js"]
