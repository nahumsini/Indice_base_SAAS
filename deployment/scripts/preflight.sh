#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_DIR="${ROOT_DIR}/deployment"
USE_EXAMPLE=false
DEPLOY_TOPOLOGY="${DEPLOY_TOPOLOGY:-compose}"

case "${DEPLOY_TOPOLOGY}" in
  compose|host-network) ;;
  *) echo "DEPLOY_TOPOLOGY must be compose or host-network." >&2; exit 2 ;;
esac

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

for command in bash docker git java npm; do
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

validate_deployed_auth_configuration() {
  local bypass profiles
  bypass="$(read_env_value APP_AUTH_LOCAL_MFA_BYPASS_ENABLED)"
  bypass="${bypass,,}"
  bypass="${bypass//\"/}"
  bypass="${bypass//\'/}"
  bypass="${bypass//[[:space:]]/}"
  if [[ -n "${bypass}" && "${bypass}" != "false" ]]; then
    echo "APP_AUTH_LOCAL_MFA_BYPASS_ENABLED must be false for deployed environments." >&2
    return 1
  fi
  profiles="$(read_env_value SPRING_PROFILES_ACTIVE)"
  profiles="${profiles,,}"
  profiles="${profiles//\"/}"
  profiles="${profiles//\'/}"
  profiles="${profiles//[[:space:]]/}"
  if [[ ",${profiles}," == *,local,* ]]; then
    echo "The local Spring profile must not be active in deployed environments." >&2
    return 1
  fi
}

require_env_value() {
  local key="$1"
  if [[ -z "$(read_env_value "${key}")" ]]; then
    echo "Missing required production value: ${key}" >&2
    return 1
  fi
}

require_env_true() {
  local key="$1"
  if [[ "$(read_env_value "${key}")" != "true" ]]; then
    echo "${key} must be true for this production configuration." >&2
    return 1
  fi
}

