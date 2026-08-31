import { ArrowRight, CalendarClock, CreditCard, Users } from 'lucide-react';
import type { BillingSelectionResponse, BillingSubscriptionResponse } from '../../api/billing';
import { formatBillingDate, formatBillingMoney } from '../billingFormatters';
import { toBillingPresentation } from '../billingPresentation.adapter';
import type { BillingCopy } from '../translations';

type Props = {
  copy: BillingCopy;
  selection: BillingSelectionResponse;
  subscription: BillingSubscriptionResponse | null;
  languageCode: string;
};

export function BillingOverviewBar({ copy, selection, subscription, languageCode }: Props) {
  const capacity = selection.included_seats + selection.extra_seats;
  const available = Math.max(0, capacity - selection.used_seats);
  const presentation = toBillingPresentation(selection, subscription);
  const selectionLabel = selection.selection_state === 'PENDING_STRIPE'
    ? copy.syncingSelection
    : selection.selection_state === 'SCHEDULED'
    ? copy.scheduledSelection
    : selection.selection_state === 'DRAFT'
      ? copy.draftSelection
      : copy.customAccess;
  const chargeMoment = selection.change_timing === 'TRIAL_END'
    ? copy.atTrialEnd
    : selection.change_timing === 'NEXT_INVOICE'
      ? copy.atRenewal
      : copy.afterStripe;
  const selectionStateStyle = selection.selection_state === 'CURRENT'
    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
    : selection.selection_state === 'DRAFT'
      ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
      : 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200';

  return (
    <section aria-label={copy.accountSummary} className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <header className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#59C3A5]/10 text-[#177D66] dark:bg-[#59C3A5]/15 dark:text-[#8FE0CA]">
            <CalendarClock className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-medium text-slate-950 dark:text-white">{copy.planAtCutoff}</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{copy.noImmediateCharge}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${selectionStateStyle}`}>{selectionLabel}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{copy.catalogVersion}: {selection.catalog_version || '—'}</span>
        </div>
      </header>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4">
        <article className="p-4 sm:border-r sm:border-slate-200 dark:sm:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">{copy.currentToNext}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xl font-medium text-slate-500 dark:text-slate-400">{presentation.currentModuleCount}</span>
            <ArrowRight className="h-4 w-4 text-[#177D66] dark:text-[#8FE0CA]" />
            <span className="text-xl font-medium text-slate-950 dark:text-white">{presentation.targetModuleCount}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{copy.modulesShort}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{presentation.pendingSelection ? copy.scheduledAccessHelp : copy.currentAccess}</p>
        </article>

        <article className="flex items-center gap-3 border-t border-slate-200 p-4 dark:border-slate-800 sm:border-t-0 xl:border-r">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><Users className="h-5 w-5" /></span>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{copy.userCapacity}</p>
            <p className="mt-0.5 text-xl font-medium text-slate-950 dark:text-white">{selection.used_seats} <span className="text-sm text-slate-400">/ {capacity}</span></p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{available} {copy.availableShort}</p>
          </div>
        </article>

        <article className="border-t border-slate-200 p-4 dark:border-slate-800 sm:border-r xl:border-t-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">{copy.nextCharge}</p>
          <p className="mt-1 text-xl font-medium text-slate-950 dark:text-white">{formatBillingMoney(selection.estimated_amount_cents, selection.currency, languageCode)}</p>
          <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400">
            <CalendarClock className="h-3.5 w-3.5" /> {chargeMoment} · {formatBillingDate(presentation.cutoffAt, languageCode, copy.noDate)}
          </p>
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
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {!selection.stripe_enabled
                ? copy.stripeDisabled
                : !selection.stripe_catalog_ready
                  ? copy.stripeCatalogPending
                  : copy.stripeBilling}
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}
