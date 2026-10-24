# Production local release: bounded historical Stripe TEST deferral

Date: 2026-10-24.

The owner separately answered “Autorizar excepción puntual” for source
`210ee8ced37bcde91a4e0b62aa7038c95fb7f0c1`, production only. The operational
record was created at **2026-10-24T05:15:52.915918Z**. Earlier closed exceptions
are not reused. The scope is one activation of this exact candidate and its
five-minute observation, ending immediately afterward and in all cases no later
than **2026-10-24T07:15:52.915918Z**. Subsequent documentation-only closeout commits
do not change these artifacts or authorize another activation.

Only the historical Stripe TEST-key revocation blocker is deferred. That finding
remains **HIGH and unresolved**. No revocation is claimed. All other security,
tenant, identity, authorization, integrity, capacity, backup/restore, recovery
and monitoring gates still apply. This does not cover another secret, dependency
finding or incident, or authorize provider activation, real sends, live charges,
catalogue publication, price changes or access expansion.

The [production-only sequencing decision](2026-10-24-production-local-release.md)
implements the owner's explicit request to keep App Test unchanged. Protected
configuration, existing permissions, billing references and prices remain protected.
The only new schema resource is additive V360. Compatible recovery preserves the
previous application's classes/resources and adds that exact migration resource;
never repair history or start the original V359-only backend against V360.

Immutable images were built from `52391681067460e1eba4b67b44d733ea4bbbcec9`.
The final source differs only in opportunity regression-test assertions, with all
runtime/build/deployment inputs verified identical. CI passed for the exact source
`210ee8ce`; image scans, isolated restoration and compatibility evidence remain bound
to their immutable identities. See the [validation report](../validation/2026-10-24-production-local-release.md).

Human product acceptance remains UNKNOWN until owner review. Engineering browser
regressions use synthetic fixtures; no claim is made about the owner's original PDF.
This changes acceptance timing only and does not waive a known security defect.

Production activation and its five-minute observation passed. Runtime verification
completed at **2026-10-24T05:22:34.587078Z**; observation ended at **2026-10-24T05:22:27.280Z**.
The scoped operational authorization closed at **2026-10-24T05:22:34.589611Z** and now has
`authorized=false` and `canBeReused=false`. This exception window is closed and
cannot be reused. The historical Stripe TEST-key finding remains HIGH and unresolved;
human product acceptance remains UNKNOWN. App Test and provider settings are unchanged.
