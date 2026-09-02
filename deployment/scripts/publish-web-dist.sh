#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_DIR="${APP_DIR:-${ROOT_DIR}}"
FRONTEND_DIST="${FRONTEND_DIST:-${APP_DIR}/react/dist}"
WEB_CONTAINER="${WEB_CONTAINER:-indice-erp-web-1}"
WEB_HTML_DIR="${WEB_HTML_DIR:-/usr/share/nginx/html}"
DEFAULT_WEB_NGINX_CONFIG="${APP_DIR}/deployment/docker/web/nginx.conf"
WEB_NGINX_CONFIG_PROVIDED="${WEB_NGINX_CONFIG+x}"
WEB_NGINX_CONFIG="${WEB_NGINX_CONFIG:-${DEFAULT_WEB_NGINX_CONFIG}}"
WEB_NGINX_CONFIG_TARGET="${WEB_NGINX_CONFIG_TARGET:-/etc/nginx/conf.d/default.conf}"
WEB_NGINX_BACKEND_PORT="${WEB_NGINX_BACKEND_PORT:-}"
SYNC_WEB_NGINX_CONFIG="${SYNC_WEB_NGINX_CONFIG:-true}"
PUBLIC_URL="${PUBLIC_URL:-}"
VALIDATE_PUBLIC="${VALIDATE_PUBLIC:-true}"
PREPARED_WEB_NGINX_CONFIG=""

cleanup() {
  if [[ -n "${PREPARED_WEB_NGINX_CONFIG}" && -f "${PREPARED_WEB_NGINX_CONFIG}" ]]; then
    rm -f "${PREPARED_WEB_NGINX_CONFIG}"
  fi
}
trap cleanup EXIT

prepare_nginx_config() {
  local source_config="$1"

  if [[ -z "${WEB_NGINX_BACKEND_PORT}" ]]; then
    printf '%s\n' "${source_config}"
    return 0
  fi

  if [[ -n "${PREPARED_WEB_NGINX_CONFIG}" && -f "${PREPARED_WEB_NGINX_CONFIG}" ]]; then
    rm -f "${PREPARED_WEB_NGINX_CONFIG}"
  fi
  PREPARED_WEB_NGINX_CONFIG="$(mktemp)"
  sed "s#127\\.0\\.0\\.1:8082#127.0.0.1:${WEB_NGINX_BACKEND_PORT}#g" \
    "${source_config}" >"${PREPARED_WEB_NGINX_CONFIG}"
  printf '%s\n' "${PREPARED_WEB_NGINX_CONFIG}"
}

publish_nginx_config() {
  local host_config_path
  local source_config="${WEB_NGINX_CONFIG}"
  local prepared_config
  local host_config_candidate="${APP_DIR}/deployment/docker/web/nginx.host.conf"
  local web_network_mode

  prepared_config="$(prepare_nginx_config "${source_config}")"
  if docker cp "${prepared_config}" "${WEB_CONTAINER}:${WEB_NGINX_CONFIG_TARGET}"; then
    return 0
  fi

  echo "Direct docker cp could not replace ${WEB_NGINX_CONFIG_TARGET}; checking for a bind-mounted config." >&2
  host_config_path="$(
    docker inspect "${WEB_CONTAINER}" \
      --format '{{range .Mounts}}{{printf "%s|||%s\n" .Source .Destination}}{{end}}' 2>/dev/null \
      | awk -F'\\|\\|\\|' -v target="${WEB_NGINX_CONFIG_TARGET}" '$2 == target {print $1; exit}'
  )"

  if [[ -z "${host_config_path}" ]]; then
    echo "No bind-mounted nginx config was found for ${WEB_NGINX_CONFIG_TARGET}." >&2
    return 1
  fi

  echo "Detected nginx config bind mount: ${host_config_path}"

  web_network_mode="$(
    docker inspect "${WEB_CONTAINER}" --format '{{.HostConfig.NetworkMode}}' 2>/dev/null || true
  )"

  if [[ -z "${WEB_NGINX_CONFIG_PROVIDED}" \
    && "${web_network_mode}" == "host" \
    && -f "${host_config_candidate}" ]]; then
    source_config="${host_config_candidate}"
    prepared_config="$(prepare_nginx_config "${source_config}")"
    echo "Web container uses host networking; using ${source_config}"
  fi

  if [[ ! -w "${host_config_path}" ]]; then
    echo "The bind-mounted nginx config is not writable by this user." >&2
    echo "Run with a user that can write it, or update it manually:" >&2
    echo "cp '${source_config}' '${host_config_path}'" >&2
    return 1
  fi

  cp "${prepared_config}" "${host_config_path}"
}

if [[ ! -f "${FRONTEND_DIST}/index.html" ]]; then
  echo "Missing ${FRONTEND_DIST}/index.html. Run npm run build first." >&2
  exit 1
fi

expected_asset="$(grep -oE '/assets/index-[^"]+\.js' "${FRONTEND_DIST}/index.html" | head -1 || true)"

if [[ -z "${expected_asset}" ]]; then
  echo "Could not find built index asset in ${FRONTEND_DIST}/index.html." >&2
  exit 1
fi

echo "Publishing ${FRONTEND_DIST} to ${WEB_CONTAINER}:${WEB_HTML_DIR}"
echo "Expected public asset: ${expected_asset}"
echo "App directory: ${APP_DIR}"

docker cp "${FRONTEND_DIST}/." "${WEB_CONTAINER}:${WEB_HTML_DIR}/"
docker exec --user 0 "${WEB_CONTAINER}" chmod -R a+rX "${WEB_HTML_DIR}"

if [[ "${SYNC_WEB_NGINX_CONFIG}" == "true" && -f "${WEB_NGINX_CONFIG}" ]]; then
  echo "Publishing web nginx config to ${WEB_CONTAINER}:${WEB_NGINX_CONFIG_TARGET}"
  publish_nginx_config
  docker exec "${WEB_CONTAINER}" sh -c "nginx -t && nginx -s reload"
fi

container_asset="$(
  docker exec "${WEB_CONTAINER}" sh -c \
    "grep -oE '/assets/index-[^\" ]+\\.js' '${WEB_HTML_DIR}/index.html' | head -1" \
    || true
)"

if [[ "${container_asset}" != "${expected_asset}" ]]; then
  echo "Container asset mismatch." >&2
  echo "Expected: ${expected_asset}" >&2
  echo "Actual:   ${container_asset:-<empty>}" >&2
  exit 1
fi

if ! docker exec "${WEB_CONTAINER}" test -r "${WEB_HTML_DIR}${expected_asset}"; then
  echo "The web runtime user cannot read ${WEB_HTML_DIR}${expected_asset}." >&2
  exit 1
fi

if [[ "${VALIDATE_PUBLIC}" == "true" && -n "${PUBLIC_URL}" ]]; then
  public_asset="$(curl --fail --silent --show-error "${PUBLIC_URL}/" \
    | grep -oE '/assets/index-[^"]+\.js' \
    | head -1 \
    || true)"

  if [[ "${public_asset}" != "${expected_asset}" ]]; then
    echo "Public asset mismatch." >&2
    echo "Expected: ${expected_asset}" >&2
    echo "Actual:   ${public_asset:-<empty>}" >&2
    exit 1
  fi
fi

echo "Web container frontend updated."
