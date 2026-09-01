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

load_env_file() {
  local line key value

  while IFS= read -r line || [[ -n "${line}" ]]; do
    line="${line%$'\r'}"
    [[ -z "${line}" || "${line}" =~ ^[[:space:]]*# ]] && continue
    line="${line#export }"

    if [[ "${line}" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
      key="${line%%=*}"
      value="${line#*=}"
      if [[ "${value}" == \"*\" && "${value}" == *\" ]]; then
        value="${value:1:${#value}-2}"
      elif [[ "${value}" == \'*\' && "${value}" == *\' ]]; then
        value="${value:1:${#value}-2}"
      fi
      export "${key}=${value}"
    fi
  done <"${ENV_FILE}"
}

load_env_file

PUBLIC_URL="${PUBLIC_URL:-${WEB_PUBLIC_URL:-http://localhost:8080}}"
HOST_WEB_PORT="${HOST_WEB_PORT:-${WEB_HOST_PORT:-8080}}"
HOST_BACKEND_PORT="${HOST_BACKEND_PORT:-${BACKEND_HOST_PORT:-8082}}"
HOST_MINIO_API_PORT="${HOST_MINIO_API_PORT:-${MINIO_API_HOST_PORT:-9000}}"
HOST_MINIO_CONSOLE_PORT="${HOST_MINIO_CONSOLE_PORT:-${MINIO_CONSOLE_HOST_PORT:-9001}}"
HOST_FACE_SERVICE_PORT="${HOST_FACE_SERVICE_PORT:-${FACE_SERVICE_HOST_PORT:-8091}}"
HOST_MCP_PORT="${HOST_MCP_PORT:-${MCP_HOST_PORT:-3010}}"

WEB_CONTAINER="${WEB_CONTAINER:-indice-erp-web-1}"
BACKEND_CONTAINER="${BACKEND_CONTAINER:-indice-erp-backend-1}"
MINIO_CONTAINER="${MINIO_CONTAINER:-indice-erp-minio-1}"
MCP_CONTAINER="${MCP_CONTAINER:-indice-erp-mcp-1}"

# Release commands may select immutable application images without mutating the
# durable environment file. The DEPLOY_* names are intentionally distinct from
# the runtime keys loaded above so the file cannot overwrite the release choice.
WEB_IMAGE="${DEPLOY_WEB_IMAGE:-${WEB_IMAGE:-indice-erp-web:latest}}"
BACKEND_IMAGE="${DEPLOY_BACKEND_IMAGE:-${BACKEND_IMAGE:-indice-erp-backend:latest}}"
MCP_IMAGE="${DEPLOY_MCP_IMAGE:-${MCP_IMAGE:-indice-erp-mcp:latest}}"
MINIO_IMAGE="${MINIO_IMAGE:-minio/minio:latest}"
MINIO_DATA_VOLUME="${MINIO_DATA_VOLUME:-indice-erp_minio-data}"
WEB_NGINX_HOST_CONFIG="${WEB_NGINX_HOST_CONFIG:-$(dirname "${ENV_FILE}")/../runtime/nginx-host.conf}"
PUBLISH_LOCAL_FRONTEND_DIST="${PUBLISH_LOCAL_FRONTEND_DIST:-false}"
ALLOW_MUTABLE_APP_IMAGES="${ALLOW_MUTABLE_APP_IMAGES:-false}"
DEPLOY_MIN_FREE_MB="${DEPLOY_MIN_FREE_MB:-10240}"
DEPLOY_DRY_RUN="${DEPLOY_DRY_RUN:-false}"
MCP_ENABLED="${DEPLOY_MCP_ENABLED:-${MCP_ENABLED:-false}}"
DEPLOY_BACKUP_SUFFIX="rollback"
DEPLOY_CANDIDATE_SUFFIX="candidate-$(date +%Y%m%d%H%M%S)-$$"

for command in curl df docker grep install mktemp sed; do
  if ! command -v "${command}" >/dev/null 2>&1; then
    echo "Missing required command: ${command}" >&2
    exit 1
  fi
done

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

require_immutable_image() {
  local variable_name="$1"
  local image="${!variable_name}"

  if [[ "${ALLOW_MUTABLE_APP_IMAGES}" != "true" && ( "${image}" == "latest" || "${image}" == *:latest ) ]]; then
    echo "${variable_name} must use an immutable version tag or digest, not ${image}." >&2
    echo "Set ALLOW_MUTABLE_APP_IMAGES=true only for a deliberate non-production recovery." >&2
    exit 1
  fi
  if ! docker image inspect "${image}" >/dev/null 2>&1; then
    echo "Required Docker image is not available locally: ${image}" >&2
    exit 1
  fi
}

validate_disk_space() {
  local available_kb required_kb
  if [[ ! "${DEPLOY_MIN_FREE_MB}" =~ ^[0-9]+$ ]]; then
    echo "DEPLOY_MIN_FREE_MB must be a non-negative integer." >&2
    exit 1
  fi
  available_kb="$(df -Pk "${APP_DIR}" | awk 'NR == 2 { print $4 }')"
  required_kb=$((DEPLOY_MIN_FREE_MB * 1024))
  if [[ -z "${available_kb}" || "${available_kb}" -lt "${required_kb}" ]]; then
    echo "Deployment stopped: less than ${DEPLOY_MIN_FREE_MB} MiB is free on the APP_DIR filesystem." >&2
    df -Ph "${APP_DIR}" >&2
    exit 1
  fi
}

validate_inputs() {
  local source_config="${APP_DIR}/deployment/docker/web/nginx.host.conf"

  [[ -f "${source_config}" ]] || { echo "Missing ${source_config}" >&2; exit 1; }
  [[ -r "${source_config}" ]] || { echo "Cannot read ${source_config}" >&2; exit 1; }
  mkdir -p "$(dirname "${WEB_NGINX_HOST_CONFIG}")"
  [[ -w "$(dirname "${WEB_NGINX_HOST_CONFIG}")" ]] || {
    echo "Cannot write Nginx host configuration directory: $(dirname "${WEB_NGINX_HOST_CONFIG}")" >&2
    exit 1
  }
  if [[ "${PUBLISH_LOCAL_FRONTEND_DIST}" == "true" && ! -f "${APP_DIR}/react/dist/index.html" ]]; then
    echo "PUBLISH_LOCAL_FRONTEND_DIST=true but ${APP_DIR}/react/dist/index.html is missing." >&2
    exit 1
  fi
  require_immutable_image WEB_IMAGE
  require_immutable_image BACKEND_IMAGE
  if [[ "${MCP_ENABLED}" != "true" && "${MCP_ENABLED}" != "false" ]]; then
    echo "MCP_ENABLED must be true or false." >&2
    exit 1
  fi
  if [[ "${MCP_ENABLED}" == "true" ]]; then
    [[ "${HOST_MCP_PORT}" =~ ^[0-9]+$ ]] && (( HOST_MCP_PORT > 0 && HOST_MCP_PORT <= 65535 )) || {
      echo "HOST_MCP_PORT must be a valid TCP port." >&2
      exit 1
    }
    require_immutable_image MCP_IMAGE
  fi
  docker image inspect "${MINIO_IMAGE}" >/dev/null 2>&1 || {
    echo "Required Docker image is not available locally: ${MINIO_IMAGE}" >&2
    exit 1
  }
  validate_disk_space
}

prepare_backend_env() {
  local output="$1"

  grep -v -E '^(SERVER_PORT|SERVER_ADDRESS|JAVA_OPTS|APP_STORAGE_MINIO_ENDPOINT|APP_STORAGE_MINIO_PUBLIC_ENDPOINT|APP_STORAGE_MINIO_SERVICE_PUBLIC_ENDPOINT|APP_HR_FACE_SERVICE_BASE_URL|APP_WEB_ALLOWED_ORIGINS|APP_WEB_PUBLIC_URL|APP_WEB_INVITATION_BASE_URL|APP_WEB_PASSWORD_RESET_BASE_URL|APP_AI_OAUTH_ISSUER_URL|APP_AI_OAUTH_RESOURCE_URL|APP_PRODUCT_ANALYTICS_WEB_INGEST_TOKEN|APP_BILLING_STRIPE_SECRET_KEY_FILE|APP_BILLING_STRIPE_WEBHOOK_SECRET_FILE)=' \
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
    printf 'APP_AI_OAUTH_ISSUER_URL=%s\n' "${APP_AI_OAUTH_ISSUER_URL:-${PUBLIC_URL}}"
    printf 'APP_AI_OAUTH_RESOURCE_URL=%s\n' "${APP_AI_OAUTH_RESOURCE_URL:-${PUBLIC_URL}/api/v1/ai/mcp}"
    printf 'APP_PRODUCT_ANALYTICS_WEB_INGEST_TOKEN=%s\n' "${APP_PRODUCT_ANALYTICS_WEB_INGEST_TOKEN:-}"
    if [[ -n "${APP_BILLING_STRIPE_SECRET_KEY_FILE:-}" ]]; then
      printf 'APP_BILLING_STRIPE_SECRET_KEY_FILE=%s\n' "${APP_BILLING_STRIPE_SECRET_KEY_FILE}"
    fi
    if [[ -n "${APP_BILLING_STRIPE_WEBHOOK_SECRET_FILE:-}" ]]; then
      printf 'APP_BILLING_STRIPE_WEBHOOK_SECRET_FILE=%s\n' "${APP_BILLING_STRIPE_WEBHOOK_SECRET_FILE}"
    fi
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
    -e "s#127\\.0\\.0\\.1:3010#127.0.0.1:${HOST_MCP_PORT}#g" \
    "${source_config}" >"${prepared_config}"
  install -m 0644 "${prepared_config}" "${WEB_NGINX_HOST_CONFIG}"
  rm -f "${prepared_config}"
}

REPLACED_CONTAINERS=()
DEPLOY_SUCCEEDED=false

candidate_name() {
  printf '%s-%s' "$1" "${DEPLOY_CANDIDATE_SUFFIX}"
}

preserve_current_container() {
  local container="$1"
  local candidate
  candidate="$(candidate_name "${container}")"
  if docker container inspect "${container}" >/dev/null 2>&1; then
    docker rename "${container}" "${candidate}"
    if ! docker stop "${candidate}" >/dev/null; then
      docker rename "${candidate}" "${container}" >/dev/null 2>&1 || true
      echo "Could not stop ${container}; its original name was restored." >&2
      return 1
    fi
  fi
  REPLACED_CONTAINERS+=("${container}")
}

restore_previous_containers() {
  local index container candidate
  [[ "${DEPLOY_SUCCEEDED}" == "true" ]] && return 0
  echo "Deployment failed. Restoring the previous containers..." >&2
  for ((index=${#REPLACED_CONTAINERS[@]}-1; index>=0; index--)); do
    container="${REPLACED_CONTAINERS[index]}"
    candidate="$(candidate_name "${container}")"
    docker rm -f "${container}" >/dev/null 2>&1 || true
    if docker container inspect "${candidate}" >/dev/null 2>&1; then
      docker rename "${candidate}" "${container}" >/dev/null
      docker start "${container}" >/dev/null
    fi
  done
  echo "Previous containers restored. Review the failed container logs before retrying." >&2
}

finalize_rollback_containers() {
  local container candidate rollback
  for container in "${REPLACED_CONTAINERS[@]}"; do
    candidate="$(candidate_name "${container}")"
    rollback="${container}-${DEPLOY_BACKUP_SUFFIX}"
    if docker container inspect "${candidate}" >/dev/null 2>&1; then
      docker rm -f "${rollback}" >/dev/null 2>&1 || true
      docker rename "${candidate}" "${rollback}"
    fi
  done
}

validate_inputs

if [[ "${DEPLOY_DRY_RUN}" == "true" ]]; then
  echo "Host-network deployment validation passed (dry run). No containers were changed."
  echo "Backend image: ${BACKEND_IMAGE}"
  echo "Web image: ${WEB_IMAGE}"
  echo "Backend port: ${HOST_BACKEND_PORT}"
  echo "MCP enabled: ${MCP_ENABLED}"
  if [[ "${MCP_ENABLED}" == "true" ]]; then
    echo "MCP image: ${MCP_IMAGE}"
    echo "MCP loopback port: ${HOST_MCP_PORT}"
  fi
  exit 0
fi
trap restore_previous_containers ERR INT TERM

echo "Using env file: ${ENV_FILE}"
echo "Using public URL: ${PUBLIC_URL}"
echo "Using backend image: ${BACKEND_IMAGE}"
echo "Using web image: ${WEB_IMAGE}"
echo "Free-space safety threshold: ${DEPLOY_MIN_FREE_MB} MiB"
echo "Starting host-network MinIO, backend, optional MCP, and web containers."

MINIO_DATA_MOUNT="$(resolve_minio_data_mount)"
preserve_current_container "${MINIO_CONTAINER}"
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

BACKEND_SECRET_MOUNTS=()
prepare_backend_secret_mount() {
  local variable_name="$1"
  local container_path="$2"
  local host_path="${!variable_name:-}"
  local prepared_host_path

  [[ -z "${host_path}" ]] && return 0
  if [[ "${host_path}" != /* || ! -f "${host_path}" || ! -r "${host_path}" ]]; then
    echo "${variable_name} must reference a readable absolute host file." >&2
    exit 1
  fi

  # The backend image runs as an unprivileged user. Keep the durable source
  # secret root-only, then expose a read-only copy through a root-only host
  # directory. Mode 0444 is visible only inside the container because the host
  # parent directory cannot be traversed by unprivileged users.
  install -d -m 0700 "${BACKEND_SECRET_RUNTIME_DIR}"
  prepared_host_path="${BACKEND_SECRET_RUNTIME_DIR}/$(basename "${container_path}")"
  install -m 0444 "${host_path}" "${prepared_host_path}"
  BACKEND_SECRET_MOUNTS+=(--volume "${prepared_host_path}:${container_path}:ro")
  printf -v "${variable_name}" '%s' "${container_path}"
  export "${variable_name}"
}

BACKEND_SECRET_RUNTIME_DIR="${BACKEND_SECRET_RUNTIME_DIR:-/run/indice-erp-secrets/${BACKEND_CONTAINER}}"
prepare_backend_secret_mount APP_BILLING_STRIPE_SECRET_KEY_FILE /run/secrets/indice-stripe-secret-key
prepare_backend_secret_mount APP_BILLING_STRIPE_WEBHOOK_SECRET_FILE /run/secrets/indice-stripe-webhook-secret

BACKEND_ENV_FILE="$(mktemp)"
trap 'rm -f "${BACKEND_ENV_FILE}"' EXIT
prepare_backend_env "${BACKEND_ENV_FILE}"

preserve_current_container "${BACKEND_CONTAINER}"
docker run -d \
  --name "${BACKEND_CONTAINER}" \
  --restart unless-stopped \
  --network host \
  --env-file "${BACKEND_ENV_FILE}" \
  "${BACKEND_SECRET_MOUNTS[@]}" \
  "${BACKEND_IMAGE}" >/dev/null

sleep "${BACKEND_STARTUP_WAIT_SECONDS:-45}"
curl --fail --silent --show-error "http://127.0.0.1:${HOST_BACKEND_PORT}/api/v1/health" >/dev/null

if [[ "${MCP_ENABLED}" == "true" ]]; then
  preserve_current_container "${MCP_CONTAINER}"
  docker run -d \
    --name "${MCP_CONTAINER}" \
    --restart unless-stopped \
    --network host \
    -e INDICE_BACKEND_URL="http://127.0.0.1:${HOST_BACKEND_PORT}" \
    -e INDICE_MCP_TRANSPORT=http \
    -e INDICE_MCP_AUTH_MODE=delegated \
    -e INDICE_MCP_HOST=127.0.0.1 \
    -e INDICE_MCP_PORT="${HOST_MCP_PORT}" \
    -e INDICE_OAUTH_ISSUER="${APP_AI_OAUTH_ISSUER_URL:-${PUBLIC_URL}}" \
    -e INDICE_MCP_RESOURCE="${APP_AI_OAUTH_RESOURCE_URL:-${PUBLIC_URL}/api/v1/ai/mcp}" \
    -e INDICE_OAUTH_RESOURCE_METADATA_URL="${APP_AI_OAUTH_ISSUER_URL:-${PUBLIC_URL}}/.well-known/oauth-protected-resource" \
    -e INDICE_HTTP_TIMEOUT_MS="${INDICE_HTTP_TIMEOUT_MS:-5000}" \
    -e INDICE_PREFERRED_CURRENCY="${INDICE_PREFERRED_CURRENCY:-MXN}" \
    "${MCP_IMAGE}" >/dev/null

  sleep "${MCP_STARTUP_WAIT_SECONDS:-5}"
  MCP_HTTP_STATUS="$(curl --silent --output /dev/null --write-out '%{http_code}' \
    "http://127.0.0.1:${HOST_MCP_PORT}/mcp")"
  if [[ "${MCP_HTTP_STATUS}" != "401" ]]; then
    echo "MCP readiness check failed: expected protected HTTP 401 from GET /mcp, received ${MCP_HTTP_STATUS}." >&2
    exit 1
  fi
fi

prepare_nginx_host_config

preserve_current_container "${WEB_CONTAINER}"
docker run -d \
  --name "${WEB_CONTAINER}" \
  --restart unless-stopped \
  --network host \
  -v "${WEB_NGINX_HOST_CONFIG}:/etc/nginx/conf.d/default.conf:ro" \
  "${WEB_IMAGE}" >/dev/null

if [[ "${PUBLISH_LOCAL_FRONTEND_DIST}" == "true" ]]; then
  echo "Publishing explicitly requested local frontend dist into ${WEB_CONTAINER}."
  docker cp "${APP_DIR}/react/dist/." "${WEB_CONTAINER}:/usr/share/nginx/html/"
fi

sleep 8
docker exec "${WEB_CONTAINER}" nginx -t >/dev/null
curl --fail --silent --show-error "http://127.0.0.1:${HOST_WEB_PORT}/api/v1/health" >/dev/null

if [[ -n "${PUBLIC_URL}" ]]; then
  curl --fail --silent --show-error "${PUBLIC_URL}/api/v1/health" >/dev/null
  DEPLOY_ENV_FILE="${ENV_FILE}" \
  WEB_PUBLIC_URL="${PUBLIC_URL}" \
  "${APP_DIR}/deployment/scripts/smoke-test.sh"
fi

DEPLOY_SUCCEEDED=true
trap - ERR INT TERM
finalize_rollback_containers

echo "Host-network stack is healthy."
echo "The previous application containers remain stopped with the -${DEPLOY_BACKUP_SUFFIX} suffix."
