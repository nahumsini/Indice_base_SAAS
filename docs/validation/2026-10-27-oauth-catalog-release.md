# OAuth consent catalog correction — 2026-10-27

Status: PRODUCTION DEPLOYED; OBSERVATION PASS; AUTHENTICATED MCP CONTINUITY UNKNOWN.
Application source:
`5e6a227ecf218b8698b750c9dfd36d85ac2b354f` on `codex/next-work-20261025`.
Production now runs this source. It includes the complete previously prepared
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
The authenticated owner connection list also shows two active connections out of
five: capacity does not explain this rejection. No connection was revoked.

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
  The subsequent complete protected-environment preflight passes against a fresh
  disposable database: 4,243 backend tests, zero failures/errors, three established
  skips. All 188 MCP/deployment checks pass.
- [Exact-source CI](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/40568607124)
  passed at 2026-10-27T19:45:10Z, including 1,332 frontend regressions, real isolated
  MinIO attachment tests, image builds and runtime checks. Final-image HTTP/OAuth/
  proxy suites, both actual Nginx configurations and recovery regressions also pass.
- An intermediate compatibility check rejected ES2022 `Object.hasOwn`; the final
  adapter uses the existing ES2020 target without changing compiler settings.
  Final TypeScript, build and focused browser/API regressions pass.
- Current source, full application delta and new Git history have no actual new
  secrets. Twenty known scanner false positives retain identical whole-file bytes.
  Four fresh image scans verify every OCI blob and retain CycloneDX inventories;
  all have zero secret findings. Web/MCP have no HIGH/CRITICAL findings.

