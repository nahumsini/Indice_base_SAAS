# OAuth and Marketing release: bounded historical Stripe TEST deferral

Date: 2026-10-27.

The owner answered “Autorizar excepción puntual” for application source
`5e6a227ecf218b8698b750c9dfd36d85ac2b354f`, production only, after reviewing the OAuth correction
and complete primary-local Marketing candidate. This replaces the unanswered
question for superseded `8393d85a`; that earlier source was never activated.

The authorization was recorded at **2026-10-27T19:49:14.838640+00:00**. It ends immediately
after this single deployment attempt and its five-minute observation, in all
cases no later than **2026-10-27T21:49:14.838640+00:00**. Documentation-only handoff commits
do not change the runtime source or authorize another activation. Earlier
closed exceptions are not reused.

Only the historical Stripe TEST-key revocation blocker is deferred. The finding
remains **HIGH**, unresolved, owned by the release owner for revocation and follow-up
before another public release. No revocation is claimed. This decision cannot
waive another secret, exploitable vulnerability, tenant, authentication, integrity,
capacity, backup/recovery or monitoring gate. It does not enable providers,
authorize real messages or charges, publish a billing catalogue, change prices
or expand existing access.

The [exact-source evidence](../validation/2026-10-27-oauth-catalog-release.md)
records successful CI, protected preflight, immutable-image scans, off-host backup,
disconnected restoration with candidate and exact prior backend, and final dry run.
All previously captured primary-local work is retained; separate worktrees and
local database contents are excluded. Schema remains V365. App Test, protected
settings, billing references and access remain protected.

Production activation passed public smoke, preserved-state checks and
five-minute observation. Authenticated MCP continuity still requires real read evidence;
the earlier unavailable connector binding cannot count as a successful read.
A fresh connection requires the owner's own consent; this release authorization
does not approve OAuth scopes on their behalf. Human product acceptance remains
UNKNOWN until owner review. The private authorization must close after this
attempt and cannot be reused for another source, image change or deployment.

## Preparation recovery within this release

The initial preparatory invocation stopped when canonical secret staging rejected
identical source and destination paths. No candidate backend or web container had
been created; automatic recovery restored the prior services. Preparation now
uses distinct root-only source copies verified against both the active container
and the accepted backup, while preserving effective credentials, mounts and settings.
Protected configuration checks, disconnected candidate/recovery restoration and
the dry run passed again before continuing this same source and immutable images.
The original authorization expiry is unchanged; this does not authorize a later
release, a different application source or a second application activation after
the window closes. The interruption evidence is retained privately.


## Closed deployment window

Production activation, public smoke, unchanged protected state and the six-sample
five-minute observation passed. The authorization closed at
**2026-10-27T20:09:15.566050+00:00** with result
`DEPLOYED_OBSERVATION_PASS_AUTHENTICATED_MCP_PENDING`. This window is closed and
cannot be reused. Real-client authenticated continuity and human product acceptance
remain UNKNOWN pending the owner's fresh ChatGPT connection/consent; a missing
connector binding is not accepted as a successful business read. Historical Stripe
TEST-key revocation remains HIGH and unresolved. See the
[activation evidence](../validation/2026-10-27-oauth-catalog-release.md#production-activation-and-observation).
