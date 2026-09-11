# Petty Cash fund classification stages

Status: approved product decision, 2026-09-10.
Owner: Funds, with Treasury, Expenses, Budget and KPI contracts as downstream consumers.

## Ledger rule

A fund is a balance ledger in one native currency:

```text
current balance = opening balance + money entries - captured exits + audited adjustments
```

The equation is identical for internal and external funds. An entry increases the fund once. A
captured purchase decreases the fund and its custody account once. Later receipt approval validates
or classifies the evidence and cannot subtract money again.

Every fund has an active, company-owned, same-currency Payment Account as its custody account. It
describes where the administered money is held. It does not determine ownership, accounting
classification or the source of the next entry.

## Classification and origins

| Fund stage | Company account deposit | Medios externos deposit | Receipt approval |
|---|---|---|---|
| `INTERNAL_COMPANY` | Allowed; transfers Treasury into custody | Rejected | Creates/links the paid company Expense and budget impact |
| `EXTERNAL_MANAGED` | Allowed; transfers Treasury into custody | Allowed; credits custody and the fund | Validates the client statement and never creates a company Expense or budget impact |

The deposit modal chooses the origin for each entry. Fund create/edit does not persist an allowed
methods list or require a permanent source. A selected company source must be active, belong to the
authenticated company, match currency and differ from custody. Medios externos requires a source
name and never invents a Payment Account.

A positive balance returned during statement closing follows the same per-operation rule. The
closing modal requires a destination: an active same-currency company account for either fund type,
or a named **Medios externos** recipient for an external fund. The selected route is stored on the
return movement and changes custody and fund balance once. Legacy default-source fields are only a
fallback for older API clients; they are not part of current fund configuration.

Company-owned cash is the eligible Payment Account balance less the exact current balances of
external funds held in those accounts. Consequently, an external deposit raises custody and the
external-fund deduction by the same amount; company-owned cash is unchanged. A company-account
transfer into an external fund reduces company-owned cash by the amount transferred.

## Prospective type change

The same fund may change between internal and external. The change is a classification stage, not a
deposit, withdrawal, deletion or replacement fund.

Required rules:

1. Preserve fund ID, currency, custody account and exact current balance.
2. Require the target type's complete configuration: Budget/Budget Line for internal; owner,
   relationship and statement recipient for external.
3. Require a reason of 8–500 characters, effective date and current optimistic version.
4. After any financial activity, the earliest effective date is the next calendar date in the
   company's configured time zone.
5. Permit only one scheduled change and block ordinary configuration edits until it is applied or
   cancelled.
6. Resolve every pending receipt before scheduling. If a backdated pending receipt appears before
   activation, activation waits; operations dated on or after the new stage are rejected meanwhile.
7. Reject a date that already has fund activity or a terminal statement on or after it.
8. At activation, seal the prior stage through the day before the effective date and open the new
   stage with the same carried balance. If an empty statement already starts on the effective date,
   reuse it for the new stage so statement periods never overlap. The transition posts no Treasury
   or budget movement.
9. Preserve the prior statement's fund type, budget, custody, responsible party, owner, recipient
   and managed assets as an immutable snapshot. Earlier internal receipts stay company Expenses;
   earlier external receipts stay outside company Expenses.
10. Apply the target classification to operations in the new stage. Reclassifying a carried balance
    changes whether that balance is included in company-owned cash from the effective date.
11. Allow cancellation only while the change remains scheduled. Keep applied and cancelled records
    as tenant-scoped audit history.

Protected endpoints are:

- `GET /api/v1/finance/petty-cash/funds/{fundId}/type-changes`
- `POST /api/v1/finance/petty-cash/funds/{fundId}/type-changes`
- `DELETE /api/v1/finance/petty-cash/funds/{fundId}/type-changes/{changeId}`

Reads and mutations use the authenticated company/scope. Mutations require the existing Finance
write capability and CSRF token. Activation and all balance-sensitive operations lock the fund and
run transactionally.

## Persistence and release

V275 adds a fund type-stage ID, immutable statement configuration snapshots and an append-only
type-change audit table. Same-month stage splits use `(fund, stage, period)` uniqueness; earlier
versioned migrations are never edited.

The migration is forward-only and preserves all existing IDs, balances and statements. It is safe
to apply before exposing the new UI. Once a same-month transition has been applied, an older backend
that does not understand type stages is not a compatible application rollback. Promotion must keep
a V275-aware prior image as the retained rollback set, or disable the type-change UI until that
image is available. Database recovery remains the separate verified-backup procedure in
`deployment/README.md`.
