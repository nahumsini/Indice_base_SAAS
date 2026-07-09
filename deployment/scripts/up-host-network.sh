#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_DIR="${APP_DIR:-${ROOT_DIR}}"
DEFAULT_ENV_FILE="${APP_DIR}/deployment/env/.env"
CPANEL_ENV_FILE="/home/corazon/apps/indice-erp-docker/current/deployment/env/.env"

if [[ -n "${DEPLOY_ENV_FILE:-}" ]]; then
  ENV_FILE="${DEPLOY_ENV_FILE}"
elif [[ -f "${CPANEL_ENV_FILE}" ]]; then
  ENV_FILE="${CPANEL_ENV_FILE}"
else
  ENV_FILE="${DEFAULT_ENV_FILE}"
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing env file: ${ENV_FILE}" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "${ENV_FILE}"
set +a

PUBLIC_URL="${PUBLIC_URL:-${WEB_PUBLIC_URL:-http://localhost:8080}}"
HOST_WEB_PORT="${HOST_WEB_PORT:-${WEB_HOST_PORT:-8080}}"
HOST_BACKEND_PORT="${HOST_BACKEND_PORT:-8082}"
HOST_MINIO_API_PORT="${HOST_MINIO_API_PORT:-${MINIO_API_HOST_PORT:-9000}}"
HOST_MINIO_CONSOLE_PORT="${HOST_MINIO_CONSOLE_PORT:-${MINIO_CONSOLE_HOST_PORT:-9001}}"
HOST_FACE_SERVICE_PORT="${HOST_FACE_SERVICE_PORT:-${FACE_SERVICE_HOST_PORT:-8091}}"

WEB_CONTAINER="${WEB_CONTAINER:-indice-erp-web-1}"
BACKEND_CONTAINER="${BACKEND_CONTAINER:-indice-erp-backend-1}"
MINIO_CONTAINER="${MINIO_CONTAINER:-indice-erp-minio-1}"

WEB_IMAGE="${WEB_IMAGE:-indice-erp-web:latest}"
BACKEND_IMAGE="${BACKEND_IMAGE:-indice-erp-backend:latest}"
MINIO_IMAGE="${MINIO_IMAGE:-minio/minio:latest}"
MINIO_DATA_VOLUME="${MINIO_DATA_VOLUME:-indice-erp_minio-data}"
WEB_NGINX_HOST_CONFIG="${WEB_NGINX_HOST_CONFIG:-/home/corazon/apps/indice-erp-docker/current/deployment/docker/web/nginx-host.conf}"

require_env() {
  local key="$1"
  if [[ -z "${!key:-}" ]]; then
    echo "Missing required ${key} in ${ENV_FILE}" >&2
    exit 1
  fi
}

require_env SPRING_DATASOURCE_URL
require_env SPRING_DATASOURCE_USERNAME
require_env SPRING_DATASOURCE_PASSWORD

prepare_backend_env() {
  local output="$1"

  grep -v -E '^(SERVER_PORT|SERVER_ADDRESS|JAVA_OPTS|APP_STORAGE_MINIO_ENDPOINT|APP_STORAGE_MINIO_PUBLIC_ENDPOINT|APP_STORAGE_MINIO_SERVICE_PUBLIC_ENDPOINT|APP_HR_FACE_SERVICE_BASE_URL|APP_WEB_ALLOWED_ORIGINS|APP_WEB_PUBLIC_URL|APP_WEB_INVITATION_BASE_URL|APP_WEB_PASSWORD_RESET_BASE_URL)=' \
    "${ENV_FILE}" >"${output}"

  {
    printf 'SERVER_PORT=%s\n' "${HOST_BACKEND_PORT}"
    printf 'SERVER_ADDRESS=0.0.0.0\n'
    printf 'JAVA_OPTS=-Djava.net.preferIPv4Stack=true %s\n' "${BACKEND_JAVA_OPTS:-}"
    printf 'APP_STORAGE_MINIO_ENDPOINT=http://127.0.0.1:%s\n' "${HOST_MINIO_API_PORT}"
    printf 'APP_STORAGE_MINIO_PUBLIC_ENDPOINT=%s\n' "${APP_STORAGE_MINIO_PUBLIC_ENDPOINT:-${PUBLIC_URL}/storage}"
    printf 'APP_STORAGE_MINIO_SERVICE_PUBLIC_ENDPOINT=http://127.0.0.1:%s\n' "${HOST_MINIO_API_PORT}"
    printf 'APP_HR_FACE_SERVICE_BASE_URL=http://127.0.0.1:%s\n' "${HOST_FACE_SERVICE_PORT}"
    printf 'APP_WEB_ALLOWED_ORIGINS=%s\n' "${APP_WEB_ALLOWED_ORIGINS:-${PUBLIC_URL}}"
    printf 'APP_WEB_PUBLIC_URL=%s\n' "${APP_WEB_PUBLIC_URL:-${PUBLIC_URL}}"
    printf 'APP_WEB_INVITATION_BASE_URL=%s\n' "${APP_WEB_INVITATION_BASE_URL:-${APP_WEB_PUBLIC_URL:-${PUBLIC_URL}}}"
    printf 'APP_WEB_PASSWORD_RESET_BASE_URL=%s\n' "${APP_WEB_PASSWORD_RESET_BASE_URL:-${APP_WEB_PUBLIC_URL:-${PUBLIC_URL}}}"
  } >>"${output}"
}

