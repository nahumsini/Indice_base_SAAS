import { useRef, useState, type ReactNode } from 'react';
import { ListChecks } from 'lucide-react';
import { IndiceModalFrame, IndiceModalValidation } from '../../../../components/indice-modal';
import { Button } from '../../../../components/ui/button';
import { ExpenseAccountSelect } from '../table/ExpenseAccountSelect';
import type { Expense } from '../../types/expenses.types';
import type { PaymentAccount } from '../../PaymentAccounts/types';
import { formatExpenseDate } from '../../utils/expenseDates';
import { getExpenseBalance } from '../../utils/expenseFilters';
import { getExpenseWorkflowCopy } from '../../utils/expenseWorkflow.copy';
import { toFinanceApiErrorMessage } from '../../services/finance-api.errors';

import type { ExpenseBulkStatusChange } from '../../types/expenseOperations.types';

export function ExpenseBulkStatusModal({ rows, paymentAccounts, locale, summary, onApply, onClose }: {
  rows: Expense[]; paymentAccounts: PaymentAccount[]; locale: string; summary?: ReactNode;
  onApply: (change: ExpenseBulkStatusChange) => Promise<void>; onClose: () => void;
}) {
  const copy = getExpenseWorkflowCopy(locale);
  const today = formatExpenseDate(new Date())!;
  const [target, setTarget] = useState<ExpenseBulkStatusChange['target']>('PAID');
  const [date, setDate] = useState(today);
  const [account, setAccount] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const key = useRef(crypto.randomUUID());
  const blocked = rows.length > 200 ? copy.limit : rows.some(row => !/^\d+$/.test(row.id) || row.version === undefined
    || row.originFund || row.accountingPosted || row.purchaseOrderId || row.budgetLineId
    || !['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_PAID'].includes(row.backendStatus ?? '')
    || getExpenseBalance(row) <= 0) ? copy.protected : '';
  const accounts = paymentAccounts.filter(item => item.isActive && item.backendType !== 'PETTY_CASH'
    && item.source !== 'petty_cash' && !item.linkedFundId && rows.every(row => row.currency === item.currency));
  const latest = rows.reduce((latest, row) => {
    const date = formatExpenseDate(row.date) ?? ''; return date > latest ? date : latest;
  }, '');
  const dateError = !date ? copy.dateRequired : target === 'PAID' && (date > today || date < latest) ? copy.paymentDateInvalid
    : target === 'PENDING' && date < today ? copy.pendingDateInvalid : target === 'OVERDUE' && date >= today ? copy.overdueDateInvalid : '';
  const valid = rows.length > 0 && !blocked && !dateError && (target !== 'PAID' || accounts.some(item => item.id === account));
  const apply = async () => {
    if (!valid || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try { await onApply({ target, effectiveDate: date, paymentAccountId: target === 'PAID' ? account : undefined, requestKey: key.current }); onClose(); }
    catch (failure) { setError(toFinanceApiErrorMessage(failure)); }
    finally { inFlight.current = false; setBusy(false); }
  };
  return <IndiceModalFrame open tone="green" modalType="standard-form" busy={busy} icon={<ListChecks />}
    title={copy.changeStatus} description={`${rows.length} ${copy.selected}`} onOpenChange={open => { if (!open && !inFlight.current) onClose(); }}
    footer={<><Button variant="outline" disabled={busy} onClick={onClose}>{copy.cancel}</Button><Button disabled={busy || !valid} onClick={() => void apply()}>{copy.apply}</Button></>}>
    <div className="space-y-4">
      {summary}
      <label className="grid gap-1 text-sm">{copy.status}<select aria-label={copy.status} className="h-11 rounded-xl border bg-transparent px-3" disabled={busy} value={target} onChange={event => {
        const next = event.target.value as ExpenseBulkStatusChange['target']; setTarget(next); setError('');
        const value = new Date(); if (next === 'OVERDUE') value.setDate(value.getDate() - 1); setDate(formatExpenseDate(value)!);
      }}><option value="PAID">{copy.paid}</option><option value="PENDING">{copy.pending}</option><option value="OVERDUE">{copy.overdue}</option></select></label>
      <IndiceModalValidation tone="info" messages={[target === 'PAID' ? copy.paidHint : target === 'PENDING' ? copy.pendingHint : copy.overdueHint]} />
      {target === 'PAID' && <><div className="grid gap-1 text-sm"><span>{copy.account}</span><ExpenseAccountSelect label={copy.account} disabled={busy} value={account}
        options={accounts.map(item => ({ value: item.id, label: `${item.name} · ${item.currency}` }))} onChange={setAccount} /></div>
        {!accounts.length && <IndiceModalValidation tone="warning" messages={[copy.currencies]} />}</>}
      <label className="grid gap-1 text-sm">{target === 'PAID' ? copy.paymentDate : copy.dueDate}<input aria-label={target === 'PAID' ? copy.paymentDate : copy.dueDate} type="date" className="h-11 rounded-xl border bg-transparent px-3" disabled={busy} value={date} onChange={event => setDate(event.target.value)} /></label>
      <IndiceModalValidation messages={[blocked, dateError, error].filter(Boolean)} />
    </div>
  </IndiceModalFrame>;
}
