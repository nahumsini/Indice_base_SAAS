import { CalendarClock } from 'lucide-react';
import type { BillingSelectionResponse, BillingSubscriptionResponse } from '../../api/billing';
import { formatBillingDate } from '../billingFormatters';
import { toBillingPresentation } from '../billingPresentation.adapter';
import type { BillingDraft } from '../types';
import type { BillingCopy } from '../translations';
import { BillingActionDock } from './BillingActionDock';
import { BillingPaymentSection } from './BillingPaymentSection';
import { BillingPriceSummary } from './BillingPriceSummary';
import { BillingUserControl } from './BillingUserControl';

type Props = {
  copy: BillingCopy;
  selection: BillingSelectionResponse;
  preview: BillingSelectionResponse | null;
  subscription: BillingSubscriptionResponse | null;
  draft: BillingDraft;
  action: string;
  hasChanges: boolean;
  readOnly: boolean;
  languageCode: string;
  onChange: (patch: Partial<BillingDraft>) => void;
  onReset: () => void;
  onSave: () => void;
  onActivate: () => void;
  onSubscriptionAction: (name: 'portal' | 'cancel' | 'resume') => void;
};

export function BillingConfigurationPanel(props: Props) {
  const visible = props.preview ?? props.selection;
  const paymentRequired = props.selection.payment_method_required;
  const billingCycleLocked = ['ACTIVE', 'PAST_DUE'].includes(props.selection.status.toUpperCase());
  const presentation = toBillingPresentation(visible, props.subscription, props.hasChanges);
  const activationHelp = props.selection.activation_block_reason === 'OWNER_REQUIRED'
    ? props.copy.ownerPaymentRequired
    : props.selection.activation_block_reason === 'STRIPE_UNAVAILABLE'
      ? props.copy.stripeDisabled
      : props.copy.stripeCatalogPending;

  return (
    <aside className="lg:sticky lg:top-4 lg:self-start">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <header className="flex items-start gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#2563EB] dark:bg-blue-950/50 dark:text-blue-200">
            <CalendarClock className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-medium text-slate-950 dark:text-white">{props.copy.planAtCutoff}</h2>
            <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {props.copy.cutoffDate}: {formatBillingDate(presentation.cutoffAt, props.languageCode, props.copy.noDate)}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {presentation.targetModuleCount} {props.copy.modulesShort}
          </span>
        </header>

        <section className="p-4">
          <label className="block">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{props.copy.billingCycle}</span>
            <select
              value={props.draft.billingInterval}
              disabled={Boolean(props.action) || billingCycleLocked || props.readOnly}
              onChange={(event) => props.onChange({ billingInterval: event.target.value as BillingDraft['billingInterval'] })}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:disabled:bg-slate-800"
            >
              <option value="MONTH">{props.copy.monthly}</option>
              <option value="YEAR">{props.copy.annual}</option>
            </select>
          </label>
          {billingCycleLocked ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{props.copy.billingCycleLocked}</p> : null}
        </section>

        <BillingUserControl
          copy={props.copy}
          visible={visible}
          subscription={props.subscription}
          extraSeats={props.draft.extraSeats}
          disabled={Boolean(props.action) || props.readOnly}
          paymentRequired={paymentRequired}
          onChange={(extraSeats) => props.onChange({ extraSeats })}
        />
        <BillingPriceSummary copy={props.copy} visible={visible} draft={props.draft} languageCode={props.languageCode} />
        <BillingPaymentSection
          copy={props.copy}
          selection={props.selection}
          subscription={props.subscription}
          action={props.action}
          hasChanges={props.hasChanges}
          readOnly={props.readOnly}
          onSubscriptionAction={props.onSubscriptionAction}
        />

        {props.readOnly ? null : (
          <BillingActionDock
            copy={props.copy}
            primaryAction={presentation.primaryAction}
            action={props.action}
            hasChanges={props.hasChanges}
            hasProducts={Boolean(props.draft.productCodes.length)}
            activationAvailable={props.selection.activation_available}
            activationHelp={activationHelp}
            onReset={props.onReset}
            onSave={props.onSave}
            onActivate={props.onActivate}
          />
        )}
      </section>
    </aside>
  );
}
