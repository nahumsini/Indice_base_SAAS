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
: "${STRIPE_REQUIRED_TAX_COUNTRIES:?Set the accountant-approved country codes, for example CA,MX.}"
: "${STRIPE_EXPECTED_BRAND:=Indice}"
: "${STRIPE_EXPECTED_DOMAIN:=indiceapp.com}"

[[ -r "${STRIPE_SECRET_KEY_FILE}" ]] || {
  echo "STRIPE_SECRET_KEY_FILE cannot be read." >&2
  exit 1
}
stripe_secret_key="$(tr -d '\r\n' <"${STRIPE_SECRET_KEY_FILE}")"
if [[ "${stripe_secret_key}" != sk_live_* && "${stripe_secret_key}" != rk_live_* ]]; then
  echo "A Stripe live secret or restricted key is required." >&2
  exit 1
fi

stripe_get() {
  curl --fail --silent --show-error --get "https://api.stripe.com${1}" \
    --user "${stripe_secret_key}:" "${@:2}"
}

account="$(stripe_get /v1/account)"
tax_settings="$(stripe_get /v1/tax/settings)"
tax_registrations="$(stripe_get /v1/tax/registrations --data-urlencode limit=100)"

jq -e '.charges_enabled == true and .payouts_enabled == true and .details_submitted == true' \
  <<<"${account}" >/dev/null || {
  echo "Stripe LIVE account is not fully enabled for charges and payouts." >&2
  exit 1
}

brand="$(jq -r '.business_profile.name // .settings.dashboard.display_name // empty' <<<"${account}")"
url="$(jq -r '.business_profile.url // empty' <<<"${account}")"
if [[ "${brand,,}" != *"${STRIPE_EXPECTED_BRAND,,}"* ]]; then
  echo "Stripe public brand does not contain '${STRIPE_EXPECTED_BRAND}'. Current value: '${brand:-unset}'." >&2
  exit 1
fi
if [[ "${url,,}" != *"${STRIPE_EXPECTED_DOMAIN,,}"* ]]; then
  echo "Stripe business URL does not use ${STRIPE_EXPECTED_DOMAIN}. Current value: '${url:-unset}'." >&2
  exit 1
fi

jq -e '.status == "active"' <<<"${tax_settings}" >/dev/null || {
  echo "Stripe Tax is not active in LIVE mode." >&2
  exit 1
}

IFS=',' read -r -a required_countries <<<"${STRIPE_REQUIRED_TAX_COUNTRIES}"
for country in "${required_countries[@]}"; do
  country="${country//[[:space:]]/}"
  country="${country^^}"
  [[ -z "${country}" ]] && continue
  jq -e --arg country "${country}" \
    '.data[] | select(.country == $country and .status == "active")' \
    <<<"${tax_registrations}" >/dev/null || {
    echo "Stripe Tax has no active LIVE registration for ${country}." >&2
    exit 1
  }
done

echo "Stripe LIVE account, Indice branding, Stripe Tax, and required registrations are ready."
