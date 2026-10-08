# Customer entry MX/CA and basic module coordination

Status: accepted product policy; initial entry implementation only, no public-release approval.

## Owner decisions

- This branch owns public entry, not the separate Agenda/Meeting Control functionality work.
- Capture lead, verify email, create a native company/owner and start 15 days without a card in
  Mexico and Canada. Diagnosis supports rather than gates activation.
- New initial offering includes 10 people. Agenda and Meeting Control become basic after their
  responsible delivery is tested/released and the commercial catalog is approved.
- Charge the chosen plan automatically at the original deadline, with a valid method and
  separately recorded advance consent. No consent is inferred from contact or trial acceptance.
- Block operational access on unpaid expiry; retain account, data and billing recovery.
- The target launch date does not waive data integrity, security, regional-price or release gates.

## Integration boundary

Branch: `codex/customer-entry-mx-ca-20261008`, based on
`e3c83653d594c4cfe3a1170bd2575b1f5c9910d7` (`main` at inspection).
V305 is allocated to `public_verified_trial_entry`; V306 strengthens its required deadline
forward-only after isolated validation, without editing V305. Other concurrent migrations must inspect
the combined directory and choose the next unique version before integration. Do not rename an
already applied migration or repair a functional database to make conflicting branches fit.

This branch touches native signup/provisioning/access, lead owner contracts and a new public
React route; it does not edit Agenda/Meetings operational files or their pilot migrations.
Canonical docs include scoped append-only owner additions and the new commercial policy;
preserve both agents' extensions when resolving documentation conflicts.

The native trial selects all **released** basics at account creation. It will not auto-publish
or grant the other agent's current pilots. Paid offerings remain immutable until their audited
publication workflow runs separately. Existing USD customers are not migrated to CAD/MXN.

## Current executable scope

See [entry contract](../public-customer-entry-mx-ca-contract-v1.md) and
[validation](../validation/2026-10-08-customer-entry-mx-ca.md).
The initial increment provisions/verifies/expires demos, defaults off, reports paid conversion
not ready and prevents the cohort using legacy USD payment/selection paths. It does not yet
take a card, save automatic-charge consent, charge or lift expiry after a verified payment.

## Remaining release blockers

1. Regional versioned CAD/MXN offer + provider verification, original-cutoff automatic payment
   consent and trusted paid conversion are not implemented. No fallback to the old USD offer.
2. Marketing CTA wiring and real APPTEST capture → email → login → ERP → method/consent →
   first charge/failure/expiry acceptance remain pending. Marketing repo has pre-existing work.
3. Exact baseline main CI is failed:
   [run 37734480938](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/37734480938),
   `e3c83653…`. Prior inspection identifies global Learning MVC advice missing dependencies in
   WebMvcTest slices. It is outside this branch's feature ownership. Local focused success is not
   proof that the full merged suite is green; coordinate the fix before updating main for release.
4. Prior release notes record a Stripe test-secret exposure and a deferral ending 2026-10-07.
   Current revocation/rotation evidence is unresolved; do not reuse that exception or exposed
   credential. This branch makes no live Stripe calls and does not store provider secrets.
5. Separate module readiness/basic publication and Mexico implementation-payment timing remain
   pending. Canada must not silently acquire implementation/consulting charges.

Do not merge a claimed launch-ready main, enable public signup, advertise completed autoservice
or deploy production until the exact combined candidate clears these blockers.

## Owner-requested main checkpoint — 2026-10-08

After the default-off foundation and its payment/release limitations were reported, the owner
explicitly requested updating main and identifying the work remaining for today's launch.
Integrate `c1be1a0c` as a development coordination checkpoint, not a launch-ready release.
The working tree and remote main were unchanged at inspection; integration is fast-forward.
The exact branch CI was still running, with remote migration validation/startup successful:
[run 37846979481](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/37846979481).
Local focused validation remains recorded separately; full CI is not claimed successful.

This request replaces only the earlier sequencing condition for the Git checkpoint. It does
not waive the public release/security gates, publish a paid catalog, deploy either environment,
enable public entry, create a payment mandate or authorize charges. The five remaining release
blockers above remain in force. Further entry/payment work and the separate module delivery
should branch from this updated checkpoint and coordinate migration numbering before merging.
