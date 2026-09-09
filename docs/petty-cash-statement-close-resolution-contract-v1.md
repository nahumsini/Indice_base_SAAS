# Petty cash statement closing and accepted receipts

Status: product decision approved by the user on 2026-09-08.
Owner: Funds; Treasury owns account movements and HR owns payroll deductions.
This decision replaces the blanket negative-balance closing restriction in the
2026-09-08 button implementation note. No historical records are migrated.

## Closing a signed statement balance

The statement balance is the recorded custody balance, not a physical cash count.
A negative balance indicates recorded withdrawals exceeding the assigned money.
An authorized user's explicit resolution is an adjustment of that recorded balance;
it does not invent another expense, deposit, payroll payment or receipt.

- Zero: close cleanly. A nonzero balance cannot be silently cleared by this action.
- Carry forward: carry the whole positive or negative balance into the following
  monthly opening. Store the signed carryover on the closed cut. Do not post a new
  Treasury movement, fund deposit, budget issuance or expense.
- Forgive shortage: resolve the negative balance with an equal positive adjustment.
- Forgive surplus: resolve the positive balance with an equal negative adjustment.
  Use the existing `SHORTAGE_ADJUSTMENT` movement and `CLOSED` status, with explicit
  `FORGIVE_SURPLUS` action metadata. Surplus is not counted as a shortage KPI.
- Charge shortage: resolve the negative balance and queue one deduction for the
  fund's responsible, active company collaborator. HR retains its explicit review
  and application to payroll; closing never mutates a finalized payroll run.
- Return to source remains available for positive balances.

The browser resolves the entire shown difference. For compatibility, older clients
can still declare a positive physical shortage and can resolve a partial difference;
any remainder is explicitly carried forward instead of stranded in a terminal cut.
Amounts larger than the absolute balance, zero adjustments and negative adjustment
amounts are rejected. The browser supplies its expected signed balance; a changed
server balance requires a refresh and review before closing.

Closing is a single transaction locking the authenticated company-owned fund before
its statement. The original balance, decision, effective date, reference and actor
are stored in the cut's closure metadata; adjustments also retain the signed delta
and native currency in movement history. A terminal cut rejects another closure.
No approval, payment evidence or original expense date is rewritten.

Open successor cuts are reconciled in month order: each opening becomes the previous
cut's remaining/carryover balance; only the opening and derived closing projections
change. Their deposits, expenses and source records are preserved. A finalized
successor whose opening would change blocks the operation and rolls back the entire
transaction. An unchanged finalized successor ends propagation. A cut with all
receipts authorized (`SETTLED`) is still operational until the explicit closing action.

## Approval without an attachment

The existing administrator roles (root, superadmin, admin, owner, dueno) can explicitly
authorize a captured receipt without a file, within normal tenant, module and scope
permissions. Other actors still need evidence for initial authorization. A previously
validated receipt preserves its authorization even if its last attachment is removed.
Rejected and reversed states also survive attachment count changes.

Internal authorization creates exactly one paid Expense and its custody settlement,
without another withdrawal. External authorization stays `VALIDATED`, outside company
Expenses and budgets. Only genuinely pending receipt states block closing, regardless
of table filters. Final authorized states do not block because their attachment count
is zero. This does not bulk-approve drafts during closing.

## Payroll currency and integrity

The source amount and ISO currency are preserved. Same-currency deductions use 1:1.
A different payroll currency uses verified persisted exchange evidence for the closing
date (up to seven preceding days, following the existing evidence policy). Missing or
illustrative fallback rates block the deduction and roll back the closing; static
example rates and unknown-currency 1:1 fallbacks are not used. The source statement key
continues to prevent duplicate deductions. External fund operations remain excluded
from company expense and budget consumption.

## Verification boundaries

Use isolated, rollback-only database fixtures for carryover, both signed adjustments,
payroll intake, attachment removal, native currencies, ownership, stale balance,
closed-cut protection and the accepted-receipt flow. UI regression covers actual
component events and the API adapter, with transport mocked. Authenticated visual
review and production promotion are separate release evidence.
