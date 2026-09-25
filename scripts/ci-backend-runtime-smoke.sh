#!/usr/bin/env bash
set -euo pipefail

image="${1:-indice-erp-backend:ci}"
backend_container="${CI_SMOKE_BACKEND_CONTAINER:-indice-erp-backend-ci-smoke}"
storage_stub_port="${CI_SMOKE_STORAGE_STUB_PORT:-19000}"
storage_stub_url="http://127.0.0.1:${storage_stub_port}"
storage_stub_container_url="${CI_SMOKE_STORAGE_STUB_CONTAINER_URL:-${storage_stub_url}}"
storage_stub_bind="${CI_SMOKE_STORAGE_STUB_BIND:-127.0.0.1}"
server_address="${CI_SMOKE_SERVER_ADDRESS:-127.0.0.1}"
server_port="${CI_SMOKE_SERVER_PORT:-8083}"
health_url="http://${server_address}:${server_port}/api/v1/auth/me"

: "${TEST_DATASOURCE_URL:?TEST_DATASOURCE_URL is required}"
: "${TEST_DATASOURCE_USERNAME:?TEST_DATASOURCE_USERNAME is required}"
: "${TEST_DATASOURCE_PASSWORD:?TEST_DATASOURCE_PASSWORD is required}"

storage_stub_pid=""

cleanup() {
  docker rm -f "${backend_container}" >/dev/null 2>&1 || true
  if [[ -n "${storage_stub_pid}" ]]; then
    kill "${storage_stub_pid}" >/dev/null 2>&1 || true
    wait "${storage_stub_pid}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

start_storage_stub() {
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  python3 "${script_dir}/ci-object-storage-stub.py" "${storage_stub_port}" "${storage_stub_bind}" &
  storage_stub_pid="$!"

  for attempt in $(seq 1 20); do
    if curl -fsS "${storage_stub_url}/minio/health/live" >/dev/null 2>&1; then
      return 0
    fi
    if ! kill -0 "${storage_stub_pid}" >/dev/null 2>&1; then
      echo "Object storage stub exited before it became ready." >&2
      return 1
    fi
    sleep 1
  done

  echo "Object storage stub did not become ready at ${storage_stub_url}." >&2
  return 1
}

wait_for_backend() {
  for attempt in $(seq 1 36); do
    response="$(curl -sS "${health_url}" 2>/dev/null || true)"
    internal_status="$(
      docker exec "${backend_container}" sh -lc \
        "wget -S -O /dev/null http://127.0.0.1:${server_port}/api/v1/auth/me 2>&1 || true" \
        2>/dev/null || true
    )"
    if printf '%s' "${response}" | grep -q "User is not authenticated" \
        || printf '%s' "${internal_status}" | grep -q "HTTP/1.1 401"; then
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
    -e "APP_STORAGE_PROVIDER=minio" \
    -e "APP_STORAGE_REQUIRED=true" \
    -e "APP_STORAGE_MINIO_ENDPOINT=${storage_stub_container_url}" \
    -e "APP_STORAGE_MINIO_ACCESS_KEY=ci-smoke-access-key" \
    -e "APP_STORAGE_MINIO_SECRET_KEY=ci-smoke-secret-key" \
    -e "JAVA_OPTS=-Xms256m -Xmx768m" \
    "${image}" >/dev/null

  wait_for_backend "${flyway_enabled}"
  docker rm -f "${backend_container}" >/dev/null 2>&1 || true
}

start_storage_stub
run_backend_smoke false
run_backend_smoke true
