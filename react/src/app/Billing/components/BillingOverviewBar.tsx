import { Boxes, CalendarClock, CreditCard, ReceiptText, Users } from 'lucide-react';
import type { BillingSelectionResponse, BillingSubscriptionResponse } from '../../api/billing';
import type { BillingCopy } from '../translations';

type Props = {
  copy: BillingCopy;
  selection: BillingSelectionResponse;
  subscription: BillingSubscriptionResponse | null;
};

export function BillingOverviewBar({ copy, selection, subscription }: Props) {
  const capacity = selection.included_seats + selection.extra_seats;
  const available = Math.max(0, capacity - selection.used_seats);
  const periodEnd = subscription?.current_period_end_at || selection.trial_ends_at;
  const chargeMoment = selection.change_timing === 'TRIAL_END'
    ? copy.atTrialEnd
    : selection.change_timing === 'NEXT_INVOICE'
      ? copy.atRenewal
      : copy.afterStripe;

  return (
    <section aria-label={copy.accountSummary} className="mt-4 grid overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 xl:grid-cols-4">
      <article className="flex items-center gap-3 p-4 sm:border-r sm:border-slate-200 dark:sm:border-slate-800">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-300"><Boxes className="h-5 w-5" /></span>
        <div className="min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">{copy.selectedModules}</p>
          <div className="mt-0.5 flex min-w-0 items-baseline gap-2">
            <p className="text-xl font-medium text-slate-950 dark:text-white">{selection.selected_product_codes.length}</p>
            <span className="truncate rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-200">{selection.offer_code || copy.customAccess}</span>
          </div>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{copy.catalogVersion}: {selection.catalog_version || '—'}</p>
        </div>
      </article>

      <article className="flex items-center gap-3 border-t border-slate-200 p-4 dark:border-slate-800 sm:border-t-0 xl:border-r dark:xl:border-slate-800">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-[#177D66] dark:bg-emerald-950/50 dark:text-emerald-300"><Users className="h-5 w-5" /></span>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{copy.userCapacity}</p>
          <p className="mt-0.5 text-xl font-medium text-slate-950 dark:text-white">{selection.used_seats} <span className="text-sm text-slate-400">/ {capacity}</span></p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{available} {copy.availableShort}</p>
        </div>
      </article>

      <article className="flex items-center gap-3 border-t border-slate-200 p-4 dark:border-slate-800 sm:border-r sm:border-slate-200 xl:border-t-0 dark:sm:border-slate-800">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"><ReceiptText className="h-5 w-5" /></span>
        <div className="min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">{copy.nextCharge}</p>
          <p className="mt-0.5 text-xl font-medium text-slate-950 dark:text-white">{formatMoney(selection.estimated_amount_cents, selection.currency)}</p>
          <p className="flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400"><CalendarClock className="h-3.5 w-3.5" /> {chargeMoment} · {formatDate(periodEnd, copy.noDate)}</p>
        </div>
      </article>

      <article className="flex items-center gap-3 border-t border-slate-200 p-4 dark:border-slate-800 xl:border-t-0">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${selection.payment_method_required ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-emerald-50 text-[#177D66] dark:bg-emerald-950/50 dark:text-emerald-300'}`}>
          <CreditCard className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">{copy.paymentMethod}</p>
          <p className="mt-0.5 truncate text-sm font-medium text-slate-950 dark:text-white">
            {selection.payment_method_required ? copy.paymentMissing : copy.paymentReady}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{copy.stripeBilling}</p>
        </div>
      </article>
    </section>
  );
}

function formatMoney(cents: number | null, currency: string) {
  if (cents == null) return '—';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(cents / 100);
}

function formatDate(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}