resolve_protected_value() {
  local direct_key="$1"
  local file_key="$2"
  local direct_value file_path
  direct_value="$(read_env_value "${direct_key}")"
  file_path="$(read_env_value "${file_key}")"

  if [[ -n "${file_path}" ]]; then
    if [[ "${file_path}" != /* || ! -r "${file_path}" ]]; then
      echo "${file_key} must reference a readable absolute host file." >&2
      return 1
    fi
    tr -d '\r\n' <"${file_path}"
    return 0
  fi
  printf '%s' "${direct_value}"
}

validate_mcp_configuration() {
  local enabled image transport auth_mode host
  enabled="$(read_env_value MCP_ENABLED)"
  enabled="${enabled:-false}"
  if [[ "${enabled}" != "true" && "${enabled}" != "false" ]]; then
    echo "MCP_ENABLED must be true or false." >&2
    return 1
  fi
  [[ "${enabled}" == "true" ]] || return 0

  require_env_value MCP_IMAGE
  image="$(read_env_value MCP_IMAGE)"
  if [[ "${image}" == "latest" || "${image}" == *:latest ]]; then
    echo "MCP_IMAGE must use an immutable release tag or digest, not ${image}." >&2
    return 1
  fi

  transport="$(read_env_value INDICE_MCP_TRANSPORT)"
  auth_mode="$(read_env_value INDICE_MCP_AUTH_MODE)"
  host="$(read_env_value INDICE_MCP_HOST)"
  [[ "${transport}" == "http" ]] || {
    echo "APPTEST MCP requires INDICE_MCP_TRANSPORT=http." >&2
    return 1
  }
  [[ "${auth_mode}" == "delegated" ]] || {
    echo "APPTEST MCP requires INDICE_MCP_AUTH_MODE=delegated." >&2
    return 1
  }
  [[ "${host}" == "127.0.0.1" ]] || {
    echo "APPTEST MCP must bind to INDICE_MCP_HOST=127.0.0.1." >&2
    return 1
  }

  if ! grep -Fq "location = /api/v1/ai/mcp" "${DEPLOY_DIR}/docker/web/nginx.host.conf"; then
    echo "Host Nginx must expose only the exact OAuth-protected MCP route." >&2
    return 1
  fi
}

validate_deployed_auth_configuration
validate_mcp_configuration

if [[ "${USE_EXAMPLE}" == "false" ]]; then
  required_keys=(
    WEB_IMAGE
    BACKEND_IMAGE
    MINIO_ROOT_USER
    MINIO_ROOT_PASSWORD
    WEB_PUBLIC_URL
    MINIO_PUBLIC_ENDPOINT
    APP_WEB_ALLOWED_ORIGINS
    APP_WEB_PUBLIC_URL
    APP_HR_KIOSK_IDENTIFICATION_TOKEN_SECRET
    APP_KIOSK_TOKEN_PROTECTION_SECRET
    APP_BILLING_STORAGE_INCLUDED_BYTES
    APP_BILLING_STORAGE_BLOCK_BYTES
  )

  for key in "${required_keys[@]}"; do
    require_env_value "${key}"
  done

  for key in WEB_IMAGE BACKEND_IMAGE; do
    image="$(read_env_value "${key}")"
    if [[ "${image}" == "latest" || "${image}" == *:latest ]]; then
      echo "${key} must use an immutable release tag or digest, not ${image}." >&2
      exit 1
    fi
  done

  datasource_url="$(read_env_value SPRING_DATASOURCE_URL)"
  datasource_username="$(read_env_value SPRING_DATASOURCE_USERNAME)"
  datasource_password="$(read_env_value SPRING_DATASOURCE_PASSWORD)"

  if [[ -n "${datasource_url}${datasource_username}${datasource_password}" ]]; then
    require_env_value SPRING_DATASOURCE_URL
    require_env_value SPRING_DATASOURCE_USERNAME
    require_env_value SPRING_DATASOURCE_PASSWORD
  else
    require_env_value MYSQL_PASSWORD
    require_env_value MYSQL_ROOT_PASSWORD
  fi

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

  if [[ "$(read_env_value APP_BILLING_STORAGE_INCLUDED_BYTES)" != "5368709120" ]]; then
    echo "APP_BILLING_STORAGE_INCLUDED_BYTES must preserve the approved 5 GiB included quota." >&2
    exit 1
  fi
  if [[ "$(read_env_value APP_BILLING_STORAGE_BLOCK_BYTES)" != "5368709120" ]]; then
    echo "APP_BILLING_STORAGE_BLOCK_BYTES must preserve the approved 5 GiB commercial block." >&2
    exit 1
  fi

  public_url="$(read_env_value WEB_PUBLIC_URL)"
  if [[ "${public_url}" == https://* && "$(read_env_value APP_SESSION_COOKIE_SECURE)" != "true" ]]; then
    echo "APP_SESSION_COOKIE_SECURE must be true when WEB_PUBLIC_URL uses HTTPS." >&2
    exit 1
  fi

  for key in APP_BILLING_COLLECTION_ENABLED APP_BILLING_COLLECTION_REMINDERS_ENABLED APP_BILLING_COLLECTION_EMAIL_ENABLED APP_BILLING_COLLECTION_RECONCILIATION_ENABLED; do
    collection_flag="$(read_env_value "${key}")"
    if [[ -n "${collection_flag}" && "${collection_flag}" != "true" && "${collection_flag}" != "false" ]]; then
      echo "${key} must be true or false." >&2
      exit 1
    fi
  done
  if [[ "$(read_env_value APP_BILLING_COLLECTION_ENABLED)" == "true" ]]; then
    for key in APP_BILLING_STRIPE_ENABLED APP_BILLING_STRIPE_PROCESSOR_ENABLED APP_BILLING_PROVISIONING_ENABLED APP_EMAIL_ENABLED APP_BILLING_COLLECTION_REMINDERS_ENABLED APP_BILLING_COLLECTION_EMAIL_ENABLED APP_BILLING_COLLECTION_RECONCILIATION_ENABLED; do
      require_env_true "${key}"
    done
    require_env_value APP_EMAIL_FROM
    case "$(read_env_value APP_EMAIL_PROVIDER)" in
      sendgrid) require_env_value APP_EMAIL_SENDGRID_API_KEY ;;
      smtp) require_env_value SPRING_MAIL_HOST ;;
      *) echo "Payment collection requires a configured SendGrid or SMTP email provider." >&2; exit 1 ;;
    esac
  fi

  if [[ "$(read_env_value APP_BILLING_STRIPE_ENABLED)" == "true" ]]; then
    stripe_mode="$(read_env_value APP_BILLING_STRIPE_MODE)"
    if [[ "${stripe_mode}" != "test" && "${stripe_mode}" != "live" ]]; then
      echo "APP_BILLING_STRIPE_MODE must be test or live." >&2
      exit 1
    fi

    catalog_live_sync="$(read_env_value APP_BILLING_STRIPE_CATALOG_LIVE_SYNC_ENABLED)"
    catalog_live_sync="${catalog_live_sync:-false}"
    if [[ "${catalog_live_sync}" != "true" && "${catalog_live_sync}" != "false" ]]; then
      echo "APP_BILLING_STRIPE_CATALOG_LIVE_SYNC_ENABLED must be true or false." >&2
      exit 1
    fi
    if [[ "${stripe_mode}" == "test" && "${catalog_live_sync}" == "true" ]]; then
      echo "Stripe catalog LIVE synchronization cannot be enabled while Stripe mode is test." >&2
      exit 1
    fi

    stripe_secret="$(resolve_protected_value APP_BILLING_STRIPE_SECRET_KEY APP_BILLING_STRIPE_SECRET_KEY_FILE)"
    webhook_secret="$(resolve_protected_value APP_BILLING_STRIPE_WEBHOOK_SECRET APP_BILLING_STRIPE_WEBHOOK_SECRET_FILE)"
    if [[ "${stripe_mode}" == "live" ]]; then
      [[ "${stripe_secret}" == sk_live_* || "${stripe_secret}" == rk_live_* ]] || {
        echo "Stripe live mode requires a protected sk_live_ or rk_live_ key." >&2
        exit 1
      }
    else
      [[ "${stripe_secret}" == sk_test_* || "${stripe_secret}" == rk_test_* ]] || {
        echo "Stripe test mode requires a protected sk_test_ or rk_test_ key." >&2
        exit 1
      }
    fi
    [[ "${webhook_secret}" == whsec_* ]] || {
      echo "Stripe billing requires a whsec_ webhook signing secret." >&2
      exit 1
    }

    stripe_required_keys=(
      APP_BILLING_STRIPE_SUCCESS_URL
      APP_BILLING_STRIPE_CANCEL_URL
      APP_BILLING_STRIPE_PORTAL_RETURN_URL
    )
    for key in "${stripe_required_keys[@]}"; do
      require_env_value "${key}"
    done

    if [[ "${stripe_mode}" == "live" ]]; then
      if [[ -n "$(read_env_value APP_BILLING_STRIPE_SECRET_KEY)" ]]; then
        echo "Live Stripe secrets must not be stored directly in the environment file." >&2
        exit 1
      fi
      require_env_value APP_BILLING_STRIPE_SECRET_KEY_FILE
      require_env_value APP_BILLING_STRIPE_WEBHOOK_SECRET_FILE
      success_url="$(read_env_value APP_BILLING_STRIPE_SUCCESS_URL)"
      cancel_url="$(read_env_value APP_BILLING_STRIPE_CANCEL_URL)"
      portal_url="$(read_env_value APP_BILLING_STRIPE_PORTAL_RETURN_URL)"
      [[ "${success_url}" == https://app.indiceapp.com/signup/complete* ]] || {
        echo "Live Stripe success URL must use app.indiceapp.com/signup/complete." >&2
        exit 1
      }
      [[ "${cancel_url}" == https://app.indiceapp.com/signup* ]] || {
        echo "Live Stripe cancel URL must use app.indiceapp.com/signup." >&2
        exit 1
      }
      [[ "${portal_url}" == https://app.indiceapp.com/home-panel/billing* ]] || {
        echo "Live Stripe portal return URL must use app.indiceapp.com/home-panel/billing." >&2
        exit 1
      }

      live_required_true=(
        APP_BILLING_STRIPE_PROCESSOR_ENABLED
        APP_BILLING_PROVISIONING_ENABLED
        APP_BILLING_STRIPE_AUTOMATIC_TAX_ENABLED
        APP_BILLING_STRIPE_TAX_ID_COLLECTION_ENABLED
        APP_ENTITLEMENTS_ENFORCEMENT_ENABLED
        APP_BILLING_LIFECYCLE_ENABLED
        APP_BILLING_LIFECYCLE_SCHEDULER_ENABLED
      )
      for key in "${live_required_true[@]}"; do
        require_env_true "${key}"
      done
      require_env_value APP_BILLING_LIFECYCLE_RETENTION_DAYS
      if (( $(read_env_value APP_BILLING_LIFECYCLE_RETENTION_DAYS) < 90 )); then
        echo "APP_BILLING_LIFECYCLE_RETENTION_DAYS must be at least 90 in live mode." >&2
        exit 1
      fi
    fi
  fi
fi

echo "Validating deployment scripts and Compose configuration..."
bash -n "${DEPLOY_DIR}"/scripts/*.sh
compose_config_options=(--quiet)
if [[ "${DEPLOY_TOPOLOGY}" == "host-network" ]]; then
  # Host-network deployments use the protected environment directly. The Compose
  # MySQL and Stripe TEST services are not part of that topology.
  compose_config_options+=(--no-interpolate)
fi
docker compose \
  --env-file "${ENV_FILE}" \
  -f "${DEPLOY_DIR}/compose/docker-compose.yml" \
  config "${compose_config_options[@]}"
docker compose \
  --env-file "${ENV_FILE}" \
  -f "${DEPLOY_DIR}/compose/docker-compose.staging.yml" \
  --profile ai \
  config --no-interpolate --quiet
if [[ "${USE_EXAMPLE}" == "false" && "${DEPLOY_TOPOLOGY}" == "compose" ]]; then
  APP_IMAGE_TAG=release-check docker compose \
    --env-file "${ENV_FILE}" \
    -f "${DEPLOY_DIR}/compose/docker-compose.staging.yml" \
    --profile ai \
    config --quiet
fi

latest_migration=0
for migration in "${ROOT_DIR}"/src/main/resources/db/migration/V*__*.sql; do
  [[ -e "${migration}" ]] || continue
  version="${migration##*/V}"
  version="${version%%__*}"
  if [[ "${version}" =~ ^[0-9]+$ ]] && (( version > latest_migration )); then
    latest_migration="${version}"
  fi
done
echo "Latest Flyway migration in this release: V${latest_migration}"

echo "Checking repository diff..."
git -C "${ROOT_DIR}" diff --check

echo "Validating the Indice MCP service..."
(
  cd "${ROOT_DIR}/integrations/indice-mcp"
  npm ci --no-audit --no-fund
  npm test
)

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
  docker build \
    -f "${DEPLOY_DIR}/docker/mcp/Dockerfile" \
    -t indice-erp-mcp:release-check \
    "${ROOT_DIR}"
fi

echo "Deployment preflight passed."
