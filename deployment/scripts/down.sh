#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_DIR="${ROOT_DIR}/deployment"
ENV_FILE="${DEPLOY_ENV_FILE:-${DEPLOY_DIR}/env/.env}"

compose_args=(
  --env-file "${ENV_FILE}"
  -f "${DEPLOY_DIR}/compose/docker-compose.yml"
)

if [[ "${1:-}" == "dev" ]]; then
  compose_args+=(-f "${DEPLOY_DIR}/compose/docker-compose.dev.yml")
  shift
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Copy deployment/env/.env.example to deployment/env/.env first." >&2
  exit 1
fi

docker compose "${compose_args[@]}" down "$@"
