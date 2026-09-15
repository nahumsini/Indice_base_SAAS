import { CalendarClock, ReceiptText } from 'lucide-react';
import type { BillingSelectionResponse } from '../../api/billing';
import { formatBillingDate, formatBillingMoney } from '../billingFormatters';
import type { BillingDraft } from '../types';
import type { BillingCopy } from '../translations';

type Props = {
  copy: BillingCopy;
  visible: BillingSelectionResponse;
  draft: BillingDraft;
  languageCode: string;
};

export function BillingPriceSummary({ copy, visible, draft, languageCode }: Props) {
  const timing = visible.change_timing === 'TRIAL_END'
    ? copy.trialTiming
    : visible.change_timing === 'NEXT_INVOICE'
      ? copy.activeTiming
      : copy.courtesyTiming;

  return (
    <section className="border-t border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--indice-brand-soft)] text-[var(--indice-brand-action)] dark:bg-blue-950/50 dark:text-blue-200">
          <ReceiptText className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[var(--indice-brand-action)] dark:text-blue-300">{copy.priceDetail}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{copy.estimate}</p>
          <div className="mt-0.5 flex items-baseline justify-between gap-2">
            <p className="text-2xl font-semibold text-slate-950 dark:text-white">{formatBillingMoney(visible.estimated_amount_cents, visible.currency, languageCode)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">/{draft.billingInterval === 'YEAR' ? copy.annual.toLowerCase() : copy.monthly.toLowerCase()}</p>
          </div>
        </div>
      </div>
      <dl className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex justify-between gap-3"><dt>{copy.baseSubtotal}</dt><dd className="font-medium text-slate-900 dark:text-white">{formatBillingMoney(visible.base_amount_cents, visible.currency, languageCode)}</dd></div>
        <div className="flex justify-between gap-3"><dt>{copy.complementarySubtotal}</dt><dd className="font-medium text-slate-900 dark:text-white">{formatBillingMoney(visible.complementary_amount_cents, visible.currency, languageCode)}</dd></div>
        <div className="flex justify-between gap-3"><dt>{copy.usersSubtotal}</dt><dd className="font-medium text-slate-900 dark:text-white">{formatBillingMoney(visible.extra_seat_unit_amount_cents * visible.extra_seats, visible.currency, languageCode)}</dd></div>
      </dl>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{copy.taxes}</p>
      <div className="mt-3 flex gap-2 rounded-xl border border-[var(--indice-brand-border)] bg-[var(--indice-brand-soft)] px-3 py-2.5 text-xs leading-5 text-[var(--indice-brand-text)] dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {timing}
          {visible.effective_at ? ` ${copy.effectiveOn}: ${formatBillingDate(visible.effective_at, languageCode)}.` : ''}
          {' '}{copy.noImmediateCharge}
        </span>
      </div>
    </section>
  );
}
