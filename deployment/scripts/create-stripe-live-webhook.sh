#!/usr/bin/env bash

set -euo pipefail
umask 077

for command in curl jq; do
  command -v "${command}" >/dev/null 2>&1 || {
    echo "${command} is required." >&2
    exit 1
  }
done

: "${STRIPE_SECRET_KEY_FILE:?Set STRIPE_SECRET_KEY_FILE to the protected live key file.}"
: "${STRIPE_WEBHOOK_SECRET_OUTPUT_FILE:?Set STRIPE_WEBHOOK_SECRET_OUTPUT_FILE.}"
: "${STRIPE_WEBHOOK_URL:=https://app.indiceapp.com/api/v1/billing/stripe/webhook}"

[[ -r "${STRIPE_SECRET_KEY_FILE}" ]] || {
  echo "STRIPE_SECRET_KEY_FILE cannot be read." >&2
  exit 1
}
stripe_secret_key="$(tr -d '\r\n' < "${STRIPE_SECRET_KEY_FILE}")"
if [[ "${stripe_secret_key}" != sk_live_* && "${stripe_secret_key}" != rk_live_* ]]; then
  echo "A Stripe live secret or restricted key is required." >&2
  exit 1
fi
if [[ "${STRIPE_WEBHOOK_URL}" != https://app.indiceapp.com/* ]]; then
  echo "The live webhook URL must use https://app.indiceapp.com/." >&2
  exit 1
fi
mkdir -p "$(dirname "${STRIPE_WEBHOOK_SECRET_OUTPUT_FILE}")"

existing="$(curl --fail --silent --show-error --get https://api.stripe.com/v1/webhook_endpoints \
  --user "${stripe_secret_key}:" \
  --data-urlencode limit=100 \
  | jq -r --arg url "${STRIPE_WEBHOOK_URL}" '.data[] | select(.url == $url and .status == "enabled") | .id' \
  | head -1)"
if [[ -n "${existing}" ]]; then
  echo "An enabled live webhook already exists at this URL (${existing})." >&2
  echo "Its signing secret cannot be recovered; rotate it in Stripe or set the existing whsec_ value on the VPS." >&2
  exit 2
fi

response="$(curl --fail --silent --show-error --request POST https://api.stripe.com/v1/webhook_endpoints \
  --user "${stripe_secret_key}:" \
  --header "Idempotency-Key: indice-live-webhook-2026-08-v1" \
  --data-urlencode "url=${STRIPE_WEBHOOK_URL}" \
  --data-urlencode 'description=Indice production billing lifecycle' \
  --data-urlencode 'enabled_events[]=checkout.session.completed' \
  --data-urlencode 'enabled_events[]=checkout.session.expired' \
  --data-urlencode 'enabled_events[]=customer.subscription.created' \
  --data-urlencode 'enabled_events[]=customer.subscription.updated' \
  --data-urlencode 'enabled_events[]=customer.subscription.deleted' \
  --data-urlencode 'enabled_events[]=customer.subscription.paused' \
  --data-urlencode 'enabled_events[]=customer.subscription.resumed' \
  --data-urlencode 'enabled_events[]=invoice.paid' \
  --data-urlencode 'enabled_events[]=invoice.payment_succeeded' \
  --data-urlencode 'enabled_events[]=invoice.payment_failed' \
  --data-urlencode 'enabled_events[]=invoice.finalized' \
  --data-urlencode 'enabled_events[]=invoice.voided' \
  --data-urlencode 'enabled_events[]=charge.refunded' \
  --data-urlencode 'enabled_events[]=refund.updated' \
  --data-urlencode 'enabled_events[]=charge.dispute.created' \
  --data-urlencode 'enabled_events[]=charge.dispute.updated' \
  --data-urlencode 'enabled_events[]=charge.dispute.closed')"

secret="$(jq -r '.secret // empty' <<<"${response}")"
endpoint_id="$(jq -r '.id // empty' <<<"${response}")"
if [[ "${secret}" != whsec_* || -z "${endpoint_id}" ]]; then
  echo "Stripe did not return a live webhook endpoint and signing secret." >&2
  exit 1
fi
printf '%s\n' "${secret}" > "${STRIPE_WEBHOOK_SECRET_OUTPUT_FILE}"
chmod 600 "${STRIPE_WEBHOOK_SECRET_OUTPUT_FILE}"
echo "Stripe LIVE webhook ${endpoint_id} created; its secret was written to the protected output file."
