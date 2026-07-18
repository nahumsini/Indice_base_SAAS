#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_DIR="${ROOT_DIR}/deployment"
USE_EXAMPLE=false

if [[ "${1:-}" == "--example" ]]; then
  USE_EXAMPLE=true
  ENV_FILE="${DEPLOY_DIR}/env/.env.example"
elif [[ -n "${1:-}" ]]; then
  echo "Usage: $0 [--example]" >&2
  exit 2
else
  ENV_FILE="${DEPLOY_ENV_FILE:-${DEPLOY_DIR}/env/.env}"
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing deployment environment: ${ENV_FILE}" >&2
  echo "Copy deployment/env/.env.example to deployment/env/.env and configure production values." >&2
  exit 1
fi

for command in bash docker git npm; do
  if ! command -v "${command}" >/dev/null 2>&1; then
    echo "Missing required command: ${command}" >&2
    exit 1
  fi
done

read_env_value() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" "${ENV_FILE}" | tail -n 1 || true)"
  printf '%s' "${line#*=}"
}

require_env_value() {
  local key="$1"
  if [[ -z "$(read_env_value "${key}")" ]]; then
    echo "Missing required production value: ${key}" >&2
    return 1
  fi
}

if [[ "${USE_EXAMPLE}" == "false" ]]; then
  required_keys=(
    MYSQL_PASSWORD
    MYSQL_ROOT_PASSWORD
    MINIO_ROOT_USER
    MINIO_ROOT_PASSWORD
    WEB_PUBLIC_URL
    MINIO_PUBLIC_ENDPOINT
    APP_WEB_ALLOWED_ORIGINS
    APP_WEB_PUBLIC_URL
    APP_HR_KIOSK_IDENTIFICATION_TOKEN_SECRET
    APP_KIOSK_TOKEN_PROTECTION_SECRET
  )

  for key in "${required_keys[@]}"; do
    require_env_value "${key}"
  done

  unsafe_values=(
    "MYSQL_PASSWORD:indice_pass"
    "MYSQL_ROOT_PASSWORD:rootpass"
    "MINIO_ROOT_USER:minioadmin"
    "MINIO_ROOT_PASSWORD:minioadmin"
    "APP_HR_KIOSK_IDENTIFICATION_TOKEN_SECRET:indice-kiosk-identification-secret"
    "APP_HR_KIOSK_IDENTIFICATION_TOKEN_SECRET:change-this-to-a-long-random-production-secret"
    "APP_KIOSK_TOKEN_PROTECTION_SECRET:change-this-to-a-different-long-random-production-secret"
  )

  for entry in "${unsafe_values[@]}"; do
    key="${entry%%:*}"
    unsafe="${entry#*:}"
    if [[ "$(read_env_value "${key}")" == "${unsafe}" ]]; then
      echo "Unsafe default value detected for ${key}." >&2
      exit 1
    fi
  done

  hr_kiosk_secret="$(read_env_value APP_HR_KIOSK_IDENTIFICATION_TOKEN_SECRET)"
  kiosk_protection_secret="$(read_env_value APP_KIOSK_TOKEN_PROTECTION_SECRET)"
  if (( ${#hr_kiosk_secret} < 32 )); then
    echo "APP_HR_KIOSK_IDENTIFICATION_TOKEN_SECRET must contain at least 32 characters." >&2
    exit 1
  fi
  if (( ${#kiosk_protection_secret} < 32 )); then
    echo "APP_KIOSK_TOKEN_PROTECTION_SECRET must contain at least 32 characters." >&2
    exit 1
  fi
  if [[ "${hr_kiosk_secret}" == "${kiosk_protection_secret}" ]]; then
    echo "Kiosk identification and token-protection secrets must be different." >&2
    exit 1
  fi

  public_url="$(read_env_value WEB_PUBLIC_URL)"
  if [[ "${public_url}" == https://* && "$(read_env_value APP_SESSION_COOKIE_SECURE)" != "true" ]]; then
    echo "APP_SESSION_COOKIE_SECURE must be true when WEB_PUBLIC_URL uses HTTPS." >&2
    exit 1
  fi
fi

echo "Validating deployment scripts and Compose configuration..."
bash -n "${DEPLOY_DIR}"/scripts/*.sh
docker compose \
  --env-file "${ENV_FILE}" \
  -f "${DEPLOY_DIR}/compose/docker-compose.yml" \
  config --quiet

echo "Checking repository diff..."
git -C "${ROOT_DIR}" diff --check

echo "Validating and building frontend..."
(
  cd "${ROOT_DIR}/react"
  npm run typecheck
  npm run build
)

echo "Running backend tests..."
(
  cd "${ROOT_DIR}"
  ./mvnw test
)

if [[ "${SKIP_DOCKER_BUILD:-false}" != "true" ]]; then
  echo "Building deployment images..."
  docker build \
    -f "${DEPLOY_DIR}/docker/backend/Dockerfile" \
    -t indice-erp-backend:release-check \
    "${ROOT_DIR}"
  docker build \
    -f "${DEPLOY_DIR}/docker/web/Dockerfile" \
    -t indice-erp-web:release-check \
    "${ROOT_DIR}"
fi

echo "Deployment preflight passed."
