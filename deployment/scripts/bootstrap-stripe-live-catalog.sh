#!/usr/bin/env bash

set -euo pipefail
umask 077

for command in curl jq; do
  command -v "${command}" >/dev/null 2>&1 || {
    echo "${command} is required." >&2
    exit 1
  }
done

read_secret() {
  if [[ -n "${STRIPE_SECRET_KEY_FILE:-}" ]]; then
    [[ -r "${STRIPE_SECRET_KEY_FILE}" ]] || {
      echo "STRIPE_SECRET_KEY_FILE cannot be read." >&2
      exit 1
    }
    tr -d '\r\n' < "${STRIPE_SECRET_KEY_FILE}"
    return
  fi
  printf '%s' "${STRIPE_SECRET_KEY:-}"
}

stripe_secret_key="$(read_secret)"
if [[ "${stripe_secret_key}" != sk_live_* && "${stripe_secret_key}" != rk_live_* ]]; then
  echo "A Stripe live secret or restricted key is required." >&2
  exit 1
fi

: "${INDICE_BASIC_ALL_MONTHLY_CENTS:?Set the approved basic-all monthly amount in cents.}"
: "${INDICE_BASIC_ALL_ANNUAL_CENTS:?Set the approved basic-all annual amount in cents.}"
: "${INDICE_STORAGE_BLOCK_MONTHLY_CENTS:?Set the approved 5 GiB storage monthly amount in cents.}"
: "${INDICE_STORAGE_BLOCK_ANNUAL_CENTS:?Set the approved 5 GiB storage annual amount in cents.}"
for approved_amount in \
  "${INDICE_BASIC_ALL_MONTHLY_CENTS}" \
  "${INDICE_BASIC_ALL_ANNUAL_CENTS}" \
  "${INDICE_STORAGE_BLOCK_MONTHLY_CENTS}" \
  "${INDICE_STORAGE_BLOCK_ANNUAL_CENTS}"; do
  [[ "${approved_amount}" =~ ^[1-9][0-9]*$ ]] || {
    echo "Approved catalog amounts must be positive integer cents." >&2
    exit 1
  }
done

output="${STRIPE_CATALOG_OUTPUT_FILE:-}"
if [[ -z "${output}" ]]; then
  echo "STRIPE_CATALOG_OUTPUT_FILE is required so live IDs are not lost." >&2
  exit 1
fi
mkdir -p "$(dirname "${output}")"

stripe_get() {
  curl --fail --silent --show-error --get "https://api.stripe.com${1}" \
    --user "${stripe_secret_key}:" "${@:2}"
}

stripe_post() {
  local path="$1"
  local idempotency_key="$2"
  shift 2
  curl --fail --silent --show-error --request POST "https://api.stripe.com${path}" \
    --user "${stripe_secret_key}:" \
    --header "Idempotency-Key: ${idempotency_key}" \
    "$@"
}

ensure_product() {
  local product_id="$1"
  local name="$2"
  local existing
  existing="$(curl --silent --get "https://api.stripe.com/v1/products/${product_id}" \
    --user "${stripe_secret_key}:" | jq -r '.id // empty')"
  if [[ -z "${existing}" ]]; then
    stripe_post /v1/products "indice-live-${product_id}" \
      --data-urlencode "id=${product_id}" \
      --data-urlencode "name=${name}" \
      --data-urlencode "tax_code=txcd_10103001" \
      --data-urlencode "metadata[indice_catalog]=2026.08-live-v1" \
      | jq -r '.id'
    return
  fi
  stripe_post "/v1/products/${product_id}" "indice-live-${product_id}-normalize" \
    --data-urlencode "name=${name}" \
    --data-urlencode "active=true" \
    --data-urlencode "tax_code=txcd_10103001" \
    --data-urlencode "metadata[indice_catalog]=2026.08-live-v1" \
    | jq -r '.id'
}

ensure_recurring_price() {
  local product_id="$1"
  local lookup_key="$2"
  local cents="$3"
  local interval="$4"
  local existing
  existing="$(stripe_get /v1/prices \
    --data-urlencode "lookup_keys[]=${lookup_key}" \
    --data-urlencode "active=true" \
    --data-urlencode "limit=1" | jq -c '.data[0] // empty')"
  if [[ -n "${existing}" ]]; then
    if ! jq -e \
      --arg product "${product_id}" \
      --arg interval "${interval}" \
      --argjson cents "${cents}" \
      '.livemode == true and .product == $product and .currency == "usd" and
       .unit_amount == $cents and .recurring.interval == $interval and
       .tax_behavior == "exclusive"' <<<"${existing}" >/dev/null; then
      echo "Existing live price ${lookup_key} does not match the approved catalog." >&2
      exit 1
    fi
    jq -r '.id' <<<"${existing}"
    return
  fi
  stripe_post /v1/prices "indice-live-${lookup_key}" \
    --data-urlencode "product=${product_id}" \
    --data-urlencode "currency=usd" \
    --data-urlencode "unit_amount=${cents}" \
    --data-urlencode "recurring[interval]=${interval}" \
    --data-urlencode "tax_behavior=exclusive" \
    --data-urlencode "lookup_key=${lookup_key}" \
    --data-urlencode "metadata[indice_catalog]=2026.08-live-v1" \
    | jq -r '.id'
}

