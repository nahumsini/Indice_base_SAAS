# Docker Deployment

This repo now ships a dedicated Docker deployment layout under `deployment/`.

## Layout

- `compose/docker-compose.yml`: production-safe base stack
- `compose/docker-compose.dev.yml`: local admin/debug port overrides
- `docker/backend/Dockerfile`: Spring Boot image build
- `docker/web/Dockerfile`: React build plus Nginx runtime
- `docker/web/nginx.conf`: SPA hosting and `/api` reverse proxy
- `docker/minio/init-minio.sh`: bucket bootstrap
- `env/.env.example`: deployment environment template
- `scripts/`: operational wrappers for bring-up, shutdown, logs, and smoke tests

## Services

- `web`: public entrypoint for the React app and `/api` reverse proxy
- `backend`: Spring Boot API
- `mysql`: application database
- `minio`: S3-compatible object storage for attendance media
- `minio-init`: idempotent bootstrap job that creates the bucket

## First Run

1. Copy the environment template:

```bash
cp deployment/env/.env.example deployment/env/.env
```

2. Review these variables before startup:

- `WEB_PUBLIC_URL`
- `MINIO_PUBLIC_ENDPOINT`
- `APP_WEB_ALLOWED_ORIGINS`
- `MINIO_CORS_ALLOWED_ORIGINS`
- `APP_SESSION_COOKIE_SECURE`
- `MYSQL_*`
- `MINIO_*`

3. Start the stack.

Production-safe base stack:

```bash
./deployment/scripts/up.sh
```

Local stack with extra admin/debug ports:

```bash
./deployment/scripts/up.sh dev
```

## Endpoints

Base stack:

- web: `http://localhost:${WEB_HOST_PORT:-8080}`
- MinIO presigned/public path: `${MINIO_PUBLIC_ENDPOINT:-http://localhost:8080/storage}`
- MinIO API: `http://localhost:${MINIO_API_HOST_PORT:-9000}`

Dev override adds:

- backend direct: `http://localhost:${BACKEND_HOST_PORT:-8082}`
- MySQL direct: `127.0.0.1:${MYSQL_HOST_PORT:-3307}`
- MinIO console: `http://localhost:${MINIO_CONSOLE_HOST_PORT:-9001}`

## Operational Notes

- The frontend is served by Nginx and calls the backend through same-origin `/api` paths.
- Nginx also proxies `/storage/` to MinIO so presigned browser uploads can stay on the web origin by default.
- The backend uses the internal MinIO endpoint for server-side access and rewrites presigned URLs onto `MINIO_PUBLIC_ENDPOINT`.
- MinIO CORS is configured cluster-wide through `MINIO_API_CORS_ALLOW_ORIGIN`, sourced from `MINIO_CORS_ALLOWED_ORIGINS`.
- Session auth is still servlet-session based, so this deployment should be treated as a single backend replica unless session storage is externalized.
- `minio-init` is safe to rerun; it creates the bucket if missing.
- The MySQL and MinIO data directories are persisted via named Docker volumes.

## Verification

Run the smoke test after startup:

```bash
./deployment/scripts/smoke-test.sh
```

Tail logs:

```bash
./deployment/scripts/logs.sh
./deployment/scripts/logs.sh dev backend
```

Shut the stack down:

```bash
./deployment/scripts/down.sh
./deployment/scripts/down.sh dev
```
