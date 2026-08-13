import { Boxes, CreditCard, ReceiptText, Users } from 'lucide-react';
import { Button } from '../../components/ui/button';
import type { BillingSelectionResponse, BillingSubscriptionResponse } from '../../api/billing';
import type { BillingDraft } from '../types';
import type { BillingCopy } from '../translations';
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
  onChange: (patch: Partial<BillingDraft>) => void;
  onReset: () => void;
  onSave: () => void;
  onActivate: () => void;
  onSubscriptionAction: (name: 'portal' | 'cancel' | 'resume') => void;
};

export function BillingConfigurationPanel(props: Props) {
  const visible = props.preview ?? props.selection;
  const paymentRequired = props.selection.payment_method_required;
  const paymentCommercialChanges = paymentRequired && (
    props.draft.extraSeats !== props.selection.extra_seats
    || props.draft.billingInterval !== props.selection.billing_interval
  );
  const billingCycleLocked = ['ACTIVE', 'PAST_DUE'].includes(props.selection.status.toUpperCase());
  const capacity = visible.included_seats + props.draft.extraSeats;
  const steps = [
    { icon: Boxes, label: props.copy.planStep, value: props.draft.productCodes.length },
    { icon: Users, label: props.copy.peopleStep, value: capacity },
    { icon: CreditCard, label: props.copy.paymentStep, value: paymentRequired ? '!' : '✓' },
  ];

  return (
    <aside className="lg:sticky lg:top-4 lg:self-start">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <header className="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
            <ReceiptText className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-medium text-slate-950 dark:text-white">{props.copy.currentPlan}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{visible.catalog_version}</p>
          </div>
        </header>

        <div aria-label={props.copy.configurationGuide} className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40">
          {steps.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex min-w-0 items-center gap-2 border-r border-slate-200 px-3 py-2.5 last:border-r-0 dark:border-slate-800">
              <Icon className="h-4 w-4 shrink-0 text-[#177D66] dark:text-[#8FE0CA]" />
              <div className="min-w-0">
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
                <p className="text-xs font-medium text-slate-900 dark:text-white">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <section className="p-4">
          <label className="block">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{props.copy.billingCycle}</span>
            <select
              value={props.draft.billingInterval}
              disabled={Boolean(props.action) || billingCycleLocked}
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
          disabled={Boolean(props.action)}
          paymentRequired={paymentRequired}
          onChange={(extraSeats) => props.onChange({ extraSeats })}
        />
        <BillingPriceSummary copy={props.copy} visible={visible} draft={props.draft} />
        <BillingPaymentSection
          copy={props.copy}
          selection={props.selection}
          subscription={props.subscription}
          action={props.action}
          hasChanges={props.hasChanges}
          onActivate={props.onActivate}
          onSubscriptionAction={props.onSubscriptionAction}
        />

        <footer className="grid grid-cols-2 gap-2 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <Button type="button" variant="outline" onClick={props.onReset} disabled={!props.hasChanges || Boolean(props.action)} className="h-10 rounded-xl bg-white dark:bg-slate-900">
            {props.copy.reset}
          </Button>
          <Button type="button" onClick={props.onSave} disabled={!props.hasChanges || !props.draft.productCodes.length || paymentCommercialChanges || Boolean(props.action)} className="h-10 rounded-xl bg-[#177D66] hover:bg-[#126653]">
            {props.action === 'save' ? props.copy.saving : props.copy.save}
          </Button>
        </footer>
      </section>
    </aside>
  );
}
