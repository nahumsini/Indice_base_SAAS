# Payroll/workspace release: bounded historical Stripe TEST deferral

Date: 2026-10-26.

The owner separately answered “Autorizar excepción puntual” for application source
`30f3552f9d697c331869c80bdaed1d1aeb4026f7`, production only. The operational record was
created at **2026-10-26T18:27:33.687639+00:00** and expires immediately after this single activation
attempt and its five-minute observation, in all cases no later than
**2026-10-26T20:27:33.687639+00:00**. Earlier closed exceptions are not reused.
Documentation-only readiness/closeout commits do not change the runtime source or
authorize another activation. The exact final images are recorded in the
[readiness report](../validation/2026-10-26-payroll-workspace-release.md).

Only the historical Stripe TEST-key revocation blocker is deferred. The finding
remains **HIGH**, unresolved, owned by the release owner for revocation and follow-up
before another public release. No revocation is claimed. This decision cannot waive
another secret, exploitable vulnerability, tenant, authentication, integrity,
capacity, backup/recovery or monitoring gate. It does not enable providers, authorize
live charges or mail, publish a catalogue, change prices or expand existing access.

The [source decision](2026-10-26-payroll-workspace-production-release.md) retains all
captured primary-local work and the production-only preference. App Test, protected
settings, billing references and existing access remain protected. V361–V365 are
forward-only and have been rehearsed on the complete disconnected backup with both
the candidate and compatible backend recovery, preserving original records and
history. The final web image includes the verified curl dependency patch.

Human product acceptance remains UNKNOWN until owner review. Ordinary-pay regression
coverage does not certify every payroll case or filing. All other technical gates
remain applicable. The private authorization must be closed after this attempt and
cannot be reused for another source, image change or deployment.

## Closed

Production activation and its six-sample observation passed. Final verification
completed at **2026-10-26T18:36:09.566744+00:00**. This exception window closed at
**2026-10-26T18:36:09.569272+00:00** and cannot be reused. The historical Stripe
TEST-key finding remains HIGH and unresolved; no revocation is claimed.
App Test, protected settings, prices, subscriptions and access were preserved.
See the [release closeout](../validation/2026-10-26-payroll-workspace-release.md#production-closeout).
