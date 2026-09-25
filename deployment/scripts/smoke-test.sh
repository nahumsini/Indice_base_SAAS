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

if [[ "${APP_POS_MERCADO_PAGO_ENABLED:-false}" == "true" ]]; then
  echo "Checking protected Mercado Pago setup route"
  mp_status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' \
    "${WEB_PUBLIC_URL}/api/v1/pos/mercado-pago/status")"
  [[ "${mp_status}" == "401" ]] || {
    echo "Expected anonymous Mercado Pago status to return 401; received HTTP ${mp_status}." >&2
    exit 1
  }

  echo "Checking Mercado Pago OAuth callback routing"
  mp_callback_status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' \
    "${WEB_PUBLIC_URL}/api/v1/pos/mercado-pago/oauth/callback")"
  [[ "${mp_callback_status}" == "303" ]] || {
    echo "Expected Mercado Pago callback to return 303; received HTTP ${mp_callback_status}." >&2
    exit 1
  }
fi

if [[ "${SMOKE_TEST_AUTH_ROUTE:-true}" == "true" ]]; then
  cookie_jar="$(mktemp)"
  csrf_body="$(mktemp)"
  login_body="$(mktemp)"
  trap 'rm -f "${cookie_jar}" "${csrf_body}" "${login_body}"' EXIT

  echo "Checking CSRF session route"
  curl --fail --silent --show-error \
    --cookie-jar "${cookie_jar}" \
    --output "${csrf_body}" \
    "${WEB_PUBLIC_URL}/api/v1/auth/csrf"

  csrf_token="$(sed -n 's/.*"csrfToken"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "${csrf_body}")"
  if [[ -z "${csrf_token}" ]]; then
    echo "CSRF endpoint did not return a csrfToken." >&2
    exit 1
  fi

  echo "Checking login routing with synthetic invalid credentials"
  login_status="$(curl --silent --show-error \
    --cookie "${cookie_jar}" \
    --cookie-jar "${cookie_jar}" \
    --header 'Accept: application/json' \
    --header 'Content-Type: application/json' \
    --header "X-CSRF-Token: ${csrf_token}" \
    --request POST \
    --data '{"companyName":"__indice_deployment_smoke__","email":"deployment-smoke-invalid@invalid.example","password":"not-a-real-password"}' \
    --output "${login_body}" \
    --write-out '%{http_code}' \
    "${WEB_PUBLIC_URL}/api/v1/auth/login")"

  if [[ "${login_status}" != "401" ]]; then
    echo "Expected the synthetic login to reach the backend and return 401; received HTTP ${login_status}." >&2
    exit 1
  fi
fi

echo "Smoke test passed."
