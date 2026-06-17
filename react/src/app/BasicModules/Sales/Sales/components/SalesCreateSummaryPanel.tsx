import { ClipboardCheck } from 'lucide-react';
import { cn } from '../../../../components/ui/utils';
import type { SalesOpportunity, SalesQuote } from '../../types';
import type { SalesRecordsTranslations } from '../translations';
import type { SaleRecordDraft } from '../types/salesTypes';
import { formatSalesCurrency } from '../utils/salesFormatters';
import { DetailField } from './SalesModalPrimitives';

function StatusPill({
  tone,
  children,
}: {
  tone: 'blue' | 'green' | 'yellow' | 'slate';
  children: string;
}) {
  const tones = {
    blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-200',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200',
    yellow: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200',
    slate: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
  } as const;

  return (
    <span className={cn('inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-black', tones[tone])}>
      {children}
    </span>
  );
}

function SummaryMetric({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: string;
  tone?: 'coral' | 'blue' | 'green' | 'yellow' | 'slate';
}) {
  const accents = {
    coral: 'border-l-[#FF6B5E]',
    blue: 'border-l-blue-500',
    green: 'border-l-emerald-500',
    yellow: 'border-l-amber-400',
    slate: 'border-l-slate-300 dark:border-l-slate-600',
  } as const;

  return (
    <div className={cn('rounded-2xl border border-slate-200 bg-slate-50 p-4 pl-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/60', 'border-l-4', accents[tone])}>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

export function SalesCreateSummaryPanel({
  form,
  selectedOpportunity,
  selectedQuote,
  t,
}: {
  form: SaleRecordDraft;
  selectedOpportunity: SalesOpportunity | null;
  selectedQuote: SalesQuote | null;
  t: SalesRecordsTranslations;
}) {
  const quoteIsReady = selectedQuote?.status === 'Approved' || selectedQuote?.status === 'Closed Won';
  const itemsCount = selectedQuote?.items.length ?? form.saleLines.length;
  const nextAction = quoteIsReady ? t.modal.workspace.nextActionReady : t.modal.workspace.nextActionNeedsQuote;

  return (
    <aside className="space-y-4 lg:sticky lg:top-0">
      <section className="rounded-[24px] border border-[#FF6B5E]/20 bg-white p-5 shadow-sm dark:border-[#FF6B5E]/25 dark:bg-slate-900/70">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[#FF6B5E]/10 p-3 text-[#FF6B5E] dark:bg-[#FF6B5E]/15">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-950 dark:text-white">{t.modal.workspace.summaryTitle}</h3>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{t.modal.workspace.summarySubtitle}</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <DetailField label={t.modal.fields.customerName} value={form.customerName || t.common.notAvailable} />
          <DetailField label={t.modal.fields.quoteReference} value={form.quoteReference || t.common.notAvailable} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <SummaryMetric label={t.modal.fields.totalAmount} value={formatSalesCurrency(form.totalAmount, form.currency)} tone="coral" />
            <SummaryMetric label={t.modal.fields.currency} value={form.currency || t.common.notAvailable} tone="blue" />
            <SummaryMetric label={t.modal.workspace.itemsLabel} value={String(itemsCount)} tone="green" />
            <SummaryMetric label={t.modal.fields.taxTotal} value={formatSalesCurrency(form.taxTotal, form.currency)} tone="yellow" />
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t.modal.workspace.readinessTitle}</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusPill tone={selectedOpportunity ? 'green' : 'slate'}>
            {selectedOpportunity ? t.modal.workspace.opportunityLoaded : t.modal.workspace.opportunityPending}
          </StatusPill>
          <StatusPill tone={quoteIsReady ? 'green' : 'yellow'}>
            {quoteIsReady ? t.modal.workspace.quoteReady : t.modal.workspace.quotePending}
          </StatusPill>
          <StatusPill tone="blue">{t.statuses.finance[form.financeStatus]}</StatusPill>
          <StatusPill tone="yellow">{t.statuses.inventory[form.inventoryStatus]}</StatusPill>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t.modal.workspace.nextAction}</p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-950 dark:text-white">{nextAction}</p>
        </div>
      </section>
    </aside>
  );
}
