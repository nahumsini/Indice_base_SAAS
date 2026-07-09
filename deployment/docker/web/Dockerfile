# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS build
WORKDIR /workspace/react

COPY react/package.json react/package-lock.json ./
ENV NODE_ENV=development
ENV NPM_CONFIG_PRODUCTION=false
RUN --mount=type=cache,target=/root/.npm \
    npm ci --include=dev --no-audit --no-fund \
    && if [ ! -x node_modules/.bin/vite ]; then \
      npm install --no-save --include=dev --no-audit --no-fund \
        vite@6.3.5 \
        @vitejs/plugin-react@4.7.0 \
        @tailwindcss/vite@4.1.12 \
        tailwindcss@4.1.12; \
    fi \
    && test -x node_modules/.bin/vite

COPY react ./

ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine

COPY deployment/docker/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/react/dist /usr/share/nginx/html

EXPOSE 8080
