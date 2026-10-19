# Production release: explicit historical Stripe TEST deferral

Date: 2026-10-19 (America/Toronto).

After confirming production deployment, the owner explicitly instructed: "ignora
stripe y continua". Under AGENTS.md instruction precedence, this replaces only
the historical Stripe TEST-key revocation blocker for the current prepared
production release, application candidate `5dac3bf0bcb8`, superseded within
this same activation by `3df8e17dd380` to correct the cold daily exchange cache
found by authenticated acceptance. This does not authorize another release.

The key remains active at the last read-only check (HTTP 200), HIGH and unresolved;
it is not PASS. Revocation remains with the Stripe account owner. This one-release
exception expires when this activation attempt and its observation window finish;
it does not authorize a subsequent release or any new billing/provider activation.

Before activation, verify by fingerprint only that the historical credential is
absent from production, APPTEST and the candidate runtime configuration. Retain
existing provider flags, secret bytes, catalogue prices and subscription versions.
Do not charge, rotate provider keys, publish catalogues or change subscriptions.

All other authorization, tenant isolation, data integrity, backup, compatible
recovery, vulnerability, acceptance and monitoring requirements remain applicable.
This decision does not resolve or waive the separate verifier diagnostic incident.
Record actual deployment and checks separately; this decision is not activation.

The authorized activation and observation completed on 2026-10-19 at 13:33:13 UTC,
as recorded in [the activation report](../validation/2026-10-19-production-activation.md).
This exception is now expired; the historical finding remains unresolved.