ensure_one_time_price() {
  local product_id="$1"
  local lookup_key="$2"
  local cents="$3"
  local existing
  existing="$(stripe_get /v1/prices \
    --data-urlencode "lookup_keys[]=${lookup_key}" \
    --data-urlencode "active=true" \
    --data-urlencode "limit=1" | jq -c '.data[0] // empty')"
  if [[ -n "${existing}" ]]; then
    if ! jq -e \
      --arg product "${product_id}" \
      --argjson cents "${cents}" \
      '.livemode == true and .product == $product and .currency == "usd" and
       .unit_amount == $cents and .type == "one_time" and
       .tax_behavior == "exclusive"' <<<"${existing}" >/dev/null; then
      echo "Existing live price ${lookup_key} does not match the approved catalog." >&2
      exit 1
    fi
    jq -r '.id' <<<"${existing}"
    return
  fi
  stripe_post /v1/prices "indice-live-${lookup_key}" \
    --data-urlencode "product=${product_id}" \
    --data-urlencode "currency=usd" \
    --data-urlencode "unit_amount=${cents}" \
    --data-urlencode "tax_behavior=exclusive" \
    --data-urlencode "lookup_key=${lookup_key}" \
    --data-urlencode "metadata[indice_catalog]=2026.08-live-v1" \
    | jq -r '.id'
}

basic_1_product="$(ensure_product prod_indice_launch_basic_1_v1 "Indice launch package · 1 core bundle")"
basic_2_product="$(ensure_product prod_indice_launch_basic_2_v1 "Indice launch package · 2 core bundles")"
basic_3_product="$(ensure_product prod_indice_launch_basic_3_v1 "Indice launch package · 3 core bundles")"
basic_all_product="$(ensure_product prod_indice_launch_basic_all_v1 "Indice launch package · 4 or more core bundles")"
extra_seat_product="$(ensure_product prod_indice_extra_seat_v1 "Indice additional employee")"
storage_product="$(ensure_product prod_indice_storage_5gib_v1 "Indice additional storage · 5 GiB")"
consulting_product="$(ensure_product prod_indice_consulting_50m_v1 "Indice consultation · 50 minutes")"

basic_1_month="$(ensure_recurring_price "${basic_1_product}" indice_launch_basic_1_month_v1 6900 month)"
basic_1_year="$(ensure_recurring_price "${basic_1_product}" indice_launch_basic_1_year_v1 66240 year)"
basic_2_month="$(ensure_recurring_price "${basic_2_product}" indice_launch_basic_2_month_v1 10900 month)"
basic_2_year="$(ensure_recurring_price "${basic_2_product}" indice_launch_basic_2_year_v1 104640 year)"
basic_3_month="$(ensure_recurring_price "${basic_3_product}" indice_launch_basic_3_month_v1 14900 month)"
basic_3_year="$(ensure_recurring_price "${basic_3_product}" indice_launch_basic_3_year_v1 143040 year)"
basic_all_month="$(ensure_recurring_price "${basic_all_product}" indice_launch_basic_all_month_v1 "${INDICE_BASIC_ALL_MONTHLY_CENTS}" month)"
basic_all_year="$(ensure_recurring_price "${basic_all_product}" indice_launch_basic_all_year_v1 "${INDICE_BASIC_ALL_ANNUAL_CENTS}" year)"
extra_seat_month="$(ensure_recurring_price "${extra_seat_product}" indice_extra_seat_month_v1 1200 month)"
extra_seat_year="$(ensure_recurring_price "${extra_seat_product}" indice_extra_seat_year_v1 14400 year)"
storage_month="$(ensure_recurring_price "${storage_product}" indice_storage_5gib_month_v1 "${INDICE_STORAGE_BLOCK_MONTHLY_CENTS}" month)"
storage_year="$(ensure_recurring_price "${storage_product}" indice_storage_5gib_year_v1 "${INDICE_STORAGE_BLOCK_ANNUAL_CENTS}" year)"
consulting_once="$(ensure_one_time_price "${consulting_product}" indice_consulting_50m_once_v1 8900)"

cat > "${output}" <<OUTPUT
APP_BILLING_STRIPE_PRICE_BASIC_1_MONTHLY=${basic_1_month}
APP_BILLING_STRIPE_PRICE_BASIC_1_ANNUAL=${basic_1_year}
APP_BILLING_STRIPE_PRICE_BASIC_2_MONTHLY=${basic_2_month}
APP_BILLING_STRIPE_PRICE_BASIC_2_ANNUAL=${basic_2_year}
APP_BILLING_STRIPE_PRICE_BASIC_3_MONTHLY=${basic_3_month}
APP_BILLING_STRIPE_PRICE_BASIC_3_ANNUAL=${basic_3_year}
APP_BILLING_STRIPE_PRICE_BASIC_ALL_MONTHLY=${basic_all_month}
APP_BILLING_STRIPE_PRICE_BASIC_ALL_ANNUAL=${basic_all_year}
APP_BILLING_STRIPE_PRICE_EXTRA_SEAT_MONTHLY=${extra_seat_month}
APP_BILLING_STRIPE_PRICE_EXTRA_SEAT_ANNUAL=${extra_seat_year}
APP_BILLING_STRIPE_PRICE_STORAGE_BLOCK_MONTHLY=${storage_month}
APP_BILLING_STRIPE_PRICE_STORAGE_BLOCK_ANNUAL=${storage_year}
INDICE_STRIPE_PRICE_CONSULTATION_50_MINUTES=${consulting_once}
OUTPUT
chmod 600 "${output}"
echo "Stripe LIVE catalog verified and written to ${output}."
