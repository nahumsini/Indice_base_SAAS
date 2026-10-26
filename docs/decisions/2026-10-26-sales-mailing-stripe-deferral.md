# Sales Mailing release: bounded historical Stripe TEST deferral

Date: 2026-10-26.

The owner separately answered “Autorizar excepción puntual” for application source
`2e18cf7523ffecf48193577fd1d1868616b9656b`, production only. The operational record was
created at **2026-10-26T20:28:49.289691+00:00** and expires immediately after this single activation
attempt and its five-minute observation, in all cases no later than
**2026-10-26T22:28:49.289691+00:00**. Earlier closed exceptions are not reused.
Documentation-only readiness/closeout commits do not change the runtime source or
authorize another activation. The exact final images and passed technical gates are
recorded in the [readiness report](../validation/2026-10-26-sales-mailing-release.md).

Only the historical Stripe TEST-key revocation blocker is deferred. The finding
remains **HIGH**, unresolved, owned by the release owner for revocation and follow-up
before another public release. No revocation is claimed. This decision cannot waive
another secret, exploitable vulnerability, tenant, authentication, integrity,
capacity, backup/recovery or monitoring gate. It does not enable providers, authorize
live charges or mail, publish a catalogue, change prices or expand existing access.

The [source decision](2026-10-26-sales-mailing-production-release.md) preserves all
captured primary-local work and the production-only scope. App Test, protected
settings, billing references and existing access remain protected. Schema stays
V365. The complete fresh backup has passed disconnected restoration with both the
candidate and exact previous backend, preserving original records and objects.
Recovery retains the exact previous containers. No schema repair is necessary.

Human product acceptance remains UNKNOWN until owner review. Synthetic browser
checks do not certify real mail delivery. All other technical gates remain
applicable. The private authorization must be closed after this attempt and cannot
be reused for another source, image change or deployment.

## Closed

Production activation and its six-sample observation passed. Final verification
completed at **2026-10-26T20:35:43.564960+00:00**. This exception window closed at
**2026-10-26T20:35:43.567845+00:00** and cannot be reused. The historical Stripe
TEST-key finding remains HIGH and unresolved; no revocation is claimed.
App Test, protected settings, prices, subscriptions and access were preserved.
See the [release closeout](../validation/2026-10-26-sales-mailing-release.md#production-closeout).
