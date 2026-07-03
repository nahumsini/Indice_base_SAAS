#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_DIR="${ROOT_DIR}/deployment"
ENV_FILE="${DEPLOY_ENV_FILE:-${DEPLOY_DIR}/env/.env}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Copy deployment/env/.env.example to deployment/env/.env first." >&2
  exit 1
fi

while IFS='=' read -r key value; do
  [[ -z "${key}" || "${key}" =~ ^[[:space:]]*# ]] && continue
  if [[ -z "${!key+x}" ]]; then
    export "${key}=${value}"
  fi
done <"${ENV_FILE}"

WEB_PUBLIC_URL="${WEB_PUBLIC_URL:-http://localhost:${WEB_HOST_PORT:-8080}}"
MINIO_PUBLIC_ENDPOINT="${MINIO_PUBLIC_ENDPOINT:-http://localhost:${MINIO_API_HOST_PORT:-9000}}"

echo "Checking web at ${WEB_PUBLIC_URL}"
curl --fail --silent --show-error "${WEB_PUBLIC_URL}" >/dev/null

echo "Checking backend health via web proxy"
backend_health="$(curl --fail --silent --show-error "${WEB_PUBLIC_URL}/api/v1/health")"

if [[ "${EXPECT_OBJECT_STORAGE:-true}" == "true" ]]; then
  if ! printf '%s' "${backend_health}" | grep -q '"storage"[[:space:]]*:'; then
    echo "Backend health does not expose object storage status." >&2
    echo "${backend_health}" >&2
    exit 1
  fi

  if ! printf '%s' "${backend_health}" | grep -q '"enabled"[[:space:]]*:[[:space:]]*true'; then
    echo "Object storage is not enabled in backend health." >&2
    echo "${backend_health}" >&2
    exit 1
  fi
fi

echo "Checking MinIO health at ${MINIO_PUBLIC_ENDPOINT}"
curl --fail --silent --show-error "${MINIO_PUBLIC_ENDPOINT}/minio/health/live" >/dev/null

echo "Smoke test passed."
