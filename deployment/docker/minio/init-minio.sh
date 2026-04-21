#!/bin/sh

set -eu

MINIO_ALIAS="${MINIO_ALIAS:-local}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://minio:9000}"
MINIO_BUCKET_ATTENDANCE="${MINIO_BUCKET_ATTENDANCE:-indice-hr-attendance}"
MINIO_BUCKET_BIOMETRIC="${MINIO_BUCKET_BIOMETRIC:-indice-hr-biometric}"
MINIO_CORS_FILE="${MINIO_CORS_FILE:-/init/attendance-cors.json}"

until mc alias set "${MINIO_ALIAS}" "${MINIO_ENDPOINT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"; do
  sleep 2
done

mc mb --ignore-existing "${MINIO_ALIAS}/${MINIO_BUCKET_ATTENDANCE}"
mc anonymous set none "${MINIO_ALIAS}/${MINIO_BUCKET_ATTENDANCE}"
mc mb --ignore-existing "${MINIO_ALIAS}/${MINIO_BUCKET_BIOMETRIC}"
mc anonymous set none "${MINIO_ALIAS}/${MINIO_BUCKET_BIOMETRIC}"
if [ -f "${MINIO_CORS_FILE}" ]; then
  mc cors set "${MINIO_ALIAS}/${MINIO_BUCKET_ATTENDANCE}" "${MINIO_CORS_FILE}"
  mc cors set "${MINIO_ALIAS}/${MINIO_BUCKET_BIOMETRIC}" "${MINIO_CORS_FILE}"
fi
