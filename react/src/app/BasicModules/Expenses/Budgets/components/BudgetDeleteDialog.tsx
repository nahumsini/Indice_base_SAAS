import { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { IndiceModalFrame, IndiceModalValidation } from '../../../../components/indice-modal';
import { Button } from '../../../../components/ui/button';
import { getFinanceBulkCopy } from '../../../shared/financeBulkActions.copy';
import { toFinanceApiErrorMessage } from '../../services';
import { useBudgetsResolvedLocale, useBudgetsTranslations } from '../hooks/useBudgetsTranslations';
import { getBudgetWorkspaceCopy } from '../budgetWorkspace.copy';
import type { BudgetLineTableRow } from '../types/budgetLineTable.types';

export function BudgetDeleteDialog({ rows, onClose, onDelete }: {
  rows: BudgetLineTableRow[]; onClose: () => void; onDelete: (reason: string) => Promise<void>;
}) {
  const locale = useBudgetsResolvedLocale();
  const t = useBudgetsTranslations();
  const copy = getFinanceBulkCopy(locale);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const submit = async () => {
    if (inFlight.current || reason.trim().length < 8) return;
    inFlight.current = true; setBusy(true); setError('');
    try { await onDelete(reason.trim()); onClose(); }
    catch (failure) { setError(toFinanceApiErrorMessage(failure, t.budgets.messages.deleteFailed)); }
    finally { inFlight.current = false; setBusy(false); }
  };
  return <IndiceModalFrame open onOpenChange={open => { if (!open && !busy) onClose(); }} busy={busy}
    tone="green" modalType="confirmation" title={t.budgets.confirmDelete.title} description={rows.map(row => row.folio).join(',')} icon={<Trash2 />}
    footer={<><Button variant="outline" disabled={busy} onClick={onClose}>{copy.cancel}</Button><Button disabled={busy || reason.trim().length < 8} onClick={() => void submit()}>{copy.DELETE}</Button></>}>
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">{getBudgetWorkspaceCopy(locale).delete}</p>
      <label className="block text-sm font-medium">{copy.reason}<textarea className="mt-2 w-full rounded-lg border bg-transparent p-3" value={reason} maxLength={500} disabled={busy} onChange={event => setReason(event.target.value)} /></label>
      {error && <IndiceModalValidation messages={[error]} />}
    </div>
  </IndiceModalFrame>;
}
