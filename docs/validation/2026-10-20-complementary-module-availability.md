# Complementary modules: production availability

Status: ACTIVATED AND VERIFIED, 2026-10-20.

The owner authorized the five modules for all current companies in the
[availability decision](../decisions/2026-10-20-complementary-module-availability.md).
The configuration operation completed on `app.indiceapp.com` using the existing
`04f127a9a96e125b6a5b41b46386215ffb44d337` application and V339 schema.

## Result

| Module | Active companies |
| --- | ---: |
| Correo electrónico (`correo`) | 40 |
| Pizarra de ideas (`ideas_board`) | 40 |
| Agenda y eventos (`scheduling`) | 40 |
| Mantenimiento (`maintenance`) | 40 |
| Control de juntas (`control_minutas`) | 40 |

Inserted 196 company entitlements, preserving the four existing active grants and
their original sources. Inserted 239 missing administrator module assignments
and 858 missing tab permissions across 49 active root/superadmin memberships.
Existing assignments, permission denials and ordinary employee permissions were
preserved. Each company's administrator can assign employee access normally.

Email changed from planned/nonassignable to pilot/assignable with tab access.
All five retain their pilot lifecycle. Recorded 40 company activation audit events
and one catalog audit event with the operation ID
`complementary-availability-20261020` and a null operational actor.

## Verification

- Isolated synthetic MySQL rehearsal: activation, repeat execution, preservation
  of paid access and denials, inactive-company exclusion, rollback conflict
  atomicity, rollback and retained audit all passed. No production database was
  used for automated tests.
- Production readback: 200 active company/module combinations; exact preservation
  of all prior module/permission rows except the authorized Email catalog fields.
- Commercial configuration checksums unchanged for products, benefits,
  subscriptions and projected company entitlements.
- Production and APPTEST image IDs, environment fingerprints, start times and
  restart counts unchanged. No container deployment or restart.
- Authenticated production UI: dashboard shows all five; Email mailbox and
  Accounts, personal Ideas Board, Scheduling calendar, Maintenance requests and
  Minutes/meetings calendar opened successfully in the existing owner session.
- Public health returned 200. Valid anonymous requests to representative APIs
  for all five modules returned 401. The meetings list requires its date
  parameters; omitting them returns 400 before the owner access check.
- Configuration backup gzip integrity passed; the rollback manifest is marked
  COMMITTED and contains exact before/after values and inserted row IDs.
- Three-minute observation after activation (20:57–21:00 UTC): health remained
  `ok`, all five authenticated views loaded, and the final access readback passed.

Application tests/build/TypeScript/schema migration: N/A, no application code or
schema was changed. The exact deployed artifact's tests remain documented in the
[release preparation](2026-10-20-workspace-production-preparation.md).

## Recovery and evidence

Protected VPS directory: `/root/indice-module-availability-20261020` (0700).
It contains the access configuration SQL backup, before/after JSON snapshots,
runtime and billing fingerprints, operation script/dependency, result, audit
verification and `rollback-manifest.json`. Row snapshots are not committed.

Operator SHA-256:
`c5bd8f1eaba1f4513851e01c421b9c236cd6f18df6127e4186c05a4b5be0287f`.
Backup SHA-256:
`ac31194326d4503dcceef0b3a32f71eda7065b9595522f12a8ea05dc8de9f4a5`.

On that VPS, bounded recovery is:

```sh
python3 /root/indice-module-availability-20261020/activate_modules.py rollback \
  --directory /root/indice-module-availability-20261020
```

Recovery refuses to overwrite later edits to the affected permission rows. It
deactivates newly created entitlements, restores prior catalog values, removes
only unchanged newly inserted administrator grants, and preserves business and
audit data. No production rollback was needed.

## Limits and handoff

This enables the current company cohort; future companies are not automatically
enrolled by this one-time operation. Email users still connect their own accounts;
no account credentials were copied and no message was sent. Provider delivery,
creating real bookings/work orders/meetings, and employee-specific permissions
were not exercised with customer data. Billing reconciliation retains its existing
authority if a company's commercial products later change.

Application files changed: N/A. Added only the availability decision and this
report; unrelated local board work was preserved. The historical Stripe TEST-key
finding remains unresolved as previously recorded; no new release exception is
asserted by this configuration operation.
