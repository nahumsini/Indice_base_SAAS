#!/bin/sh

set -eu

MINIO_ALIAS="${MINIO_ALIAS:-local}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://minio:9000}"
MINIO_BUCKET_ATTENDANCE="${MINIO_BUCKET_ATTENDANCE:-indice-hr-attendance}"
MINIO_BUCKET_BIOMETRIC="${MINIO_BUCKET_BIOMETRIC:-indice-hr-biometric}"
MINIO_BUCKET_DOCUMENTS="${MINIO_BUCKET_DOCUMENTS:-indice-hr-documents}"
MINIO_BUCKET_SALES_DOCUMENTS="${MINIO_BUCKET_SALES_DOCUMENTS:-indice-sales-documents}"
MINIO_CORS_FILE="${MINIO_CORS_FILE:-/init/attendance-cors.json}"

until mc alias set "${MINIO_ALIAS}" "${MINIO_ENDPOINT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"; do
  sleep 2
done

mc mb --ignore-existing "${MINIO_ALIAS}/${MINIO_BUCKET_ATTENDANCE}"
mc anonymous set none "${MINIO_ALIAS}/${MINIO_BUCKET_ATTENDANCE}"
mc mb --ignore-existing "${MINIO_ALIAS}/${MINIO_BUCKET_BIOMETRIC}"
mc anonymous set none "${MINIO_ALIAS}/${MINIO_BUCKET_BIOMETRIC}"
mc mb --ignore-existing "${MINIO_ALIAS}/${MINIO_BUCKET_DOCUMENTS}"
mc anonymous set none "${MINIO_ALIAS}/${MINIO_BUCKET_DOCUMENTS}"
mc mb --ignore-existing "${MINIO_ALIAS}/${MINIO_BUCKET_SALES_DOCUMENTS}"
mc anonymous set none "${MINIO_ALIAS}/${MINIO_BUCKET_SALES_DOCUMENTS}"
if [ -f "${MINIO_CORS_FILE}" ]; then
  mc cors set "${MINIO_ALIAS}/${MINIO_BUCKET_ATTENDANCE}" "${MINIO_CORS_FILE}" || echo "Warning: unable to set CORS on ${MINIO_BUCKET_ATTENDANCE}; continuing."
  mc cors set "${MINIO_ALIAS}/${MINIO_BUCKET_BIOMETRIC}" "${MINIO_CORS_FILE}" || echo "Warning: unable to set CORS on ${MINIO_BUCKET_BIOMETRIC}; continuing."
  mc cors set "${MINIO_ALIAS}/${MINIO_BUCKET_DOCUMENTS}" "${MINIO_CORS_FILE}" || echo "Warning: unable to set CORS on ${MINIO_BUCKET_DOCUMENTS}; continuing."
  mc cors set "${MINIO_ALIAS}/${MINIO_BUCKET_SALES_DOCUMENTS}" "${MINIO_CORS_FILE}" || echo "Warning: unable to set CORS on ${MINIO_BUCKET_SALES_DOCUMENTS}; continuing."
fi
