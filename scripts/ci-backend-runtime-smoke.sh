#!/usr/bin/env bash
set -euo pipefail

image="${1:-indice-erp-backend:ci}"
backend_container="${CI_SMOKE_BACKEND_CONTAINER:-indice-erp-backend-ci-smoke}"
minio_container="${CI_SMOKE_MINIO_CONTAINER:-indice-erp-minio-ci-smoke}"
minio_image="${CI_SMOKE_MINIO_IMAGE:-minio/minio:latest}"
minio_root_user="${CI_SMOKE_MINIO_ROOT_USER:-minioadmin}"
minio_root_password="${CI_SMOKE_MINIO_ROOT_PASSWORD:-minioadmin}"
server_address="${CI_SMOKE_SERVER_ADDRESS:-127.0.0.1}"
server_port="${CI_SMOKE_SERVER_PORT:-8083}"
health_url="http://${server_address}:${server_port}/api/v1/auth/me"
minio_health_url="http://127.0.0.1:9000/minio/health/live"

: "${TEST_DATASOURCE_URL:?TEST_DATASOURCE_URL is required}"
: "${TEST_DATASOURCE_USERNAME:?TEST_DATASOURCE_USERNAME is required}"
: "${TEST_DATASOURCE_PASSWORD:?TEST_DATASOURCE_PASSWORD is required}"

started_minio=0

cleanup() {
  docker rm -f "${backend_container}" >/dev/null 2>&1 || true
  if [[ "${started_minio}" == "1" ]]; then
    docker rm -f "${minio_container}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

minio_is_live() {
  curl -fsS "${minio_health_url}" >/dev/null 2>&1
}

wait_for_minio() {
  for attempt in $(seq 1 30); do
    if minio_is_live; then
      return 0
    fi
    if ! docker ps --format '{{.Names}}' | grep -Fxq "${minio_container}"; then
      echo "MinIO smoke container exited before it became healthy." >&2
      docker logs --tail 120 "${minio_container}" >&2 || true
      return 1
    fi
    sleep 2
  done

  echo "MinIO did not become healthy at ${minio_health_url}." >&2
  docker logs --tail 120 "${minio_container}" >&2 || true
  return 1
}

ensure_minio() {
  if minio_is_live; then
    echo "Using existing MinIO service at ${minio_health_url}."
    return 0
  fi

  docker rm -f "${minio_container}" >/dev/null 2>&1 || true
  docker run -d \
    --name "${minio_container}" \
    -p 9000:9000 \
    -e "MINIO_ROOT_USER=${minio_root_user}" \
    -e "MINIO_ROOT_PASSWORD=${minio_root_password}" \
    "${minio_image}" \
    server /data >/dev/null
  started_minio=1
  wait_for_minio
}

wait_for_backend() {
  for attempt in $(seq 1 36); do
    response="$(curl -sS "${health_url}" 2>/dev/null || true)"
    if printf '%s' "${response}" | grep -q "User is not authenticated"; then
      echo "Backend smoke check passed with Flyway ${1}."
      return 0
    fi

    if ! docker ps --format '{{.Names}}' | grep -Fxq "${backend_container}"; then
      echo "Backend smoke container exited before the health check passed with Flyway ${1}." >&2
      docker logs --tail 180 "${backend_container}" >&2 || true
      return 1
    fi

    sleep 5
  done

  echo "Backend did not pass ${health_url} with Flyway ${1}." >&2
  docker logs --tail 180 "${backend_container}" >&2 || true
  return 1
}

run_backend_smoke() {
  local flyway_enabled="$1"

  docker rm -f "${backend_container}" >/dev/null 2>&1 || true
  docker run -d \
    --name "${backend_container}" \
    --network host \
    -e "SERVER_ADDRESS=${server_address}" \
    -e "SERVER_PORT=${server_port}" \
    -e "SERVER_FORWARD_HEADERS_STRATEGY=framework" \
    -e "SPRING_FLYWAY_ENABLED=${flyway_enabled}" \
    -e "SPRING_FLYWAY_VALIDATE_ON_MIGRATE=false" \
    -e "SPRING_DATASOURCE_URL=${TEST_DATASOURCE_URL}" \
    -e "SPRING_DATASOURCE_USERNAME=${TEST_DATASOURCE_USERNAME}" \
    -e "SPRING_DATASOURCE_PASSWORD=${TEST_DATASOURCE_PASSWORD}" \
    -e "APP_WEB_ALLOWED_ORIGINS=https://app.indiceapp.com,https://apptest.indiceapp.com" \
    -e "APP_WEB_BASE_URL=https://app.indiceapp.com" \
    -e "APP_WEB_PUBLIC_URL=https://apptest.indiceapp.com" \
    -e "APP_WEB_INVITATION_BASE_URL=https://app.indiceapp.com" \
    -e "APP_SESSION_COOKIE_SECURE=true" \
    -e "APP_SESSION_COOKIE_SAME_SITE=lax" \
    -e "APP_SESSION_TIMEOUT=12h" \
    -e "APP_HR_FACE_ENABLED=false" \
    -e "JAVA_OPTS=-Xms256m -Xmx768m" \
    "${image}" >/dev/null

  wait_for_backend "${flyway_enabled}"
  docker rm -f "${backend_container}" >/dev/null 2>&1 || true
}

ensure_minio
run_backend_smoke false
run_backend_smoke true
