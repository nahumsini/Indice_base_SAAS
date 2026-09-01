#!/usr/bin/env bash

set -euo pipefail

PUBLIC_URL="${PUBLIC_URL:-}"
EXPECTED_RESOURCE="${EXPECTED_RESOURCE:-${PUBLIC_URL}/api/v1/ai/mcp}"
CHALLENGE_TOKEN="${OPENAI_DOMAIN_CHALLENGE_TOKEN:-}"

if [[ ! "${PUBLIC_URL}" =~ ^https://[^/]+$ ]]; then
  echo "PUBLIC_URL must be an HTTPS origin without a trailing slash." >&2
  exit 2
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "${tmp_dir}"' EXIT

headers_file="${tmp_dir}/mcp.headers"
body_file="${tmp_dir}/mcp.body"
status="$(curl -sS -D "${headers_file}" -o "${body_file}" -w '%{http_code}' "${PUBLIC_URL}/api/v1/ai/mcp")"

if [[ "${status}" != "401" ]]; then
  echo "Public MCP must reject anonymous access with 401; received ${status}." >&2
  exit 1
fi

if ! tr -d '\r' <"${headers_file}" | grep -Eiq '^WWW-Authenticate:[[:space:]]*Bearer'; then
  echo "Public MCP 401 must include a Bearer challenge." >&2
  exit 1
fi

metadata_url="${PUBLIC_URL}/.well-known/oauth-protected-resource"
metadata_file="${tmp_dir}/metadata.json"
metadata_status="$(curl -sS -o "${metadata_file}" -w '%{http_code}' "${metadata_url}")"
if [[ "${metadata_status}" != "200" ]]; then
  echo "OAuth protected-resource metadata returned ${metadata_status}." >&2
  exit 1
fi

node -e '
  const fs = require("node:fs");
  const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  if (data.resource !== process.argv[2]) {
    throw new Error(`Unexpected protected resource: ${data.resource}`);
  }
  if (!Array.isArray(data.authorization_servers) || data.authorization_servers.length !== 1) {
    throw new Error("Expected exactly one authorization server.");
  }
' "${metadata_file}" "${EXPECTED_RESOURCE}"

issuer="$(node -e '
  const fs = require("node:fs");
  const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  process.stdout.write(data.authorization_servers[0]);
' "${metadata_file}")"

authorization_file="${tmp_dir}/authorization.json"
authorization_status="$(curl -sS -o "${authorization_file}" -w '%{http_code}' "${issuer}/.well-known/oauth-authorization-server")"
if [[ "${authorization_status}" != "200" ]]; then
  echo "OAuth authorization-server metadata returned ${authorization_status}." >&2
  exit 1
fi

node -e '
  const fs = require("node:fs");
  const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const issuer = process.argv[2];
  if (data.issuer !== issuer) throw new Error(`Unexpected issuer: ${data.issuer}`);
  if (!Array.isArray(data.code_challenge_methods_supported) || !data.code_challenge_methods_supported.includes("S256")) {
    throw new Error("OAuth metadata must advertise PKCE S256.");
  }
' "${authorization_file}" "${issuer}"

support_status="$(curl -sS -o /dev/null -w '%{http_code}' "${PUBLIC_URL}/support")"
if [[ "${support_status}" != "200" ]]; then
  echo "Public support page returned ${support_status}." >&2
  exit 1
fi

if [[ -n "${CHALLENGE_TOKEN}" ]]; then
  challenge_file="${tmp_dir}/challenge.txt"
  challenge_status="$(curl -sS -o "${challenge_file}" -w '%{http_code}' "${PUBLIC_URL}/.well-known/openai-apps-challenge")"
  if [[ "${challenge_status}" != "200" || "$(cat "${challenge_file}")" != "${CHALLENGE_TOKEN}" ]]; then
    echo "OpenAI domain challenge does not match the expected exact value." >&2
    exit 1
  fi
fi

echo "Public MCP boundary is healthy: anonymous access blocked, OAuth metadata aligned, support available."
