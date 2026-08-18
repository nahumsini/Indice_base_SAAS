#!/usr/bin/env bash

set -euo pipefail

if [[ "${CONFIRM_ROLLBACK:-false}" != "true" ]]; then
  echo "Rollback is a production mutation." >&2
  echo "Run again with CONFIRM_ROLLBACK=true after confirming the database is compatible with the previous application images." >&2
  exit 2
fi

WEB_CONTAINER="${WEB_CONTAINER:-indice-erp-web-1}"
BACKEND_CONTAINER="${BACKEND_CONTAINER:-indice-erp-backend-1}"
MINIO_CONTAINER="${MINIO_CONTAINER:-indice-erp-minio-1}"
ROLLBACK_SUFFIX="${DEPLOY_BACKUP_SUFFIX:-rollback}"
SWAP_SUFFIX="rollback-swap-$(date +%Y%m%d%H%M%S)-$$"
SWAPPED=()
ROLLBACK_COMPLETED=false

restore_failed_swap() {
  local index container current_swap rollback
  [[ "${ROLLBACK_COMPLETED}" == "true" ]] && return 0
  echo "Rollback did not complete. Restoring the containers active before this command..." >&2
  for ((index=${#SWAPPED[@]}-1; index>=0; index--)); do
    container="${SWAPPED[index]}"
    current_swap="${container}-${SWAP_SUFFIX}"
    rollback="${container}-${ROLLBACK_SUFFIX}"
    docker rm -f "${container}" >/dev/null 2>&1 || true
    if docker container inspect "${current_swap}" >/dev/null 2>&1; then
      docker rename "${current_swap}" "${container}" >/dev/null
      docker start "${container}" >/dev/null
    fi
    docker container inspect "${rollback}" >/dev/null 2>&1 && docker stop "${rollback}" >/dev/null || true
  done
}

trap restore_failed_swap ERR INT TERM

for container in "${MINIO_CONTAINER}" "${BACKEND_CONTAINER}" "${WEB_CONTAINER}"; do
  rollback="${container}-${ROLLBACK_SUFFIX}"
  if ! docker container inspect "${container}" >/dev/null 2>&1; then
    echo "Current container is missing: ${container}" >&2
    exit 1
  fi
  if ! docker container inspect "${rollback}" >/dev/null 2>&1; then
    echo "Rollback container is missing: ${rollback}" >&2
    exit 1
  fi
done

for container in "${MINIO_CONTAINER}" "${BACKEND_CONTAINER}" "${WEB_CONTAINER}"; do
  rollback="${container}-${ROLLBACK_SUFFIX}"
  current_swap="${container}-${SWAP_SUFFIX}"
  docker rename "${container}" "${current_swap}"
  SWAPPED+=("${container}")
  docker stop "${current_swap}" >/dev/null
  docker rename "${rollback}" "${container}"
  docker start "${container}" >/dev/null
done

sleep "${ROLLBACK_HEALTH_WAIT_SECONDS:-15}"
HOST_WEB_PORT="${HOST_WEB_PORT:-${WEB_HOST_PORT:-8080}}"
HOST_BACKEND_PORT="${HOST_BACKEND_PORT:-${BACKEND_HOST_PORT:-8082}}"
HOST_MINIO_API_PORT="${HOST_MINIO_API_PORT:-${MINIO_API_HOST_PORT:-9000}}"
curl --fail --silent --show-error "http://127.0.0.1:${HOST_MINIO_API_PORT}/minio/health/live" >/dev/null
curl --fail --silent --show-error "http://127.0.0.1:${HOST_BACKEND_PORT}/api/v1/health" >/dev/null
curl --fail --silent --show-error "http://127.0.0.1:${HOST_WEB_PORT}/api/v1/health" >/dev/null

for container in "${SWAPPED[@]}"; do
  current_swap="${container}-${SWAP_SUFFIX}"
  rollback="${container}-${ROLLBACK_SUFFIX}"
  docker rename "${current_swap}" "${rollback}"
done

ROLLBACK_COMPLETED=true
trap - ERR INT TERM
echo "Host-network application rollback completed and passed local health checks."
