import { useEffect, type ChangeEvent, type ReactNode } from 'react';
import {
  Banknote,
  Camera,
  CheckCircle2,
  FileUp,
  Filter,
  Loader2,
  MapPin,
  Paperclip,
  Plus,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { BudgetTaxControls, type TaxControlDraft } from '../../../Expenses/components/modals/BudgetTaxControls';
import type { PettyCashTranslations } from '../../translations';
import type { PublicPettyCashPeriod } from '../pettyCashKioskApi';

export type PettyCashReceiptDraft = TaxControlDraft & {
  description: string;
  expenseDate: string;
  receiptReference: string;
};

export function PettyCashKioskIdentityCard({
  balanceLabel,
  balanceValue,
  detail,
  fundLimitLabel,
  fundLimitValue,
  initials,
  name,
  onReset,
  resetLabel,
  scopeLabel,
  utilizationPercent,
  verifiedLabel,
}: {
  balanceLabel: string;
  balanceValue: string;
  detail: string;
  fundLimitLabel: string;
  fundLimitValue: string;
  initials: string;
  name: string;
  onReset: () => void;
  resetLabel: string;
  scopeLabel: string;
  utilizationPercent: number;
  verifiedLabel: string;
}) {
  return (
    <section className="rounded-2xl border border-[#147514]/25 bg-white p-4 shadow-[0_14px_34px_-32px_rgba(15,23,42,0.8)] dark:border-emerald-400/20 dark:bg-slate-950">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#147514] text-base font-medium text-white shadow-sm">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[#147514] dark:text-emerald-300">{verifiedLabel}</p>
          <h2 className="mt-1 line-clamp-2 text-lg font-medium leading-tight tracking-tight text-slate-950 dark:text-white">{name}</h2>
          <p className="mt-1 truncate text-sm font-medium text-slate-500 dark:text-slate-400">{detail}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          aria-label={resetLabel}
          className="h-10 shrink-0 gap-2 rounded-xl border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:border-[#147514]/40 hover:bg-emerald-50 hover:text-[#147514] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
          onClick={onReset}
        >
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          <span className="hidden min-[390px]:inline">{resetLabel}</span>
        </Button>
      </div>

      <div className="mt-3 border-t border-emerald-100 pt-3 dark:border-slate-800">
        <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-[#147514]" />
          <span className="truncate">{scopeLabel}</span>
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400">{balanceLabel}</p>
            <p className="mt-0.5 truncate text-sm font-medium text-slate-950 dark:text-white">{balanceValue}</p>
          </div>
          <div className="min-w-0 text-right">
            <p className="text-xs font-medium text-slate-400">{fundLimitLabel}</p>
            <p className="mt-0.5 truncate text-sm font-medium text-slate-600 dark:text-slate-300">{fundLimitValue}</p>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-[#147514] transition-[width]" style={{ width: `${Math.min(100, Math.max(0, utilizationPercent))}%` }} />
        </div>
      </div>
    </section>
  );
}

export function PettyCashKioskSummaryStrip({
  balanceLabel,
  balanceValue,
  expenseLabel,
  expenseValue,
  incomeLabel,
  incomeValue,
}: {
  balanceLabel: string;
  balanceValue: string;
  expenseLabel: string;
  expenseValue: string;
  incomeLabel: string;
  incomeValue: string;
}) {
  const metrics = [
    { icon: <WalletCards className="h-4 w-4" />, label: balanceLabel, value: balanceValue, valueClass: 'text-slate-950 dark:text-white' },
    { icon: <ReceiptText className="h-4 w-4" />, label: expenseLabel, value: expenseValue, valueClass: 'text-rose-600 dark:text-rose-300' },
    { icon: <Banknote className="h-4 w-4" />, label: incomeLabel, value: incomeValue, valueClass: 'text-emerald-700 dark:text-emerald-300' },
  ];

  return (
    <section className="grid grid-cols-3 divide-x divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950">
      {metrics.map(metric => (
        <div className="min-w-0 px-2 py-3 text-center" key={metric.label}>
          <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[#147514] dark:bg-emerald-400/10 dark:text-emerald-300">{metric.icon}</div>
          <p title={metric.value} className={`mt-1 truncate text-sm font-medium leading-none min-[390px]:text-base ${metric.valueClass}`}>{metric.value}</p>
          <p className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">{metric.label}</p>
        </div>
      ))}
    </section>
  );
}

export function PettyCashKioskToolbar({
  createLabel,
  noPeriodsLabel,
  onCreate,
  onPeriodChange,
  periodLabel,
  periods,
  selectedPeriodKey,
  formatPeriod,
}: {
  createLabel: string;
  noPeriodsLabel: string;
  onCreate: () => void;
  onPeriodChange: (periodKey: string) => void;
  periodLabel: string;
  periods: PublicPettyCashPeriod[];
  selectedPeriodKey: string;
  formatPeriod: (period: PublicPettyCashPeriod) => string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <label className="flex min-w-0 items-center gap-3 rounded-xl bg-emerald-50/80 px-3 py-2 dark:bg-emerald-400/10">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#147514] text-white shadow-sm">
            <Filter aria-hidden="true" className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-medium text-[#147514] dark:text-emerald-300">{periodLabel}</span>
            <select
              aria-label={periodLabel}
              className="mt-0.5 block h-6 w-full min-w-0 appearance-none truncate bg-transparent pr-1 text-sm font-medium text-slate-950 outline-none dark:text-white"
              onChange={event => onPeriodChange(event.target.value)}
              value={selectedPeriodKey}
            >
              {periods.length === 0 ? <option value="">{noPeriodsLabel}</option> : periods.map(period => <option key={period.id} value={period.period_key}>{formatPeriod(period)}</option>)}
            </select>
          </span>
        </label>
        <Button
          type="button"
          aria-label={createLabel}
          className="h-auto min-h-12 gap-2 rounded-xl bg-[#147514] px-3 text-xs font-medium text-white shadow-sm hover:bg-[#0f5f0f]"
          onClick={onCreate}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          <span className="hidden min-[390px]:inline">{createLabel}</span>
        </Button>
      </div>
    </section>
  );
}

export function PettyCashKioskEmptyState({ body, icon, title }: { body: string; icon: ReactNode; title: string }) {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-[#147514] dark:bg-emerald-400/10 dark:text-emerald-300">{icon}</div>
      <h3 className="mt-4 text-lg font-medium tracking-tight text-slate-950 dark:text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-slate-500 dark:text-slate-400">{body}</p>
    </section>
  );
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PettyCashReceiptModal({
  attachments,
  canSave,
  copy,
  currencyCode,
  errorMessage,
  form,
  isOpen,
  isSaving,
  onAttachmentChange,
  onClear,
  onClose,
  onFormChange,
  onRemoveAttachment,
  onSubmit,
  totals,
}: {
  attachments: File[];
  canSave: boolean;
  copy: PettyCashTranslations;
  currencyCode: string;
  errorMessage: string;
  form: PettyCashReceiptDraft;
  isOpen: boolean;
  isSaving: boolean;
  onAttachmentChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  onClose: () => void;
  onFormChange: (updates: Partial<PettyCashReceiptDraft>) => void;
  onRemoveAttachment: (index: number) => void;
  onSubmit: () => void;
  totals: { subtotal: string; taxes: string; total: string };
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-busy={isSaving} aria-labelledby="petty-cash-receipt-title">
      <section className="flex h-[100dvh] w-full flex-col overflow-hidden border-slate-200/80 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950 sm:h-auto sm:max-h-[92dvh] sm:max-w-[480px] sm:rounded-[24px] sm:border">
        <header className="shrink-0 border-b border-slate-100 bg-white px-4 pb-3.5 pt-[calc(0.875rem+env(safe-area-inset-top))] dark:border-slate-800 dark:bg-slate-950 sm:px-5 sm:pb-4 sm:pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#147514] text-white shadow-sm"><ReceiptText className="h-5 w-5" /></span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#147514] dark:text-emerald-300">{copy.publicKiosk.header.eyebrow}</p>
                <h2 id="petty-cash-receipt-title" className="mt-0.5 text-xl font-medium leading-tight text-slate-950 dark:text-white">{copy.publicKiosk.receipt.title}</h2>
                <p className="mt-1 line-clamp-2 text-xs font-normal leading-4 text-slate-500 dark:text-slate-400 sm:text-sm sm:leading-5">{copy.publicKiosk.receipt.description}</p>
              </div>
            </div>
            <button type="button" disabled={isSaving} aria-label={copy.common.close} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300" onClick={onClose}><X className="h-5 w-5" /></button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/70 px-4 py-4 dark:bg-slate-900/40 sm:px-5">
          {errorMessage ? <div role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">{errorMessage}</div> : null}
          <div className="grid gap-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-4">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-[#147514] dark:bg-emerald-400/10 dark:text-emerald-300"><ReceiptText className="h-5 w-5" /></span>
                <div><p className="text-sm font-medium text-slate-950 dark:text-white">{copy.publicKiosk.receipt.title}</p><p className="text-xs text-slate-500 dark:text-slate-400">{copy.publicKiosk.receipt.totalCaptured}</p></div>
              </div>
              <div className="grid gap-3.5">
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.publicKiosk.receipt.concept}</span><input className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-medium text-slate-900 outline-none focus:border-[#147514] focus:ring-4 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white" disabled={isSaving} onChange={event => onFormChange({ description: event.target.value })} placeholder={copy.publicKiosk.receipt.conceptPlaceholder} value={form.description} /></label>
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.publicKiosk.receipt.amount}</span><input className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-medium text-slate-900 outline-none focus:border-[#147514] focus:ring-4 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white" disabled={isSaving} inputMode="decimal" onChange={event => onFormChange({ amount: event.target.value })} placeholder="0.00" value={form.amount} /></label>
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.publicKiosk.receipt.reference}</span><input className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-medium text-slate-900 outline-none focus:border-[#147514] focus:ring-4 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white" disabled={isSaving} onChange={event => onFormChange({ receiptReference: event.target.value })} placeholder={copy.publicKiosk.receipt.referencePlaceholder} value={form.receiptReference} /></label>
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.publicKiosk.receipt.date}</span><input className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-medium text-slate-900 outline-none focus:border-[#147514] focus:ring-4 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white" disabled={isSaving} onChange={event => onFormChange({ expenseDate: event.target.value })} type="date" value={form.expenseDate} /></label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-4">
              <div className="mb-3 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-[#147514] dark:bg-emerald-400/10 dark:text-emerald-300"><ShieldCheck className="h-5 w-5" /></span><div><p className="text-sm font-medium text-slate-950 dark:text-white">{copy.publicKiosk.workspace.calculation}</p><p className="text-xs text-slate-500 dark:text-slate-400">{copy.publicKiosk.receipt.currency(currencyCode)}</p></div></div>
              <BudgetTaxControls compact draft={form} onDraftChange={updates => onFormChange(updates)} />
              <div className="mt-3 grid grid-cols-3 divide-x divide-emerald-100 overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50/70 dark:divide-emerald-500/20 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                {[
                  [copy.publicKiosk.workspace.subtotal, totals.subtotal],
                  [copy.publicKiosk.workspace.taxes, totals.taxes],
                  [copy.common.total, totals.total],
                ].map(([label, value], index) => <div className="min-w-0 px-2 py-3 text-center" key={label}><p className="truncate text-xs font-medium text-slate-500">{label}</p><p className={`mt-1 truncate text-xs font-medium ${index === 2 ? 'text-[#147514] dark:text-emerald-300' : 'text-slate-950 dark:text-white'}`}>{value}</p></div>)}
              </div>
            </section>

            <section className="rounded-2xl border border-[#147514]/25 bg-white p-3.5 shadow-sm dark:border-emerald-400/20 dark:bg-slate-950 sm:p-4">
              <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#147514] text-white shadow-sm"><Camera className="h-5 w-5" /></span><div><p className="text-sm font-medium text-slate-950 dark:text-white">{copy.publicKiosk.workspace.evidenceTitle}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{copy.publicKiosk.workspace.evidenceDescription}</p></div></div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-[#147514]/35 bg-emerald-50 px-3 py-3 text-center text-sm font-medium text-[#147514] transition hover:bg-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-300"><Camera className="h-5 w-5" />{copy.publicKiosk.workspace.takePhoto}<input type="file" className="sr-only" accept="image/*" capture="environment" disabled={isSaving} onChange={onAttachmentChange} /></label>
                <label className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"><FileUp className="h-5 w-5" />{copy.publicKiosk.workspace.chooseFile}<input type="file" className="sr-only" multiple accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" disabled={isSaving} onChange={onAttachmentChange} /></label>
              </div>
              <p className="mt-2 text-center text-xs text-slate-500">{copy.publicKiosk.workspace.evidenceHint}</p>
              {attachments.length > 0 ? <div className="mt-3 grid gap-2">{attachments.map((file, index) => <div key={`${file.name}-${file.size}-${file.lastModified}-${index}`} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950"><Paperclip className="h-4 w-4 shrink-0 text-[#147514]" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{file.name}</p><p className="text-xs text-slate-500">{formatFileSize(file.size)}</p></div><button type="button" disabled={isSaving} aria-label={copy.common.deleteAttachment} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30" onClick={() => onRemoveAttachment(index)}><Trash2 className="h-4 w-4" /></button></div>)}</div> : null}
            </section>
          </div>
        </div>

        <footer className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)] gap-2 border-t border-slate-100 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-950 sm:px-5 sm:py-4">
          <Button type="button" variant="outline" className="h-12 rounded-xl border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50" disabled={isSaving} onClick={onClear}>{copy.publicKiosk.receipt.clear}</Button>
          <Button type="button" className="h-12 rounded-xl bg-[#147514] px-5 text-sm font-medium text-white hover:bg-[#0f5f0f]" disabled={!canSave} onClick={onSubmit}>{isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}{copy.publicKiosk.receipt.submit}</Button>
        </footer>
      </section>
    </div>
  );
}
