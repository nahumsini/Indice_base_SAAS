# Personal workspace and main integration — 2026-10-20

The owner requested updating the working branch, main and production with the local
workspace. This integrates the private ideas workspace with main's regional trial
payment implementation. Public regional entry/payment flags retain their existing
default-off values. This release does not authorize provider activation, prices,
charges, subscriptions or automatic grants for the new complementary pilot.

## Migration lineage

Production was inspected read-only on 2026-10-20. Its successful V307, V308 and V309
are coordination follow-up, scheduling receipts and maintenance, and its current
maximum is V331. Those identities and all previously published SQL are preserved.

Main's regional trial SQL previously used V307–V309 only in isolated preparation.
The recorded APPTEST preparation did not activate that candidate. On integration,
the exact regional SQL bytes move to the next unused versions after the local
workspace's V335–V336:

| Unpublished regional filename | Integrated filename |
| --- | --- |
| V307__regional_trial_catalog_metadata.sql | V337__regional_trial_catalog_metadata.sql |
| V308__regional_trial_payment_consent.sql | V338__regional_trial_payment_consent.sql |
| V309__trial_subscription_attempt_deadline.sql | V339__trial_subscription_attempt_deadline.sql |

Existing functional or isolated databases that previously applied the competing
regional V307–V309 lineage must not run this integrated candidate. Production and
APPTEST lineage must be rechecked before startup. No repair, checksum override,
out-of-order adoption or destructive reset is authorized.

## Integration boundaries

Dashboard retains both its localized learning presentation and the Billing-owned
trial notice. Billing and subscription restrictions keep single-workspace behavior.
The private ideas workspace adds reviewed learning chapters for its three views;
generated owner fingerprints include its frontend and backend. Its focused model
regressions are included in CI.

Production requires exact-source validation, an isolated upgrade rehearsal and a
compatible recovery backend through V339. The earlier V334 recovery image is not
compatible with these additional migrations. Historical Stripe TEST-key revocation
remains a separate release decision; this integration does not extend prior exceptions.
