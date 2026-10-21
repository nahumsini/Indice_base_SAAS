# Complementary module availability for current companies

Date: 2026-10-20. Environment: `https://app.indiceapp.com`.

The owner explicitly confirmed the five modules ("Sí, esos cinco módulos") and
requested availability for all companies for now ("ponselo a todas las empresas
por ahora"). This replaces the no-automatic-grants scope of the earlier release
decision only for this bounded configuration operation.

## Decision

Enable `correo`, `ideas_board`, `scheduling`, `maintenance` and `control_minutas`
for the 40 currently active, non-deleted companies. This is a temporary courtesy
cohort with no automatic enrollment of future companies and no invented expiry
date. Retain the `pilot` lifecycle. Change Email's catalog from planned/nonassignable
to pilot/assignable with its existing `mail` and `accounts` tab permissions.

Preserve existing active entitlements and their sources. Tag new or reactivated
entitlements `owner_complementary_rollout`. Match the native administrator grant
cohort (active root/superadmin/owner memberships), insert missing module/tab
permissions, and preserve existing roles and explicit permission denials. Each
company administrator continues assigning employee access through the existing
configuration center. Tenant, private mailbox/board ownership, CSRF, session,
company status, billing holds and tab enforcement remain unchanged.

This is configuration for the already deployed and validated application revision
`04f127a9a96e125b6a5b41b46386215ffb44d337`, schema V339. It does not publish local
work, replace containers, change secrets, create subscription/product benefits,
alter prices or billing protection, send email, or publish scheduling portals.
The historical Stripe TEST finding remains unresolved; this operation neither
reopens the closed release exception nor authorizes another artifact release.

## Operation and recovery

Use a protected configuration snapshot, transactional activation, optimistic
state checks, and an operation lock. Append platform audit records with an
operational (null) actor and the owner's authorization, rather than impersonating
an application user. Preserve existing audit and business records.

The bounded operation is `complementary-availability-20261020`. Repeating it must
not duplicate grants or audit events. Recovery deactivates newly inserted company
entitlements, restores changed catalog/entitlement values, and removes only newly
inserted administrator permissions whose values have not changed. Any intervening
permission edit aborts recovery for review. Retain the audit trail.

An isolated synthetic MySQL rehearsal verified activation, repeat execution,
preservation of paid access and explicit denials, inactive-company exclusion,
rollback conflict detection and atomicity, and successful recovery. Application
compilation and a new build are N/A: no application code or schema changes.

These courtesy grants are transitional. Existing commercial reconciliation may
replace a module entitlement when that company's commercial products change;
this decision does not redefine the billing entitlement projection. Production
verification and protected evidence locations are recorded in the matching
[activation report](../validation/2026-10-20-complementary-module-availability.md).
