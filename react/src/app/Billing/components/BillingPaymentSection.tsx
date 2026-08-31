import { CreditCard, ExternalLink, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import type { BillingSelectionResponse, BillingSubscriptionResponse } from '../../api/billing';
import type { BillingCopy } from '../translations';

type Props = {
  copy: BillingCopy;
  selection: BillingSelectionResponse;
  subscription: BillingSubscriptionResponse | null;
  action: string;
  hasChanges: boolean;
  readOnly: boolean;
  onSubscriptionAction: (name: 'portal' | 'cancel' | 'resume') => void;
};

export function BillingPaymentSection(props: Props) {
  const paymentRequired = props.selection.payment_method_required;
  const busy = Boolean(props.action);
  const activationHelp = props.selection.activation_block_reason === 'OWNER_REQUIRED'
    ? props.copy.ownerPaymentRequired
    : props.selection.activation_block_reason === 'STRIPE_UNAVAILABLE'
      ? props.copy.stripeDisabled
      : props.copy.stripeCatalogPending;

  return (
    <section className="border-t border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-start gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${paymentRequired ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-emerald-50 text-[#177D66] dark:bg-emerald-950/50 dark:text-emerald-300'}`}>
          <CreditCard className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-slate-950 dark:text-white">{props.copy.paymentMethod}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${paymentRequired ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200' : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'}`}>
              {paymentRequired ? props.copy.paymentMissing : props.copy.paymentReady}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {paymentRequired ? props.copy.paymentMissingDescription : props.copy.paymentReadyDescription}
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#177D66] dark:text-[#8FE0CA]" />
        {props.copy.stripeSecurity}
      </div>

      {props.readOnly ? (
        <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs leading-5 text-blue-800 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-200">
          {props.copy.paymentMethod} · {props.selection.currency} · {paymentRequired ? props.copy.paymentMissing : props.copy.paymentReady}. {props.copy.stripeSecurity}
        </p>
      ) : null}

      {props.readOnly || paymentRequired ? null : (
        <>
          <Button type="button" variant="outline" onClick={() => props.onSubscriptionAction('portal')} disabled={busy || props.hasChanges || !props.selection.payment_management_available} className="mt-3 h-11 w-full justify-between rounded-xl bg-white text-[#143675] hover:bg-blue-50 dark:bg-slate-900 dark:text-blue-200 dark:hover:bg-blue-950/30">
            {props.action === 'portal' ? props.copy.openingPortal : props.copy.openPortal}<ExternalLink className="h-4 w-4" />
          </Button>
          {props.hasChanges ? <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{props.copy.saveBeforePayment}</p> : null}
          {props.subscription ? (
            <Button type="button" variant="ghost" onClick={() => props.onSubscriptionAction(props.subscription!.cancel_at_period_end ? 'resume' : 'cancel')} disabled={busy} className="mt-1 h-9 w-full rounded-xl text-slate-600 dark:text-slate-300">
              {props.subscription.cancel_at_period_end
                ? (props.action === 'resume' ? props.copy.resuming : props.copy.resume)
                : (props.action === 'cancel' ? props.copy.cancelling : props.copy.cancel)}
            </Button>
          ) : null}
        </>
      )}
      {!props.readOnly && paymentRequired && !props.selection.activation_available ? (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
          {activationHelp}
        </p>
      ) : null}
    </section>
  );
}