The two existing backend/recovery scanner findings
[CVE-2026-47884](https://spring.io/security/cve-2026-47884/) and
[CVE-2026-47890](https://spring.io/security/cve-2026-47890/) retain the documented
deployment-specific non-applicability assessment: no XSLT/implicit wildcard MVC
rendering or SSE view fragments, unchanged MVC configuration/dependencies and two
fresh passing MVC exposure regressions. This is applicability evidence, not a
Spring patch or a platform-wide security certification.

## Artifacts, backup and recovery

| Component | Immutable image ID |
| --- | --- |
| backend | `sha256:2cb8872f88de748bdc9ce6199ed39f6433f7c78665ac104be786d176cd89263e` |
| web | `sha256:1f7e2c2e034210191f9f979c9ef52fe60db2b1ffdecffa214885e59585db5320` |
| backend recovery | `sha256:bc6953a7785b1ad830235fd1cab47da6674bd2311f7ae963b3268f0e36bda3f6` |
| MCP | `sha256:071fb61e5586584c636290fdc3b1918ca140559ee51d7edb6957b5e992a1af11` |

JAR and frontend bytes match the final images. All 50 changed JAR entries against
the deployed backend are limited to the previously reviewed Email/Mailing/
Whatsapping/Sales projection, the OAuth service and its nested records, and the
generated learning resource. No dependencies, schema, routes, scope catalog or
provider activation changed. All previously captured primary-local work is retained;
separate worktrees and local database contents remain outside the release scope.

Fresh backup **`production-20261027T193416Z`** contains SQL, objects, configuration
and all five declared protected files. The off-host copy passes individual hashes,
manifest and compressed-stream verification. The prepared environment uses verified
protected-file inputs; all five contents match the active container,
144 common settings match, and effective JVM options are unchanged.

The initial live preparatory invocation rejected a source file copied onto itself,
before creating any candidate backend or web container. Automatic recovery restored
the prior services. Distinct root-only source copies now feed the canonical staging
step, which preserves the exact effective mount destinations and credential bytes.
Protected configuration checks, disconnected restoration with both images and the
canonical dry run passed again. This continues the same authorized application
source and image set; the original authorization expiry is unchanged.

Disconnected restoration passes with the candidate and exact prior backend,
comparing every original raw row/column, Flyway history and object. Workers/providers
and database events are disabled, application authority is SELECT-only and the
private network has no external access. Schema remains V365. Restore proof and
off-host evidence use the same backup and its own protected-file copies.

The pre-activation canonical production dry run and protected-state guard passed at
2026-10-27T19:45:15Z and passed again after the preparation repair. Capacity was
94,501,023,744 bytes with the standard 10,240 MiB minimum, without an override.
Post-activation preserved-state verification passes; App Test, protected settings,
prices, subscriptions, access, schema and effective mounts remain unchanged.

## Changed files and activation boundary

Runtime changes are limited to
[`AiOAuthService.java`](../../src/main/java/com/indice/erp/ai/oauth/AiOAuthService.java)
and the OAuth-specific frontend adapter
[`aiOAuth.ts`](../../react/src/app/api/aiOAuth.ts).
The change also adds actual-catalog service regressions, API-adapter tests and the
synthetic real-page browser fixture/runner, plus the canonical MCP rule and this
evidence. Financial calculations, migrations and other native API error handling
are unchanged. Their change report fields are N/A.

Engineering verification does not represent human consent or a successful new
production connection. After deployment, the owner must restart the connection
from the assistant to obtain a fresh authorization request and complete consent.
The pending
historical Stripe TEST revocation and all deployment/recovery gates remain in force.
The prior question about authorizing `8393d85a` cannot authorize this updated source.
The owner subsequently authorized this exact source under the
[bounded Stripe TEST deferral](../decisions/2026-10-27-oauth-marketing-stripe-deferral.md).
Public smoke, preserved-state checks and five-minute observation pass. A real
authenticated MCP business read remains outstanding; human product acceptance is UNKNOWN.
An existing connected-tool probe returned `Unknown tool` at the connector binding;
it did not establish an authenticated business read and is not counted as continuity
evidence. No inference about production token validity is made from that response.


## Production activation and observation

Application activation began at **2026-10-27T19:57:01Z**. Backend and web now use
the exact approved immutable images above. The MCP image is unchanged. Public
web/API, private storage/readiness, public anonymous OAuth/MCP rejection and security
headers pass. Backend startup has no ERROR/FATAL/out-of-memory entries. Public HTML
matches the final web image. Verification completed at **2026-10-27T20:04:09Z**;
the six-sample five-minute observation began immediately afterward.

The first post-activation settings comparison stopped on MinIO's inherited foreign
backend input-file paths and application image-reference strings. Its own credentials,
storage settings, image, arguments and mounts were byte-identical. The exact original
MinIO container was restored as the active storage service, retaining a stopped
compatible storage recovery container. The unchanged preservation guard then passed
for every production service and all of App Test. No object, volume or business record
was deleted. This did not change the approved application images or protected values.

A post-activation connected-tool read still reports an unavailable connector binding
(`Unknown tool`), which is not an authenticated production response. The native browser
session also needs sign-in after the backend restart. The owner has been asked to
start a fresh ChatGPT connection and personally review consent. No real OAuth grant,
revocation, email, WhatsApp message or campaign restart was performed by verification.
This records outstanding real-client evidence explicitly rather than marking it PASS.

The six observation samples from **2026-10-27T20:04:09.111Z** through
**2026-10-27T20:09:10.034Z** all returned HTTP 200 for web, API, private MCP readiness
and storage, with zero backend errors and zero service restarts. Final preserved-state
verification passed at **2026-10-27T20:09:15.565788+00:00**. Available capacity was
94,496,342,016 bytes; the minimum was not overridden. Exact prior application images
and compatible stopped recovery containers remain available.

The deployment/observation authorization closed at
**2026-10-27T20:09:15.566050+00:00**, with operational result
`DEPLOYED_OBSERVATION_PASS_AUTHENTICATED_MCP_PENDING`; it cannot authorize another
activation. This is deliberately not a full MCP real-client acceptance PASS. The
historical Stripe TEST-key revocation remains HIGH and unresolved. No claim of
revocation, successful new consent, authenticated tool continuity or human acceptance
is made. Raw operational evidence remains in protected off-repository storage.
