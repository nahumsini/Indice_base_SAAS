# Administrative release: explicit Stripe deferral

Decision date: 2026-10-06. Scope: the platform-administrator release on
`codex/platform-admin-ux-20261005`, APPTEST first, then production only after
successful verification. This is not an approval to activate billing or change
the commercial model.

The product/release owner explicitly instructed continuation in APPTEST and,
if successful, production while leaving Stripe work pending. Under the repository
instruction precedence, this is a narrow replacement decision for the historical
Stripe TEST-secret revocation blocker in section 3 of the public release gate.
It does not create a general exception for exposed secrets.

## Known unresolved finding

- Severity: HIGH. One historical public Stripe TEST secret still authenticated
  during the recorded read-only check. The historical LIVE secret is expired.
- Owner: product/release owner coordinates revocation with the Stripe account owner.
- Status: unresolved; not PASS and not a security certification.
- Due: before any Stripe/billing activation or production release changing billing authority.
  This exception expires on 2026-10-07 UTC or at the start of that activation/release, whichever
  occurs first; further releases require a fresh decision or remediation.

Fingerprint-only inspection found the historical TEST secret was not used by
either running backend, their checked release configuration, or the durable
production configuration. Unknown external consumers remain unknown. No secret
value or provider-account payload belongs in this record.

## Conditions deliberately preserved

1. Recheck that the deferred credential is not consumed by either target before
   activation. If that changes, stop; this exception does not authorize deploying it.
2. Do not rotate keys, change Stripe configuration, publish/synchronize a catalog,
   charge customers, change prices, or alter subscriptions as part of this release.
3. Compare persisted catalog prices and subscription-version counts before/after.
4. All other CI, authorization, migration, backup/restore, compatible rollback,
   protected configuration, vulnerability, APPTEST UAT and canary gates still apply.
5. Production is conditional on successful APPTEST verification, not merely its
   deployment command finishing.

The [prior blocked record](../../deployment/releases/2026.10.05-candidate-blocked.md)
remains historical evidence. Record actual activation evidence separately; this
decision alone does not say that either target has been deployed.

## Owner-authorized merged continuation — 2026-10-06

After the uploaded Lupita branch was integrated with the administrator, the owner
explicitly requested updating main and deploying APPTEST first, then production
after successful verification. The standing instruction leaves Stripe pending.
This is the same controlled release continuation, now including the named
HR/Processes and Inventory/Sales/POS owner extensions; it is not permission to
activate Stripe, providers, LIVE terminal charges or refunds.

The deferral remains limited to the historical TEST credential, which must be
rechecked as unused by both target runtimes and release configurations. The
original HIGH finding, owner, due date and 2026-10-07 UTC expiry remain unchanged.
No prices, subscription versions, billing authority, provider flags or secret
bytes may change through this deployment. All new domain, file, authorization,
rollback, exact-artifact and real APPTEST acceptance gates remain mandatory.
