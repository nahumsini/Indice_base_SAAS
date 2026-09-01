import { useEffect, useState } from 'react';
import { LockKeyhole, RotateCcw } from 'lucide-react';
import { IndiceConfirmationDialog } from '../../../components/indice-modal/IndiceConfirmationDialog';
import { IndiceModalFrame } from '../../../components/indice-modal/IndiceModalFrame';
import { IndiceModalValidation } from '../../../components/indice-modal/IndiceModalValidation';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import type { AccountingReportCopy } from './accountingReportTranslations';

export function ClosePeriodConfirmation({ copy, open, periodKey, busy, onCancel, onConfirm }: {
  copy: AccountingReportCopy; open: boolean; periodKey: string; busy: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  return <IndiceConfirmationDialog open={open} busy={busy} tone="blue" icon={<LockKeyhole className="h-5 w-5" />} title={copy.modals.closeTitle} description={copy.modals.closeDescription} itemName={periodKey} cancelLabel={copy.actions.cancel} confirmLabel={copy.actions.confirm} onCancel={onCancel} onConfirm={onConfirm}><p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.modals.closeItem}</p></IndiceConfirmationDialog>;
}

export function ReopenPeriodModal({ copy, open, periodKey, busy, onCancel, onConfirm }: {
  copy: AccountingReportCopy; open: boolean; periodKey: string; busy: boolean; onCancel: () => void; onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [attempted, setAttempted] = useState(false);
  useEffect(() => { if (open) { setReason(''); setAttempted(false); } }, [open]);
  const normalized = reason.trim();
  const invalid = normalized.length < 10 || normalized.length > 500;
  return <IndiceModalFrame open={open} busy={busy} modalType="standard-form" tone="blue" icon={<RotateCcw className="h-5 w-5" />} title={copy.modals.reopenTitle} description={copy.modals.reopenDescription} onOpenChange={(next) => { if (!next) onCancel(); }} closeLabel={copy.actions.closeModal} footer={<><Button type="button" variant="outline" disabled={busy} onClick={onCancel}>{copy.actions.cancel}</Button><Button type="button" disabled={busy} onClick={() => { setAttempted(true); if (!invalid) onConfirm(normalized); }}>{copy.actions.save}</Button></>} footerSummary={periodKey}>
    <div className="space-y-3"><label htmlFor="accounting-reopen-reason" className="text-sm font-medium text-slate-800 dark:text-slate-100">{copy.modals.reason}</label><Textarea id="accounting-reopen-reason" value={reason} maxLength={500} rows={6} onChange={(event) => setReason(event.target.value)} aria-invalid={attempted && invalid} aria-describedby="accounting-reopen-help" /><div id="accounting-reopen-help" className="flex justify-between gap-3 text-xs text-slate-500"><span>{copy.modals.reasonHelp}</span><span>{reason.length}/500</span></div>{attempted && invalid ? <IndiceModalValidation tone="error" messages={[copy.modals.reasonRequired]} /> : null}</div>
  </IndiceModalFrame>;
}
