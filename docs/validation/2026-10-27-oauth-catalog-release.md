# OAuth consent catalog correction — 2026-10-27

Status: LOCAL CORRECTION VERIFIED; updated release gates pending. Production has
not been changed. This candidate includes the complete previously prepared
[primary-local Marketing workspace](2026-10-27-marketing-workspace-release.md).
That earlier source was never activated and is superseded before deployment.

## Diagnosis

Read-only inspection of the owner's production authorization screen and matching
proxy responses confirms HTTP 400 from `/api/v1/ai/oauth/consent`. The JSON response
is `invalid_scope`. The requested scope set equals the public discovery catalog:
118 scopes, 2,279 characters after joining with single spaces. The service rejected
any scope input over 2,048 characters before validating individual permissions.
The frontend's generic API parser did not interpret OAuth `error_description`,
which hid the cause behind `Request failed` under HTTP/2.

Only route/status/timestamp and scope count/length were retained as diagnostic
evidence. No real authorization URL, state, challenge, cookie, code or token is
included in this report. Diagnosis did not approve/deny a connection or revoke
existing access. Successful consent/token responses earlier in the same production
log establish that this is request-dependent, not evidence of a global outage.

## Correction and preserved behavior

`AiOAuthService` permits a bounded 8,192-character scope input in initial consent,
authorization and refresh. Supported-scope validation, identity-scope pairing,
registered client/exact redirect, PKCE S256, resource binding, single-use codes,
membership, CSRF, expiry and five-connection capacity remain unchanged. Refresh
still cannot expand permissions or create another connection. Existing grants,
schema, API contracts and MCP tool declarations are unchanged.

The OAuth frontend adapter maps known machine error codes to actionable Spanish
messages and preserves HTTP status for login and capacity handling. Unknown/network
failures receive safe retry guidance. Raw provider/request details are not rendered.
The shared native API client and other modules' error behavior are unchanged.

## Verification

- Before correction: the new actual-catalog consent and refresh tests both reproduce
  the rejection. After correction: 46 focused OAuth/access tests pass, no skips.
- Backend regression checks the actual advertised catalog, exact scopes stored in
  the code, large-catalog refresh, unknown scopes, oversized input and existing
  PKCE/resource/capacity/rotation behavior.
- 13 OAuth/integration frontend regressions pass. The synthetic real-page browser
  flow passes full catalog, explanatory errors/retry, explicit approval, native
  CSRF, redirect, capacity, expired session, mobile and network/server failures.
  External requests are blocked; no real connection is granted by these tests.
- TypeScript and production frontend build pass; the established large-chunk
  advisory remains.
- An initial broad local test selection included a repository integration test
  whose pre-existing isolated `indice_test_db` has old migration checksums. It
  correctly refused startup. No migration, checksum or database repair was made.
  The release must rerun database tests against a fresh disposable database.

Engineering verification does not represent human consent or a successful new
production connection. The owner must finish consent after deployment. The pending
historical Stripe TEST revocation and all deployment/recovery gates remain in force.
The prior question about authorizing `8393d85a` cannot authorize this updated source.
