import { useRef, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { IndiceModalFrame, IndiceModalValidation } from '../../../../components/indice-modal';
import { getFinanceBulkCopy } from '../../../shared/financeBulkActions.copy';
import { useExpensesResolvedLocale, useExpensesTranslations } from '../../Expenses/hooks/useExpensesTranslations';
import { toFinanceApiErrorMessage } from '../../services/finance-api.errors';
import type { Expense } from '../../types/expenses.types';
import { financeModalInputClass, financeModalSecondaryButtonClass } from './FinanceModalPrimitives';

export function ExpenseDeleteModal({ expenses, onClose, onDelete }: {
  expenses: Expense[]; onClose: () => void; onDelete: (reason: string) => Promise<void>;
}) {
  const t = useExpensesTranslations();
  const copy = getFinanceBulkCopy(useExpensesResolvedLocale());
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const submit = async () => {
    if (inFlight.current || reason.trim().length < 8) return;
    inFlight.current = true; setBusy(true); setError('');
    try { await onDelete(reason.trim()); }
    catch (failure) { setError(toFinanceApiErrorMessage(failure, t.expenses.messages.deleteFailed)); }
    finally { inFlight.current = false; setBusy(false); }
  };
  return <IndiceModalFrame open busy={busy} modalType="confirmation" tone="green" icon={<Trash2 />}
    title={expenses.length > 1 ? t.expenses.confirmDelete.bulkTitle : t.expenses.confirmDelete.title}
    description={t.expenses.confirmDelete.description} onOpenChange={open => { if (!open) onClose(); }}
    footer={<><button type="button" className={financeModalSecondaryButtonClass} disabled={busy} onClick={onClose}>{t.common.cancel}</button>
      <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50" disabled={busy || reason.trim().length < 8} onClick={() => void submit()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}{t.common.delete}
      </button></>}>
    <div className="space-y-4">
      <ul className="max-h-36 space-y-2 overflow-auto rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        {expenses.map(expense => <li key={expense.id} className="text-sm"><span className="font-mono text-xs text-slate-500">{expense.folio}</span><p>{expense.concept}</p></li>)}
      </ul>
      <label className="block text-sm font-medium">{copy.reason}<textarea autoFocus className={`${financeModalInputClass} mt-2 h-24 resize-y`} value={reason} minLength={8} maxLength={500} disabled={busy} onChange={event => setReason(event.target.value)} /></label>
      {error && <IndiceModalValidation messages={[error]} tone="error" />}
    </div>
  </IndiceModalFrame>;
}
