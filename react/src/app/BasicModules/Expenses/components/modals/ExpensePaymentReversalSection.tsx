import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { IndiceModalValidation } from '../../../../components/indice-modal';
import { useExpensesResolvedLocale } from '../../Expenses/hooks/useExpensesTranslations';
import { expensesService, toFinanceApiErrorMessage } from '../../services';
import type { Expense, ExpensePayment } from '../../types/expenses.types';
import { getExpenseBalance } from '../../utils/expenseFilters';
import { getExpenseReversalCopy } from '../../utils/expenseReversal.copy';
import { financeModalInputClass } from './FinanceModalPrimitives';

type Props = {
  expense: Expense;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  onHistoryLoaded: (hasHistory: boolean) => void;
  onReverse: (paymentId: string, reason: string) => Promise<void>;
};

export function ExpensePaymentReversalSection({ expense, disabled, onBusyChange, onHistoryLoaded, onReverse }: Props) {
  const locale = useExpensesResolvedLocale();
  const copy = getExpenseReversalCopy(locale);
  const [payments, setPayments] = useState<ExpensePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const busy = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setLoadFailed(false);
    expensesService.getExpensePayments(expense.id).then(rows => {
      if (!active) return;
      setPayments(rows); onHistoryLoaded(rows.length > 0);
    }).catch(() => { if (active) setLoadFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [expense.id, expense.version, attempt, onHistoryLoaded]);
  const payment = payments.filter(row => !row.reversedAt).sort((a, b) => Number(b.id) - Number(a.id))[0];
  const money = (value: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: expense.currency }).format(value);
  const undo = async () => {
    if (!payment || !reason.trim() || busy.current || disabled) return;
    busy.current = true; onBusyChange(true); setError('');
    try {
      await onReverse(payment.id, reason.trim());
      setConfirming(false); setReason(''); setAttempt(value => value + 1);
    } catch (failure) { setError(toFinanceApiErrorMessage(failure, copy.failed)); }
    finally { busy.current = false; onBusyChange(false); }
  };
  const buttonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 disabled:opacity-50 dark:bg-slate-900 dark:text-amber-200';
  return <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 md:col-span-2 dark:border-amber-800 dark:bg-amber-950/20">
    <h3 className="text-sm font-medium">{copy.title}</h3>
    <p className="text-sm text-slate-600 dark:text-slate-300">{copy.hint}</p>
    {loading ? <p role="status" className="text-sm">{copy.loading}</p> : loadFailed ? <div role="alert"><p>{copy.loadFailed}</p><button type="button" className={buttonClass} onClick={() => setAttempt(value => value + 1)}>{copy.retry}</button></div> : payment ? <>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt>{copy.last}</dt><dd className="font-medium">{money(payment.amount)} · {new Intl.DateTimeFormat(locale).format(new Date(`${payment.paymentDate}T00:00:00`))}</dd><dd>{payment.paymentAccountName}</dd></div>
        <div><dt>{copy.balance}</dt><dd className="font-medium">{money(getExpenseBalance(expense) + payment.amount)}</dd></div>
      </dl>
      {!payment.paymentAccountId && <p className="text-sm">{copy.noBank}</p>}
      {confirming ? <>
        <label className="block text-sm font-medium">{copy.reason}<textarea aria-label={copy.reason} maxLength={500} value={reason} disabled={disabled}
          onChange={event => setReason(event.target.value)} className={`${financeModalInputClass} mt-2 min-h-20`} /></label>
        <IndiceModalValidation messages={error ? [error] : []} />
        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonClass} disabled={disabled || !reason.trim()} onClick={() => void undo()}>{copy.confirm}</button>
          <button type="button" className={buttonClass} disabled={disabled} onClick={() => { setConfirming(false); setError(''); }}>{copy.cancel}</button>
        </div>
      </> : <button type="button" className={buttonClass} disabled={disabled} onClick={() => setConfirming(true)}><RotateCcw className="h-4 w-4" />{copy.undo}</button>}
    </> : <p className="text-sm">{copy.noPayments}</p>}
  </section>;
}
