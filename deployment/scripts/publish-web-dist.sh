#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_DIR="${APP_DIR:-${ROOT_DIR}}"
FRONTEND_DIST="${FRONTEND_DIST:-${APP_DIR}/react/dist}"
WEB_CONTAINER="${WEB_CONTAINER:-indice-erp-web-1}"
WEB_HTML_DIR="${WEB_HTML_DIR:-/usr/share/nginx/html}"
PUBLIC_URL="${PUBLIC_URL:-}"
VALIDATE_PUBLIC="${VALIDATE_PUBLIC:-true}"

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