resolve_minio_data_mount() {
  local mount
  mount="$(
    docker inspect "${MINIO_CONTAINER}" \
      --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{if .Name}}{{.Name}}{{else}}{{.Source}}{{end}}{{end}}{{end}}' \
      2>/dev/null || true
  )"

  if [[ -n "${mount}" ]]; then
    printf '%s\n' "${mount}"
    return 0
  fi

  if ! docker volume inspect "${MINIO_DATA_VOLUME}" >/dev/null 2>&1; then
    docker volume create "${MINIO_DATA_VOLUME}" >/dev/null
  fi
  printf '%s\n' "${MINIO_DATA_VOLUME}"
}

prepare_nginx_host_config() {
  local source_config="${APP_DIR}/deployment/docker/web/nginx.host.conf"
  local prepared_config

  if [[ ! -f "${source_config}" ]]; then
    echo "Missing ${source_config}" >&2
    exit 1
  fi

  mkdir -p "$(dirname "${WEB_NGINX_HOST_CONFIG}")"
  prepared_config="$(mktemp)"
  sed \
    -e "s#listen 8080;#listen ${HOST_WEB_PORT};#g" \
    -e "s#127\\.0\\.0\\.1:8082#127.0.0.1:${HOST_BACKEND_PORT}#g" \
    -e "s#127\\.0\\.0\\.1:9000#127.0.0.1:${HOST_MINIO_API_PORT}#g" \
    "${source_config}" >"${prepared_config}"
  cp "${prepared_config}" "${WEB_NGINX_HOST_CONFIG}"
  rm -f "${prepared_config}"
}

echo "Using env file: ${ENV_FILE}"
echo "Using public URL: ${PUBLIC_URL}"
echo "Using datasource: ${SPRING_DATASOURCE_URL}"
echo "Starting host-network MinIO, backend, and web containers."

MINIO_DATA_MOUNT="$(resolve_minio_data_mount)"
docker rm -f "${MINIO_CONTAINER}" >/dev/null 2>&1 || true
docker run -d \
  --name "${MINIO_CONTAINER}" \
  --restart unless-stopped \
  --network host \
  --env-file "${ENV_FILE}" \
  -e "MINIO_API_CORS_ALLOW_ORIGIN=${MINIO_CORS_ALLOWED_ORIGINS:-${PUBLIC_URL}}" \
  -v "${MINIO_DATA_MOUNT}:/data" \
  "${MINIO_IMAGE}" \
  server /data --console-address ":${HOST_MINIO_CONSOLE_PORT}" >/dev/null

sleep 8
curl --fail --silent --show-error "http://127.0.0.1:${HOST_MINIO_API_PORT}/minio/health/live" >/dev/null

BACKEND_ENV_FILE="$(mktemp)"
trap 'rm -f "${BACKEND_ENV_FILE}"' EXIT
prepare_backend_env "${BACKEND_ENV_FILE}"

docker rm -f "${BACKEND_CONTAINER}" >/dev/null 2>&1 || true
docker run -d \
  --name "${BACKEND_CONTAINER}" \
  --restart unless-stopped \
  --network host \
  --env-file "${BACKEND_ENV_FILE}" \
  "${BACKEND_IMAGE}" >/dev/null

sleep "${BACKEND_STARTUP_WAIT_SECONDS:-45}"
curl --fail --silent --show-error "http://127.0.0.1:${HOST_BACKEND_PORT}/api/v1/health" >/dev/null

prepare_nginx_host_config

docker rm -f "${WEB_CONTAINER}" >/dev/null 2>&1 || true
docker run -d \
  --name "${WEB_CONTAINER}" \
  --restart unless-stopped \
  --network host \
  -v "${WEB_NGINX_HOST_CONFIG}:/etc/nginx/conf.d/default.conf:ro" \
  "${WEB_IMAGE}" >/dev/null

if [[ -f "${APP_DIR}/react/dist/index.html" ]]; then
  docker cp "${APP_DIR}/react/dist/." "${WEB_CONTAINER}:/usr/share/nginx/html/"
fi

sleep 8
docker exec "${WEB_CONTAINER}" nginx -t >/dev/null
curl --fail --silent --show-error "http://127.0.0.1:${HOST_WEB_PORT}/api/v1/health" >/dev/null

if [[ -n "${PUBLIC_URL}" ]]; then
  curl --fail --silent --show-error "${PUBLIC_URL}/api/v1/health" >/dev/null
fi

echo "Host-network stack is healthy."
