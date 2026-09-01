# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS build
WORKDIR /workspace/react

COPY react/package.json react/package-lock.json ./
ENV NODE_ENV=development
ENV NPM_CONFIG_PRODUCTION=false
RUN --mount=type=cache,target=/root/.npm \
    set -eux; \
    npm config set fetch-retries 5; \
    npm config set fetch-retry-mintimeout 20000; \
    npm config set fetch-retry-maxtimeout 120000; \
    for attempt in 1 2 3; do \
      rm -rf node_modules; \
      if npm ci --include=dev --no-audit --no-fund && test -x node_modules/.bin/vite; then \
        exit 0; \
      fi; \
      echo "npm ci did not produce a complete Vite toolchain on attempt ${attempt}; retrying..." >&2; \
      rm -rf node_modules /root/.npm/_cacache/tmp; \
      sleep 10; \
    done; \
    echo "Vite toolchain missing after npm ci retries." >&2; \
    exit 1

COPY react ./

ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build \
    && chmod -R a+rX dist

FROM nginxinc/nginx-unprivileged:stable-alpine

ARG WEB_NGINX_CONFIG=deployment/docker/web/nginx.conf
ARG WEB_NGINX_LISTEN_PORT=8080
ARG WEB_NGINX_BACKEND_PORT=8082
ARG WEB_NGINX_MINIO_PORT=9000

COPY --chmod=0644 ${WEB_NGINX_CONFIG} /etc/nginx/conf.d/default.conf
RUN sed -i \
      -e "s#listen 8080;#listen ${WEB_NGINX_LISTEN_PORT};#g" \
      -e "s#127\\.0\\.0\\.1:8082#127.0.0.1:${WEB_NGINX_BACKEND_PORT}#g" \
      -e "s#127\\.0\\.0\\.1:9000#127.0.0.1:${WEB_NGINX_MINIO_PORT}#g" \
      /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/react/dist /usr/share/nginx/html

EXPOSE 8080
