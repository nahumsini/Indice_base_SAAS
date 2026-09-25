# MCP OAuth connection capacity incident — 2026-09-22

## Outcome

The reported reconnect used `https://app.indiceapp.com/api/v1/ai/mcp`, which still runs
`74fcf8b7d5e2`. APPTEST runs `0e5215524db6`; its earlier technical verification did not
certify the production ChatGPT conversation.

The production OAuth reconnect reached registration and consent but failed during token
exchange. The affected user-company pair already had the existing maximum of five active
AI connections. `AiAccessTokenService.issueOAuth` rejected another connection and the
controller converted that capacity exception into a misleading HTTP 503.

The owner explicitly authorized revoking one identified, unused connection. At 14:03:47 UTC,
exactly one row was marked revoked, with guards for the confirmed owner, creation timestamp,
absence of previous use and absence of an OAuth refresh association. The active count became
four. The connection used earlier that day remained active. No token values, hashes, business
payloads or personal identifiers were retrieved for this diagnosis.

**Status:** capacity blocker removed in production; a fresh ChatGPT reconnect and conversation
test still require client-side confirmation. The preventive code change is local and tested,
not deployed. No claim is made that every cause of missing tools has been eliminated.

## Evidence and limits

- 13:44:59 UTC: dynamic client registration returned 201.
- 13:45:10 UTC: consent succeeded and an authorization code was stored.
- 13:45:12 UTC: `/api/v1/ai/oauth/token` returned 503.
- The corresponding code remained unused and no new connection was issued after it.
- Its owner had five unexpired, unrevoked connections; three had no recorded use.
- 13:45:57 UTC: `list_tasks`, `get_funds_status` and `get_sales_today` recorded successful
  reads for that same owner through an existing connection. These records establish that
  those tools were usable by an earlier grant, not that the reported new conversation worked.
- Public OAuth metadata returned 200 and advertised the expected production issuer/resource.
  Anonymous MCP requests returned 401 with `WWW-Authenticate` as intended.
- The older production adapter lacks the newer per-request MCP diagnostics. Absence of its
  structured log events is not evidence of no traffic, especially for a separate tunnel path.
- Aggregate checks and token-state inspection were read-only until the explicitly approved,
  narrowly scoped revocation. No tasks were created or edited.

## Preventive change

- Added a specific `AiConnectionLimitException` while preserving compatibility with existing
  `IllegalStateException` handling on manual connection creation.
- OAuth checks available capacity before presenting consent and again before issuing a code.
- Consent returns HTTP 409, `connection_limit_reached`, and an actionable Spanish `message`
  consumed by the existing UI: use **Panel Inicial → Conectar IA**, revoke an unused connection,
  then reconnect.
- Final token issuance retains its capacity check. If capacity changes after consent, token
  exchange returns HTTP 400 `invalid_grant` with a clear recovery description instead of 503.
- Cancellation and refresh retain their existing behavior. The maximum, scopes, owner and
  tenant checks, PKCE, CSRF, token lifetimes and explicit revocation choice are preserved.
- No automatic revocation, permission expansion, new endpoint or schema change was added.

Files changed: `AiAccessTokenService`, new `AiConnectionLimitException`, `AiOAuthService`,
`AiOAuthApiController`, their focused tests, the canonical MCP document and this record.
Frontend changes: N/A. Database migrations: N/A. Application deployment: N/A.

## Verification

`./mvnw -B -ntp -Dtest=AiAccessTokenServiceTest,AiOAuthServiceTest,AiOAuthConnectionLimitTest test`

- 36 tests passed; zero failures, errors or skips. These tests use mocked repositories and
  services, not a functional or production database.
- Backend compilation and test compilation passed; `git diff --check` passed.
- Regression coverage includes capacity refusal without issuing/revoking tokens, owner-scoped
  capacity checks, rejection before authorization-code issuance, decline at full capacity,
  actionable consent errors, a capacity change at exchange, safe handling of unrelated failures,
  and refresh/rotation without another active slot.
- Initial test compilation exposed a wildcard assertion type mismatch in the new test; it was
  corrected before the successful run. Existing deprecation/compiler warnings remain.

## Next client check

Reconnect the same production URL, select the connector in a new ChatGPT conversation and ask
for pending tasks, including overdue and due-today tasks. Correlate the new token exchange and
task read with the test time. This request has been sent to the owner; its result is pending.

Task creation in the current MCP is limited to the connected user and requires preview followed
by explicit confirmation. A proposed test assigning another person is not supported by that
contract. Read access to another employee's tasks still respects the connected actor's visible
task set; existing limits also prevent claiming an exhaustive list from a truncated response.

The prior production-promotion gates remain in
[`deployment/releases/2026.09.22-apptest-lupita.md`](../../deployment/releases/2026.09.22-apptest-lupita.md).
This incident resolution does not waive authenticated APPTEST acceptance or the network gate.

Official references consulted: [OpenAI troubleshooting](https://developers.openai.com/plugins/deploy/troubleshooting)
and [connecting and testing a plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt).
